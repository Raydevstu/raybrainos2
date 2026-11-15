// api/types.ts — canonical CortexOS contracts
//
// These are the shared view models between the CortexOS frontend and the
// future brain-service / Jarvis / studio / provider-gateway backends.
// The UI must not know whether data came from the demo adapter or the live
// brain-service — both sides speak these exact types.
//
// Nothing here imports the store: the contracts are dependency-free so the
// demo adapter, the live clients and the components can all consume them.

/* ———————————————————————— runtime mode ———————————————————————— */

/** demo = local simulated adapter · live = real brain-service URLs */
export type CortexMode = 'demo' | 'live';

export interface CortexEnv {
  mode: CortexMode;
  brainServiceUrl: string;
  jarvisServiceUrl: string;
  studioServiceUrl: string;
  eventsUrl: string;
}

/* ———————————————————————— canonical work contracts ———————————————————————— */

/** What the user (or MainBrain) sends when work must be done. */
export interface WorkRequest {
  project_id: string;
  objective: string;
  studio: string;
  context_ids: string[];
  constraints: string[];
}

/** What a studio/custodian hands back when work completes. */
export interface WorkResponse {
  status: 'accepted' | 'working' | 'blocked' | 'delivered';
  artifacts: ArtifactVM[];
  decisions: DecisionVM[];
  references: string[];
  next_steps: string[];
}

/* ———————————————————————— brain object types ———————————————————————— */

export type BrainObjectType =
  | 'Project' | 'Artifact' | 'Source' | 'Entity' | 'Concept' | 'Decision'
  | 'Meeting' | 'Task' | 'Person' | 'Studio' | 'Agent' | 'Pattern'
  | 'Doctrine' | 'Playbook' | 'WikiPage';

/** Directed relationships the knowledge graph understands. */
export type RelationshipType =
  | 'CONTAINS' | 'CREATED_BY' | 'REFERENCES' | 'USES' | 'IMPLEMENTS'
  | 'DEPENDS_ON' | 'DERIVED_FROM' | 'PART_OF' | 'OWNS' | 'SUPERSEDES'
  | 'INFLUENCES' | 'BLOCKS';

/* ———————————————————————— view models ———————————————————————— */

export interface ProjectVM {
  id: string;
  name: string;
  objective: string;
  phase: string;
  status: 'active' | 'paused' | 'archived';
  created: string;
}

export interface ArtifactVM {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  kind: string;
  state: 'pending' | 'ingested' | 'approved' | 'changes-requested';
  created: string;
}

export interface SourceVM {
  id: string;
  title: string;
  kind: string;
  note: string;
  created: string;
}

export interface WikiPageVM {
  title: string;
  type: string;
  summary: string;
  links: string[];
  updated: string;
}

export interface DecisionVM {
  id: string;
  title: string;
  reasoning: string;
  supersededBy?: string;
  created: string;
}

export interface EntityVM { id: string; type: string; name: string }
export interface ConceptVM { id: string; title: string; summary: string }

export interface GraphNode {
  id: string;
  type: BrainObjectType;
  label: string;
  edges: GraphEdge[];
}

export interface GraphEdge {
  to: string;
  relationship: RelationshipType;
}

export interface GraphProject {
  projectId: string;
  nodes: GraphNode[];
}

export interface GraphSubgraph {
  centerId: string;
  nodes: GraphNode[];
  depth: number;
}

export interface StudioVM {
  id: string;
  name: string;
  domain: string;
  agentId: string;
  playbooks: string[];
  memoryIds: string[];
}

export interface StudioMemoryVM {
  studioId: string;
  entries: { id: string; kind: string; text: string; created: string }[];
}

export interface CouncilStateVM {
  phase: string;
  custodians: { agentId: string; status: string; task: string | null }[];
  gates: { name: string; verdict: 'pass' | 'hold' | 'pending' }[];
}

export interface ProjectStateVM {
  project: ProjectVM;
  phase: string;
  gate: 'pending' | 'approved' | 'changes-requested';
  openArtifacts: number;
}

export interface IngestResultVM {
  source: SourceVM;
  wikiPages: string[];
  entities: string[];
  audit: 'clean' | 'advisories';
}

/* ———————————————————————— event stream ———————————————————————— */

export type CortexEventType =
  | 'SourceCreated' | 'ArtifactCreated' | 'ArtifactUpdated' | 'EntityCreated'
  | 'ConceptCreated' | 'DecisionCreated' | 'WikiUpdated' | 'GraphUpdated'
  | 'IndexUpdated' | 'AuditCompleted' | 'StudioStarted' | 'StudioCompleted'
  | 'ArtifactDelivered';

export interface CortexEvent {
  id: string;
  type: CortexEventType;
  agentId?: string;
  projectId?: string;
  title: string;
  at: string;
}

/* ———————————————————————— search ———————————————————————— */

export interface BrainSearchResult {
  query: string;
  pages: WikiPageVM[];
  artifacts: ArtifactVM[];
  entities: EntityVM[];
  concepts: ConceptVM[];
  agents: { id: string; name: string; domain: string; color: string }[];
}

/* ———————————————————————— errors ———————————————————————— */

/** Normalized API error — surfaced as non-blocking inline states + feed events. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
