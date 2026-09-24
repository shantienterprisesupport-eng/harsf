import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const children = [];
let stopping = false;

function start(label, args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`[${label}] exited (${signal || code ?? 'unknown'}). Stopping HARSF browser mode.`);
    shutdown(code ?? 1);
  });
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 50);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('AI gateway', [resolve('server', 'ai-gateway.mjs')]);
start('Vite', [resolve('node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0', '--port', '5173']);
