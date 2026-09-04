import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { enqueueTask, readQueue } from './queue.mjs';

const execFileAsync = promisify(execFile);
const host = '127.0.0.1';
const port = Number(process.env.HARSF_API_PORT || 8787);

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': 'http://localhost:5173',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 100_000) throw new Error('Request too large');
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function repositoryStatus() {
  const cwd = process.cwd();
  const [branchResult, statusResult, entries] = await Promise.all([
    execFileAsync('git', ['branch', '--show-current'], { cwd, windowsHide: true }).catch(() => ({ stdout: 'unknown' })),
    execFileAsync('git', ['status', '--short'], { cwd, windowsHide: true }).catch(() => ({ stdout: '' })),
    fs.readdir(cwd, { withFileTypes: true }),
  ]);

  const visibleEntries = entries
    .filter((entry) => !['node_modules', 'dist', '.git', '.harsf-runtime'].includes(entry.name))
    .map((entry) => entry.name)
    .sort()
    .slice(0, 20);

  const changed = String(statusResult.stdout || '').trim();
  return {
    ok: true,
    branch: String(branchResult.stdout || 'unknown').trim() || 'unknown',
    clean: changed.length === 0,
    changes: changed ? changed.split(/\r?\n/).slice(0, 30) : [],
    rootEntries: visibleEntries,
    cwd: path.basename(cwd),
  };
}

async function latestSelfTest() {
  const tasks = await readQueue();
  const task = [...tasks].reverse().find((item) => item.type === 'selftest');
  if (!task) return null;
  return {
    id: task.id,
    status: task.status,
    phase: task.phase || null,
    result: task.result || null,
    updatedAt: task.updatedAt || null,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url || '/', `http://${host}:${port}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, service: 'harsf-runtime', selfTest: await latestSelfTest() });
    }

    if (req.method === 'GET' && url.pathname === '/api/repository-status') {
      return json(res, 200, await repositoryStatus());
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks') {
      return json(res, 200, { tasks: await readQueue() });
    }

    if (req.method === 'POST' && url.pathname === '/api/goals') {
      const body = await readBody(req);
      const goal = String(body.goal || '').trim();
      if (!goal) return json(res, 400, { error: 'goal is required' });
      if (/^autopilot\s+test$/i.test(goal)) {
        const task = await enqueueTask({ type: 'selftest', source: 'manual' });
        return json(res, 202, { task });
      }
      const task = await enqueueTask({ type: 'goal', goal });
      return json(res, 202, { task });
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      const body = await readBody(req);
      const allowed = new Set(['test', 'build', 'qa', 'selftest']);
      if (!allowed.has(body.type)) return json(res, 400, { error: 'Only test, build, qa, or selftest tasks are allowed.' });
      const task = await enqueueTask({ type: body.type });
      return json(res, 202, { task });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    return json(res, 500, { error: String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`[HARSF API] http://${host}:${port}`);
});
