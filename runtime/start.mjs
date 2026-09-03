import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    windowsHide: false,
    env: process.env,
  });
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[${label}] stopped with code ${code}`);
  });
  return child;
}

console.log('HARSF AUTOPILOT starting...');
start(process.execPath, ['runtime/api.mjs'], 'api');
start(process.execPath, ['runtime/worker.mjs'], 'worker');
start(npm, ['run', 'dev'], 'ui');

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
