import type { Provider } from '../types';

export const providers: Provider[] = [
  { id: 'ollama', name: 'Ollama Local', models: ['Qwen2.5 Coder 3B'], status: 'adapter-ready', env: 'HARSF_MODEL_NAME' },
  { id: 'claude', name: 'Claude', models: ['Claude'], status: 'adapter-ready', env: 'ANTHROPIC_API_KEY' },
  { id: 'deepseek', name: 'DeepSeek', models: ['V4-Pro', 'V4-Flash'], status: 'adapter-ready', env: 'DEEPSEEK_API_KEY' },
  { id: 'grok', name: 'xAI Grok', models: ['Grok 4'], status: 'adapter-ready', env: 'XAI_API_KEY' },
  { id: 'alibaba', name: 'Alibaba Cloud', models: ['Qwen'], status: 'adapter-ready', env: 'ALIBABA_DASHSCOPE_API_KEY' },
  { id: 'zhipu', name: 'Zhipu AI', models: ['GLM'], status: 'adapter-ready', env: 'ZHIPU_API_KEY' },
  { id: 'moonshot', name: 'Moonshot AI', models: ['Kimi'], status: 'adapter-ready', env: 'MOONSHOT_API_KEY' },
  { id: 'minimax', name: 'MiniMax', models: ['MiniMax'], status: 'adapter-ready', env: 'MINIMAX_API_KEY' },
  { id: 'sakana', name: 'Sakana AI', models: ['Research models'], status: 'research-only' },
  { id: 'rakuten', name: 'Rakuten', models: ['Rakuten AI'], status: 'research-only' },
  { id: 'elyza', name: 'ELYZA / Matsuo Lab', models: ['ELYZA'], status: 'research-only' },
  { id: 'cyberagent', name: 'CyberAgent', models: ['OpenCALM'], status: 'research-only' },
  { id: 'naver', name: 'HyperCLOVA X', models: ['HyperCLOVA X'], status: 'adapter-ready', env: 'HYPERCLOVA_API_KEY' },
  { id: 'upstage', name: 'Solar / Upstage', models: ['Solar'], status: 'adapter-ready', env: 'UPSTAGE_API_KEY' },
  { id: 'varco', name: 'VARCO', models: ['VARCO LLM'], status: 'research-only' },
  { id: 'exaone', name: 'EXAONE', models: ['EXAONE'], status: 'research-only' },
];
