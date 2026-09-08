import assert from 'node:assert/strict';
import { isProviderConfigured, normalizeRequestedProvider, providerHealthSnapshot, selectActiveProvider } from './provider-policy.mjs';

const models = {
  omniroute: 'smart-route',
  anthropic: 'claude-test',
  openai: 'gpt-test',
  deepseek: 'deepseek-test',
  xai: 'grok-test',
  alibaba: 'qwen-test',
  zhipu: 'glm-test',
  moonshot: 'kimi-test',
  minimax: 'minimax-test',
  hyperclova: 'hcx-test',
  upstage: 'solar-test',
};
const baseUrls = {
  omniroute: 'http://127.0.0.1:20128/v1',
  alibaba: 'https://workspace.example.com/compatible-mode/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  moonshot: 'https://api.moonshot.cn/v1',
  minimax: 'https://api.minimax.io/v1',
  hyperclova: 'https://clovastudio.stream.ntruss.com/v1/openai',
  upstage: 'https://api.upstage.ai/v1',
};
const config = { models, baseUrls };

assert.equal(selectActiveProvider('auto', { OMNIROUTE_API_KEY: 'secret-omni', ANTHROPIC_API_KEY: 'secret-claude' }, config), 'omniroute');
assert.equal(selectActiveProvider('auto', { ANTHROPIC_API_KEY: 'secret-claude', OPENAI_API_KEY: 'secret-openai' }, config), 'anthropic');
assert.equal(selectActiveProvider('auto', { OPENAI_API_KEY: 'secret-openai', DEEPSEEK_API_KEY: 'secret-deep' }, config), 'openai');
assert.equal(selectActiveProvider('auto', { DEEPSEEK_API_KEY: 'secret-deep', XAI_API_KEY: 'secret-xai' }, config), 'deepseek');
assert.equal(selectActiveProvider('auto', { ALIBABA_DASHSCOPE_API_KEY: 'secret-qwen' }, config), 'alibaba');
assert.equal(selectActiveProvider('auto', { ZHIPU_API_KEY: 'secret-glm' }, config), 'zhipu');
assert.equal(selectActiveProvider('auto', { MOONSHOT_API_KEY: 'secret-kimi' }, config), 'moonshot');
assert.equal(selectActiveProvider('auto', { MINIMAX_API_KEY: 'secret-mini' }, config), 'minimax');
assert.equal(selectActiveProvider('auto', { HYPERCLOVA_API_KEY: 'secret-hcx' }, config), 'hyperclova');
assert.equal(selectActiveProvider('auto', { UPSTAGE_API_KEY: 'secret-solar' }, config), 'upstage');

assert.equal(normalizeRequestedProvider('qwen'), 'alibaba');
assert.equal(normalizeRequestedProvider('glm'), 'zhipu');
assert.equal(normalizeRequestedProvider('kimi'), 'moonshot');
assert.equal(normalizeRequestedProvider('naver'), 'hyperclova');
assert.equal(normalizeRequestedProvider('solar'), 'upstage');
assert.equal(normalizeRequestedProvider('grok'), 'xai');

assert.equal(isProviderConfigured('omniroute', { OMNIROUTE_API_KEY: 'secret-omni' }, { models: { omniroute: '' }, baseUrls }), false);
assert.equal(isProviderConfigured('alibaba', { ALIBABA_DASHSCOPE_API_KEY: 'secret-qwen' }, { models, baseUrls: { ...baseUrls, alibaba: null } }), false);

const env = {
  OPENAI_API_KEY: 'TOP_SECRET_VALUE',
  XAI_API_KEY: 'OTHER_SECRET_VALUE',
  MOONSHOT_API_KEY: 'KIMI_SECRET_VALUE',
  UPSTAGE_API_KEY: 'SOLAR_SECRET_VALUE',
};
const health = providerHealthSnapshot('openai', env, config, models);
assert.equal(health.find((item) => item.id === 'openai')?.active, true);
assert.equal(health.find((item) => item.id === 'grok')?.configured, true);
assert.equal(health.find((item) => item.id === 'moonshot')?.configured, true);
assert.equal(health.find((item) => item.id === 'upstage')?.configured, true);
const serialized = JSON.stringify(health);
for (const secret of Object.values(env)) assert.equal(serialized.includes(secret), false);

console.log('Provider routing policy self-test OK');
