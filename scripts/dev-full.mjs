import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
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

start(process.execPath, ['server/local-executor.mjs'], 'EXECUTOR');
start(npmCommand, ['run', 'dev'], 'WEB');
