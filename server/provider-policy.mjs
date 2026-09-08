export function normalizeRequestedProvider(value = 'auto') {
  const requested = String(value || 'auto').toLowerCase();
  if (requested === 'omniroute' || requested === 'omni') return 'omniroute';
  if (requested === 'anthropic' || requested === 'claude') return 'anthropic';
  if (requested === 'openai') return 'openai';
  if (requested === 'deepseek') return 'deepseek';
  if (requested === 'xai' || requested === 'grok') return 'xai';
  return 'auto';
}

export function isProviderConfigured(provider, env, config = {}) {
  if (provider === 'omniroute') {
    return Boolean(env.OMNIROUTE_API_KEY && config.omniRouteModel && config.omniRouteBaseUrl);
  }
  if (provider === 'anthropic') return Boolean(env.ANTHROPIC_API_KEY);
  if (provider === 'openai') return Boolean(env.OPENAI_API_KEY);
  if (provider === 'deepseek') return Boolean(env.DEEPSEEK_API_KEY);
  if (provider === 'xai') return Boolean(env.XAI_API_KEY);
  return false;
}

export function selectActiveProvider(requestedProvider, env, config = {}) {
  const requested = normalizeRequestedProvider(requestedProvider);
  if (requested !== 'auto') return requested;
  if (isProviderConfigured('omniroute', env, config)) return 'omniroute';
  if (isProviderConfigured('anthropic', env, config)) return 'anthropic';
  if (isProviderConfigured('openai', env, config)) return 'openai';
  if (isProviderConfigured('deepseek', env, config)) return 'deepseek';
  if (isProviderConfigured('xai', env, config)) return 'xai';
  return 'none';
}

export function modelForProvider(provider, models = {}) {
  if (provider === 'omniroute') return models.omniroute || null;
  if (provider === 'anthropic') return models.anthropic || null;
  if (provider === 'openai') return models.openai || null;
  if (provider === 'deepseek') return models.deepseek || null;
  if (provider === 'xai') return models.xai || null;
  return null;
}

export function providerHealthSnapshot(activeProvider, env, config = {}, models = {}) {
  const liveProviders = [
    ['omniroute', 'omniroute'],
    ['openai', 'openai'],
    ['claude', 'anthropic'],
    ['deepseek', 'deepseek'],
    ['grok', 'xai'],
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
  return 'a configured OmniRoute route or one direct AI provider credential';
}
