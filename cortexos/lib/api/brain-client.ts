// brain-client.ts — projects, artifacts, sources, search, graph, librarian.
// demo mode → local store via the demo adapter · live mode → brain-service.
// Both sides speak the same view models; the UI cannot tell them apart.
import { isLive, request, cortexEnv } from './http';
import type {
  ArtifactVM, BrainSearchResult, ConceptVM, EntityVM, GraphNode, GraphProject,
  GraphSubgraph, IngestResultVM, ProjectVM, SourceVM, WikiPageVM, WorkResponse
} from './types';
import { S, uid } from '../../components/cortex';
import {
  listArtifacts as demoArtifacts,
  listWikiPages as demoWiki,
  searchBrain as demoSearch,
  ingestSource as demoIngest
} from '../cortex-adapter';

const svc = 'brain-service';
const base = () => cortexEnv().brainServiceUrl;

const latency = () => new Promise<void>(r => setTimeout(r, 120 + Math.random() * 200));

/* ———————————————————————— projects ———————————————————————— */

const DEMO_PROJECT: ProjectVM = {
  id: 'proj-solar', name: 'Solar CRM', objective: 'AI CRM for solar companies',
  phase: 'build', status: 'active', created: '6d'
};

export async function createProject(input: { name: string; objective: string }): Promise<ProjectVM> {
  if (isLive()) return request<ProjectVM>(svc, base(), '/projects', { method: 'POST', body: JSON.stringify(input) });
  await latency();
  return { ...DEMO_PROJECT, id: 'proj' + uid(), name: input.name, objective: input.objective, phase: 'discovery', created: 'now' };
}

export async function listProjects(): Promise<ProjectVM[]> {
  if (isLive()) return request<ProjectVM[]>(svc, base(), '/projects');
  await latency();
  return [DEMO_PROJECT];
}

export async function getProject(id: string): Promise<ProjectVM | null> {
  if (isLive()) return request<ProjectVM>(svc, base(), `/projects/${id}`);
  await latency();
  return id === DEMO_PROJECT.id ? DEMO_PROJECT : null;
}

