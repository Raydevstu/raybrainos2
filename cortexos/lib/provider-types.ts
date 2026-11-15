// provider-types.ts — provider gateway type system
//
// Any provider (account, API key, custom endpoint, local) plugs into the same
// shape. The gateway never lets components talk to a provider directly —
// they always go through model-router → provider-gateway.
//
// SECURITY BOUNDARY:
//   Raw API keys are NEVER stored client-side. In demo mode we keep only a
//   key *reference label* (e.g. "${CORTEX_API_KEY}"). In live mode the
//   gateway route on the server holds real credentials — see
//   provider-gateway.ts for the adapter boundary.

/* ———————————————————————— provider shapes ———————————————————————— */

export type ProviderType = 'account' | 'api-key' | 'custom-endpoint' | 'local';

export type ApiMode =
  | 'auto'                // auto-detect from endpoint shape
  | 'chat-completions'    // OpenAI-compatible /v1/chat/completions
  | 'responses'           // OpenAI Responses API
  | 'anthropic-messages'  // Anthropic Messages API
  | 'ollama';             // local Ollama daemon

export type ProviderHealth = 'online' | 'offline' | 'degraded' | 'unknown';

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow?: number;
}

export interface Provider {
  id: string;
  name: string;
  /** UI affordances */
  icon: string;
  color: string;
  /** gateway classification */
  type: ProviderType;
  /** how requests must be shaped */
  apiMode: ApiMode;
  /** endpoint base (never contains credentials) */
  baseUrl: string;
  /** reference label only — never a raw key (see security note above) */
  apiKeyRef?: string;
  connected: boolean;
  health: ProviderHealth;
  models: ProviderModel[];
  custom: boolean;
  /** default model used when routing picks this provider without a specific model */
  defaultModel?: string;
  /** context window override for custom endpoints */
  contextWindow?: number;
}

/* ———————————————————————— model profile ———————————————————————— */

/**
 * The project-wide model profile. `mainModel` is the workhorse, `fallbackModels`
 * is the ordered chain engaged when the primary provider is offline/degraded,
 * `auxiliaryModel` handles cheap classification/extraction work (Librarian).
 */
export interface ModelProfile {
  id: string;
  name: string;
  mainModel: string;
  fallbackModels: string[];
  auxiliaryModel: string;
  perAgentOverrides: Record<string, string>;
  contextWindowOverride?: number;
  temperature: number;
  maxTokens: number;
}

/* ———————————————————————— routing ———————————————————————— */

export interface RouteDecision {
  agentId: string;
  model: string;
  provider: Provider;
  /** true when a fallback model was engaged because the primary was unavailable */
  fellBack: boolean;
  chain: string[];
}

/** Agent-domain → the kind of model strength it needs (used by the router). */
export type ModelStrength =
  | 'reasoning'      // MainBrain — strong reasoning
  | 'extraction'     // Librarian — fast extraction
  | 'research'       // Discovery
  | 'writing'        // Product — reasoning/writing
  | 'vision-ux'      // Design
  | 'reasoning-code' // Architecture
  | 'coding'         // Development
  | 'testing'        // QA — testing/security
  | 'ops';           // Release — ops/code

export interface AgentModelAffinity {
  agentId: string;
  strength: ModelStrength;
  label: string;
}
