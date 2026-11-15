// provider-gateway.ts — the single boundary between CortexOS and every model
// provider. No component ever imports a provider SDK or calls a provider URL
// directly; they ask the gateway, and the gateway talks to:
//   demo mode  → the local store (simulated health, visible fallbacks)
//   live mode  → the server-side gateway route (real credentials never touch
//                the browser — see SECURITY below)
import { S, log, toast, uid, save, emit } from '../components/cortex';
import { rerouteDependents } from './model-router';
import type { ApiMode, Provider, ProviderHealth } from './provider-types';

export function listProviders(): Provider[] { return S.providers; }

/** Settings > Providers is grouped by gateway classification. */
export function providerGroups() {
  return {
    accounts: S.providers.filter(p => p.type === 'account'),
    apiKeys: S.providers.filter(p => p.type === 'api-key'),
    custom: S.providers.filter(p => p.type === 'custom-endpoint'),
    local: S.providers.filter(p => p.type === 'local')
  };
}

export const API_MODES: { id: ApiMode; label: string }[] = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'chat-completions', label: 'Chat Completions' },
  { id: 'responses', label: 'Responses API' },
  { id: 'anthropic-messages', label: 'Anthropic Messages' },
  { id: 'ollama', label: 'Ollama' }
];

export function describeMode(m: ApiMode): string { return API_MODES.find(x => x.id === m)?.label ?? m; }

/**
 * SECURITY BOUNDARY
 * Never persist raw API keys client-side. This form accepts only a key
 * *reference label* (e.g. "${CORTEX_API_KEY}") that the future server-side
 * gateway route resolves against a secret manager. When live mode lands,
 * requests proxy through that route — the real key never enters the browser.
 */
export function addCustomEndpoint(input: {
  name: string; url: string; apiMode: ApiMode;
  defaultModel?: string; contextWindow?: number; apiKeyRef?: string;
}): Provider | null {
  if (!input.name.trim() || !/^https?:\/\/.+/.test(input.url.trim())) return null;
  const p: Provider = {
    id: 'pv' + uid(),
    name: input.name.trim(),
    icon: 'plug', color: '#22d3ee',
    type: input.apiMode === 'ollama' ? 'local' : 'custom-endpoint',
    apiMode: input.apiMode,
    baseUrl: input.url.trim().replace(/\/+$/, ''),
    apiKeyRef: input.apiKeyRef?.trim() || '${CORTEX_API_KEY}',
    connected: true, health: 'online', custom: true,
    defaultModel: input.defaultModel?.trim() || undefined,
    contextWindow: input.contextWindow || undefined,
    models: input.defaultModel?.trim()
      ? [{ id: input.defaultModel.trim(), name: input.defaultModel.trim(), contextWindow: input.contextWindow }]
      : []
  };
  S.providers.push(p);
  save(); emit();
  log('mainbrain', `Custom endpoint wired: ${p.name} (${describeMode(p.apiMode)}).`, 'system');
  toast(`${p.name} wired`, 'Any model behind it is now routable.', 'plug');
  return p;
}

/** Toggle with visible consequences: disconnecting reroutes dependents through fallbacks. */
export function gatewayToggleProvider(id: string) {
  const p = S.providers.find(x => x.id === id); if (!p) return;
  p.connected = !p.connected;
  p.health = p.connected ? 'online' : 'offline';
  save(); emit();
  if (p.connected) {
    toast(p.name, 'Connected — models routable.', 'link');
    log('mainbrain', `${p.name} back online — routing restored.`, 'system');
  } else {
    toast(p.name, 'Disconnected — rerouting dependents…', 'warn');
    log('mainbrain', `${p.name} offline — engaging fallback chains.`, 'system');
    rerouteDependents(id);
  }
}

export function removeProvider(id: string) {
  const i = S.providers.findIndex(x => x.id === id); if (i < 0) return;
  const [p] = S.providers.splice(i, 1);
  save(); emit();
  if (!p.connected) rerouteDependents(id);
  toast('Endpoint removed', p.name, 'trash', () => { S.providers.splice(i, 0, p); save(); emit(); });
}

export function setProviderHealth(id: string, h: ProviderHealth) {
  const p = S.providers.find(x => x.id === id); if (!p) return;
  p.health = h; save(); emit();
}

/** Structured payload for the future server-side gateway route (live mode). */
export function buildGatewayPayload(decision: { model: string; provider: Provider }, objective: string) {
  return {
    provider: decision.provider.id,
    baseUrl: decision.provider.baseUrl,
    apiMode: decision.provider.apiMode,
    model: decision.model,
    objective,
    apiKeyRef: decision.provider.apiKeyRef ?? null, // resolved server-side only
    stream: true
  };
}
