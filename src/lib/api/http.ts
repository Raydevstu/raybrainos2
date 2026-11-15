// http.ts — live-mode transport for the brain-service clients.
//
// Environment contract (Next.js runtime; VITE_* names honoured for AI Studio
// parity — no backend URL is ever hardcoded):
//   NEXT_PUBLIC_CORTEX_MODE (or VITE_CORTEX_MODE)   = demo | live
//   NEXT_PUBLIC_BRAIN_SERVICE_URL  / VITE_BRAIN_SERVICE_URL
//   NEXT_PUBLIC_JARVIS_SERVICE_URL / VITE_JARVIS_SERVICE_URL
//   NEXT_PUBLIC_STUDIO_SERVICE_URL / VITE_STUDIO_SERVICE_URL
//   NEXT_PUBLIC_EVENTS_URL         / VITE_EVENTS_URL
import { ApiError, type CortexEnv } from './types';

function env(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return process.env[`NEXT_PUBLIC_${name}`] ?? process.env[`VITE_${name}`];
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
