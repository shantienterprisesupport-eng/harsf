const aliases = new Map([
  ['omniroute', 'omniroute'], ['omni', 'omniroute'],
  ['anthropic', 'anthropic'], ['claude', 'anthropic'],
  ['openai', 'openai'],
  ['deepseek', 'deepseek'],
  ['xai', 'xai'], ['grok', 'xai'],
  ['alibaba', 'alibaba'], ['qwen', 'alibaba'], ['dashscope', 'alibaba'],
  ['zhipu', 'zhipu'], ['glm', 'zhipu'], ['bigmodel', 'zhipu'],
  ['moonshot', 'moonshot'], ['kimi', 'moonshot'],
  ['minimax', 'minimax'],
  ['hyperclova', 'hyperclova'], ['naver', 'hyperclova'], ['clova', 'hyperclova'],
  ['upstage', 'upstage'], ['solar', 'upstage'],
]);

const keyByProvider = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  xai: 'XAI_API_KEY',
  alibaba: 'ALIBABA_DASHSCOPE_API_KEY',
  zhipu: 'ZHIPU_API_KEY',
  moonshot: 'MOONSHOT_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  hyperclova: 'HYPERCLOVA_API_KEY',
  upstage: 'UPSTAGE_API_KEY',
};

export function normalizeRequestedProvider(value = 'auto') {
  const requested = String(value || 'auto').trim().toLowerCase();
  if (requested === 'auto') return 'auto';
  return aliases.get(requested) || 'auto';
}

export function isProviderConfigured(provider, env, config = {}) {
  if (provider === 'omniroute') {
    return Boolean(env.OMNIROUTE_API_KEY && config.baseUrls?.omniroute && config.models?.omniroute);
  }
  const keyName = keyByProvider[provider];
  if (!keyName || !env[keyName]) return false;
  if (provider === 'alibaba') {
    return Boolean(config.baseUrls?.alibaba && config.models?.alibaba);
  }
  if (['zhipu', 'moonshot', 'minimax', 'hyperclova', 'upstage'].includes(provider)) {
    return Boolean(config.baseUrls?.[provider] && config.models?.[provider]);
  }
  return true;
}

export function selectActiveProvider(requestedProvider, env, config = {}) {
  const requested = normalizeRequestedProvider(requestedProvider);
  if (requested !== 'auto') return requested;
  const order = [
    'omniroute', 'anthropic', 'openai', 'deepseek', 'xai',
    'alibaba', 'zhipu', 'moonshot', 'minimax', 'hyperclova', 'upstage',
  ];
  return order.find((provider) => isProviderConfigured(provider, env, config)) || 'none';
}

export function modelForProvider(provider, models = {}) {
  return models[provider] || null;
}

export function providerHealthSnapshot(activeProvider, env, config = {}, models = {}) {
  const liveProviders = [
    ['omniroute', 'omniroute'],
    ['openai', 'openai'],
    ['claude', 'anthropic'],
    ['deepseek', 'deepseek'],
    ['grok', 'xai'],
    ['alibaba', 'alibaba'],
    ['zhipu', 'zhipu'],
    ['moonshot', 'moonshot'],
    ['minimax', 'minimax'],
    ['naver', 'hyperclova'],
    ['upstage', 'upstage'],
  ];
  return liveProviders.map(([id, internalId]) => {
    const configured = isProviderConfigured(internalId, env, config);
    return {
      id,
      configured,
      active: configured && activeProvider === internalId,
      model: configured ? modelForProvider(internalId, models) : null,
    };
  });
}

export function missingCredential(provider) {
  if (provider === 'omniroute') return 'OMNIROUTE_API_KEY, OMNIROUTE_MODEL, and a valid OMNIROUTE_BASE_URL';
  if (provider === 'anthropic') return 'ANTHROPIC_API_KEY';
  if (provider === 'openai') return 'OPENAI_API_KEY';
  if (provider === 'deepseek') return 'DEEPSEEK_API_KEY';
  if (provider === 'xai') return 'XAI_API_KEY';
  if (provider === 'alibaba') return 'ALIBABA_DASHSCOPE_API_KEY plus ALIBABA_BASE_URL for the matching Model Studio region/workspace';
  if (provider === 'zhipu') return 'ZHIPU_API_KEY with valid ZHIPU_BASE_URL and ZHIPU_MODEL';
  if (provider === 'moonshot') return 'MOONSHOT_API_KEY with valid MOONSHOT_BASE_URL and MOONSHOT_MODEL';
  if (provider === 'minimax') return 'MINIMAX_API_KEY with valid MINIMAX_BASE_URL and MINIMAX_MODEL';
  if (provider === 'hyperclova') return 'HYPERCLOVA_API_KEY with valid HYPERCLOVA_BASE_URL and HYPERCLOVA_MODEL';
  if (provider === 'upstage') return 'UPSTAGE_API_KEY with valid UPSTAGE_BASE_URL and UPSTAGE_MODEL';
  return 'a configured OmniRoute route or one direct AI provider credential';
}
