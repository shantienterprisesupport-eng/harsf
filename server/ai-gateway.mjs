import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

function loadLocalEnv() {
  const file = resolve(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

function normalizeHttpBaseUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

loadLocalEnv();

const repoRoot = resolve(process.cwd());
const appDraftRoot = resolve(repoRoot, '.harsf-runtime', 'app-drafts');
const port = Number(process.env.AI_GATEWAY_PORT || 8787);
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const deepSeekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const xaiModel = process.env.XAI_MODEL || 'grok-4.6';
const omniRouteBaseUrl = normalizeHttpBaseUrl(process.env.OMNIROUTE_BASE_URL || 'http://127.0.0.1:20128/v1');
const omniRouteModel = (process.env.OMNIROUTE_MODEL || '').trim();
const requestedProvider = (process.env.AI_PROVIDER || 'auto').toLowerCase();

const systemPrompt = `You are HARSF Master AI Assistant for a Human CEO.
Reply in the user's language (Hindi, Hinglish, Odia, or English) and adapt naturally to each message. Do not repeat a canned answer.
You are an app-builder and automation orchestrator, not only a planner. For app requests, turn the goal into concrete product, architecture, UI, implementation, QA, security, and code-review work. For automation requests, map integrations, workflow steps, tests, and failure handling.
Use the supplied conversation history and current HARSF workflow so follow-up questions stay contextual.
When useful, report DONE / DOING / BLOCKED / NEXT, but do not force those labels into every reply.
Never claim that you executed, changed, sent, paid, deployed, deleted, merged, published, connected, or tested anything unless the system actually performed that action and returned evidence.
Read-only inspection, planning, summarization, isolated app-draft creation, and safe analysis may proceed without approval.
Require explicit Human CEO approval before payments or purchases, credentials/secrets/API keys, tracked-repository code changes, database migrations, destructive actions, sending external messages, merging, publishing, or deployment.
If an integration is not connected, say exactly what is missing. Prefer concrete next work over generic advice and avoid unnecessary questions.`;

const protectedExecution = /(password|passcode|otp|api[ _-]?key|access[ _-]?token|secret|credential|payment|purchase|\bbuy\b|\bpay\b|delete|destroy|wipe|format|merge|deploy|production|database migration|db migration|send money)/i;
const appBuildIntent = /(app|website|web app|software|dashboard|portal)/i;
const createIntent = /(banao|bana do|banana|build|create|make|develop|ready karo|taiyar karo)/i;

function requestedProviderName() {
  if (requestedProvider === 'omni') return 'omniroute';
  if (requestedProvider === 'claude') return 'anthropic';
  if (requestedProvider === 'grok') return 'xai';
  return requestedProvider;
}

function isConfigured(provider) {
  if (provider === 'omniroute') return Boolean(omniRouteModel && omniRouteBaseUrl);
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  if (provider === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY);
  if (provider === 'xai') return Boolean(process.env.XAI_API_KEY);
  return false;
}

function providerModel(provider) {
  if (provider === 'omniroute') return omniRouteModel || null;
  if (provider === 'anthropic') return anthropicModel;
  if (provider === 'openai') return openAiModel;
  if (provider === 'deepseek') return deepSeekModel;
  if (provider === 'xai') return xaiModel;
  return null;
}

function providerCandidates() {
  const normalized = requestedProviderName();
  if (normalized !== 'auto') return isConfigured(normalized) ? [normalized] : [];
  return ['omniroute', 'anthropic', 'openai', 'deepseek', 'xai'].filter(isConfigured);
}

function missingCredential(provider) {
  if (provider === 'omniroute') return 'OMNIROUTE_MODEL and a valid OMNIROUTE_BASE_URL';
  if (provider === 'anthropic') return 'ANTHROPIC_API_KEY';
  if (provider === 'openai') return 'OPENAI_API_KEY';
  if (provider === 'deepseek') return 'DEEPSEEK_API_KEY';
  if (provider === 'xai') return 'XAI_API_KEY';
  return 'a configured OmniRoute route or one direct AI provider credential';
}

function json(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-12)
    .map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null,
      content: typeof item?.content === 'string' ? item.content.trim().slice(0, 5000) : '',
    }))
    .filter((item) => item.role && item.content);
}

function normalizePlan(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item) => ({
    title: typeof item?.title === 'string' ? item.title.slice(0, 240) : 'Task',
    agentId: typeof item?.agentId === 'string' ? item.agentId.slice(0, 80) : 'agent',
    risk: typeof item?.risk === 'string' ? item.risk.slice(0, 30) : 'unknown',
    status: typeof item?.status === 'string' ? item.status.slice(0, 30) : 'queued',
  }));
}

