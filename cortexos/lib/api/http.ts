// http.ts — runtime mode + live-mode transport for the brain-service clients.
//
// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT BOUNDARY
//
//   DEMO MODE (default — zero configuration):
//     No environment variables are required. Every client call resolves
//     through the local seeded adapter (lib/cortex-adapter.ts) against the
//     in-browser CortexOS store. The AI Studio / GitHub preview runs fully
//     self-contained in this mode.
//
//   LIVE MODE:
//     Set VITE_CORTEX_MODE=live plus the four service URLs:
//       VITE_BRAIN_SERVICE_URL    → brain-service   (projects, artifacts, sources, search, graph, librarian)
//       VITE_JARVIS_SERVICE_URL   → jarvis-service  (work requests, phase gates, council state)
//       VITE_STUDIO_SERVICE_URL   → studio-service  (studio environments, playbooks, memory)
//       VITE_EVENTS_URL           → event stream    (SSE: SourceCreated, ArtifactCreated, …)
//
//     In live mode the same client functions fetch the real services and
//     speak the identical view models from api/types.ts — no UI changes.
//     Provider credentials never enter the browser: live inference is
//     proxied by the server-side provider gateway (see lib/provider-gateway.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { ApiError, type CortexEnv } from './types';

interface ViteEnvBag {
  VITE_CORTEX_MODE?: string;
  VITE_BRAIN_SERVICE_URL?: string;
  VITE_JARVIS_SERVICE_URL?: string;
  VITE_STUDIO_SERVICE_URL?: string;
  VITE_EVENTS_URL?: string;
}

/** Vite exposes VITE_* vars on import.meta.env; AI Studio injects them the same way. */
const viteEnv: ViteEnvBag = ((import.meta as unknown as { env?: ViteEnvBag }).env ?? {});

function env(name: string): string | undefined {
  return viteEnv[`VITE_${name}` as keyof ViteEnvBag] || undefined;
}

export function cortexEnv(): CortexEnv {
  const mode = (env('CORTEX_MODE') as CortexEnv['mode'] | undefined) ?? 'demo';
  return {
    mode,
    brainServiceUrl: env('BRAIN_SERVICE_URL') ?? '',
    jarvisServiceUrl: env('JARVIS_SERVICE_URL') ?? '',
    studioServiceUrl: env('STUDIO_SERVICE_URL') ?? '',
    eventsUrl: env('EVENTS_URL') ?? ''
  };
}

export const isLive = () => cortexEnv().mode === 'live';

/** JSON request with normalized errors (ApiError) and a 12s timeout guard. */
export async function request<T>(service: string, base: string, path: string, init?: RequestInit): Promise<T> {
  if (!base) throw new ApiError(`${service} URL is not configured`, service);
  const timeout = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(12000)
    : undefined;
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      signal: init?.signal ?? timeout
    });
    if (!res.ok) throw new ApiError(`${service} responded ${res.status}`, service, res.status);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(e instanceof Error ? e.message : `${service} unreachable`, service);
  }
}
