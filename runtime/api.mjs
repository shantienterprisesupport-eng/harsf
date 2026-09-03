import http from 'node:http';
import { enqueueTask, readQueue } from './queue.mjs';

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

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url || '/', `http://${host}:${port}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, service: 'harsf-runtime' });
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks') {
      return json(res, 200, { tasks: await readQueue() });
    }

    if (req.method === 'POST' && url.pathname === '/api/goals') {
      const body = await readBody(req);
      const goal = String(body.goal || '').trim();
      if (!goal) return json(res, 400, { error: 'goal is required' });
      const task = await enqueueTask({ type: 'goal', goal });
      return json(res, 202, { task });
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      const body = await readBody(req);
      const allowed = new Set(['test', 'build', 'qa']);
      if (!allowed.has(body.type)) return json(res, 400, { error: 'Only test, build, or qa tasks are allowed.' });
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
