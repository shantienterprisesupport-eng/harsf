import type { Provider } from '../types';

export interface RuntimeProviderHealth {
  id: string;
  configured: boolean;
  active: boolean;
  model: string | null;
}

export type ProviderRuntimeState = 'active' | 'connected' | 'not-configured' | 'adapter' | 'research';

const gatewayIds: Record<string, string> = {
  omniroute: 'omniroute',
  openai: 'openai',
  claude: 'claude',
  deepseek: 'deepseek',
  grok: 'grok',
  alibaba: 'alibaba',
  zhipu: 'zhipu',
  moonshot: 'moonshot',
  minimax: 'minimax',
  naver: 'naver',
  upstage: 'upstage',
};

export function providerRuntimeState(provider: Provider, runtime: RuntimeProviderHealth[]): ProviderRuntimeState {
  if (provider.status === 'research-only') return 'research';
  const gatewayId = gatewayIds[provider.id];
  if (!gatewayId) return 'adapter';
  const health = runtime.find((item) => item.id === gatewayId);
  if (!health) return 'not-configured';
  if (health.active && health.configured) return 'active';
  if (health.configured) return 'connected';
  return 'not-configured';
}

export function providerRuntimeLabel(state: ProviderRuntimeState): string {
  if (state === 'active') return 'ACTIVE';
  if (state === 'connected') return 'CONNECTED';
  if (state === 'not-configured') return 'NOT CONFIGURED';
  if (state === 'adapter') return 'ADAPTER';
  return 'RESEARCH';
}
