// cortex-adapter.ts — local demo adapter
//
// This module is the single contract boundary between the CortexOS frontend and
// its future backend (brain-service / Jarvis / provider-gateway). Every function
// mimics a real API call: async, latency-shaped, typed request/response.
// Swapping to the real backend later means replacing the bodies with fetch()
// calls — no component changes required.
//
//   listAgents()        → GET    /api/agents
//   summonAgent()       → POST   /api/agents/:id/summon
//   sendCommand()       → POST   /api/agents/:id/command
//   listArtifacts()     → GET    /api/artifacts
//   ingestSource()      → POST   /api/knowledge/ingest
//   listWikiPages()     → GET    /api/knowledge/wiki
//   searchBrain()       → GET    /api/knowledge/search?q=
//   listProviders()     → GET    /api/providers
//   saveProvider()      → POST   /api/providers
//   routeModel()        → PUT    /api/routing/:agentId
//   getWarRoomState()   → GET    /api/warroom
import {
  S, byId, summon,
  sendCommand as storeSendCommand,
  ingestSource as storeIngestSource,
  addProvider as storeAddProvider,
  routeModel as storeRouteModel,
  SOURCE_KINDS,
  type Agent, type Artifact, type Source, type SourceKind, type WikiPage, type Provider,
  type WorkRequest, type WorkResponse, type WarRoomState
} from '@/components/cortex/cortex';

// NOTE: this module is the DEMO implementation detail behind the api/* clients.
// Components import the clients (brain/jarvis/studio/events), never this file
// directly — that keeps the demo↔live switch invisible to the UI.

/** Simulated network latency (120–320ms) so UI code exercises real async paths. */
const latency = () => new Promise<void>(r => setTimeout(r, 120 + Math.random() * 200));

export async function listAgents(): Promise<Agent[]> {
  await latency();
  return S.agents;
}

export async function summonAgent(id: string): Promise<Agent | null> {
  await latency();
  summon(id);
  return byId(id) ?? null;
}

export async function sendCommand(req: WorkRequest): Promise<WorkResponse> {
  await latency();
  const a = byId(req.agentId);
  if (!a) return { accepted: false, agentId: req.agentId, message: 'Agent not found on the neural rail.' };
  storeSendCommand(a, req.command, req.origin);
  const mainBrain = a.core ? routePreview(req.command) : null;
  return {
    accepted: true,
    agentId: a.id,
    routedTo: mainBrain && mainBrain.id !== a.id ? mainBrain.id : undefined,
    message: `Directive accepted by ${a.name}.`
  };
}

/** Peek at where MainBrain would route a directive (mirrors store routing rules). */
function routePreview(command: string): { id: string } {
  const low = command.toLowerCase();
  const named = S.agents.find(a => low.startsWith(a.name.toLowerCase() + ':') || low.startsWith(a.name.toLowerCase() + ' '));
  if (named) return named;
  const table: [RegExp, string][] = [
    [/\b(design|ui|ux|screen|wireframe|mockup|layout|pricing screen)\b/, 'design'],
    [/\b(research|competitor|market|persona|validat|discover)\b/, 'discovery'],
    [/\b(prd|roadmap|story|priorit|scope|mvp|requirement|product)\b/, 'product'],
    [/\b(api|schema|database|erd|openapi|infra|architect|security design)\b/, 'architecture'],
    [/\b(build|code|implement|scaffold|component|frontend|backend|develop|fix)\b/, 'development'],
    [/\b(test|qa|bug|security sweep|a11y|accessib|compliance|scan)\b/, 'qa'],
    [/\b(deploy|release|ship|ci|cd|rollback|runbook|monitor)\b/, 'release'],
    [/\b(wiki|remember|ingest|knowledge|note|source|librarian)\b/, 'librarian']
  ];
  for (const [re, id] of table) if (re.test(low)) { const a = byId(id); if (a) return a; }
  return { id: 'mainbrain' };
}

export async function listArtifacts(): Promise<Artifact[]> {
  await latency();
  return S.artifacts;
}

export async function ingestSource(input: { title: string; type: string; body: string }): Promise<Source> {
  await latency();
  const kind: SourceKind = input.type in SOURCE_KINDS ? input.type as SourceKind : 'markdown';
  const source: Source = { id: 'src-' + Math.random().toString(36).slice(2, 9), title: input.title, kind, note: input.body || 'Ingested source.', created: 'now', status: 'queued' };
  storeIngestSource(input.title, kind, input.body);
  return source;
}

export async function listWikiPages(): Promise<WikiPage[]> {
  await latency();
  return S.wiki;
}

export async function searchBrain(q: string): Promise<{ pages: WikiPage[]; artifacts: Artifact[]; agents: Agent[] }> {
  await latency();
  const s = q.trim().toLowerCase();
  if (!s) return { pages: S.wiki, artifacts: S.artifacts, agents: S.agents };
  return {
    pages: S.wiki.filter(w => w.title.toLowerCase().includes(s) || w.summary.toLowerCase().includes(s) || w.type.includes(s)),
    artifacts: S.artifacts.filter(x => x.title.toLowerCase().includes(s) || x.agentName.toLowerCase().includes(s) || x.kind.includes(s)),
    agents: S.agents.filter(a => a.name.toLowerCase().includes(s) || a.domain.toLowerCase().includes(s))
  };
}

export async function listProviders(): Promise<Provider[]> {
  await latency();
  return S.providers;
}

export async function saveProvider(p: Omit<Provider, 'id'>): Promise<Provider> {
  await latency();
  storeAddProvider(p);
  return S.providers[S.providers.length - 1];
}

export async function routeModel(agentId: string, model: string): Promise<{ model: string; provider: string } | null> {
  await latency();
  return storeRouteModel(agentId, model);
}

export async function getWarRoomState(): Promise<WarRoomState> {
  await latency();
  return {
    agentsActive: S.agents.filter(a => a.status === 'working' || a.status === 'review').length,
    agentsTotal: S.agents.length,
    tasksRunning: S.agents.filter(a => a.status === 'working').length,
    wikiPages: S.metrics.pages,
    buildPct: S.agents.find(a => a.id === 'development')?.task
      ? Math.round(100 * (S.agents.find(a => a.id === 'development')!.task!.stepsDone / S.agents.find(a => a.id === 'development')!.task!.steps.length))
      : 0,
    health: S.metrics.health,
    artifactsPending: S.artifacts.filter(x => x.state === 'pending').length,
    artifactsIngested: S.artifacts.filter(x => x.state === 'ingested').length,
    events: S.activity.length
  };
}