export async function patchProject(id: string, patch: Partial<ProjectVM>): Promise<ProjectVM> {
  if (isLive()) return request<ProjectVM>(svc, base(), `/projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  await latency();
  return { ...DEMO_PROJECT, ...patch };
}

/* ———————————————————————— artifacts ———————————————————————— */

export async function createArtifact(input: { agentId: string; title: string; kind: string }): Promise<ArtifactVM> {
  if (isLive()) return request<ArtifactVM>(svc, base(), '/artifacts', { method: 'POST', body: JSON.stringify(input) });
  await latency();
  const a = S.agents.find(x => x.id === input.agentId);
  // `as const` keeps state a 'pending' literal so the object satisfies both the
  // store's Artifact and the wire ArtifactVM contract.
  const vm = { id: 'art' + uid(), agentId: input.agentId, agentName: a?.name ?? 'Agent', title: input.title, kind: input.kind, state: 'pending' as const, created: 'now' };
  S.artifacts.unshift(vm);
  return vm;
}

export async function listArtifacts(): Promise<ArtifactVM[]> {
  if (isLive()) return request<ArtifactVM[]>(svc, base(), '/artifacts');
  return demoArtifacts();
}

export async function getArtifact(id: string): Promise<ArtifactVM | null> {
  if (isLive()) return request<ArtifactVM>(svc, base(), `/artifacts/${id}`);
  await latency();
  return S.artifacts.find(x => x.id === id) ?? null;
}

export async function patchArtifact(id: string, patch: Partial<ArtifactVM>): Promise<ArtifactVM | null> {
  if (isLive()) return request<ArtifactVM>(svc, base(), `/artifacts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  await latency();
  const a = S.artifacts.find(x => x.id === id);
  if (a) Object.assign(a, patch);
  return a ?? null;
}

/* ———————————————————————— sources ———————————————————————— */

export async function createSource(input: { title: string; kind: string; note: string }): Promise<SourceVM> {
  if (isLive()) return request<SourceVM>(svc, base(), '/sources', { method: 'POST', body: JSON.stringify(input) });
  // map the wire shape onto the librarian pipeline contract (title/type/body)
  const r = await ingestSource({ title: input.title, type: input.kind, body: input.note });
  return r.source;
}

export async function listSources(): Promise<SourceVM[]> {
  if (isLive()) return request<SourceVM[]>(svc, base(), '/sources');
  await latency();
  return S.sources;
}

export async function getSource(id: string): Promise<SourceVM | null> {
  if (isLive()) return request<SourceVM>(svc, base(), `/sources/${id}`);
  await latency();
  return S.sources.find(x => x.id === id) ?? null;
}

/* ———————————————————————— search ———————————————————————— */

export async function searchBrain(query: string, type?: string, projectId?: string, limit = 20): Promise<BrainSearchResult> {
  if (isLive()) {
    const qs = new URLSearchParams({ q: query, ...(type ? { type } : {}), ...(projectId ? { projectId } : {}), limit: String(limit) });
    return request<BrainSearchResult>(svc, base(), `/search?${qs.toString()}`);
  }
  await latency();
  const r = await demoSearch(query);
  return {
    query,
    pages: r.pages.slice(0, limit),
    artifacts: r.artifacts.slice(0, limit),
    entities: [] as EntityVM[],
    concepts: [] as ConceptVM[],
    agents: r.agents.map(a => ({ id: a.id, name: a.name, domain: a.domain, color: a.color }))
  };
}

/* ———————————————————————— graph ———————————————————————— */

export async function getGraphNode(id: string): Promise<GraphNode | null> {
  if (isLive()) return request<GraphNode>(svc, base(), `/graph/nodes/${id}`);
  await latency();
  const w = S.wiki.find(x => x.title === id);
  if (!w) return null;
  return { id, type: 'WikiPage', label: w.title, edges: w.links.map(l => ({ to: l, relationship: 'REFERENCES' as const })) };
}

export async function getGraphProject(projectId: string): Promise<GraphProject> {
  if (isLive()) return request<GraphProject>(svc, base(), `/graph/projects/${projectId}`);
  await latency();
  const nodes: GraphNode[] = S.wiki.slice(0, 12).map(w => ({
    id: w.title, type: 'WikiPage', label: w.title,
    edges: w.links.map(l => ({ to: l, relationship: 'REFERENCES' as const }))
  }));
  return { projectId, nodes };
}

export async function getGraphSubgraph(centerId: string, depth = 1): Promise<GraphSubgraph> {
  if (isLive()) return request<GraphSubgraph>(svc, base(), `/graph/subgraph?center=${centerId}&depth=${depth}`);
  await latency();
  const center = await getGraphNode(centerId);
  const nodes = center ? [center] : [];
  if (center) {
    for (const e of center.edges) {
      const n = await getGraphNode(e.to);
      if (n) nodes.push(n);
    }
  }
  return { centerId, nodes, depth };
}

/* ———————————————————————— librarian pipeline ———————————————————————— */

export async function ingest(input: { title: string; type: string; body: string }): Promise<IngestResultVM> {
  if (isLive()) return request<IngestResultVM>(svc, base(), '/librarian/ingest', { method: 'POST', body: JSON.stringify(input) });
  return ingestSource(input);
}

export async function classify(text: string): Promise<{ labels: string[] }> {
  if (isLive()) return request<{ labels: string[] }>(svc, base(), '/librarian/classify', { method: 'POST', body: JSON.stringify({ text }) });
  await latency();
  const low = text.toLowerCase();
  const labels: string[] = [];
  if (/decid|chose|select/.test(low)) labels.push('decision');
  if (/competitor|market|pricing/.test(low)) labels.push('research');
  if (/api|schema|database/.test(low)) labels.push('architecture');
  return { labels: labels.length ? labels : ['note'] };
}

export async function extract(text: string): Promise<{ entities: EntityVM[] }> {
  if (isLive()) return request<{ entities: EntityVM[] }>(svc, base(), '/librarian/extract', { method: 'POST', body: JSON.stringify({ text }) });
  await latency();
  const known = ['Solar CRM', 'Jobber', 'ServiceTitan', 'Installer Ian', 'OAuth', 'OpenAPI'];
  const entities = known.filter(k => text.includes(k)).map(k => ({ id: uid(), type: 'Entity', name: k }));
  return { entities };
}

export async function audit(): Promise<{ verdict: 'clean' | 'advisories'; receipts: number }> {
  if (isLive()) return request<{ verdict: 'clean' | 'advisories'; receipts: number }>(svc, base(), '/librarian/audit');
  await latency();
  return { verdict: 'clean', receipts: S.wiki.length * 3 + S.artifacts.length };
}

/** Convenience re-export so UI modules have one import surface for wiki pages. */
export async function listWikiPages(): Promise<WikiPageVM[]> {
  if (isLive()) return request<WikiPageVM[]>(svc, base(), '/wiki');
  return demoWiki();
}

/** Demo ingest shares the adapter; live mode posts to the pipeline. */
async function ingestSource(input: { title: string; type: string; body: string }): Promise<IngestResultVM> {
  const r = await demoIngest(input);
  return { source: r, wikiPages: [input.title], entities: [], audit: 'clean' };
}

/** Studio completion callback shape (used by the harness review flow). */
export async function deliverArtifact(input: { agentId: string; title: string; kind: string }): Promise<WorkResponse> {
  const artifact = await createArtifact(input);
  return { status: 'delivered', artifacts: [artifact], decisions: [], references: [], next_steps: ['Librarian ingestion'] };
}
