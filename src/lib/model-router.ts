// model-router.ts — every agent command goes through the router before any
// provider is touched. The router picks provider + model from the model
// profile and the agent's affinity; if the primary provider is offline or
// degraded, the ordered fallback chain engages — visibly, in the activity
// feed and the agent terminal.
import { S, byId, log, pushOutput, save, emit, providerOfModel, type Agent } from '@/components/cortex/cortex';
import type { AgentModelAffinity, RouteDecision } from './provider-types';

/** Every custodian's model strength — routing is by profile, not vibes. */
export const AGENT_AFFINITY: AgentModelAffinity[] = [
  { agentId: 'mainbrain', strength: 'reasoning', label: 'Strong reasoning' },
  { agentId: 'librarian', strength: 'extraction', label: 'Fast extraction' },
  { agentId: 'discovery', strength: 'research', label: 'Research' },
  { agentId: 'product', strength: 'writing', label: 'Reasoning / writing' },
  { agentId: 'design', strength: 'vision-ux', label: 'Vision / UX' },
  { agentId: 'architecture', strength: 'reasoning-code', label: 'Reasoning / code' },
  { agentId: 'development', strength: 'coding', label: 'Coding' },
  { agentId: 'qa', strength: 'testing', label: 'Testing / security' },
  { agentId: 'release', strength: 'ops', label: 'Ops / code' }
];

export function affinityOf(agentId: string): AgentModelAffinity | undefined {
  return AGENT_AFFINITY.find(a => a.agentId === agentId);
}

/** Effective model = per-agent override → agent default → profile main model. */
export function effectiveModel(agentId: string): string {
  return S.modelProfile.perAgentOverrides[agentId] ?? byId(agentId)?.model ?? S.modelProfile.mainModel;
}

const usable = (model: string) => {
  const p = providerOfModel(model);
  return !!p && p.connected && p.health !== 'offline';
};

/**
 * Resolve provider + model for an agent directive. When the primary provider
 * is unavailable the ordered fallback chain from the model profile is walked.
 */
export function resolveRoute(agentId: string): RouteDecision | null {
  const a = byId(agentId); if (!a) return null;
  const primary = effectiveModel(agentId);
  const primaryProvider = providerOfModel(primary);
  const chain: string[] = [primary];
  if (!primaryProvider || !usable(primary)) {
    for (const fb of S.modelProfile.fallbackModels) {
      chain.push(fb);
      if (usable(fb)) return { agentId, model: fb, provider: providerOfModel(fb)!, fellBack: true, chain };
    }
    // Everything is down — report the failure chain honestly.
    return { agentId, model: primary, provider: primaryProvider ?? S.providers[0], fellBack: true, chain };
  }
  return { agentId, model: primary, provider: primaryProvider, fellBack: false, chain };
}

/** After a provider goes offline, reroute every dependent agent — visibly. */
export function rerouteDependents(providerId: string) {
  const gone = S.providers.find(x => x.id === providerId);
  if (!gone) return;
  S.agents.forEach(a => {
    const cur = effectiveModel(a.id);
    if (providerOfModel(cur)?.id !== providerId) return;
    const d = resolveRoute(a.id);
    if (!d || !d.fellBack) return;
    a.model = d.model;
    a.provider = d.provider.name;
    S.modelProfile.perAgentOverrides[a.id] = d.model;
    const chainStr = d.chain.map(m => `${m} (${providerOfModel(m)?.name ?? 'unreachable'})`).join(' → ');
    pushOutput(a, `:: primary route offline — fallback engaged: ${chainStr}`, 'warn');
    log(a.id, `Fallback chain engaged: ${chainStr}`, 'system');
  });
  save(); emit();
}

/**
 * Wrap a directive with routing. Demo mode simulates the fallback visibly;
 * live mode structures the payload for the server-side gateway route
 * (provider-gateway.buildGatewayPayload).
 */
export function routeDirective(a: Agent, objective: string): RouteDecision | null {
  const d = resolveRoute(a.id);
  if (!d) return null;
  if (d.fellBack) {
    const chainStr = d.chain.map(m => `${m} @ ${providerOfModel(m)?.name ?? '?'}`).join(' → ');
    pushOutput(a, `:: routing: ${chainStr}`, 'info');
    log(a.id, `Routed via fallback — ${chainStr}`, 'system');
  }
  return d;
}
