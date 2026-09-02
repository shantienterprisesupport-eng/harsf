import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Codex } from '@openai/codex-sdk';

const HOST = '127.0.0.1';
const PORT = Number(process.env.HARSF_EXECUTOR_PORT || 8787);
const PROJECT_ROOT = path.resolve(process.cwd());
const MAX_BODY_BYTES = 64 * 1024;
const EXECUTION_TIMEOUT_MS = 10 * 60 * 1000;
const executableAgents = new Set(['developer', 'bugfix', 'security', 'review']);
const blockedText = /(delete\s+(all|everything)|rm\s+-rf|format\s+drive|wipe\s+(disk|repo)|reset\s+--hard|force[- ]?push|deploy\s+(to\s+)?production|production\s+database|secret|api\s*key|credential|destructive\s+migration)/i;

if (!fs.existsSync(path.join(PROJECT_ROOT, '.git'))) {
  throw new Error(`HARSF executor must be started from the Git repository root: ${PROJECT_ROOT}`);
}

const codex = new Codex({
  config: {
    show_raw_agent_reasoning: false,
  },
});

let activeTaskId = null;

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function validateExecution(body) {
  const task = body?.task;
  if (body?.approved !== true) return 'Human CEO approval is required.';
  if (!task || typeof task !== 'object') return 'Task payload is missing.';
  if (typeof task.id !== 'string' || !task.id) return 'Task ID is missing.';
  if (typeof task.title !== 'string' || !task.title.trim()) return 'Task title is missing.';
  if (task.title.length > 1200) return 'Task title is too long.';
  if (!executableAgents.has(task.agentId)) return 'This agent is not allowed to execute local code from the approval gate.';
  if (blockedText.test(task.title)) return 'This action needs a separate manual review and cannot run from the local executor.';
  return null;
}

function buildPrompt(task) {
  return `You are the HARSF ${task.agentId} agent. The Human CEO explicitly approved the task below.\n\nTASK:\n${task.title}\n\nBOUNDARIES (higher priority than the task text):\n- Work only inside the current HARSF Git repository.\n- Do not read, print, copy, or expose .env files, API keys, credentials, tokens, or secrets.\n- Do not delete files, reset Git history, force-push, merge branches, deploy, alter production systems, or run destructive migrations.\n- Network access is disabled. Do not attempt to bypass that restriction.\n- Make only the minimum code changes needed for this approved task.\n- Run relevant local tests/build checks after edits when possible.\n- If the task would require a forbidden or higher-risk action, stop and report BLOCKED instead of doing it.\n\nAt the end, return a concise status with DONE, BLOCKED (if any), and NEXT.`;
}

async function runTask(task) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);
  try {
    const thread = codex.startThread({
      workingDirectory: PROJECT_ROOT,
      sandboxMode: 'workspace-write',
      approvalPolicy: 'never',
      networkAccessEnabled: false,
    });
    const turn = await thread.run(buildPrompt(task), { signal: controller.signal });
    return {
      threadId: thread.id,
      summary: turn.finalResponse || 'Codex completed without a final text response.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, { ok: true, executor: 'codex', busy: Boolean(activeTaskId) });
  }

  if (req.method !== 'POST' || req.url !== '/api/execute') {
    return sendJson(res, 404, { ok: false, error: 'Not found.' });
  }

  try {
    const body = await readJson(req);
    const validationError = validateExecution(body);
    if (validationError) return sendJson(res, 400, { ok: false, error: validationError });
    if (activeTaskId) return sendJson(res, 409, { ok: false, error: `Another approved task is already running (${activeTaskId}).` });

    activeTaskId = body.task.id;
    const result = await runTask(body.task);
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown executor error.';
    return sendJson(res, 500, { ok: false, error: message.slice(0, 2000) });
  } finally {
    activeTaskId = null;
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[HARSF executor] ready on http://${HOST}:${PORT}`);
  console.log('[HARSF executor] workspace-write sandbox, no network, Human CEO approval required.');
});