function buildConversation(message, history, plan) {
  const workflow = plan.length
    ? `\n\nCurrent HARSF workflow:\n${plan.map((task, index) => `${index + 1}. ${task.title} | agent=${task.agentId} | risk=${task.risk} | status=${task.status}`).join('\n')}`
    : '';
  return [...history, { role: 'user', content: `${message}${workflow}` }];
}

function listDraftFiles() {
  if (!existsSync(appDraftRoot)) return [];
  const files = [];
  const stack = [appDraftRoot];
  while (stack.length && files.length < 400) {
    const directory = stack.pop();
    for (const name of readdirSync(directory)) {
      const path = resolve(directory, name);
      let stats;
      try {
        stats = statSync(path);
      } catch {
        continue;
      }
      if (stats.isDirectory()) stack.push(path);
      else if (stats.isFile()) files.push(relative(appDraftRoot, path).replaceAll('\\', '/'));
    }
  }
  return files.sort();
}

function safeProcessOutput(text) {
  return String(text || '')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g, '[REDACTED]')
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{24,}/gi, 'Bearer [REDACTED]')
    .slice(-6000);
}

function runNpmScript(script, extraArgs = [], timeoutMs = 600_000) {
  return new Promise((resolvePromise) => {
    const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(executable, ['run', script, ...(extraArgs.length ? ['--', ...extraArgs] : [])], {
      cwd: repoRoot,
      shell: false,
      env: process.env,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    const append = (current, chunk) => `${current}${chunk}`.slice(-20_000);
    child.stdout?.on('data', (chunk) => { stdout = append(stdout, chunk.toString()); });
    child.stderr?.on('data', (chunk) => { stderr = append(stderr, chunk.toString()); });

    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      child.kill();
      finished = true;
      resolvePromise({ ok: false, code: null, timedOut: true, stdout, stderr: `${stderr}\nCommand timed out.` });
    }, timeoutMs);

    child.on('error', (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolvePromise({ ok: false, code: null, timedOut: false, stdout, stderr: `${stderr}\n${error.message}` });
    });

    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolvePromise({ ok: code === 0, code, timedOut: false, stdout, stderr });
    });
  });
}

async function buildAppDraft(goal) {
  if (!appBuildIntent.test(goal) || !createIntent.test(goal)) {
    return { status: 400, payload: { error: 'This endpoint accepts only clear new-app build requests.' } };
  }
  if (protectedExecution.test(goal)) {
    return { status: 409, payload: { error: 'Protected action detected. Human CEO approval is required before merge/deploy/secret/payment/destructive execution.' } };
  }
  if (!providerCandidates().length) {
    return { status: 503, payload: { error: 'App draft needs a connected model provider. Configure OmniRoute or one direct provider first.' } };
  }
  if (!existsSync(resolve(repoRoot, 'praison', 'app_builder_tools.py'))) {
    return { status: 503, payload: { error: 'HARSF app-draft tools are missing from this local checkout. Pull the latest main branch first.' } };
  }

  const before = new Set(listDraftFiles());
  const routed = await runNpmScript('ruflo:orchestrate', [goal], 300_000);
  if (!routed.ok) {
    return {
      status: routed.code === 2 ? 409 : 502,
      payload: {
        error: routed.code === 2 ? 'Ruflo stopped at the Human CEO approval gate.' : 'Ruflo could not prepare the app build handoff.',
        details: safeProcessOutput(`${routed.stdout}\n${routed.stderr}`),
      },
    };
  }

  const built = await runNpmScript('agents:run:handoff', [], 900_000);
  if (!built.ok) {
    return {
      status: 502,
      payload: {
        error: 'App agent handoff could not finish. Check the configured model/provider and PraisonAI setup.',
        details: safeProcessOutput(`${built.stdout}\n${built.stderr}`),
      },
    };
  }

  const after = listDraftFiles();
  const createdOrChanged = after.filter((path) => !before.has(path));
  return {
    status: 200,
    payload: {
      ok: true,
      status: 'DRAFT_READY',
      files: createdOrChanged.length ? createdOrChanged : after,
      details: safeProcessOutput(built.stdout),
      scope: '.harsf-runtime/app-drafts only',
    },
  };
}

async function callAnthropic(conversation) {
  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 1200,
      system: systemPrompt,
      messages: conversation,
    }),
  });
  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    console.error('Anthropic request failed:', apiResponse.status);
    throw new Error('provider-request-failed');
  }
  const text = Array.isArray(data.content)
    ? data.content.filter((item) => item?.type === 'text').map((item) => item.text).join('\n').trim()
    : '';
  return text || 'No response returned.';
}

