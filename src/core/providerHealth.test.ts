import { describe, expect, it } from 'vitest';
import { providerRuntimeLabel, providerRuntimeState } from './providerHealth';
import type { Provider } from '../types';

const openai: Provider = { id: 'openai', name: 'OpenAI', models: ['GPT'], status: 'adapter-ready', env: 'OPENAI_API_KEY' };
const alibaba: Provider = { id: 'alibaba', name: 'Alibaba', models: ['Qwen'], status: 'adapter-ready', env: 'ALIBABA_DASHSCOPE_API_KEY' };
const sakana: Provider = { id: 'sakana', name: 'Sakana', models: ['Research'], status: 'research-only' };

describe('provider runtime health mapping', () => {
  it('marks the configured active provider as active', () => {
    expect(providerRuntimeState(openai, [{ id: 'openai', configured: true, active: true, model: 'gpt-test' }])).toBe('active');
  });

  it('marks a configured but inactive live provider as connected', () => {
    expect(providerRuntimeState(openai, [{ id: 'openai', configured: true, active: false, model: 'gpt-test' }])).toBe('connected');
  });

  it('does not pretend an unconfigured live provider is connected', () => {
    expect(providerRuntimeState(openai, [{ id: 'openai', configured: false, active: false, model: 'gpt-test' }])).toBe('not-configured');
  });

  it('treats newly live Alibaba/Qwen as not configured until runtime config exists', () => {
    expect(providerRuntimeState(alibaba, [])).toBe('not-configured');
    expect(providerRuntimeState(alibaba, [{ id: 'alibaba', configured: true, active: false, model: 'qwen-test' }])).toBe('connected');
  });

  it('keeps research-only providers visibly research-only', () => {
    const state = providerRuntimeState(sakana, []);
    expect(state).toBe('research');
    expect(providerRuntimeLabel(state)).toBe('RESEARCH');
  });
});
