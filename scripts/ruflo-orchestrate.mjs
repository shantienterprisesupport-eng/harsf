import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import process from 'node:process';

const repoRoot = resolve(process.cwd());
const runtimeDir = join(repoRoot, '.harsf-runtime');
const handoffFile = join(runtimeDir, 'ruflo-handoff.json');
const expectedPackageName = 'harsf-autonomous-ai-company';

const approvalRules = [
  ['merge', /\bmerge\b/i],
  ['deployment', /\bdeploy(?:ment)?\b|\bproduction\b/i],
  ['credentials/secrets', /\bpassword\b|\bpasscode\b|\botp\b|\bapi[ _-]?key\b|\baccess[ _-]?token\b|\bsecret\b/i],
  ['payment/purchase', /\bpayment\b|\bpurchase\b|\bbuy\b|\bpay\b/i],
  ['destructive action', /\bdelete\b|\bdestroy\b|\bwipe\b|\bformat\b/i],
  ['database migration', /\bdatabase migration\b|\bdb migration\b|\bmigrate production\b/i],
];

function assertRepoScope() {
  const packagePath = join(repoRoot, 'package.json');
  if (!existsSync(packagePath)) throw new Error('Run this command from the HARSF repository root.');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (pkg.name !== expectedPackageName) throw new Error('Workspace is not the HARSF repository.');
}

function approvalReasons(goal) {
  return approvalRules.filter(([, pattern]) => pattern.test(goal)).map(([label]) => label);
}

function writeHandoff(payload) {
  mkdirSync(runtimeDir, { recursive: true });
  writeFileSync(handoffFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runRuflo(label, args) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(executable, ['--yes', 'ruflo@latest', ...args], {
    cwd: repoRoot,
    shell: false,
    encoding: 'utf8',
    timeout: 120_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) return { label, ok: false, code: null, reason: result.error.code || 'spawn-error' };
  return { label, ok: result.status === 0, code: result.status, reason: result.status === 0 ? null : 'ruflo-command-failed' };
}

async function readGoal(argv) {
  if (argv.length) return argv.join(' ').trim();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question('Human CEO goal: ')).trim();
  } finally {
    rl.close();
  }
}

function selfTest() {
  assertRepoScope();
  if (approvalReasons('review the UI and plan tests').length !== 0) throw new Error('Safe-goal test failed.');
  if (!approvalReasons('deploy to production').includes('deployment')) throw new Error('Deployment gate test failed.');
  if (!approvalReasons('use API key and merge it').includes('credentials/secrets')) throw new Error('Secret gate test failed.');
  console.log('Ruflo orchestration self-test OK');
}

async function main() {
  assertRepoScope();
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }

  const goal = await readGoal(process.argv.slice(2));
  if (!goal) throw new Error('A Human CEO goal is required.');
  if (goal.length > 2000) throw new Error('Goal is too long; keep it under 2000 characters.');

  const reasons = approvalReasons(goal);
  if (reasons.length) {
    const payload = {
      created_at: new Date().toISOString(),
      scope: 'HARSF repository only',
      goal,
      status: 'BLOCKED',
      approval_gate: { required: true, reasons },
      ruflo: { executed: false },
      next: 'Get explicit Human CEO approval for the sensitive action, then submit a planning-only goal without secrets or irreversible instructions.',
    };
    writeHandoff(payload);
    console.log('BLOCKED: Human CEO approval is required before sensitive execution.');
    console.log(`Reasons: ${reasons.join(', ')}`);
    console.log('NEXT: Rephrase as a planning/review task or approve the sensitive action separately.');
    process.exitCode = 2;
    return;
  }

  console.log('DOING: Ruflo is coordinating the HARSF goal.');
  const steps = [
    runRuflo('swarm-init', ['swarm', 'init', '--topology', 'hierarchical', '--max-agents', '6']),
    runRuflo('route-goal', ['hooks', 'route', '--task', goal]),
    runRuflo('task-orchestrate', ['task', 'orchestrate', '--task', goal, '--strategy', 'specialized']),
  ];

  const failed = steps.filter((step) => !step.ok);
  const payload = {
    created_at: new Date().toISOString(),
    scope: 'HARSF repository only',
    goal,
    status: failed.length ? 'BLOCKED' : 'READY_FOR_PRAISON_HANDOFF',
    approval_gate: { required: false, reasons: [] },
    ruflo: {
      executed: true,
      steps: steps.map(({ label, ok, code, reason }) => ({ label, status: ok ? 'DONE' : 'BLOCKED', code, reason })),
    },
    praison: {
      automatic_model_call: false,
      next_command: failed.length ? null : 'npm run agents:run:handoff',
    },
  };
  writeHandoff(payload);

  if (failed.length) {
    console.log(`BLOCKED: ${failed.map((step) => step.label).join(', ')} failed. No PraisonAI model call was started.`);
    console.log('NEXT: Run npm run ruflo:doctor, fix the local Ruflo setup, then retry.');
    process.exitCode = 1;
    return;
  }

  console.log('DONE: Ruflo swarm, routing and task orchestration completed.');
  console.log('DONE: Safe handoff saved locally under .harsf-runtime (not committed to Git).');
  console.log('NEXT: Run npm run agents:run:handoff only when you want PraisonAI to call your configured model.');
}

main().catch((error) => {
  console.error(`BLOCKED: ${error.message}`);
  process.exitCode = 1;
});
