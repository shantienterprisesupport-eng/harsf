import type { Provider } from '../types';

export const providers: Provider[] = [
  { id: 'omniroute', name: 'OmniRoute Smart Router', models: ['Configured route / combo / model'], status: 'adapter-ready', env: 'OMNIROUTE_API_KEY' },
  { id: 'openai', name: 'OpenAI / ChatGPT', models: ['Codex', 'GPT'], status: 'adapter-ready', env: 'OPENAI_API_KEY' },
  { id: 'claude', name: 'Claude', models: ['Claude Sonnet 5'], status: 'adapter-ready', env: 'ANTHROPIC_API_KEY' },
  { id: 'deepseek', name: 'DeepSeek', models: ['V4-Pro', 'V4-Flash'], status: 'adapter-ready', env: 'DEEPSEEK_API_KEY' },
  { id: 'grok', name: 'xAI Grok', models: ['Grok 4.6'], status: 'adapter-ready', env: 'XAI_API_KEY' },
  { id: 'alibaba', name: 'Alibaba Cloud / Qwen', models: ['Qwen 3.8 Max', 'Configurable Model Studio model'], status: 'adapter-ready', env: 'ALIBABA_DASHSCOPE_API_KEY' },
  { id: 'zhipu', name: 'Zhipu AI / GLM', models: ['GLM 5.2', 'Configurable GLM model'], status: 'adapter-ready', env: 'ZHIPU_API_KEY' },
  { id: 'moonshot', name: 'Moonshot AI / Kimi', models: ['Kimi K2.6', 'Configurable Kimi model'], status: 'adapter-ready', env: 'MOONSHOT_API_KEY' },
  { id: 'minimax', name: 'MiniMax', models: ['MiniMax M2.7', 'Configurable MiniMax model'], status: 'adapter-ready', env: 'MINIMAX_API_KEY' },
  { id: 'sakana', name: 'Sakana AI', models: ['Research models'], status: 'research-only' },
  { id: 'rakuten', name: 'Rakuten', models: ['Rakuten AI'], status: 'research-only' },
  { id: 'elyza', name: 'ELYZA / Matsuo Lab', models: ['ELYZA'], status: 'research-only' },
  { id: 'cyberagent', name: 'CyberAgent', models: ['OpenCALM'], status: 'research-only' },
  { id: 'naver', name: 'HyperCLOVA X', models: ['HCX-005', 'Configurable HyperCLOVA model'], status: 'adapter-ready', env: 'HYPERCLOVA_API_KEY' },
  { id: 'upstage', name: 'Solar / Upstage', models: ['Solar Pro 4', 'Configurable Solar model'], status: 'adapter-ready', env: 'UPSTAGE_API_KEY' },
  { id: 'varco', name: 'VARCO', models: ['VARCO LLM'], status: 'research-only' },
  { id: 'exaone', name: 'EXAONE', models: ['EXAONE'], status: 'research-only' },
];
