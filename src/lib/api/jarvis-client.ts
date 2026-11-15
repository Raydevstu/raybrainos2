// jarvis-client.ts — the supervisor surface: work requests, project state,
// phase gates, council state. The user only ever talks to Jarvis/MainBrain;
// this client is how the frontend does.
import { isLive, request, cortexEnv } from './http';
import type { CouncilStateVM, ProjectStateVM, WorkRequest, WorkResponse } from './types';
import {
  S, byId, summon, currentPhase, currentPhaseInfo,
  sendCommand as storeSendCommand,
  approvePhase as storeApprovePhase,
  requestPhaseChanges as storeRequestChanges,
  blockPhase as storeBlockPhase,
  addConstraint as storeAddConstraint,
  type CommandOrigin
} from '@/components/cortex/cortex';
import { routeDirective } from '@/lib/model-router';

const svc = 'jarvis-service';
const base = () => cortexEnv().jarvisServiceUrl;
const latency = () => new Promise<void>(r => setTimeout(r, 120 + Math.random() * 200));

const DEMO_PROJECT_ID = 'proj-solar';

/** Send work through the supervisor. Demo: routes locally with visible fallbacks. */
export async function sendWorkRequest(agentId: string, command: string, origin: CommandOrigin = 'command-bar'): Promise<WorkResponse> {
  if (isLive()) {
    const body: WorkRequest = {
      project_id: DEMO_PROJECT_ID,
      objective: command,
      studio: agentId,
      context_ids: [],
      constraints: []
    };
    return request<WorkResponse>(svc, base(), '/work', { method: 'POST', body: JSON.stringify(body) });
  }
  await latency();
  const a = byId(agentId);
  if (!a) return { status: 'blocked', artifacts: [], decisions: [], references: [], next_steps: [`Agent ${agentId} not found on the neural rail.`] };
  // Every directive passes the model router first — fallbacks engage visibly.
  routeDirective(a, command);
  storeSendCommand(a, command, origin);
  return { status: 'accepted', artifacts: [], decisions: [], references: [], next_steps: [`${a.name} is executing within rail guards.`] };
}

export async function getProjectState(): Promise<ProjectStateVM> {
  if (isLive()) return request<ProjectStateVM>(svc, base(), `/projects/${DEMO_PROJECT_ID}/state`);
  await latency();
  const gov = S.gov;
  const cur = gov.phases[gov.phaseIdx];
  return {
    project: { id: DEMO_PROJECT_ID, name: gov.project, objective: gov.objective, phase: currentPhase(), status: 'active', created: '6d' },
    phase: currentPhase(),
    gate: cur?.status === 'review' ? 'pending' : cur?.status === 'blocked' ? 'changes-requested' : 'approved',
    openArtifacts: S.artifacts.filter(x => x.state === 'pending').length
  };
}

/** Phase gate approval — advances the lifecycle, unlocks + starts the next studio. */
export async function approvePhase(): Promise<{ approved: boolean; phase: string }> {
  if (isLive()) return request<{ approved: boolean; phase: string }>(svc, base(), `/projects/${DEMO_PROJECT_ID}/approve`, { method: 'POST' });
  await latency();
  storeApprovePhase();
  return { approved: true, phase: currentPhase() };
}

/** Request changes — sends the phase back to its studio with a real revision task. */
export async function requestChanges(reason: string): Promise<{ accepted: boolean }> {
  if (isLive()) return request<{ accepted: boolean }>(svc, base(), `/projects/${DEMO_PROJECT_ID}/changes`, { method: 'POST', body: JSON.stringify({ reason }) });
  await latency();
  storeRequestChanges(reason);
  return { accepted: true };
}

/** Block (or unblock) the current phase — Jarvis-owned hard stop. */
export async function holdPhase(reason: string): Promise<{ held: boolean }> {
  if (isLive()) return request<{ held: boolean }>(svc, base(), `/projects/${DEMO_PROJECT_ID}/block`, { method: 'POST', body: JSON.stringify({ reason }) });
  await latency();
  storeBlockPhase(reason);
  return { held: true };
}

/** Add a project-wide constraint every studio must respect. */
export async function addProjectConstraint(text: string): Promise<{ accepted: boolean }> {
  if (isLive()) return request<{ accepted: boolean }>(svc, base(), `/projects/${DEMO_PROJECT_ID}/constraints`, { method: 'POST', body: JSON.stringify({ text }) });
  await latency();
  storeAddConstraint(text);
  return { accepted: true };
}

export async function getCouncilState(): Promise<CouncilStateVM> {
  if (isLive()) return request<CouncilStateVM>(svc, base(), '/council');
  await latency();
  const gov = S.gov;
  const at = (i: number) => gov.phases[i];
  return {
    phase: currentPhase(),
    custodians: S.agents.filter(a => !a.core).map(a => ({ agentId: a.id, status: a.status, task: a.task?.title ?? null })),
    gates: [
      { name: 'Discovery gate', verdict: at(0)?.status === 'review' ? 'pending' : 'pass' },
      { name: 'Design gate', verdict: at(2)?.status === 'blocked' ? 'hold' : 'pass' },
      { name: 'QA gate', verdict: at(5)?.status === 'review' ? 'pending' : at(5)?.status === 'blocked' ? 'hold' : 'pass' },
      { name: 'Release gate', verdict: currentPhaseInfo()?.key === 'release' ? 'pending' : 'pass' }
    ]
  };
}

/** Summoning stays a local UI action in demo; live mode notifies the supervisor. */
export async function summonAgent(id: string): Promise<void> {
  if (isLive()) {
    try { await request(svc, base(), `/agents/${id}/summon`, { method: 'POST' }); } catch { /* non-blocking: workspace still opens */ }
  }
  summon(id);
}
