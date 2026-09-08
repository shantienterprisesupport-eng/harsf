import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isProviderConfigured,
  missingCredential,
  modelForProvider,
  providerHealthSnapshot,
  selectActiveProvider,
} from './provider-policy.mjs';

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

const port = Number(process.env.AI_GATEWAY_PORT || 8787);
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const deepSeekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const xaiModel = process.env.XAI_MODEL || 'grok-4.6';
const omniRouteBaseUrl = normalizeHttpBaseUrl(process.env.OMNIROUTE_BASE_URL || 'http://127.0.0.1:20128/v1');
const omniRouteModel = (process.env.OMNIROUTE_MODEL || '').trim();
const requestedProvider = process.env.AI_PROVIDER || 'auto';
const providerConfig = { omniRouteModel, omniRouteBaseUrl };
const providerModels = {
  omniroute: omniRouteModel,
  anthropic: anthropicModel,
  openai: openAiModel,
  deepseek: deepSeekModel,
  xai: xaiModel,
};
const systemPrompt = `You are the HARSF Master AI Assistant for a Human CEO.
Reply in the user's language (Hindi, Hinglish, Odia, or English), using simple concise wording.
Your job is to understand goals, coordinate HARSF/L GenZ/n8n and connected tools, break work into safe next steps, and report progress using DONE / DOING / BLOCKED / NEXT when useful.
Never claim that you executed, changed, sent, paid, deployed, deleted, merged, published, or connected anything unless the system actually performed that action and returned evidence.
Read-only inspection, planning, summarization, and local test suggestions may proceed without approval.
Require explicit Human CEO approval before payments or purchases, API keys/credentials/secrets, code or bug-fix changes, database migrations, destructive actions, sending external messages, merging, publishing, or deployment.
If an integration is not connected, say exactly what is missing instead of pretending it is available.
Prefer the smallest safe next action and avoid unnecessary questions when a reasonable plan can be made.`;

function activeProvider() {
  return selectActiveProvider(requestedProvider, process.env, providerConfig);
}

function isConfigured(provider) {
  return isProviderConfigured(provider, process.env, providerConfig);
}

function providerModel(provider) {
  return modelForProvider(provider, providerModels);
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

async function callOpenAICompatible({ url, apiKey, model, message, providerName }) {
  const apiResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
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

function callOmniRoute(message) {
  return callOpenAICompatible({
    url: `${omniRouteBaseUrl}/chat/completions`,
    apiKey: process.env.OMNIROUTE_API_KEY,
    model: omniRouteModel,
    message,
    providerName: 'OmniRoute',
  });
}

function callDeepSeek(message) {
  return callOpenAICompatible({
    url: 'https://api.deepseek.com/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: deepSeekModel,
    message,
    providerName: 'DeepSeek',
  });
}

function callXAI(message) {
  return callOpenAICompatible({
    url: 'https://api.x.ai/v1/chat/completions',
    apiKey: process.env.XAI_API_KEY,
    model: xaiModel,
    message,
    providerName: 'xAI',
  });
}

async function callProvider(provider, message) {
  if (provider === 'omniroute') return callOmniRoute(message);
  if (provider === 'anthropic') return callAnthropic(message);
  if (provider === 'openai') return callOpenAI(message);
  if (provider === 'deepseek') return callDeepSeek(message);
  if (provider === 'xai') return callXAI(message);
  throw new Error('provider-not-supported');
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {});
  if (request.method === 'GET' && request.url === '/health') {
    const provider = activeProvider();
    return json(response, 200, {
      ok: true,
      provider,
      model: providerModel(provider),
      configured: isConfigured(provider),
      providers: providerHealthSnapshot(provider, process.env, providerConfig, providerModels),
      ...(provider === 'omniroute' ? { router: 'OmniRoute', baseUrl: omniRouteBaseUrl } : {}),
    });
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
    return json(response, 503, {
      error: `AI provider is not configured. ${missingCredential(provider)} is required in .env.local.`,
    });
  }

  try {
    const text = await callProvider(provider, message.trim());
    return json(response, 200, { text, provider, model: providerModel(provider) });
  } catch {
    return json(response, 502, { error: 'AI provider could not be reached or rejected the request.' });
  }
}).listen(port, '127.0.0.1', () => {
  const provider = activeProvider();
  console.log(`HARSF Master AI gateway running at http://127.0.0.1:${port} using ${provider}`);
});
