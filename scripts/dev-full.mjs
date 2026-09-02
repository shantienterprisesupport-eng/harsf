import { spawn } from 'node:child_process';
import path from 'node:path';

const children = [];
const root = process.cwd();

function startNode(scriptPath, label) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('error', (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
  });

  child.on('exit', (code, signal) => {
    if (code && code !== 0) console.error(`[${label}] exited with code ${code}`);
    if (signal) console.error(`[${label}] exited with signal ${signal}`);
  });

  children.push(child);
  return child;
}

function shutdown() {
  for (const child of children) {
    try { child.kill(); } catch { /* already stopped */ }
  }
}

process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
process.on('exit', shutdown);

startNode(path.join(root, 'server', 'local-executor.mjs'), 'EXECUTOR');
startNode(path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'WEB');
