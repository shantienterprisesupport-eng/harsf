import assert from 'node:assert/strict';
import { isProviderConfigured, providerHealthSnapshot, selectActiveProvider } from './provider-policy.mjs';

const models = {
  omniroute: 'smart-route',
  anthropic: 'claude-test',
  openai: 'gpt-test',
  deepseek: 'deepseek-test',
  xai: 'grok-test',
};
const omniConfig = { omniRouteModel: 'smart-route', omniRouteBaseUrl: 'http://127.0.0.1:20128/v1' };

assert.equal(selectActiveProvider('auto', { OMNIROUTE_API_KEY: 'secret-omni', ANTHROPIC_API_KEY: 'secret-claude' }, omniConfig), 'omniroute');
assert.equal(selectActiveProvider('auto', { ANTHROPIC_API_KEY: 'secret-claude', OPENAI_API_KEY: 'secret-openai' }, {}), 'anthropic');
assert.equal(selectActiveProvider('auto', { OPENAI_API_KEY: 'secret-openai', DEEPSEEK_API_KEY: 'secret-deep' }, {}), 'openai');
assert.equal(selectActiveProvider('auto', { DEEPSEEK_API_KEY: 'secret-deep', XAI_API_KEY: 'secret-xai' }, {}), 'deepseek');
assert.equal(selectActiveProvider('grok', {}, {}), 'xai');
assert.equal(isProviderConfigured('omniroute', { OMNIROUTE_API_KEY: 'secret-omni' }, { omniRouteModel: '', omniRouteBaseUrl: 'http://127.0.0.1:20128/v1' }), false);

const env = { OPENAI_API_KEY: 'TOP_SECRET_VALUE', XAI_API_KEY: 'OTHER_SECRET_VALUE' };
const health = providerHealthSnapshot('openai', env, {}, models);
assert.equal(health.find((item) => item.id === 'openai')?.active, true);
assert.equal(health.find((item) => item.id === 'grok')?.configured, true);
const serialized = JSON.stringify(health);
assert.equal(serialized.includes('TOP_SECRET_VALUE'), false);
assert.equal(serialized.includes('OTHER_SECRET_VALUE'), false);

console.log('Provider routing policy self-test OK');
