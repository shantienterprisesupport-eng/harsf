import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

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

const envLoaded = loadEnvFile();
console.log(`HARSF AUTOPILOT starting... | local config: ${envLoaded ? 'loaded' : 'not found'}`);
if (!envLoaded) console.log('Run SETUP-HARSF.cmd once to configure the local model connection.');
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
