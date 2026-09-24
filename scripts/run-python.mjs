import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/run-python.mjs <script.py> [args...]');
  process.exit(2);
}

const venvPython = process.platform === 'win32'
  ? resolve('.venv', 'Scripts', 'python.exe')
  : resolve('.venv', 'bin', 'python');

const candidates = [
  ...(existsSync(venvPython) ? [venvPython] : []),
  ...(process.platform === 'win32' ? ['python.exe', 'python'] : ['python3', 'python']),
];

let python = null;
for (const candidate of candidates) {
  const probe = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
  if (!probe.error && probe.status === 0) {
    python = candidate;
    break;
  }
}

if (!python) {
  console.error('Python was not found. Create .venv or install Python first.');
  process.exit(1);
}

const result = spawnSync(python, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
