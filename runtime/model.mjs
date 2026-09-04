import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_SNAPSHOT_CHARS = 60_000;
const MAX_EDITS = 10;
const MAX_FILE_CHARS = 80_000;
const MAX_PATCH_CHARS = 20_000;
const LOCAL_WORKSPACE = 'src/generated/WorkspaceApp.tsx';
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md']);

export function modelConfigured() {
  return Boolean(process.env.HARSF_MODEL_API_URL && process.env.HARSF_MODEL_API_KEY && process.env.HARSF_MODEL_NAME);
}

function safeRelativePath(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..') || path.isAbsolute(normalized)) return null;
  if (!normalized.startsWith('src/')) return null;
  if (!ALLOWED_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return null;
  return normalized;
}

function isLocalOllama(endpoint = '') {
  return /https?:\/\/(127\.0\.0\.1|localhost):11434\//i.test(endpoint);
}

async function walk(dir, root, files) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '.harsf-runtime'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, root, files);
      continue;
    }
    const relative = path.relative(root, full).replaceAll('\\', '/');
    if (!ALLOWED_EXTENSIONS.has(path.extname(relative).toLowerCase())) continue;
    files.push(relative);
  }
}

async function buildSnapshot(limit = MAX_SNAPSHOT_CHARS) {
  const root = process.cwd();
  const files = [];
  await walk(path.join(root, 'src'), root, files);

  const priority = ['src/App.tsx', 'src/App.css', 'src/main.tsx', 'src/types.ts'];
  files.sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });

  let used = 0;
  const parts = [];
  for (const relative of files) {
    const text = await fs.readFile(path.join(root, relative), 'utf8');
    const chunk = `\n--- FILE: ${relative} ---\n${text}\n`;
    if (used + chunk.length > limit) {
      if (parts.length === 0) parts.push(chunk.slice(0, limit));
      break;
    }
    parts.push(chunk);
    used += chunk.length;
  }
  return parts.join('');
}

