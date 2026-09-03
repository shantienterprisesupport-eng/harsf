import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_SNAPSHOT_CHARS = 60_000;
const MAX_EDITS = 10;
const MAX_FILE_CHARS = 80_000;
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

async function buildSnapshot() {
  const root = process.cwd();
  const files = [];
  await walk(path.join(root, 'src'), root, files);
  let used = 0;
  const parts = [];
  for (const relative of files.sort()) {
    const text = await fs.readFile(path.join(root, relative), 'utf8');
    const chunk = `\n--- FILE: ${relative} ---\n${text}\n`;
    if (used + chunk.length > MAX_SNAPSHOT_CHARS) break;
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
    const contentValue = typeof edit.content === 'string' ? edit.content : null;
    if (!filePath || contentValue === null) throw new Error('Unsafe or invalid model edit rejected.');
    if (contentValue.length > MAX_FILE_CHARS) throw new Error(`Edit too large: ${filePath}`);
    return { path: filePath, content: contentValue };
  });
  return { summary: String(parsed.summary || 'Model prepared code edits.'), edits };
}

export async function generateCodeEdits(goal, qaFeedback = '') {
  if (!modelConfigured()) throw new Error('MODEL_ADAPTER_REQUIRED');
  const snapshot = await buildSnapshot();
  const endpoint = process.env.HARSF_MODEL_API_URL;
  const key = process.env.HARSF_MODEL_API_KEY;
  const model = process.env.HARSF_MODEL_NAME;

  const system = [
    'You are the HARSF Developer Agent working on a React/TypeScript repository.',
    'Return JSON only with shape: {"summary":"...","edits":[{"path":"src/...","content":"complete file content"}]}.',
    'Only edit files under src/. Never request shell commands, secrets, deployment, git operations, package installation, or destructive actions.',
    'Keep edits minimal and ensure TypeScript/build/tests should pass.',
  ].join(' ');
  const user = `GOAL:\n${goal}\n\n${qaFeedback ? `PREVIOUS QA FAILURE:\n${qaFeedback.slice(-8000)}\n\n` : ''}CURRENT REPOSITORY SNAPSHOT:${snapshot}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

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
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, edit.content, 'utf8');
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
