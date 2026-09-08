import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const forbiddenTrackedPaths = ['.env', '.env.local'];
const forbiddenTrackedPrefixes = ['.harsf-memory/', '.harsf-runtime/'];

for (const path of tracked) {
  if (forbiddenTrackedPaths.includes(path) || forbiddenTrackedPrefixes.some((prefix) => path.startsWith(prefix))) {
    throw new Error(`Sensitive local path must not be tracked: ${path}`);
  }
}

const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['OpenAI/Anthropic-style key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
];

const textExtensions = /\.(?:js|mjs|cjs|ts|tsx|jsx|py|json|ya?ml|md|ps1|cmd|txt|example)$/i;
const findings = [];
for (const path of tracked) {
  if (!textExtensions.test(path) && !path.startsWith('.github/')) continue;
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text)) findings.push(`${path}: possible ${label}`);
  }
}

if (findings.length) {
  throw new Error(`Possible committed secrets detected:\n${findings.join('\n')}`);
}

console.log('Security self-test OK: no tracked local secret paths or strong secret patterns found');