async function buildLocalWorkspaceSnapshot() {
  const root = process.cwd();
  let text = '';
  try {
    text = await fs.readFile(path.join(root, LOCAL_WORKSPACE), 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return `\n--- FILE: ${LOCAL_WORKSPACE} ---\n${text}\n`;
}

function parseJsonContent(content) {
  const trimmed = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(trimmed);
  if (!parsed || !Array.isArray(parsed.edits)) throw new Error('Model response must contain an edits array.');
  if (parsed.edits.length > MAX_EDITS) throw new Error(`Model proposed too many files; max ${MAX_EDITS}.`);

  const edits = parsed.edits.map((edit) => {
    const filePath = safeRelativePath(edit.path);
    if (!filePath) throw new Error('Unsafe or invalid model edit rejected.');

    if (typeof edit.content === 'string') {
      if (edit.content.length > MAX_FILE_CHARS) throw new Error(`Edit too large: ${filePath}`);
      return { path: filePath, content: edit.content };
    }

    if (typeof edit.find === 'string' && typeof edit.replace === 'string') {
      if (!edit.find || edit.find.length > MAX_PATCH_CHARS || edit.replace.length > MAX_PATCH_CHARS) {
        throw new Error(`Patch too large or empty: ${filePath}`);
      }
      return { path: filePath, find: edit.find, replace: edit.replace };
    }

    throw new Error('Model edit must contain either content or find/replace.');
  });

  return { summary: String(parsed.summary || 'Model prepared code edits.'), edits };
}

function validateLocalWorkspaceProposal(proposal) {
  if (proposal.edits.length !== 1) {
    throw new Error('LOCAL_WORKSPACE_EDIT_REQUIRED: return exactly one complete-file edit.');
  }
  const edit = proposal.edits[0];
  if (edit.path !== LOCAL_WORKSPACE || typeof edit.content !== 'string') {
    throw new Error(`LOCAL_WORKSPACE_EDIT_REQUIRED: replace ${LOCAL_WORKSPACE} using complete file content only; do not use find/replace.`);
  }
  return proposal;
}

export async function smokeTestModel() {
  if (!modelConfigured()) throw new Error('MODEL_ADAPTER_REQUIRED');
  const endpoint = process.env.HARSF_MODEL_API_URL;
  const key = process.env.HARSF_MODEL_API_KEY;
  const model = process.env.HARSF_MODEL_NAME;
  const local = isLocalOllama(endpoint);
  const timeoutMs = local ? 60_000 : 30_000;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 8,
        messages: [
          { role: 'system', content: 'You are a health check. Reply with READY only.' },
          { role: 'user', content: 'READY?' },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new Error(`Model smoke test timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model API ${response.status}: ${text.slice(0, 500)}`);
  }
  const data = await response.json();
  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!content) throw new Error('Model smoke test returned no message content.');
  return content;
}

export async function generateCodeEdits(goal, qaFeedback = '') {
  if (!modelConfigured()) throw new Error('MODEL_ADAPTER_REQUIRED');
  const endpoint = process.env.HARSF_MODEL_API_URL;
  const key = process.env.HARSF_MODEL_API_KEY;
  const model = process.env.HARSF_MODEL_NAME;
  const local = isLocalOllama(endpoint);
  const snapshot = local ? await buildLocalWorkspaceSnapshot() : await buildSnapshot();

  const system = local
    ? [
        'You are the HARSF Local Developer Agent.',
        'Build the user requested app inside one isolated React/TypeScript workspace file.',
        `You MUST return JSON only in exactly this shape: {"summary":"...","edits":[{"path":"${LOCAL_WORKSPACE}","content":"COMPLETE FILE CONTENT"}]}.`,
        `Only edit ${LOCAL_WORKSPACE}. Never edit App.tsx or any other file.`,
        'Never use find/replace patches. Always return the complete WorkspaceApp.tsx file.',
        'The file must export default function WorkspaceApp().',
        'Make it a useful interactive app for the goal using React state when helpful.',
        'Do not install packages and do not import third-party libraries. React hooks from react are allowed.',
        'Keep the code compact, valid TSX, and self-contained. Use inline styles if styling is needed.',
        'Do not use shell commands, secrets, deployment, git operations, destructive actions, or network calls.',
      ].join(' ')
    : [
        'You are the HARSF Developer Agent working on a React/TypeScript repository.',
        'Return JSON only.',
        'Preferred shape for small edits: {"summary":"...","edits":[{"path":"src/...","find":"exact existing text","replace":"replacement text"}]}.',
        'You may use {"path":"src/...","content":"complete file content"} only when a whole-file replacement is truly necessary.',
        'Only edit files under src/. Never request shell commands, secrets, deployment, git operations, package installation, or destructive actions.',
        'Keep edits minimal and ensure TypeScript/build/tests should pass. For find/replace, copy the find text exactly from the snapshot and make it unique.',
      ].join(' ');

  const user = `GOAL:\n${goal}\n\n${qaFeedback ? `PREVIOUS QA FAILURE:\n${qaFeedback.slice(-6000)}\n\n` : ''}CURRENT REPOSITORY SNAPSHOT:${snapshot}`;

  const body = {
    model,
    temperature: local ? 0 : 0.1,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  if (!local) {
    body.thinking = { type: 'disabled' };
    body.response_format = { type: 'json_object' };
  }

  const timeoutMs = local ? 180_000 : 120_000;
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new Error(`Model request timed out after ${Math.round(timeoutMs / 1000)}s. No code was changed.`);
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model API ${response.status}: ${text.slice(0, 1000)}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Model API returned no message content.');
  const proposal = parseJsonContent(content);
  return local ? validateLocalWorkspaceProposal(proposal) : proposal;
}

export async function applyEdits(edits) {
  const root = process.cwd();
  const backups = [];
  for (const edit of edits) {
    const relative = safeRelativePath(edit.path);
    if (!relative) throw new Error(`Unsafe path rejected: ${edit.path}`);
    const target = path.join(root, relative);
    let previous = null;
    try { previous = await fs.readFile(target, 'utf8'); } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    backups.push({ path: relative, previous });

    let nextContent;
    if (typeof edit.content === 'string') {
      nextContent = edit.content;
    } else {
      if (previous === null) throw new Error(`Patch target does not exist: ${relative}`);
      const first = previous.indexOf(edit.find);
      if (first === -1) throw new Error(`Patch text not found in ${relative}.`);
      if (previous.indexOf(edit.find, first + edit.find.length) !== -1) {
        throw new Error(`Patch text is not unique in ${relative}; refusing ambiguous edit.`);
      }
      nextContent = `${previous.slice(0, first)}${edit.replace}${previous.slice(first + edit.find.length)}`;
    }

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, nextContent, 'utf8');
  }
  return backups;
}

export async function rollbackEdits(backups) {
  const root = process.cwd();
  for (const backup of [...backups].reverse()) {
    const target = path.join(root, backup.path);
    if (backup.previous === null) await fs.rm(target, { force: true });
    else await fs.writeFile(target, backup.previous, 'utf8');
  }
}