async function callOpenAI(conversation) {
  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiModel,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        ...conversation.map((item) => ({ role: item.role, content: [{ type: 'input_text', text: item.content }] })),
      ],
      max_output_tokens: 1200,
    }),
  });
  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    console.error('OpenAI request failed:', apiResponse.status);
    throw new Error('provider-request-failed');
  }
  return data.output_text || 'No response returned.';
}

async function callOpenAICompatible({ url, apiKey, model, conversation, providerName }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const apiResponse = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversation,
      ],
    }),
  });
  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    console.error(`${providerName} request failed:`, apiResponse.status);
    throw new Error('provider-request-failed');
  }
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' && text.trim() ? text.trim() : 'No response returned.';
}

function callOmniRoute(conversation) {
  return callOpenAICompatible({
    url: `${omniRouteBaseUrl}/chat/completions`,
    apiKey: process.env.OMNIROUTE_API_KEY,
    model: omniRouteModel,
    conversation,
    providerName: 'OmniRoute',
  });
}

function callDeepSeek(conversation) {
  return callOpenAICompatible({
    url: 'https://api.deepseek.com/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: deepSeekModel,
    conversation,
    providerName: 'DeepSeek',
  });
}

function callXAI(conversation) {
  return callOpenAICompatible({
    url: 'https://api.x.ai/v1/chat/completions',
    apiKey: process.env.XAI_API_KEY,
    model: xaiModel,
    conversation,
    providerName: 'xAI',
  });
}

async function callProvider(provider, conversation) {
  if (provider === 'omniroute') return callOmniRoute(conversation);
  if (provider === 'anthropic') return callAnthropic(conversation);
  if (provider === 'openai') return callOpenAI(conversation);
  if (provider === 'deepseek') return callDeepSeek(conversation);
  if (provider === 'xai') return callXAI(conversation);
  throw new Error('provider-not-supported');
}

async function readJsonBody(request, response) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 80_000) {
      json(response, 413, { error: 'Message is too large.' });
      return null;
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    json(response, 400, { error: 'Invalid request.' });
    return null;
  }
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {});

  if (request.method === 'GET' && request.url === '/health') {
    const candidates = providerCandidates();
    const provider = candidates[0] || 'none';
    return json(response, 200, {
      ok: true,
      provider,
      model: providerModel(provider),
      configured: candidates.length > 0,
      providers: candidates,
      appDraftRunner: existsSync(resolve(repoRoot, 'praison', 'app_builder_tools.py')),
      ...(provider === 'omniroute' ? { router: 'OmniRoute', baseUrl: omniRouteBaseUrl } : {}),
    });
  }

  if (request.method !== 'POST' || !['/api/ceo-chat', '/api/app-draft'].includes(request.url)) {
    return json(response, 404, { error: 'Not found.' });
  }

  const body = await readJsonBody(request, response);
  if (!body) return;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return json(response, 400, { error: 'Message is required.' });
  if (message.length > 5000) return json(response, 413, { error: 'Message is too large.' });

  if (request.url === '/api/app-draft') {
    const result = await buildAppDraft(message);
    return json(response, result.status, result.payload);
  }

  const candidates = providerCandidates();
  if (!candidates.length) {
    const wanted = requestedProviderName();
    return json(response, 503, {
      error: wanted !== 'auto'
        ? `AI provider ${wanted} is not configured. ${missingCredential(wanted)} is required in .env.local.`
        : 'No model provider is connected. Configure OmniRoute or one direct provider in .env.local.',
    });
  }

  const history = normalizeHistory(body?.history);
  const plan = normalizePlan(body?.plan);
  const conversation = buildConversation(message, history, plan);
  const failures = [];

  for (const provider of candidates) {
    try {
      const text = await callProvider(provider, conversation);
      return json(response, 200, {
        text,
        provider,
        model: providerModel(provider),
        fallbackUsed: provider !== candidates[0],
      });
    } catch {
      failures.push(provider);
    }
  }

  return json(response, 502, {
    error: `Connected model provider request failed${failures.length > 1 ? ` for ${failures.join(', ')}` : ''}.`,
  });
}).listen(port, '127.0.0.1', () => {
  const candidates = providerCandidates();
  console.log(`HARSF Master AI gateway running at http://127.0.0.1:${port} using ${candidates.join(' -> ') || 'local planning only'}`);
});
