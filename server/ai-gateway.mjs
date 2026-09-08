import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadLocalEnv() {
  const file = resolve(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

loadLocalEnv();

const port = Number(process.env.AI_GATEWAY_PORT || 8787);
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const requestedProvider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
const systemPrompt = `You are the HARSF Master AI Assistant for a Human CEO.
Reply in the user's language (Hindi, Hinglish, Odia, or English), using simple concise wording.
Your job is to understand goals, coordinate HARSF/L GenZ/n8n and connected tools, break work into safe next steps, and report progress using DONE / DOING / BLOCKED / NEXT when useful.
Never claim that you executed, changed, sent, paid, deployed, deleted, merged, published, or connected anything unless the system actually performed that action and returned evidence.
Read-only inspection, planning, summarization, and local test suggestions may proceed without approval.
Require explicit Human CEO approval before payments or purchases, API keys/credentials/secrets, code or bug-fix changes, database migrations, destructive actions, sending external messages, merging, publishing, or deployment.
If an integration is not connected, say exactly what is missing instead of pretending it is available.
Prefer the smallest safe next action and avoid unnecessary questions when a reasonable plan can be made.`;

function activeProvider() {
  if (requestedProvider === 'anthropic' || requestedProvider === 'claude') return 'anthropic';
  if (requestedProvider === 'openai') return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}

function isConfigured(provider) {
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

function json(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

async function callAnthropic(message) {
  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
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

async function callOpenAI(message) {
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
        { role: 'user', content: [{ type: 'input_text', text: message }] },
      ],
      max_output_tokens: 800,
    }),
  });
  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    console.error('OpenAI request failed:', apiResponse.status);
    throw new Error('provider-request-failed');
  }
  return data.output_text || 'No response returned.';
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {});
  if (request.method === 'GET' && request.url === '/health') {
    const provider = activeProvider();
    const model = provider === 'anthropic' ? anthropicModel : provider === 'openai' ? openAiModel : null;
    return json(response, 200, { ok: true, provider, model, configured: isConfigured(provider) });
  }
  if (request.method !== 'POST' || request.url !== '/api/ceo-chat') {
    return json(response, 404, { error: 'Not found.' });
  }

  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 20000) return json(response, 413, { error: 'Message is too large.' });
  }

  let message = '';
  try {
    ({ message } = JSON.parse(raw));
  } catch {
    return json(response, 400, { error: 'Invalid request.' });
  }
  if (typeof message !== 'string' || !message.trim()) return json(response, 400, { error: 'Message is required.' });

  const provider = activeProvider();
  if (!isConfigured(provider)) {
    const missing = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY or OPENAI_API_KEY';
    return json(response, 503, { error: `AI provider is not configured. ${missing} is required in .env.local.` });
  }

  try {
    const text = provider === 'anthropic'
      ? await callAnthropic(message.trim())
      : await callOpenAI(message.trim());
    return json(response, 200, { text, provider });
  } catch {
    return json(response, 502, { error: 'AI provider could not be reached or rejected the request.' });
  }
}).listen(port, '127.0.0.1', () => {
  const provider = activeProvider();
  console.log(`HARSF Master AI gateway running at http://127.0.0.1:${port} using ${provider}`);
});
