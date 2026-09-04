import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_SNAPSHOT_CHARS = 60_000;
const LOCAL_SNAPSHOT_CHARS = 14_000;
const MAX_EDITS = 10;
const MAX_FILE_CHARS = 80_000;
const MAX_PATCH_CHARS = 20_000;
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

  // Put the main UI files first so a tiny local model sees the most useful context.
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

export async function generateCodeEdits(goal, qaFeedback = '') {
  if (!modelConfigured()) throw new Error('MODEL_ADAPTER_REQUIRED');
  const endpoint = process.env.HARSF_MODEL_API_URL;
  const key = process.env.HARSF_MODEL_API_KEY;
  const model = process.env.HARSF_MODEL_NAME;
  const local = isLocalOllama(endpoint);
  const snapshot = await buildSnapshot(local ? LOCAL_SNAPSHOT_CHARS : MAX_SNAPSHOT_CHARS);

  const system = [
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
    temperature: 0.1,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  // Cloud adapters can use their structured-output controls. Tiny local Ollama models
  // are more reliable when given the simpler OpenAI-compatible payload.
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
  return parseJsonContent(content);
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
