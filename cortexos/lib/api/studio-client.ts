// studio-client.ts — studio surface: the operating environments for each
// domain (agent + rules + playbooks + memory). The studio is the asset; the
// agent is replaceable.
import { isLive, request, cortexEnv } from './http';
import type { StudioMemoryVM, StudioVM } from './types';
import { S, emit, byId } from '../../components/cortex';
import { sendCommand as storeSendCommand } from '../../components/cortex';
import { routeDirective } from '../model-router';

const svc = 'studio-service';
const base = () => cortexEnv().studioServiceUrl;
const latency = () => new Promise<void>(r => setTimeout(r, 120 + Math.random() * 200));

export async function listStudios(): Promise<StudioVM[]> {
  if (isLive()) return request<StudioVM[]>(svc, base(), '/studios');
  await latency();
  return S.agents.map(a => ({
    id: `${a.id}-studio`,
    name: `${a.name} Studio`,
    domain: a.domain,
    agentId: a.id,
    playbooks: a.core ? ['Council broadcast', 'Sequencing'] : [`${a.domain} playbook v1`],
    memoryIds: S.artifacts.filter(x => x.agentId === a.id).map(x => x.id)
  }));
}

export async function getStudio(id: string): Promise<StudioVM | null> {
  if (isLive()) return request<StudioVM>(svc, base(), `/studios/${id}`);
  await latency();
  const agentId = id.replace(/-studio$/, '');
  const a = byId(agentId);
  if (!a) return null;
  return { id, name: `${a.name} Studio`, domain: a.domain, agentId, playbooks: [`${a.domain} playbook v1`], memoryIds: S.artifacts.filter(x => x.agentId === agentId).map(x => x.id) };
}

/** Start studio work — routes through the model router, then executes. */
export async function startStudioWork(agentId: string, objective: string): Promise<{ started: boolean }> {
  if (isLive()) return request<{ started: boolean }>(svc, base(), `/studios/${agentId}/work`, { method: 'POST', body: JSON.stringify({ objective }) });
  await latency();
  const a = byId(agentId);
  if (!a) return { started: false };
  routeDirective(a, objective);
  storeSendCommand(a, objective, 'workspace');
  emit();
  return { started: true };
}

export async function getStudioMemory(agentId: string): Promise<StudioMemoryVM> {
  if (isLive()) return request<StudioMemoryVM>(svc, base(), `/studios/${agentId}/memory`);
  await latency();
  return {
    studioId: agentId,
    entries: S.artifacts.filter(x => x.agentId === agentId).slice(0, 10).map(x => ({ id: x.id, kind: x.kind, text: x.title, created: x.created }))
  };
}
