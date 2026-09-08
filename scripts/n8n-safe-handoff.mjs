import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const repoRoot = resolve(process.cwd());
const handoffFile = join(repoRoot, '.harsf-runtime', 'ruflo-handoff.json');
const expectedPackageName = 'harsf-autonomous-ai-company';
const defaultWebhookUrl = 'http://127.0.0.1:5678/webhook/harsf-agent';
const defaultHealthUrl = 'http://127.0.0.1:5678/healthz';

const approvalRules = [
  ['code/files mutation', /\b(?:edit|modify|rewrite|change|write|patch|fix)\b.{0,40}\b(?:code|file|repo|repository|source)\b|\b(?:code|file|repo|repository|source)\b.{0,40}\b(?:edit|modify|rewrite|change|write|patch|fix)\b/i],
  ['merge/publish', /\bmerge\b|\bpublish\b|\brelease\b/i],
  ['deployment/production', /\bdeploy(?:ment)?\b|\bproduction\b/i],
  ['credentials/secrets', /\bpassword\b|\bpasscode\b|\botp\b|\bapi[ _-]?key\b|\baccess[ _-]?token\b|\bsecret\b|\bcredential\b/i],
  ['payment/purchase', /\bpayment\b|\bpurchase\b|\bbuy\b|\bpay\b|\brefund\b/i],
  ['destructive action', /\bdelete\b|\bdestroy\b|\bwipe\b|\bformat\b|\btruncate\b|\bdrop table\b/i],
  ['database migration', /\bdatabase migration\b|\bdb migration\b|\bmigrate production\b/i],
  ['external message', /\bsend\b.{0,20}\b(?:email|message|whatsapp|sms|notification)\b/i],
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

function isLoopbackUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host) && ['http:', 'https:'].includes(parsed.protocol);
}

function readGoalFromRuflo() {
  if (!existsSync(handoffFile)) throw new Error('Ruflo handoff not found. Run npm run ruflo:orchestrate first.');
  const payload = JSON.parse(readFileSync(handoffFile, 'utf8'));
  if (payload?.status !== 'READY_FOR_PRAISON_HANDOFF') {
    throw new Error('Ruflo handoff is not in a ready state. Resolve its BLOCKED status first.');
  }
  if (payload?.approval_gate?.required) throw new Error('Ruflo handoff still requires Human CEO approval.');
  const goal = String(payload?.goal ?? '').trim();
  if (!goal) throw new Error('Ruflo handoff contains no goal.');
  return goal;
}

function cleanResponse(data) {
  if (!data || typeof data !== 'object') return { ok: true, status: 'DONE', next: 'n8n returned a response.' };
  return {
    ok: Boolean(data.ok),
    status: String(data.status ?? 'DONE').slice(0, 80),
    assignedAgent: data.assignedAgent ? String(data.assignedAgent).slice(0, 120) : null,
    humanApprovalRequired: Boolean(data.humanApprovalRequired),
    next: data.next ? String(data.next).slice(0, 500) : null,
  };
}

function selfTest() {
  assertRepoScope();
  if (approvalReasons('review the n8n workflow and plan tests').length) throw new Error('Safe-goal test failed.');
  if (!approvalReasons('merge and deploy to production').includes('merge/publish')) throw new Error('Merge gate test failed.');
  if (!approvalReasons('use this API key').includes('credentials/secrets')) throw new Error('Secret gate test failed.');
  if (!approvalReasons('edit the code file').includes('code/files mutation')) throw new Error('Code mutation gate test failed.');
  if (!isLoopbackUrl(defaultWebhookUrl)) throw new Error('Loopback URL test failed.');
  if (isLoopbackUrl('https://example.com/webhook/harsf-agent')) throw new Error('Remote URL gate test failed.');
  console.log('n8n safe handoff self-test OK');
}

async function main() {
  assertRepoScope();
  if (process.argv.includes('--self-test')) return selfTest();

  const fromRuflo = process.argv.includes('--from-ruflo');
  const args = process.argv.slice(2).filter((arg) => arg !== '--from-ruflo');
  const goal = fromRuflo ? readGoalFromRuflo() : args.join(' ').trim();
  if (!goal) throw new Error('Provide a planning/read-only goal, or use --from-ruflo.');
  if (goal.length > 2000) throw new Error('Goal is too long; keep it under 2000 characters.');

  const reasons = approvalReasons(goal);
  if (reasons.length) {
    console.log(JSON.stringify({
      ok: false,
      status: 'BLOCKED',
      humanApprovalRequired: true,
      reasons,
      next: 'Get explicit Human CEO approval, then submit a planning/read-only handoff without secrets or irreversible instructions.',
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const webhookUrl = process.env.N8N_HARSF_WEBHOOK_URL || defaultWebhookUrl;
  const healthUrl = process.env.N8N_HEALTH_URL || defaultHealthUrl;
  if (!isLoopbackUrl(webhookUrl) || !isLoopbackUrl(healthUrl)) {
    throw new Error('This phase only permits loopback n8n URLs (localhost/127.0.0.1/::1).');
  }

  let healthResponse;
  try {
    healthResponse = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
  } catch {
    throw new Error('Local n8n is not reachable. Run npm run n8n:start, then npm run n8n:status.');
  }
  if (!healthResponse.ok) throw new Error(`Local n8n health check failed with HTTP ${healthResponse.status}.`);

  let response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        source: fromRuflo ? 'ruflo-safe-handoff' : 'human-ceo-safe-handoff',
        scope: 'HARSF repository only',
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('n8n webhook could not be reached. Import/review/activate the HARSF workflow first.');
  }

  if (!response.ok) {
    if (response.status === 404) throw new Error('HARSF n8n webhook is not active. Import/review the workflow and activate it in n8n.');
    throw new Error(`n8n webhook returned HTTP ${response.status}.`);
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = { ok: true, status: 'DONE', next: 'Webhook responded without JSON.' };
  }
  console.log(JSON.stringify(cleanResponse(data), null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, status: 'BLOCKED', error: error.message }, null, 2));
  process.exitCode = 1;
});
