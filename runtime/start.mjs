import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const children = new Map();
let stopping = false;

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return false;

  const text = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals <= 0) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

function windowsSafeCommand(command, args) {
  if (process.platform === 'win32' && command === 'npm') {
    const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    return { command: comspec, args: ['/d', '/s', '/c', `npm ${args.join(' ')}`] };
  }
  return { command, args };
}

function launch(rawCommand, rawArgs, label, { restart = false } = {}) {
  const { command, args } = windowsSafeCommand(rawCommand, rawArgs);
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    windowsHide: false,
    env: process.env,
  });

  children.set(label, child);
  console.log(`[HARSF] ${label} started (pid ${child.pid ?? 'unknown'})`);

  child.on('error', (error) => console.error(`[${label}] failed to start: ${error.message}`));
  child.on('exit', (code, signal) => {
    children.delete(label);
    if (stopping) return;
    console.error(`[${label}] stopped (code ${code ?? 'null'}, signal ${signal ?? 'none'})`);
    if (restart) {
      console.log(`[HARSF] restarting ${label} in 1 second...`);
      setTimeout(() => {
        if (!stopping) launch(rawCommand, rawArgs, label, { restart: true });
      }, 1000);
    }
  });

  return child;
}

const envLoaded = loadEnvFile();
console.log(`HARSF AUTOPILOT starting... | local config: ${envLoaded ? 'loaded' : 'not found'}`);
if (!envLoaded) console.log('Run SETUP-HARSF.cmd once to configure the local model connection.');

// API and worker are supervised. If either crashes, HARSF brings it back automatically
// instead of silently leaving the browser UI running without a backend.
launch(process.execPath, ['runtime/api.mjs'], 'api', { restart: true });
launch(process.execPath, ['runtime/worker.mjs'], 'worker', { restart: true });
launch('npm', ['run', 'dev'], 'ui');

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children.values()) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(0), 200);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
