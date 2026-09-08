import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const repoRoot = resolve(process.cwd());
const workflowFile = join(repoRoot, 'n8n', 'workflows', 'harsf-agent-intake.json');
const composeFile = join(repoRoot, 'n8n', 'docker-compose.yml');
const containerFile = '/tmp/harsf-agent-intake.json';
const expectedPackageName = 'harsf-autonomous-ai-company';

function assertRepoScope() {
  const packagePath = join(repoRoot, 'package.json');
  if (!existsSync(packagePath)) throw new Error('Run this command from the HARSF repository root.');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (pkg.name !== expectedPackageName) throw new Error('Workspace is not the HARSF repository.');
}

function validateWorkflow() {
  if (!existsSync(workflowFile)) throw new Error('HARSF n8n workflow file is missing.');
  const workflow = JSON.parse(readFileSync(workflowFile, 'utf8'));
  if (workflow.active !== false) throw new Error('Repository workflow must remain inactive before import.');
  const names = new Set((workflow.nodes ?? []).map((node) => node?.name));
  for (const required of ['Agent Intake', 'Safe Router', 'Return Routing Decision']) {
    if (!names.has(required)) throw new Error(`Required n8n node is missing: ${required}`);
  }
  return workflow;
}

function runDocker(args, label) {
  const executable = process.platform === 'win32' ? 'docker.exe' : 'docker';
  const result = spawnSync(executable, args, {
    cwd: repoRoot,
    shell: false,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed. Make sure Docker Desktop and the local n8n container are running.`);
  }
  return result.stdout.trim();
}

function selfTest() {
  assertRepoScope();
  const workflow = validateWorkflow();
  if (workflow.active !== false) throw new Error('Inactive workflow safety test failed.');
  console.log('n8n import self-test OK');
}

function main() {
  assertRepoScope();
  if (process.argv.includes('--self-test')) return selfTest();
  validateWorkflow();

  const running = runDocker(
    ['compose', '-f', composeFile, 'ps', '--status', 'running', '--services'],
    'n8n runtime check',
  );
  if (!running.split(/\r?\n/).includes('n8n')) throw new Error('n8n service is not running. Run npm run n8n:start first.');

  console.log('DOING: Copying the reviewed inactive HARSF workflow into the local n8n container.');
  runDocker(['compose', '-f', composeFile, 'cp', workflowFile, `n8n:${containerFile}`], 'Workflow copy');

  try {
    console.log('DOING: Importing the workflow into local n8n.');
    runDocker(
      ['compose', '-f', composeFile, 'exec', '-T', 'n8n', 'n8n', 'import:workflow', `--input=${containerFile}`],
      'Workflow import',
    );
  } finally {
    try {
      runDocker(['compose', '-f', composeFile, 'exec', '-T', 'n8n', 'rm', '-f', containerFile], 'Temporary file cleanup');
    } catch {
      // Cleanup failure should not hide the import result. The copied file contains no credentials.
    }
  }

  console.log('DONE: HARSF workflow imported into local n8n.');
  console.log('BLOCKED: It is intentionally not activated automatically.');
  console.log('NEXT: Review it in n8n, then activate it manually only when you want the local webhook available.');
}

try {
  main();
} catch (error) {
  console.error(`BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
