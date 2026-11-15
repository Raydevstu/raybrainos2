// cortex.ts — CortexOS neural store
// Ported from the RAYBRAIN-OS first slice and upgraded for the Next.js runtime:
//  - SSR-safe bootstrap: seed() is deterministic, localStorage hydration happens
//    on the client via initCortex()
//  - Artifact + Source model: raw sources, operational artifacts and the
//    synthesized wiki stay separate layers; nothing enters the Brain except
//    through the Chief Librarian
//  - Emitter-backed setters (no silent mutations that wait for the next tick)
//  - Structured toasts (coalescing, caps, mobile suppression — no HTML injection)
import { useSyncExternalStore } from 'react';
import type { Provider, ModelProfile } from '@/lib/provider-types';
import { isLive } from '@/lib/api/http';
export type { Provider, ModelProfile } from '@/lib/provider-types';

/* ———————————————————————— types ———————————————————————— */

export type ShapeKey = 'blob' | 'round' | 'drop' | 'cloud' | 'bean';
export type AgentStatus = 'idle' | 'working' | 'review';
export type OverlayKind = 'roster' | 'settings' | 'knowledge' | null;
export type KnowledgeTab = 'task' | 'wiki' | 'sources' | 'graph' | 'audit';
export type CommandOrigin = 'command-bar' | 'workspace' | 'map' | 'dock' | 'council';
export type ModalState =
  | { type: 'customize'; id: string }
  | { type: 'add' }
  | { type: 'ingest' }
  | { type: 'constraint' }
  | { type: 'review'; artifactId: string }
  | { type: 'wiki-page' }
  | { type: 'confirm'; title: string; body: string; action: () => void }
  | null;

export interface TaskDef { title: string; steps: string[]; lines: string[] }
export interface AgentTask { title: string; steps: { label: string }[]; stepsDone: number; lines: string[] }
export interface OutLine { text: string; cls?: string; who?: string }
export interface Agent {
  id: string; name: string; domain: string; color: string; shape: ShapeKey;
  model: string; provider: string; personality: string; autonomy: number;
  core?: boolean; custom?: boolean; status: AgentStatus; output: OutLine[];
  task: AgentTask | null; taskIdx: number; lineIdx: number; stepTimer: number; idleTimer: number;
  tasks?: TaskDef[]; replies: string[];
  wx?: number; wy?: number; wr?: number; hoverT?: number;
}
export interface ActivityEvent { t: string; agentId: string; text: string; kind: 'task' | 'artifact' | 'system'; flow?: string }
export interface WikiPage { title: string; type: string; summary: string; links: string[]; updated: string; citations?: string[]; deprecated?: boolean }
/** Every studio output becomes an Artifact. It flows to the Librarian before entering the Brain. */
export interface Artifact { id: string; agentId: string; agentName: string; title: string; kind: string; state: 'pending' | 'ingested'; created: string }
/** Raw source kinds — the Librarian normalizes every one of these through the same pipeline. */
export type SourceKind = 'github-repo' | 'markdown' | 'pdf' | 'docx' | 'txt' | 'meeting-notes' | 'chat-logs' | 'prd' | 'architecture-doc' | 'url' | 'video-transcript' | 'agent-output';
/** Coarse processing states mapped onto the 11-stage ingestion pipeline. */
export type SourceStatus = 'queued' | 'normalized' | 'classified' | 'extracted' | 'linked' | 'indexed' | 'audited';
/** Raw sources are preserved immutably — separate from operational memory and the synthesized wiki. */
export interface Source { id: string; title: string; kind: SourceKind; note: string; created: string; status: SourceStatus }
export interface Toast { id: string; title: string; msg: string; icon: string; count: number; undo?: () => void }
export interface Theme { id: string; name: string; desc: string; bg: string; sf: string; ac: string; ac2: string }
export interface WorkRequest { agentId: string; command: string; origin: CommandOrigin }
export interface WorkResponse { accepted: boolean; agentId: string; routedTo?: string; message: string }

/* ———————————————————————— harness types (Hermes / DeepSeek layer) ———————————————————————— */

export type HarnessLayout = 'simple' | 'focus' | 'deck' | 'council' | 'quad' | 'custom';
export interface TermLine { text: string; cls?: string }
/** A harness session binds project, agents, model profile, sandbox and layout. */
export interface HarnessSession {
  id: string; name: string; project: string; agents: string[];
  profileName: string; sandbox: 'isolated-demo' | 'live' | 'connecting';
  layout: HarnessLayout; created: string;
}
/** Files seeded from the Solar CRM workspace — reviewable artifacts, not decoration. */
export interface HarnessFile {
  path: string; name: string; kind: string; createdBy: string;
  decisions: string[]; content: string; review: 'pending' | 'approved' | 'changes'; lang: string;
}
/** MCP / tools marketplace connector. */
export interface Connector {
  id: string; name: string; icon: string; desc: string;
  connected: boolean; auth: string; allowedAgents: string[]; custom: boolean;
}
export interface SyncLogEntry { t: string; text: string; ok: boolean }
export interface WarRoomState {
  agentsActive: number; agentsTotal: number; tasksRunning: number; wikiPages: number;
  buildPct: number; health: number; artifactsPending: number; artifactsIngested: number; events: number;
}

/* ———————————————————————— governance types (Jarvis operating model) ———————————————————————— */

export type PhaseKey = 'discovery' | 'product' | 'design' | 'architecture' | 'development' | 'qa' | 'release';
export type PhaseStatus = 'pending' | 'active' | 'review' | 'approved' | 'blocked';
export interface PhaseInfo { key: PhaseKey; label: string; studio: string; status: PhaseStatus; deliverable: string; deadline: string }
export interface Blocker { id: string; text: string; phase?: PhaseKey; raised: string }
export interface RiskItem { id: string; text: string; level: 'low' | 'medium' | 'high' }
/** Jarvis/MainBrain owns the project lifecycle. Studios never advance past a gate on their own. */
export interface GovernanceState {
  project: string; objective: string; phaseIdx: number; phases: PhaseInfo[];
  blockers: Blocker[]; risks: RiskItem[]; constraints: string[];
}

/* ———————————————————————— librarian memory types ———————————————————————— */

export interface EntityItem { id: string; name: string; type: 'entity' | 'concept'; sourceId?: string }
export type FindingKind = 'duplicate-concept' | 'orphan-page' | 'broken-reference' | 'contradiction' | 'stale-claim' | 'missing-summary' | 'unverified-claim';
export interface AuditFinding { id: string; kind: FindingKind; target: string; detail: string; severity: 'low' | 'medium' | 'high'; status: 'open' | 'resolved' | 'dismissed' }
export type GraphNodeKind = 'project' | 'source' | 'wikipage' | 'artifact' | 'entity' | 'concept' | 'agent';
export interface GraphVNode { id: string; kind: GraphNodeKind; label: string; meta?: string }
export interface GraphVEdge { from: string; to: string; rel: string }

/* ———————————————————————— constants ———————————————————————— */

export const SHAPES: Record<ShapeKey, string> = {
  blob: 'M50 8 C74 6 92 24 90 48 C88 74 72 92 48 90 C24 88 8 72 10 46 C12 22 28 10 50 8 Z',
  round: 'M50 10 C78 10 90 22 90 50 C90 78 78 90 50 90 C22 90 10 78 10 50 C10 22 22 10 50 10 Z',
  drop: 'M52 6 C70 14 88 34 86 56 C84 80 66 92 46 90 C24 88 12 70 14 48 C16 28 34 10 52 6 Z',
  cloud: 'M35 18 C45 8 62 10 68 20 C82 18 92 30 88 42 C98 50 94 66 82 70 C80 84 64 92 52 86 C40 94 24 88 22 76 C10 72 6 56 16 48 C10 36 20 22 35 18 Z',
  bean: 'M28 20 C44 6 70 10 80 26 C92 40 90 62 76 76 C60 92 36 92 24 78 C10 64 12 36 28 20 Z'
};
export const PALETTE = ['#8b5cf6', '#9c6b3f', '#e8433f', '#f2711c', '#f5a623', '#4fbe6c', '#45b8ac', '#3b7cf6', '#ec4899', '#22d3ee'];
export const THEMES: Theme[] = [
  { id: 'cortex', name: 'Cortex Midnight', desc: 'Deep-space command deck', bg: '#07090f', sf: '#0e131d', ac: '#4f8cff', ac2: '#22d3ee' },
  { id: 'notebook', name: 'NotebookLM', desc: 'Google paper & ink', bg: '#f4f7fb', sf: '#ffffff', ac: '#0b57d0', ac2: '#8ab4f8' },
  { id: 'hermes', name: 'Hermes Navy', desc: 'All-blue harness deck', bg: '#0a1633', sf: '#112451', ac: '#6ea8ff', ac2: '#a3c6ff' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'Crisp white & electric blue', bg: '#ffffff', sf: '#f6f8fb', ac: '#4d6bfe', ac2: '#a5b8ff' },
  { id: 'harness', name: 'Terminal Harness', desc: 'Phosphor green, dense mono', bg: '#0a0d0a', sf: '#111711', ac: '#4ade80', ac2: '#a3e635' },
  { id: 'graphite', name: 'Graphite Pro', desc: 'Neutral, restrained, premium', bg: '#0e0f12', sf: '#16181d', ac: '#8b9cf6', ac2: '#c4b5fd' }
];
export const WIKI_TYPES: Record<string, string> = { concept: '#0ea5e9', doctrine: '#8b5cf6', summary: '#9c6b3f', decision: '#f59e0b', pattern: '#10b981', playbook: '#ec4899' };
export const ARTIFACT_KINDS: Record<string, string> = {
  mainbrain: 'directive', librarian: 'summary', discovery: 'research', product: 'spec',
  design: 'design', architecture: 'blueprint', development: 'build', qa: 'report', release: 'runbook'
};
/** Raw source taxonomy the Librarian accepts — every kind walks the same pipeline. */
export const SOURCE_KINDS: Record<SourceKind, { label: string; icon: string }> = {
  'github-repo': { label: 'GitHub Repo', icon: 'git' },
  markdown: { label: 'Markdown', icon: 'file' },
  pdf: { label: 'PDF', icon: 'file' },
  docx: { label: 'DOCX', icon: 'file' },
  txt: { label: 'TXT', icon: 'file' },
  'meeting-notes': { label: 'Meeting Notes', icon: 'users' },
  'chat-logs': { label: 'Chat Logs', icon: 'terminal' },
  prd: { label: 'PRD', icon: 'doc' },
  'architecture-doc': { label: 'Architecture Doc', icon: 'layers' },
  url: { label: 'URL', icon: 'globe' },
  'video-transcript': { label: 'Video Transcript', icon: 'monitor' },
  'agent-output': { label: 'Agent Output', icon: 'bot' }
};
/** The Librarian pipeline every raw source walks — rendered stage by stage. */
export const INGEST_STAGES = ['Source Upload', 'Normalizer', 'Classifier', 'Entity Extraction', 'Concept Extraction', 'Relationship Mapping', 'Artifact Creation', 'Wiki Update', 'Graph Update', 'Vector Index', 'Audit'] as const;
export const SOURCE_STATUSES: SourceStatus[] = ['queued', 'normalized', 'classified', 'extracted', 'linked', 'indexed', 'audited'];
/** Project lifecycle — Jarvis sequences these; studios never skip ahead. */
export const PHASE_ORDER: PhaseKey[] = ['discovery', 'product', 'design', 'architecture', 'development', 'qa', 'release'];
export const PHASE_META: Record<PhaseKey, { label: string; studio: string; deliverable: string; deadline: string }> = {
  discovery: { label: 'Discovery', studio: 'discovery', deliverable: 'Market scan + personas', deadline: 'Fri · this week' },
  product: { label: 'Product', studio: 'product', deliverable: 'PRD v0.1 — scope + stories', deadline: 'Mon · next week' },
  design: { label: 'Design', studio: 'design', deliverable: 'Neural Dock wireframes', deadline: 'Wed · next week' },
  architecture: { label: 'Architecture', studio: 'architecture', deliverable: 'OpenAPI + ERD blueprint', deadline: 'Fri · next week' },
  development: { label: 'Development', studio: 'development', deliverable: 'Working build (beta)', deadline: 'Wed · week 2' },
  qa: { label: 'QA', studio: 'qa', deliverable: 'Test report + gate verdict', deadline: 'Thu · week 2' },
  release: { label: 'Release', studio: 'release', deliverable: 'Blue-green runbook + ship', deadline: 'Fri · week 2' }
};
export const FINDING_META: Record<FindingKind, { label: string; icon: string }> = {
  'duplicate-concept': { label: 'Duplicate concept', icon: 'copy' },
  'orphan-page': { label: 'Orphan page', icon: 'unlink' },
  'broken-reference': { label: 'Broken reference', icon: 'link' },
  contradiction: { label: 'Contradiction', icon: 'warn' },
  'stale-claim': { label: 'Stale claim', icon: 'clock' },
  'missing-summary': { label: 'Missing summary', icon: 'edit' },
  'unverified-claim': { label: 'Unverified claim', icon: 'cite' }
};

/* ———————————————————————— seed data ———————————————————————— */

const DEFS: any[] = [
  { id: 'mainbrain', name: 'MainBrain', domain: 'Core OS · Supervisor', color: '#8b5cf6', shape: 'round', model: 'gemini-2.5-pro', provider: 'Gemini', personality: 'Balanced', autonomy: 80, core: true, replies: ['Routing directive across the council. Studios never self-organise — I sequence them.', 'Project state synced. Solar CRM is in {phase} phase. All rail guards enforced.', 'Directive acknowledged. Delegating to the right custodian and watching the gates.'] },
  { id: 'librarian', name: 'Librarian', domain: 'Wiki & Knowledge', color: '#9c6b3f', shape: 'blob', model: 'gemini-2.5-flash', provider: 'Gemini', personality: 'Precise', autonomy: 90, tasks: [{ title: 'Ripple new sources into the Wiki', steps: ['Normalize incoming sources', 'Classify & extract entities', 'Map relationships', 'Update wiki pages', 'Sync graph + vector index'], lines: ['✓ raw/ competitor-scan.md preserved (immutable)', '› extracting entities: Stripe, SolarEdge, Enphase…', '✓ concept page "Agent Routing" rippled (+6 backlinks)', '› doctrine check: no contradictions found', '✓ wiki/index.md updated — 3 pages touched', '✓ vector store: 128 embeddings upserted', '› knowledge graph: 14 edges merged', '✓ audit clean · 0 orphan pages'] }], replies: ['Filed. Raw source preserved, summary written, and rippled through every relevant page — with receipts.', 'Indexed and cross-linked. The wiki references project data; it never owns it.', 'Knowledge compounded. Ask me anything — I answer from the wiki, with citations.'] },
  { id: 'discovery', name: 'Discovery', domain: 'Research · Validation', color: '#e8433f', shape: 'drop', model: 'gemini-2.5-flash', provider: 'Gemini', personality: 'Creative', autonomy: 70, tasks: [{ title: 'Competitor analysis — Solar CRM', steps: ['Scan market landscape', 'Identify top competitors', 'Extract pricing & gaps', 'Synthesize user personas', 'Deliver research report'], lines: ['› scanning: solar CRM, field-service SaaS…', '✓ found 5 competitors: Jobber, ServiceTitan, SolarNinja…', '✓ pricing gap: no AI quote-follow-up under $99/mo', '› persona: "Installer Ian" — 12 trucks, spreadsheet chaos', '✓ opportunity score: 8.4 / 10', '✓ report drafted → Artifact', '› handing off to Librarian…', '✓ Discovery report delivered'] }, { title: 'Validate onboarding hypothesis', steps: ['Frame hypothesis', 'Pull interview notes', 'Score evidence', 'Write validation memo', 'Deliver to Product'], lines: ['› hypothesis: "installers churn on data entry"', '✓ 7 interviews reference manual entry pain', '✓ evidence strength: strong', '› memo: kill the 14-field lead form', '✓ memo delivered → Librarian'] }], replies: ['On it. I validate before anyone builds — evidence first, opinions second.', 'Research underway. Competitors, personas and gaps will land as artifacts in the Brain.', 'Found the signal. Writing it up with sources so Product can act on it.'] },
  { id: 'product', name: 'Product', domain: 'Strategy & PRDs', color: '#f2711c', shape: 'bean', model: 'claude-sonnet-4.6', provider: 'Anthropic', personality: 'Balanced', autonomy: 70, tasks: [{ title: 'Draft MVP PRD — Solar CRM', steps: ['Ingest Discovery report', 'Define MVP scope', 'Write user stories', 'Set acceptance criteria', 'Deliver PRD'], lines: ['› reading Discovery artifacts from Brain…', '✓ MVP: Leads · Quotes · Follow-ups (only)', '✓ 14 user stories drafted', '› acceptance: quote follow-up < 30s, mobile-first', '✓ roadmap: 3 sprints to beta', '✓ PRD v0.1 → Artifact', '› notifying MainBrain: gate ready', '✓ PRD delivered → Librarian'] }], replies: ['Scope locked. MVP means minimum — everything else goes to the backlog with a reason.', 'PRD updated. User stories and acceptance criteria are in the Brain for Design and Architecture.', 'Prioritized by impact over effort. The roadmap now reflects your directive.'] },
  { id: 'design', name: 'Design', domain: 'UI / UX', color: '#f5a623', shape: 'cloud', model: 'gpt-5.2', provider: 'OpenAI', personality: 'Creative', autonomy: 70, tasks: [{ title: 'Wireframe 12 screens — Solar CRM', steps: ['Read PRD + personas', 'Map user flows', 'Wireframe core screens', 'Build design system', 'Accessibility pass', 'Deliver design package'], lines: ['› flows: lead → quote → follow-up → won', '✓ 12 screens wireframed (mobile-first)', '✓ design system: 8pt grid, solar-amber accent', '› component map: 24 components', '✓ a11y: contrast AA, 44px targets', '✓ prototype linked', '› design package → Artifact', '✓ Design approved-ready → Librarian'] }, { title: 'Design pricing screen', steps: ['Gather pricing context', 'Sketch 3 variants', 'Pick + refine winner', 'Spec components', 'Deliver wireframe'], lines: ['› 3 variants: cards / table / slider', '✓ variant B wins: comparison cards', '✓ annual toggle + savings badge', '✓ specs: 6 components, 2 states', '✓ wireframe delivered → Librarian'] }], replies: ['Sketching now. Flows first, pixels second — and every screen gets an accessibility pass.', 'Design updated. Wireframes and the component map are synced to the Brain.', 'I explore three directions and bring you the strongest one, with rationale.'] },
  { id: 'architecture', name: 'Architecture', domain: 'Systems & APIs', color: '#4fbe6c', shape: 'blob', model: 'claude-sonnet-4.6', provider: 'Anthropic', personality: 'Precise', autonomy: 65, tasks: [{ title: 'Design API schema — Solar CRM', steps: ['Review PRD + approved design', 'Model database (ERD)', 'Draft OpenAPI spec', 'Plan infrastructure', 'Security review', 'Deliver blueprint'], lines: ['› entities: Lead, Quote, FollowUp, Crew', '✓ ERD: 9 tables, soft deletes, audit cols', '✓ OpenAPI 3.1: 22 endpoints drafted', '› stack chosen: API-first, event-driven core', '✓ auth: OAuth + row-level security', '✓ infra plan: managed Postgres + edge cache', '› blueprint → Artifact', '✓ Architecture delivered → Librarian'] }], replies: ['Blueprint updated. Contracts before code — Development builds against the OpenAPI spec, never guesses.', 'Schema revised. Migrations, indexes and security boundaries are documented in the Brain.', 'Trade-offs flagged and the decision recorded with reasoning, per doctrine.'] },
  { id: 'development', name: 'Development', domain: 'Build & Code', color: '#45b8ac', shape: 'round', model: 'deepseek-v4.1', provider: 'DeepSeek', personality: 'Precise', autonomy: 75, tasks: [{ title: 'Scaffolding project structure', steps: ['Initializing repository', 'Creating folder structure', 'Generating components', 'Setting up dependencies', 'Running tests', 'Ready for your review'], lines: ['✓ /src/components/ created', '✓ /src/agents/ created', '✓ /src/styles/ created', '› generating App shell…', '› wiring /api/quotes route…', '✓ 42 files scaffolded', '✓ deps installed · lockfile pinned', '› vitest: 18 passing, 0 failing', '✓ Project structure ready'] }, { title: 'Implement quote follow-up API', steps: ['Read OpenAPI contract', 'Generate CRUD routes', 'Add follow-up scheduler', 'Write integration tests', 'Deliver service'], lines: ['› contract: POST /quotes/{id}/followup', '✓ routes generated from spec', '✓ scheduler: 24h / 72h nudges', '✓ tests: 12 integration cases green', '✓ service delivered → Librarian'] }], replies: ['Building. I work against the approved contracts — diffs land in review.', 'Code shipped to the workspace. Tests green, patterns indexed by the Librarian for next time.', 'Scaffold ready. Every file is an artifact the Brain can trace back to its decision.'] },
  { id: 'qa', name: 'QA', domain: 'Security & Testing', color: '#3b7cf6', shape: 'drop', model: 'gpt-5.2-mini', provider: 'OpenAI', personality: 'Precise', autonomy: 70, tasks: [{ title: 'Security & accessibility sweep', steps: ['Static analysis', 'Dependency audit', 'Auth & access tests', 'Accessibility tests', 'Compile QA report'], lines: ['› semgrep: 0 critical, 2 low findings', '✓ deps: no known CVEs', '✓ authz: row-level tests passing', '✓ a11y: axe-core 0 violations', '› pen-test checklist: SOC2-ready', '✓ QA report → Artifact', '✓ gate verdict: PASS (2 advisories)'] }], replies: ['Sweeping now. Nothing ships past me without tests, scans and an accessibility pass.', 'Found and filed the issues — bug reports are in the Brain, linked to the offending artifacts.', 'Gate verdict posted. MainBrain has the report; release stays blocked until advisories clear.'] },
  { id: 'release', name: 'Release', domain: 'Deploy & Ops', color: '#ec4899', shape: 'bean', model: 'llama-4-scout:local', provider: 'Ollama', personality: 'Balanced', autonomy: 60, tasks: [{ title: 'Prepare deployment plan', steps: ['Check QA gate', 'Draft release runbook', 'Configure CI/CD', 'Plan rollback strategy', 'Deliver deployment plan'], lines: ['› QA gate: PASS — proceeding', '✓ runbook: blue-green deploy', '✓ CI: lint → test → build → canary', '✓ rollback: one-command restore', '› monitoring: uptime + error budgets', '✓ deployment plan → Librarian'] }], replies: ['Runbook drafted. Canary first, then full rollout — rollback is one command away.', 'Deployment plan is in the Brain. I only move when QA’s gate says PASS.', 'Monitoring wired. Dashboards and alerts feed straight back into the War Room.'] }
];

const WIKI_SEED: WikiPage[] = [
  { title: 'Agent Routing', type: 'concept', summary: 'The brain-stem of CortexOS: every directive flows You → MainBrain → Studio Router → custodian agent. Agents never self-organise; the supervisor sequences work and enforces gates.', links: ['Event-Driven Architecture', 'Studio Framework'], updated: '2d' },
  { title: 'Event-Driven Architecture', type: 'doctrine', summary: 'Every action becomes an event: SourceCreated, ArtifactCreated, DecisionCreated. Events flow to the Librarian queue; workers update wiki, graph, search and audit. Nothing enters the Brain directly.', links: ['Agent Routing', 'Chief Librarian Pipeline'], updated: '3d' },
  { title: 'Solar CRM — Competitor Scan', type: 'summary', summary: 'Five competitors mapped (Jobber, ServiceTitan, SolarNinja, Sunbase, FieldPulse). Gap: no AI-driven quote follow-up under $99/mo. Persona "Installer Ian" validated across 7 interviews.', links: ['Solar CRM — PRD v0.1', 'Opportunity Scoring'], updated: '5h', citations: ['src1', 'src2'] },
  { title: 'OAuth Provider Decision', type: 'decision', summary: 'Chose OAuth + row-level security over API-key auth for the Solar CRM. Reasoning: multi-crew access boundaries, SOC2 readiness, revocability. Supersedes the v0 API-key sketch.', links: ['Security Patterns', 'Solar CRM — ERD'], updated: '1d', citations: ['src3'] },
  { title: 'Studio Framework', type: 'doctrine', summary: 'A Studio is the operating environment for a domain: agent + rules + constraints + skills + templates + playbooks + tools + memory. The studio is the asset; the agent is replaceable.', links: ['Agent Routing', 'Design Review Checklist'], updated: '4d', citations: ['src3'] },
  { title: 'Neural Dock UX', type: 'pattern', summary: 'Agents are summoned, not navigated. A persistent bot dock replaces tabs; each domain opens only on click, keeping the screen clean. War Room is a monitoring layer, not the primary nav.', links: ['War Room Contract'], updated: '8h' },
  { title: 'Qdrant vs pgvector', type: 'decision', summary: 'Dedicated vector store selected for semantic retrieval at scale; the operational store remains the source of truth. Wiki is a derived layer — never the source of truth (avoids the Editorial Trap).', links: ['Event-Driven Architecture'], updated: '6d', citations: ['src2'] },
  { title: 'Release Runbook — Blue-Green', type: 'playbook', summary: 'Blue-green deploy: canary 5% → metrics watch 15m → full rollout. Rollback is one command. Error budgets and uptime alerts feed the War Room automatically.', links: ['Deployment Patterns'], updated: '2d', citations: ['src3'] }
];

const SOURCE_SEED: Source[] = [
  { id: 'src1', title: 'Interview — Installer Ian', kind: 'meeting-notes', note: '12 trucks, 3 coordinators, quote follow-up lives in spreadsheets. Churn happens between quote and signature.', created: '2d', status: 'audited' },
  { id: 'src2', title: 'Competitor pricing scan', kind: 'url', note: 'Jobber $39/user, ServiceTitan enterprise, SolarNinja $99. None offer AI-driven follow-up under $99/mo.', created: '5h', status: 'audited' },
  { id: 'src3', title: 'Kickoff notes — Solar CRM', kind: 'markdown', note: 'Goal: AI CRM for solar companies. MVP scope: leads, quotes, follow-ups. Ship a beta in 3 sprints.', created: '6d', status: 'audited' }
];

const ENTITY_SEED: EntityItem[] = [
  { id: 'ent-1', name: 'Installer Ian', type: 'entity', sourceId: 'src1' },
  { id: 'ent-2', name: 'Jobber', type: 'entity', sourceId: 'src2' },
  { id: 'ent-3', name: 'ServiceTitan', type: 'entity', sourceId: 'src2' },
  { id: 'ent-4', name: 'Solar CRM', type: 'entity', sourceId: 'src3' },
  { id: 'ent-5', name: 'OAuth', type: 'concept', sourceId: 'src3' },
  { id: 'ent-6', name: 'AI Follow-Up', type: 'concept', sourceId: 'src1' },
  { id: 'ent-7', name: 'Blue-Green Deploy', type: 'concept' }
];

const FINDING_SEED: AuditFinding[] = [
  { id: 'fnd-1', kind: 'broken-reference', target: 'OAuth Provider Decision', detail: 'Links to missing page "Security Patterns" — dangling reference.', severity: 'medium', status: 'open' },
  { id: 'fnd-2', kind: 'unverified-claim', target: 'Agent Routing', detail: 'States routing doctrine without citing a raw source.', severity: 'medium', status: 'open' },
  { id: 'fnd-3', kind: 'orphan-page', target: 'Neural Dock UX', detail: 'No other page references this — link it or deprecate it.', severity: 'low', status: 'open' },
  { id: 'fnd-4', kind: 'contradiction', target: 'OAuth Provider Decision', detail: 'Claims to supersede the v0 API-key sketch, but no v0 decision page exists in the wiki.', severity: 'low', status: 'open' }
];

/** Solar CRM lifecycle seed: Discovery just delivered — the Jarvis gate is armed. */
function govSeed(): GovernanceState {
  return {
    project: 'Solar CRM',
    objective: 'AI CRM for solar companies — beta in 3 sprints',
    phaseIdx: 0,
    phases: PHASE_ORDER.map(k => ({ key: k, ...PHASE_META[k], status: k === 'discovery' ? 'review' : 'pending' } as PhaseInfo)),
    blockers: [],
    risks: [
      { id: 'risk-1', text: 'OAuth scope creep could stall Architecture', level: 'medium' },
      { id: 'risk-2', text: 'Provider rate limits during bulk ingestion', level: 'low' },
      { id: 'risk-3', text: 'Single maintainer bus-factor on release runbook', level: 'low' }
    ],
    constraints: ['Ship demo by Friday review', 'No PII in demo data', 'Every wiki claim must cite a raw source']
  };
}

const PROV_SEED: Provider[] = [
  { id: 'gemini', name: 'Gemini', icon: 'spark', color: '#4f8cff', type: 'account', apiMode: 'auto', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKeyRef: '${GOOGLE_OAUTH}', connected: true, health: 'online', custom: false, models: [{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1048576 }, { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576 }] },
  { id: 'anthropic', name: 'Anthropic', icon: 'cpu', color: '#f2711c', type: 'api-key', apiMode: 'anthropic-messages', baseUrl: 'https://api.anthropic.com/v1', apiKeyRef: '${ANTHROPIC_API_KEY}', connected: true, health: 'online', custom: false, models: [{ id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', contextWindow: 200000 }, { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', contextWindow: 200000 }] },
  { id: 'openai', name: 'OpenAI', icon: 'globe', color: '#45b8ac', type: 'api-key', apiMode: 'chat-completions', baseUrl: 'https://api.openai.com/v1', apiKeyRef: '${OPENAI_API_KEY}', connected: true, health: 'online', custom: false, models: [{ id: 'gpt-5.2', name: 'GPT-5.2', contextWindow: 400000 }, { id: 'gpt-5.2-mini', name: 'GPT-5.2 mini', contextWindow: 400000 }] },
  { id: 'openrouter', name: 'OpenRouter', icon: 'link', color: '#f5a623', type: 'custom-endpoint', apiMode: 'chat-completions', baseUrl: 'https://openrouter.ai/api/v1', apiKeyRef: '${OPENROUTER_API_KEY}', connected: true, health: 'online', custom: false, models: [{ id: 'auto/router', name: 'Auto Router', contextWindow: 200000 }] },
  { id: 'groq', name: 'Groq', icon: 'zap', color: '#e8433f', type: 'api-key', apiMode: 'chat-completions', baseUrl: 'https://api.groq.com/openai/v1', apiKeyRef: '${GROQ_API_KEY}', connected: true, health: 'degraded', custom: false, models: [{ id: 'llama-4-scout-24b', name: 'Llama 4 Scout 24B', contextWindow: 131072 }] },
  { id: 'deepseek', name: 'DeepSeek · custom', icon: 'zap', color: '#8b5cf6', type: 'custom-endpoint', apiMode: 'chat-completions', baseUrl: 'https://opencode.ai/inference/v1', apiKeyRef: '${DEEPSEEK_KEY}', connected: true, health: 'online', custom: true, defaultModel: 'deepseek-v4.1', models: [{ id: 'deepseek-v4.1', name: 'DeepSeek V4.1', contextWindow: 128000 }, { id: 'deepseek-r2', name: 'DeepSeek R2', contextWindow: 128000 }] },
  { id: 'ollama', name: 'Ollama · local', icon: 'terminal', color: '#ec4899', type: 'local', apiMode: 'ollama', baseUrl: 'http://localhost:11434', connected: true, health: 'online', custom: false, models: [{ id: 'llama-4-scout:local', name: 'Llama 4 Scout (local)', contextWindow: 131072 }, { id: 'qwen3-coder:local', name: 'Qwen3 Coder (local)', contextWindow: 131072 }] }
];

/* ———————————————————————— harness + model profile seeds ———————————————————————— */

const PROFILE_SEED: ModelProfile = {
  id: 'profile-main', name: 'Solar CRM · Balanced',
  mainModel: 'gemini-2.5-pro',
  fallbackModels: ['claude-sonnet-4.6', 'gpt-5.2', 'deepseek-v4.1'],
  auxiliaryModel: 'gemini-2.5-flash',
  perAgentOverrides: {},
  temperature: 0.7, maxTokens: 8192
};

const HARN_SESS: HarnessSession[] = [
  { id: 'ses-solar', name: 'Solar CRM build', project: 'Solar CRM', agents: ['mainbrain', 'librarian', 'discovery', 'product', 'design', 'architecture', 'development', 'qa', 'release'], profileName: PROFILE_SEED.name, sandbox: 'isolated-demo', layout: 'deck', created: '2d' },
  { id: 'ses-design', name: 'Design review', project: 'Solar CRM', agents: ['mainbrain', 'design', 'librarian'], profileName: PROFILE_SEED.name, sandbox: 'isolated-demo', layout: 'focus', created: '1d' },
  { id: 'ses-api', name: 'API contract generation', project: 'Solar CRM', agents: ['mainbrain', 'architecture', 'development'], profileName: PROFILE_SEED.name, sandbox: 'isolated-demo', layout: 'council', created: '5h' }
];

const HARN_FILES: HarnessFile[] = [
  { path: '/docs/prd.md', name: 'prd.md', kind: 'spec', createdBy: 'Product', decisions: ['MVP scope: leads · quotes · follow-ups', 'Mobile-first'], review: 'approved', lang: 'markdown', content: '# Solar CRM — PRD v0.1\n\n## MVP scope\n- Leads capture (mobile-first)\n- Quotes with line items\n- AI follow-ups (24h / 72h nudges)\n\n## Acceptance\n- Quote follow-up generated in < 30s\n- 14-field lead form killed → 5 fields\n\n## Out of scope (backlog with reasons)\n- Invoicing — depends on accounting integration' },
  { path: '/docs/openapi.yaml', name: 'openapi.yaml', kind: 'blueprint', createdBy: 'Architecture', decisions: ['OAuth + row-level security', 'Event-driven core', 'Contracts before code'], review: 'pending', lang: 'yaml', content: 'openapi: 3.1.0\ninfo:\n  title: Solar CRM API\n  version: 0.1.0\npaths:\n  /quotes:\n    post:\n      summary: Create quote\n      security: [{ oauth2: [] }]\n  /quotes/{id}/followup:\n    post:\n      summary: Schedule AI follow-up\n      responses:\n        "202": { description: nudge scheduled }' },
  { path: '/src/components/QuoteCard.tsx', name: 'QuoteCard.tsx', kind: 'build', createdBy: 'Development', decisions: ['8pt grid design system'], review: 'pending', lang: 'tsx', content: 'export function QuoteCard({ quote }: { quote: Quote }) {\n  return (\n    <Card padding={8}>\n      <QuoteTotal value={quote.total} />\n      <FollowUpToggle quoteId={quote.id} />\n    </Card>\n  );\n}' },
  { path: '/src/agents/followup.ts', name: 'followup.ts', kind: 'build', createdBy: 'Development', decisions: ['Follow-up scheduler 24h/72h'], review: 'pending', lang: 'ts', content: '// AI follow-up agent — nudges installers between quote and signature.\nexport async function scheduleNudge(quoteId: string) {\n  await queue.push("followup", { quoteId, windows: [24, 72] });\n  return { scheduled: true };\n}' },
  { path: '/src/styles/theme.css', name: 'theme.css', kind: 'design', createdBy: 'Design', decisions: ['Solar-amber accent', 'AA contrast'], review: 'changes', lang: 'css', content: ':root {\n  --accent: #f5a623;        /* solar amber */\n  --surface: #16181d;\n  --radius: 12px;\n}\n/* FIXME(review): focus ring contrast fails AA on amber — pending fix */' },
  { path: '/api/quotes/route.ts', name: 'route.ts', kind: 'blueprint', createdBy: 'Development', decisions: ['Contracts before code'], review: 'pending', lang: 'ts', content: '// Generated from /docs/openapi.yaml — do not hand-edit contracts.\nexport async function POST(req: Request) {\n  const quote = await parseQuote(req);\n  return json(201, await createQuote(quote));\n}' }
];

const HARN_CONN: Connector[] = [
  { id: 'github', name: 'GitHub', icon: 'git', desc: 'Repos, PRs, issues — artifact delivery tracking.', connected: true, auth: 'oauth · raydevstu', allowedAgents: ['development', 'release'], custom: false },
  { id: 'linear', name: 'Linear', icon: 'layers', desc: 'Issues and cycles synced with the mission board.', connected: true, auth: 'api key', allowedAgents: ['product', 'qa'], custom: false },
  { id: 'raymemory', name: 'Ray Memory', icon: 'db', desc: 'Long-horizon project memory for every agent.', connected: true, auth: 'account', allowedAgents: ['mainbrain', 'librarian'], custom: false },
  { id: 'aion', name: 'Aion Knowledge', icon: 'book', desc: 'External knowledge retrieval for research.', connected: false, auth: 'not connected', allowedAgents: ['discovery'], custom: false },
  { id: 'canva', name: 'Canva', icon: 'palette', desc: 'Design asset export into artifact review.', connected: false, auth: 'not connected', allowedAgents: ['design'], custom: false },
  { id: 'fs', name: 'Filesystem', icon: 'folder', desc: 'Sandboxed read/write inside the session cwd.', connected: true, auth: 'sandbox', allowedAgents: ['development', 'architecture'], custom: false },
  { id: 'bsearch', name: 'Browser Search', icon: 'globe', desc: 'Live web search — results land as raw sources.', connected: true, auth: 'gateway', allowedAgents: ['discovery', 'librarian'], custom: false }
];

/* ———————————————————————— war room v2 types (constitution amendment, PROMPT 10) ———————————————————————— */

/**
 * CONSTITUTION v2:
 *  - 4v2: The War Room is the primary operating environment of CortexOS. The
 *    Agent-Bot Dock survives as a quick-summon strip INSIDE the War Room.
 *  - 6v2: Home = MainBrain neural map + dock, the calm landing view.
 *    "Enter War Room" is the primary CTA. War Room is where work happens.
 * All other clauses remain locked.
 */
export type UserMode = 'simple' | 'advanced' | 'custom';
export type CenterMode = 'chat' | 'tasks' | 'knowledge' | 'dashboard' | 'agent' | 'workflow' | 'canvas' | 'browser';
export type DockTab = 'terminal' | 'sandbox' | 'harness' | 'browser' | 'jobs';
export type RightTab = 'activity' | 'knowledge' | 'task';

/** Simple stays calm: only Chat, Knowledge and Tasks. Advanced unlocks the full deck. */
export const MODES_BY_LEVEL: Record<UserMode, CenterMode[]> = {
  simple: ['chat', 'tasks', 'knowledge'],
  advanced: ['chat', 'tasks', 'knowledge', 'dashboard', 'agent', 'workflow', 'canvas', 'browser'],
  custom: ['chat', 'tasks', 'knowledge', 'dashboard', 'agent', 'workflow', 'canvas', 'browser']
};
export const CENTER_MODE_META: Record<CenterMode, { label: string; icon: string }> = {
  chat: { label: 'Chat', icon: 'chat' },
  tasks: { label: 'Tasks', icon: 'list' },
  knowledge: { label: 'Knowledge', icon: 'book' },
  dashboard: { label: 'Dashboard', icon: 'target' },
  agent: { label: 'Agents', icon: 'bot' },
  workflow: { label: 'Automations', icon: 'flow' },
  canvas: { label: 'Canvas', icon: 'frame' },
  browser: { label: 'Browser', icon: 'compass' }
};
export const DOCK_TAB_META: Record<DockTab, { label: string; icon: string }> = {
  terminal: { label: 'Terminal', icon: 'terminal' },
  sandbox: { label: 'Sandbox', icon: 'layers' },
  harness: { label: 'Harness', icon: 'cpu' },
  browser: { label: 'Browser', icon: 'compass' },
  jobs: { label: 'Jobs', icon: 'clock' }
};

/** A workspace layout: which panels are open, which mode is active, panel sizes (%). */
export interface LayoutState {
  centerMode: CenterMode;
  dockOpen: boolean;
  dockTab: DockTab;
  dockSize: number;
  rightOpen: boolean;
  rightTab: RightTab;
  sidebarCollapsed: boolean;
  leftSize: number;
  rightSize: number;
}
export interface SavedLayout { id: string; name: string; userMode: UserMode; layout: LayoutState; createdAt: string }

/** Shipped layout presets — Research, Coding, Automation, Content Creation, Web Ops. */
export const LAYOUT_PRESETS: SavedLayout[] = [
  { id: 'lay-research', name: 'Research', userMode: 'custom', createdAt: 'preset', layout: { centerMode: 'chat', dockOpen: true, dockTab: 'browser', dockSize: 34, rightOpen: true, rightTab: 'knowledge', sidebarCollapsed: false, leftSize: 15, rightSize: 24 } },
  { id: 'lay-coding', name: 'Coding', userMode: 'custom', createdAt: 'preset', layout: { centerMode: 'chat', dockOpen: true, dockTab: 'terminal', dockSize: 40, rightOpen: true, rightTab: 'activity', sidebarCollapsed: false, leftSize: 13, rightSize: 22 } },
  { id: 'lay-automation', name: 'Automation', userMode: 'custom', createdAt: 'preset', layout: { centerMode: 'workflow', dockOpen: true, dockTab: 'jobs', dockSize: 32, rightOpen: true, rightTab: 'task', sidebarCollapsed: false, leftSize: 15, rightSize: 24 } },
  { id: 'lay-content', name: 'Content Creation', userMode: 'custom', createdAt: 'preset', layout: { centerMode: 'canvas', dockOpen: true, dockTab: 'harness', dockSize: 30, rightOpen: true, rightTab: 'knowledge', sidebarCollapsed: false, leftSize: 15, rightSize: 24 } },
  { id: 'lay-webops', name: 'Web Ops', userMode: 'custom', createdAt: 'preset', layout: { centerMode: 'browser', dockOpen: true, dockTab: 'browser', dockSize: 36, rightOpen: true, rightTab: 'activity', sidebarCollapsed: false, leftSize: 13, rightSize: 22 } }
];

/* ————— Jarvis chat: conversations become actions ————— */

export type ChatActionKind = 'terminal' | 'browser' | 'task' | 'ingest' | 'squad' | 'workflow';
export interface ChatAction { id: string; kind: ChatActionKind; label: string; payload: string; target?: string }
export interface ChatMessage {
  id: string; role: 'you' | 'jarvis'; text: string; at: string;
  streaming?: boolean; tools?: string[]; actions?: ChatAction[]; cites?: string[]; mentions?: string[]; demo?: boolean;
}

/* ————— tasks ————— */

export type TaskStatus = 'open' | 'active' | 'done' | 'blocked';
export interface TaskItem { id: string; title: string; detail: string; status: TaskStatus; owner: string; source: 'chat' | 'manual' | 'governance' | 'workflow' | 'squad'; created: string; done?: string }

/* ————— jobs — the unified execution queue ————— */

export type JobKind = 'terminal' | 'workflow' | 'agent' | 'browser' | 'ingest' | 'compare';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export interface Job { id: string; kind: JobKind; label: string; status: JobStatus; progress: number; tokens: number; costUsd: number; started: string; ended?: string; note?: string; artifact?: string; demo: boolean }

/* ————— squads — agents as teammates ————— */

export interface SquadMemberDef { id: string; name: string; role: string; color: string; agentId?: string; browser?: boolean }
export interface SquadMemberRun { memberId: string; status: 'pending' | 'working' | 'review' | 'done'; lines: string[]; tokens: number; costUsd: number; progress: number; artifact?: string }
export interface SquadRun { objective: string; started: string; status: 'running' | 'done'; members: Record<string, SquadMemberRun>; costUsd: number; tokens: number; step: number }
export interface Squad { id: string; name: string; mission: string; color: string; budgetUsd: number; members: SquadMemberDef[]; custom: boolean; run: SquadRun | null }

/* ————— workflows — knowledge becomes execution ————— */

export type WorkflowNodeKind = 'trigger' | 'model' | 'terminal' | 'browser' | 'agent' | 'ingest' | 'approval' | 'output';
export interface WorkflowNode { id: string; kind: WorkflowNodeKind; label: string; detail: string }
export interface WorkflowDef { id: string; name: string; desc: string; nodes: WorkflowNode[]; custom: boolean; lastRun?: string }
export interface WorkflowRunState { workflowId: string; status: 'idle' | 'running' | 'done' | 'failed'; stepIdx: number; activeNodeId: string | null; log: { t: string; text: string; cls?: string }[]; jobId: string | null; tokens: number; costUsd: number }

/* ————— canvas — the research board ————— */

export interface CanvasCard { id: string; kind: 'note' | 'source' | 'clip' | 'synthesis'; title: string; text: string; x: number; y: number; w: number; color: string }

/* ————— browser deck — the governed web agent ————— */

export type BrowserPolicyMode = 'read-only' | 'interact' | 'approvals';
export interface BrowserPolicy { mode: BrowserPolicyMode; allowedDomains: string[]; prohibitedDomains: string[]; maxSteps: number; maxCostUsd: number }
export interface BrowserStep { id: string; action: string; target: string; detail: string; result: 'ok' | 'blocked' | 'approval' | 'error'; thought: string; ms: number; tokens: number; costUsd: number; at: string; redacted?: boolean }
export interface BrowserExtraction { id: string; title: string; text: string; url: string; saved: boolean }
export interface BrowserApproval { id: string; stepId: string; domain: string; action: string; values: { field: string; value: string; secret?: boolean }[] }
export interface BrowserVerdict { outcome: 'success' | 'failure'; gotchas: string[]; injectionSuspected: boolean }
export interface BrowserSession {
  id: string; name: string; url: string; title: string; policy: BrowserPolicy;
  history: string[]; steps: BrowserStep[]; extractions: BrowserExtraction[];
  approval: BrowserApproval | null; status: 'idle' | 'running' | 'paused' | 'done' | 'error';
  task: string; verdict: BrowserVerdict | null; engine: 'demo' | 'native' | 'browser-use';
  takeover: boolean; costUsd: number; tokens: number; artifacts: string[]; created: string;
}
export const DEFAULT_ALLOWED_DOMAINS = ['search.cortex.example', 'docs.solarcrm.guide', 'www.solarshop.example', 'news.energy.example'];

/* ————— harness compare — the provider testing cockpit ————— */

export interface ComparePanel {
  id: string; model: string; providerId: string; text: string;
  status: 'idle' | 'streaming' | 'done' | 'error';
  firstTokenMs: number; totalMs: number; tokens: number; costUsd: number;
  finish: string; demo: boolean; error?: string;
}
export interface PromptSet { id: string; name: string; prompts: string[] }

/* ————— terminal tabs — demo + live engines ————— */

export type TermEngine = 'demo' | 'live';
export interface TermTab { id: string; title: string; engine: TermEngine; lines: TermLine[]; history: string[]; liveStatus: 'off' | 'connecting' | 'connected' | 'error'; liveError?: string }

/* ————— war room root state ————— */

export interface WarState {
  inside: boolean;
  userMode: UserMode;
  layout: LayoutState;
  layoutByMode: Record<UserMode, LayoutState>;
  savedLayouts: SavedLayout[];
  chat: ChatMessage[];
  chatStreaming: boolean;
  tasks: TaskItem[];
  jobs: Job[];
  squads: Squad[];
  workflows: WorkflowDef[];
  wfRun: WorkflowRunState | null;
  canvas: CanvasCard[];
  browser: { sessions: BrowserSession[]; activeSession: string | null };
  compare: { prompt: string; panels: ComparePanel[]; running: boolean; promptSets: PromptSet[]; winnerId: string | null };
  termTabs: TermTab[];
  activeTerm: string | null;
  popoutTerminal: boolean;
}

/* ———————————————————————— war room seeds ———————————————————————— */

const CHAT_WELCOME: ChatMessage = {
  id: 'chat-welcome', role: 'jarvis', at: 'now', demo: true,
  text: 'Council online. Solar CRM is at the Discovery review gate — approve it, or tell me what to do next. Every reply here can become an action: I can run terminal commands, dispatch a squad, launch a workflow, send the web agent out, or ingest sources into the Vault. Try: "research the competitor pricing and save findings".'
};

const TASK_SEED: TaskItem[] = [
  { id: 'tsk-seed-1', title: 'Approve the Discovery gate', detail: 'Discovery report is pending Jarvis review — approving unlocks the Product phase.', status: 'open', owner: 'Jarvis', source: 'governance', created: '2h' },
  { id: 'tsk-seed-2', title: 'Kill the 14-field lead form', detail: 'Evidence from 7 interviews: installers churn on data entry. Reduce to 5 fields.', status: 'active', owner: 'Product', source: 'governance', created: '1d' },
  { id: 'tsk-seed-3', title: 'Validate the pricing hypothesis', detail: 'No AI quote follow-up under $99/mo — re-check Jobber and ServiceTitan pricing pages.', status: 'open', owner: 'Discovery', source: 'governance', created: '5h' }
];

const SQUAD_SEED: Squad[] = [
  {
    id: 'sq-research', name: 'Research Squad', mission: 'Gather evidence with citations — nothing enters the Brain unsourced.', color: '#e8433f', budgetUsd: 2, custom: false, run: null,
    members: [
      { id: 'sqm-r1', name: 'Research Agent', role: 'Market scan · personas', color: '#e8433f', agentId: 'discovery' },
      { id: 'sqm-r2', name: 'Web Agent', role: 'Browser Deck · governed browsing', color: '#22d3ee', browser: true },
      { id: 'sqm-r3', name: 'Fact Check Agent', role: 'Citations · claims audit', color: '#3b7cf6', agentId: 'qa' }
    ]
  },
  {
    id: 'sq-dev', name: 'Development Squad', mission: 'Ship approved contracts — code lands as reviewable artifacts.', color: '#45b8ac', budgetUsd: 5, custom: false, run: null,
    members: [
      { id: 'sqm-d1', name: 'Architect', role: 'Contracts before code', color: '#4fbe6c', agentId: 'architecture' },
      { id: 'sqm-d2', name: 'Frontend', role: 'UI build · design system', color: '#f5a623' },
      { id: 'sqm-d3', name: 'Backend', role: 'API + scheduler', color: '#9c6b3f' },
      { id: 'sqm-d4', name: 'QA', role: 'Tests · security sweep', color: '#3b7cf6', agentId: 'qa' }
    ]
  },
  {
    id: 'sq-youtube', name: 'YouTube Squad', mission: 'Research → script → SEO → thumbnail, every asset cited and reviewed.', color: '#ec4899', budgetUsd: 1.5, custom: false, run: null,
    members: [
      { id: 'sqm-y1', name: 'Research', role: 'Topic + claims', color: '#e8433f', agentId: 'discovery' },
      { id: 'sqm-y2', name: 'Script', role: 'Hook · structure · CTA', color: '#f2711c' },
      { id: 'sqm-y3', name: 'SEO', role: 'Title · tags · retention', color: '#f5a623' },
      { id: 'sqm-y4', name: 'Thumbnail', role: 'Concept + contrast pass', color: '#8b5cf6', agentId: 'design' }
    ]
  }
];

const WORKFLOW_SEED: WorkflowDef[] = [
  {
    id: 'wf-watch', name: 'Competitor watch', desc: 'Weekly market scan: summarize shifts, browse pricing pages, ingest findings as a cited source.', custom: false,
    nodes: [
      { id: 'wfn-1', kind: 'trigger', label: 'Weekly', detail: 'Monday · 07:00' },
      { id: 'wfn-2', kind: 'model', label: 'Summarize market shifts', detail: 'main model via gateway' },
      { id: 'wfn-3', kind: 'browser', label: 'Scan pricing pages', detail: 'read-only · solarshop + docs' },
      { id: 'wfn-4', kind: 'ingest', label: 'Save findings as source', detail: '11-stage Librarian pipeline' },
      { id: 'wfn-5', kind: 'output', label: 'File Market Shift Report', detail: 'artifact → phase gate' }
    ]
  },
  {
    id: 'wf-digest', name: 'Gate digest', desc: 'When a phase gate arms: draft the summary, run a QA sweep, file the digest to the Brain.', custom: false,
    nodes: [
      { id: 'wfn-6', kind: 'trigger', label: 'Phase gate armed', detail: 'any studio delivers' },
      { id: 'wfn-7', kind: 'model', label: 'Draft gate summary', detail: 'auxiliary model' },
      { id: 'wfn-8', kind: 'agent', label: 'QA sweep', detail: 'qa custodian' },
      { id: 'wfn-9', kind: 'ingest', label: 'File digest', detail: 'raw preserved · cited' },
      { id: 'wfn-10', kind: 'output', label: 'Notify MainBrain', detail: 'artifact + activity' }
    ]
  }
];

const CANVAS_SEED: CanvasCard[] = [
  { id: 'cc-1', kind: 'source', title: 'Interview — Installer Ian', text: '12 trucks, 3 coordinators, quotes live in spreadsheets. Churn happens between quote and signature.', x: 40, y: 40, w: 250, color: '#f59e0b' },
  { id: 'cc-2', kind: 'note', title: 'Pricing gap', text: 'No AI-driven quote follow-up under $99/mo across Jobber, ServiceTitan, SolarNinja.', x: 330, y: 90, w: 250, color: '#22d3ee' },
  { id: 'cc-3', kind: 'synthesis', title: 'MVP thesis', text: 'Leads · Quotes · AI follow-ups only. Kill the 14-field form. Mobile-first, 3 sprints to beta.', x: 150, y: 260, w: 280, color: '#8b5cf6' }
];

const PROMPT_SET_SEED: PromptSet[] = [
  { id: 'ps-1', name: 'Product blurbs', prompts: ['Write a 2-sentence pitch for an AI CRM for solar installers.', 'Summarize why installers churn between quote and signature.'] },
  { id: 'ps-2', name: 'Code tasks', prompts: ['Draft the POST /quotes/{id}/followup endpoint contract.', 'List edge cases for a 24h/72h follow-up scheduler.'] }
];

function defaultLayout(centerMode: CenterMode, dockOpen: boolean, dockTab: DockTab, rightOpen: boolean, rightTab: RightTab): LayoutState {
  return { centerMode, dockOpen, dockTab, dockSize: 34, rightOpen, rightTab, sidebarCollapsed: false, leftSize: 15, rightSize: 24 };
}

function defaultWarState(): WarState {
  return {
    inside: false,
    userMode: 'simple',
    layout: defaultLayout('chat', false, 'terminal', false, 'task'),
    layoutByMode: {
      simple: defaultLayout('chat', false, 'terminal', false, 'task'),
      advanced: defaultLayout('dashboard', true, 'terminal', true, 'activity'),
      custom: defaultLayout('chat', true, 'terminal', true, 'activity')
    },
    savedLayouts: [],
    chat: [{ ...CHAT_WELCOME }],
    chatStreaming: false,
    tasks: TASK_SEED.map(t => ({ ...t })),
    jobs: [],
    squads: SQUAD_SEED.map(s => ({ ...s, members: s.members.map(m => ({ ...m })), run: null })),
    workflows: WORKFLOW_SEED.map(w => ({ ...w, nodes: w.nodes.map(n => ({ ...n })) })),
    wfRun: null,
    canvas: CANVAS_SEED.map(c => ({ ...c })),
    browser: {
      sessions: [{
        id: 'bs-1', name: 'Market scan', url: 'https://search.cortex.example', title: 'Cortex Search',
        policy: { mode: 'read-only', allowedDomains: DEFAULT_ALLOWED_DOMAINS.slice(), prohibitedDomains: [], maxSteps: 14, maxCostUsd: 0.5 },
        history: [], steps: [], extractions: [], approval: null, status: 'idle', task: '', verdict: null,
        engine: 'demo', takeover: false, costUsd: 0, tokens: 0, artifacts: [], created: '2d'
      }],
      activeSession: 'bs-1'
    },
    compare: {
      prompt: '',
      panels: [
        { id: 'cmp-1', model: 'gemini-2.5-pro', providerId: 'gemini', text: '', status: 'idle', firstTokenMs: 0, totalMs: 0, tokens: 0, costUsd: 0, finish: '', demo: true },
        { id: 'cmp-2', model: 'claude-sonnet-4.6', providerId: 'anthropic', text: '', status: 'idle', firstTokenMs: 0, totalMs: 0, tokens: 0, costUsd: 0, finish: '', demo: true }
      ],
      running: false, promptSets: PROMPT_SET_SEED.map(p => ({ ...p, prompts: [...p.prompts] })), winnerId: null
    },
    termTabs: [{
      id: 't1', title: 'demo', engine: 'demo', liveStatus: 'off',
      lines: [
        { text: 'CortexOS harness v1.0 — terminal engine: demo (app-state)', cls: 'info' },
        { text: 'type `help` for commands · `route <agent> <task>` dispatches work · `browser <task>` sends the web agent', cls: 'dim' }
      ],
      history: ['status', 'agents', 'theme harness']
    }],
    activeTerm: 't1',
    popoutTerminal: false
  };
}

/* ———————————————————————— state ———————————————————————— */

export const S = {
  agents: [] as Agent[],
  summoned: null as string | null,
  panelTab: 'task' as 'task' | 'wiki',
  activity: [] as ActivityEvent[],
  wiki: [] as WikiPage[],
  wikiPreview: null as WikiPage | null,
  artifacts: [] as Artifact[],
  sources: [] as Source[],
  entities: [] as EntityItem[],
  findings: [] as AuditFinding[],
  gov: govSeed() as GovernanceState,
  providers: [] as Provider[],
  unread: 0,
  settings: { theme: 'cortex', sound: true, labels: true, flow: true, fx: true, paused: false, speed: 1, glow: 1, density: 1 },
  metrics: { health: 99.9, pages: 0 },
  sparks: { active: [] as number[], tasks: [] as number[], sync: [] as number[], build: [] as number[], health: [] as number[] },
  warFilter: 'all' as string,
  warSort: 'status' as string,
  rosterQ: '',
  rosterStatus: 'all',
  rosterSort: 'name',
  knowledgeTab: 'wiki' as KnowledgeTab,
  knowledgeQ: '',
  overlay: null as OverlayKind,
  modal: null as ModalState,
  themePop: false,
  notifOpen: false,
  toasts: [] as Toast[],
  modelProfile: { ...PROFILE_SEED, fallbackModels: [...PROFILE_SEED.fallbackModels], perAgentOverrides: {} } as ModelProfile,
  syncLog: [] as SyncLogEntry[],
  harness: {
    sessions: [] as HarnessSession[],
    activeSession: null as string | null,
    layout: 'deck' as HarnessLayout,
    files: [] as HarnessFile[],
    connectors: [] as Connector[]
  },
  war: defaultWarState()
};

let version = 0;
const listeners = new Set<() => void>();
export function emit() { version++; listeners.forEach(l => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function useCortex() { return useSyncExternalStore(subscribe, () => version, () => version); }

export const uid = () => Math.random().toString(36).slice(2, 9);
export const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const byId = (id: string) => S.agents.find(a => a.id === id);
/** Which provider currently serves a given model id (gateway lookup, no duplication). */
export const providerOfModel = (model: string) => S.providers.find(p => p.models.some(m => m.id === model));
/** Flat catalog of every routable model across all connected providers. */
export const allModels = () => S.providers.flatMap(p => p.models.map(m => ({ provider: p, model: m.id, name: m.name })));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 820;

/** Deterministic RNG so the server-rendered HTML matches the first client render. */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeAgent(def: any): Agent {
  return { ...JSON.parse(JSON.stringify(def)), status: 'idle', output: [], task: null, taskIdx: 0, lineIdx: 0, stepTimer: 0, idleTimer: 0, custom: false };
}

export function seed() {
  S.agents = DEFS.map(makeAgent);
  S.wiki = WIKI_SEED.map(w => ({ ...w }));
  S.sources = SOURCE_SEED.map(s => ({ ...s }));
  S.entities = ENTITY_SEED.map(e => ({ ...e }));
  S.findings = FINDING_SEED.map(f => ({ ...f }));
  S.gov = govSeed();
  S.providers = PROV_SEED.map(p => ({ ...p, models: p.models.map(m => ({ ...m })) }));
  S.modelProfile = { ...PROFILE_SEED, fallbackModels: [...PROFILE_SEED.fallbackModels], perAgentOverrides: {} };
  S.harness.sessions = HARN_SESS.map(s => ({ ...s }));
  S.harness.activeSession = 'ses-solar';
  S.harness.layout = 'deck';
  S.harness.files = HARN_FILES.map(f => ({ ...f }));
  S.harness.connectors = HARN_CONN.map(c => ({ ...c, allowedAgents: [...c.allowedAgents] }));
  S.war = defaultWarState();
  S.syncLog = [
    { t: 'now', text: 'wiki/index.md recompiled — 8 pages', ok: true },
    { t: '1m', text: 'knowledge graph: 14 edges merged', ok: true },
    { t: '2m', text: 'vector store: 128 embeddings upserted', ok: true }
  ];
  S.artifacts = [
    { id: 'art-gate-1', agentId: 'discovery', agentName: 'Discovery', title: 'Discovery report — Solar CRM market', kind: 'research', state: 'pending', created: '09:12' },
    { id: 'art-seed-1', agentId: 'discovery', agentName: 'Discovery', title: 'Market landscape scan', kind: 'research', state: 'ingested', created: '09:12' },
    { id: 'art-seed-2', agentId: 'librarian', agentName: 'Librarian', title: 'Competitor scan synthesis', kind: 'summary', state: 'ingested', created: '09:31' }
  ];
  S.metrics.pages = S.wiki.length;
  const rand = mulberry32(20260601);
  // Governance-shaped boot: Discovery delivered → the phase sits at the Jarvis review gate.
  const disc = byId('discovery')!;
  startTask(disc, disc.tasks![0]);
  disc.task!.stepsDone = disc.tasks![0].steps.length;
  disc.lineIdx = disc.tasks![0].lines.length;
  disc.status = 'review';
  // The Librarian is mid-ripple on the seeded sources.
  const lib = byId('librarian')!;
  startTask(lib, lib.tasks![0]);
  lib.task!.stepsDone = 2; lib.lineIdx = 3;
  // Fixed timestamps keep SSR and client renders identical (hydration-safe).
  S.activity = [
    { t: 'now', agentId: 'mainbrain', text: 'Council online. Solar CRM build resumed — Discovery at the review gate.', kind: 'system' },
    { t: 'now', agentId: 'mainbrain', text: 'Discovery phase complete — Jarvis review required before Product starts.', kind: 'system' },
    { t: '1m', agentId: 'librarian', text: `Wiki synced · ${S.wiki.length} pages · graph healthy.`, kind: 'artifact' },
    { t: '2m', agentId: 'development', text: 'Standing by — Development waits for approved Architecture.', kind: 'task' }
  ];
  for (let i = 0; i < 24; i++) pushSparks(true, rand);
}

/* ———————————————————————— persistence ———————————————————————— */

const LS_KEY = 'cortexos-t4';

export function save() {
  if (typeof window === 'undefined') return;
  try {
    const meta: any = {};
    S.agents.forEach(a => { meta[a.id] = { name: a.name, color: a.color, shape: a.shape, model: a.model, provider: a.provider, personality: a.personality, autonomy: a.autonomy, domain: a.domain, custom: a.custom, tasks: a.custom ? a.tasks : undefined, replies: a.custom ? a.replies : undefined }; });
    localStorage.setItem(LS_KEY, JSON.stringify({
      meta, order: S.agents.map(a => a.id), providers: S.providers, settings: S.settings,
      wiki: S.wiki, sources: S.sources, entities: S.entities, findings: S.findings, gov: S.gov,
      modelProfile: S.modelProfile,
      harness: { sessions: S.harness.sessions, activeSession: S.harness.activeSession, layout: S.harness.layout, connectors: S.harness.connectors, fileReviews: S.harness.files.map(f => [f.path, f.review]) },
      syncLog: S.syncLog.slice(0, 20),
      war: {
        userMode: S.war.userMode, layout: S.war.layout, layoutByMode: S.war.layoutByMode,
        savedLayouts: S.war.savedLayouts.slice(0, 12),
        chat: S.war.chat.filter(m => !m.streaming).slice(-40),
        tasks: S.war.tasks, jobs: S.war.jobs.slice(0, 24),
        squads: S.war.squads.map(s => ({ ...s, run: null })),
        workflows: S.war.workflows, canvas: S.war.canvas,
        browser: { sessions: S.war.browser.sessions.map(s => ({ ...s, steps: s.steps.slice(-40) })), activeSession: S.war.browser.activeSession },
        compare: { prompt: S.war.compare.prompt, panels: S.war.compare.panels.map(p => ({ ...p, text: p.text.slice(0, 600) })), promptSets: S.war.compare.promptSets, winnerId: null },
        termTabs: S.war.termTabs.map(t => ({ ...t, lines: t.lines.slice(-120), history: t.history.slice(-30) })),
        activeTerm: S.war.activeTerm
      }
    }));
  } catch { /* storage unavailable — session-only mode */ }
}

export function load() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem('cortexos-t3') ?? localStorage.getItem('cortexos-t2') ?? localStorage.getItem('cortexos-t1'); // older slices salvaged once
    if (!raw) return;
    const d = JSON.parse(raw);
    Object.entries(d.meta || {}).forEach(([id, m]: any) => {
      let a = byId(id);
      if (!a && m.custom) { a = makeAgent({ id, ...m, tasks: m.tasks || [], replies: m.replies || [] }); a.custom = true; S.agents.push(a); }
      if (a) Object.assign(a, m);
    });
    if (d.order) {
      const ordered: Agent[] = [];
      d.order.forEach((id: string) => { const a = byId(id); if (a && !ordered.includes(a)) ordered.push(a); });
      S.agents.forEach(a => { if (!ordered.includes(a)) ordered.push(a); });
      S.agents = ordered;
    }
    if (d.providers?.[0]?.apiMode) S.providers = d.providers; // skip flat first-slice provider payloads
    if (d.settings) Object.assign(S.settings, d.settings);
    if (d.wikiExtra) S.wiki.push(...d.wikiExtra); // t2 payloads stored only the extra pages
    if (d.wiki?.length) S.wiki = d.wiki;
    if (d.sources?.[0]?.status) S.sources = d.sources;
    if (d.entities?.length) S.entities = d.entities;
    if (d.findings?.length) S.findings = d.findings;
    if (d.gov?.phases?.length) S.gov = d.gov;
    if (d.modelProfile) S.modelProfile = { ...S.modelProfile, ...d.modelProfile, fallbackModels: d.modelProfile.fallbackModels ?? S.modelProfile.fallbackModels, perAgentOverrides: d.modelProfile.perAgentOverrides || {} };
    if (d.harness) {
      if (d.harness.sessions?.length) S.harness.sessions = d.harness.sessions;
      if (d.harness.activeSession) S.harness.activeSession = d.harness.activeSession;
      if (d.harness.layout) S.harness.layout = d.harness.layout;
      if (d.harness.connectors?.length) S.harness.connectors = d.harness.connectors;
      if (d.harness.fileReviews) S.harness.files.forEach(f => { const v: [string, string] | undefined = d.harness.fileReviews.find(([p]: [string]) => p === f.path); if (v) f.review = v[1] as HarnessFile['review']; });
    }
    if (d.syncLog?.length) S.syncLog = d.syncLog;
    if (d.war) {
      const w = d.war;
      if (w.userMode) S.war.userMode = w.userMode;
      if (w.layout) S.war.layout = w.layout;
      if (w.layoutByMode) S.war.layoutByMode = w.layoutByMode;
      if (w.savedLayouts?.length) S.war.savedLayouts = w.savedLayouts;
      if (w.chat?.length) S.war.chat = w.chat;
      if (w.tasks?.length) S.war.tasks = w.tasks;
      if (w.jobs) S.war.jobs = w.jobs.map((j: Job) => j.status === 'running' || j.status === 'queued' ? { ...j, status: 'cancelled', note: 'interrupted by reload' } : j);
      if (w.squads?.length) S.war.squads = w.squads.map((s: Squad) => ({ ...s, run: null }));
      if (w.workflows?.length) S.war.workflows = w.workflows;
      if (w.canvas?.length) S.war.canvas = w.canvas;
      if (w.browser?.sessions?.length) {
        S.war.browser.sessions = w.browser.sessions.map((s: BrowserSession) => (s.status === 'running' || s.status === 'paused') ? { ...s, status: 'idle' as const, approval: null } : s);
        S.war.browser.activeSession = w.browser.activeSession;
      }
      if (w.compare) S.war.compare = { ...S.war.compare, ...w.compare, running: false };
      if (w.termTabs?.length) S.war.termTabs = w.termTabs;
      if (w.activeTerm) S.war.activeTerm = w.activeTerm;
      S.war.chatStreaming = false;
    }
    S.metrics.pages = S.wiki.length;
  } catch { /* corrupted state — fall back to seed */ }
}

let booted = false;
/** Client bootstrap: hydrate persisted preferences and apply the theme. */
export function initCortex() {
  if (booted || typeof window === 'undefined') return;
  booted = true;
  load();
  applyTheme(S.settings.theme, true);
}

/* ———————————————————————— audio ———————————————————————— */

let AC: AudioContext | null = null;
let lastDoneSfx = 0;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* audio unavailable */ } }
  if (AC?.state === 'suspended') AC.resume();
  return AC;
}
function tone(f: number, d: number, type: OscillatorType, g: number, when: number) {
  const c = ac();
  if (!c || !S.settings.sound) return;
  const o = c.createOscillator(), v = c.createGain();
  o.type = type; o.frequency.value = f;
  v.gain.setValueAtTime(0, c.currentTime + when);
  v.gain.linearRampToValueAtTime(g, c.currentTime + when + .015);
  v.gain.exponentialRampToValueAtTime(.0001, c.currentTime + when + d);
  o.connect(v).connect(c.destination);
  o.start(c.currentTime + when); o.stop(c.currentTime + when + d + .05);
}
export const sfx = {
  summon() { tone(520, .13, 'sine', .045, 0); tone(780, .17, 'sine', .045, .09); },
  send() { tone(340, .09, 'triangle', .04, 0); },
  done() { const t = Date.now(); if (t - lastDoneSfx < 3500) return; lastDoneSfx = t; tone(660, .12, 'sine', .04, 0); tone(880, .18, 'sine', .04, .1); },
  ingest() { tone(440, .1, 'sine', .035, 0); tone(560, .12, 'sine', .03, .07); },
  tick() { tone(300, .06, 'triangle', .025, 0); }
};
export function unlockAudio() { ac(); }

/* ———————————————————————— notifications & toasts ———————————————————————— */

const logListeners = new Set<(e: ActivityEvent) => void>();
/** Subscribe to the live activity stream — demo transport for the events-client (SSE equivalent). */
export function onLogEvent(fn: (e: ActivityEvent) => void) { logListeners.add(fn); return () => { logListeners.delete(fn); }; }

export function log(agentId: string, text: string, kind: ActivityEvent['kind'] = 'task', flow?: string) {
  S.activity.unshift({ t: now(), agentId, text, kind, flow });
  if (S.activity.length > 90) S.activity.pop();
  if (!S.notifOpen) S.unread++;
  logListeners.forEach(l => l(S.activity[0]));
  emit();
}

export function toast(title: string, msg = '', icon = 'spark', undo?: () => void) {
  if (typeof window === 'undefined') return;
  const mobile = isMobile();
  // When a mobile panel/overlay is open, suppress the toast overlay — the bell feed carries it.
  if (mobile && (S.summoned || S.overlay || S.notifOpen)) { emit(); return; }
  const existing = S.toasts.find(t => t.title === title && t.msg === msg && !undo);
  if (existing) { existing.count++; emit(); return; }
  const t: Toast = { id: uid(), title, msg, icon, count: 1, undo };
  S.toasts.push(t);
  const cap = mobile ? 1 : 3;
  while (S.toasts.length > cap) S.toasts.shift();
  emit();
  setTimeout(() => dismissToast(t.id), undo ? 8000 : 4600);
}
export function dismissToast(id: string) { S.toasts = S.toasts.filter(t => t.id !== id); emit(); }

/* ———————————————————————— tasks + simulation ———————————————————————— */

export function startTask(a: Agent, def: TaskDef) {
  a.task = { title: def.title, steps: def.steps.map(s => ({ label: s })), stepsDone: 0, lines: def.lines };
  a.lineIdx = 0; a.stepTimer = 0; a.status = 'working';
}
function nextTask(a: Agent) {
  if (a.id === 'librarian' && S.artifacts.some(x => x.state === 'pending' && x.agentId !== 'librarian')) { startIngestTask(a); return; }
  if (!a.tasks?.length) return;
  const t = a.tasks[a.taskIdx % a.tasks.length];
  a.taskIdx++;
  startTask(a, t);
  log(a.id, `New task: ${t.title}`, 'task');
}
export function pushOutput(a: Agent, text: string, cls?: string, who?: string) {
  a.output.push({ text, cls, who });
  if (a.output.length > 120) a.output.shift(); // cap runaway terminal logs
  emit();
}

/** The Librarian visibly works through the pending artifact queue. */
function startIngestTask(lib: Agent) {
  const pending = S.artifacts.filter(x => x.state === 'pending' && x.agentId !== 'librarian');
  const titles = pending.slice(0, 3).map(x => x.title);
  startTask(lib, {
    title: `Ingest ${pending.length} artifact${pending.length === 1 ? '' : 's'} → ripple wiki`,
    steps: ['Normalize + classify sources', 'Extract entities & links', 'Update wiki pages', 'Sync graph + search index', 'Audit · citations · receipts'],
    lines: [
      `› queue: ${pending.length} artifact${pending.length === 1 ? '' : 's'} from studios`,
      ...titles.map(t => `› normalizing: ${t}`),
      '✓ entities extracted · 0 conflicts',
      '✓ wiki pages rippled (+backlinks)',
      '✓ graph + vector index synced',
      '✓ audit clean · every claim cites its source'
    ]
  });
  log('librarian', `Ingestion cycle started — ${pending.length} artifact${pending.length === 1 ? '' : 's'} queued.`, 'artifact');
}

/** Every completed studio task becomes an Artifact; artifacts flow to the Librarian before entering the Brain. */
function deliver(a: Agent) {
  a.status = 'review';
  pushOutput(a, `✓ ${a.task!.title} — complete. Artifact delivered.`, 'ok');
  log(a.id, `Delivered artifact: ${a.task!.title}`, 'artifact', `${a.name} → Artifact → Librarian → Brain`);
  sfx.done();
  // Phase studios hand their deliverable to the Jarvis gate — never straight to the next studio.
  const ph = phaseOf(a.id);
  if (ph && ph.status === 'active') {
    ph.status = 'review';
    log('mainbrain', `${ph.label} phase complete — Jarvis review required.`, 'system', 'Phase complete → Jarvis review → Approved');
  }
  const title = a.task!.title;
  setTimeout(() => {
    if (a.id === 'librarian') {
      const pending = S.artifacts.filter(x => x.state === 'pending' && x.agentId !== 'librarian');
      pending.forEach(x => { x.state = 'ingested'; });
      S.artifacts.unshift({ id: uid(), agentId: 'librarian', agentName: 'Librarian', title, kind: 'summary', state: 'ingested', created: now() });
      if (S.artifacts.length > 60) S.artifacts.length = 60;
      const rippleTitles = ['Insight: ' + title, 'Lesson: ' + title, 'Pattern: follow-up automation', 'Doctrine: contracts before code'];
      const rippleTypes = ['summary', 'summary', 'pattern', 'doctrine'];
      const i = S.metrics.pages % rippleTitles.length;
      S.wiki.unshift({ title: `${rippleTitles[i]} #${S.metrics.pages}`, type: rippleTypes[i], summary: `Auto-synthesized by the Chief Librarian from delivered artifacts. Raw sources preserved; every claim cites its source. Rippled through ${3 + S.metrics.pages % 9} related pages.`, links: ['Agent Routing', 'Event-Driven Architecture'], updated: 'now' });
      S.metrics.pages++;
      if (S.wiki.length > 60) S.wiki.length = 60; // cap runaway wiki growth
      if (pending.length) log('librarian', `Ingested ${pending.length} artifact${pending.length > 1 ? 's' : ''} → entities, links, index updated.`, 'artifact', 'Librarian → wiki · graph · index → Brain');
      log('librarian', `Wiki rippled — now ${S.metrics.pages} pages.`, 'artifact', 'Librarian → wiki · graph · index → Brain');
      pushSyncLog(`ingested ${pending.length} artifact${pending.length > 1 ? 's' : ''} · wiki rippled · ${S.metrics.pages} pages · graph + index synced`);
      sfx.ingest();
    } else {
      S.artifacts.unshift({ id: uid(), agentId: a.id, agentName: a.name, title, kind: ARTIFACT_KINDS[a.id] || 'artifact', state: 'pending', created: now() });
      if (S.artifacts.length > 60) S.artifacts.length = 60;
      log('librarian', `Queued ${a.name} artifact for ingestion — "${title}".`, 'artifact', `${a.name} → Artifact → Librarian`);
      sfx.ingest();
      const lib = byId('librarian');
      if (lib && lib.status === 'idle') startIngestTask(lib);
    }
    a.status = 'idle';
    a.idleTimer = Math.round((100 - a.autonomy) / 12) + 2;
    save(); emit();
  }, 1400);
}

export function buildPct() { const d = byId('development'); return d?.task ? Math.round(100 * d.task.stepsDone / d.task.steps.length) : 0; }

export function pushSparks(seedMode = false, rand: () => number = Math.random) {
  const work = S.agents.filter(a => a.status === 'working').length;
  const act = S.agents.filter(a => a.status !== 'idle').length;
  const push = (arr: number[], v: number) => { arr.push(v); if (arr.length > 26) arr.shift(); };
  push(S.sparks.active, act + (seedMode ? rand() * 1.2 : rand() * .4));
  push(S.sparks.tasks, work + (seedMode ? rand() * 1.5 : rand() * .6));
  push(S.sparks.sync, S.metrics.pages + (seedMode ? rand() * 2 : rand() * .8));
  push(S.sparks.build, buildPct() + (seedMode ? rand() * 4 : 0));
  push(S.sparks.health, 99.5 + rand() * .49);
  S.metrics.health = S.sparks.health[S.sparks.health.length - 1];
}

export function simTick() {
  if (S.settings.paused) return;
  S.agents.forEach(a => {
    if (a.core) return;
    if (a.status === 'working' && a.task) {
      const lines = a.task.lines;
      if (a.lineIdx < lines.length) {
        const l = lines[a.lineIdx++];
        pushOutput(a, l, l.startsWith('✓') ? 'ok' : l.startsWith('›') ? 'info' : '');
      }
      a.stepTimer++;
      const per = Math.max(2, Math.round(lines.length / a.task.steps.length));
      if (a.stepTimer >= per && a.task.stepsDone < a.task.steps.length) {
        a.task.stepsDone++; a.stepTimer = 0;
        if (a.task.stepsDone >= a.task.steps.length) deliver(a);
      }
    } else if (a.status === 'idle' && a.autonomy > 5) {
      // Lifecycle guard: phase studios only self-start while their phase is active.
      const ph = phaseOf(a.id);
      if (ph && ph.status !== 'active') return;
      a.idleTimer--;
      if (a.idleTimer <= 0) nextTask(a);
    }
  });
  pushSparks(false);
  emit();
}

/* ———————————————————————— command routing ———————————————————————— */

const ROUTE: [RegExp, string][] = [
  [/\b(design|ui|ux|screen|wireframe|mockup|layout|pricing screen)\b/, 'design'],
  [/\b(research|competitor|market|persona|validat|discover)\b/, 'discovery'],
  [/\b(prd|roadmap|story|priorit|scope|mvp|requirement|product)\b/, 'product'],
  [/\b(api|schema|database|erd|openapi|infra|architect|security design)\b/, 'architecture'],
  [/\b(build|code|implement|scaffold|component|frontend|backend|develop|fix)\b/, 'development'],
  [/\b(test|qa|bug|security sweep|a11y|accessib|compliance|scan)\b/, 'qa'],
  [/\b(deploy|release|ship|ci|cd|rollback|runbook|monitor)\b/, 'release'],
  [/\b(wiki|remember|ingest|knowledge|note|source|librarian)\b/, 'librarian']
];

export function routeCommand(text: string): { agent: Agent; cmd: string } {
  const low = text.toLowerCase();
  const named = S.agents.find(a => low.startsWith(a.name.toLowerCase() + ':') || low.startsWith(a.name.toLowerCase() + ' '));
  if (named) return { agent: named, cmd: text.replace(new RegExp('^' + named.name + '[: ]+', 'i'), '') };
  for (const [re, id] of ROUTE) if (re.test(low)) { const a = byId(id); if (a) return { agent: a, cmd: text }; }
  return { agent: byId('mainbrain')!, cmd: text };
}

export function currentPhase() {
  const p = S.gov?.phases[S.gov.phaseIdx];
  return p ? p.label : 'Released';
}
/** Which lifecycle phase owns a given studio agent (undefined for librarian / custom / core agents). */
export function phaseOf(agentId: string): PhaseInfo | undefined {
  return S.gov?.phases.find(p => p.studio === agentId);
}
export function currentPhaseInfo(): PhaseInfo | undefined {
  return S.gov?.phases[S.gov.phaseIdx];
}

export function sendCommand(a: Agent, text: string, _origin: CommandOrigin = 'workspace') {
  if (!text.trim()) return;
  pushOutput(a, `You: ${text}`, 'you');
  sfx.send();
  log(a.id, `You → ${a.name}: ${text}`, 'task');
  setTimeout(() => {
    if (a.core) {
      const r = routeCommand(text);
      const target = phaseOf(r.agent.id);
      const cur = currentPhaseInfo();
      if (target && cur && target.status === 'pending') {
        // Lifecycle gate: Jarvis never lets a studio jump its phase.
        pushOutput(a, `MainBrain: ${r.agent.name} waits — ${target.label} is locked until ${cur.label} is approved. Routing the objective to ${cur.label} first.`, 'warn');
        log('mainbrain', `${target.label} blocked until ${cur.label} approved.`, 'system');
        log('mainbrain', `Jarvis routed objective to ${cur.label}.`, 'system', 'You → Jarvis → WorkRequest → Studio');
        const cs = byId(cur.studio);
        if (cs && cur.status !== 'blocked') { summon(cs.id, true); sendCommand(cs, text, 'council'); }
        else if (cs) pushOutput(a, `:: ${cur.label} is blocked at the gate — clear the blocker to continue.`, 'warn');
        emit();
        return;
      }
      if (r.agent.id !== 'mainbrain') {
        pushOutput(a, `→ routed to ${r.agent.name} (${r.agent.domain})`, 'info');
        log('mainbrain', `Routed directive → ${r.agent.name}`, 'system');
        summon(r.agent.id, true);
        sendCommand(r.agent, r.cmd, 'council');
      } else {
        pushOutput(a, `MainBrain: ${a.replies[Math.floor(Math.random() * a.replies.length)].replace('{phase}', currentPhase())}`, 'agent');
      }
      emit();
      return;
    }
    const replies = a.replies?.length ? a.replies : ['Directive received. Executing within my constraints — output lands as an artifact in the Brain.'];
    pushOutput(a, `${a.name}: ${replies[Math.floor(Math.random() * replies.length)]}`, 'agent');
    if (a.status !== 'working') {
      startTask(a, { title: `Directive: ${text.slice(0, 48)}`, steps: ['Parse directive', 'Pull context from Brain', `Execute: ${text.slice(0, 32)}`, 'Self-review vs constraints', 'Deliver artifact → Librarian'], lines: [`› directive parsed: "${text.slice(0, 40)}"`, '✓ context: 6 artifacts, 3 wiki pages pulled', '› executing within rail guards…', '✓ self-review: constraints satisfied', '✓ artifact drafted', '› handing to Librarian…', '✓ directive complete'] });
    }
    emit();
  }, 550);
}

/* ———————————————————————— UI mutations ———————————————————————— */

export function summon(id: string, keep = false) {
  const a = byId(id); if (!a) return;
  S.summoned = id; S.panelTab = 'task'; S.wikiPreview = null; S.overlay = null; S.themePop = false;
  if (!keep) sfx.summon();
  log(id, `${a.name} summoned to the dock panel.`, 'system');
  emit();
}
export function closePanel() { S.summoned = null; emit(); }
export function openOverlay(kind: Exclude<OverlayKind, null>) { S.overlay = kind; S.themePop = false; S.notifOpen = false; sfx.tick(); emit(); }
export function closeOverlay() { S.overlay = null; emit(); }
export function openModal(m: ModalState) { S.modal = m; emit(); }
export function closeModal() { S.modal = null; emit(); }
export function toggleThemePop() { S.themePop = !S.themePop; emit(); }
export function setThemePop(open: boolean) { S.themePop = open; emit(); }
export function toggleNotif() { S.notifOpen = !S.notifOpen; if (S.notifOpen) S.unread = 0; emit(); }
export function setNotifOpen(open: boolean) { S.notifOpen = open; if (open) S.unread = 0; emit(); }
export function setPanelTab(tab: 'task' | 'wiki') { S.panelTab = tab; S.wikiPreview = null; emit(); }
export function setWikiPreview(w: WikiPage | null) { S.wikiPreview = w; emit(); }
export function setWarFilter(f: string) { S.warFilter = f; emit(); }
export function setWarSort(s: string) { S.warSort = s; emit(); }
export function setRosterQ(q: string) { S.rosterQ = q; emit(); }
export function setRosterStatus(s: string) { S.rosterStatus = s; emit(); }
export function setRosterSort(s: string) { S.rosterSort = s; emit(); }
export function setKnowledgeTab(t: KnowledgeTab) { S.knowledgeTab = t; emit(); }
export function setKnowledgeQ(q: string) { S.knowledgeQ = q; emit(); }
export function clearActivity() {
  const copy = [...S.activity]; S.activity = []; emit();
  toast('Activity feed cleared', 'War Room history stays in the Brain.', 'trash', () => { S.activity = copy; emit(); });
}

export function applyTheme(id: string, silent = false) {
  if (typeof document === 'undefined') return;
  if (!THEMES.some(t => t.id === id)) id = 'cortex';
  document.documentElement.dataset.theme = id;
  S.settings.theme = id;
  save(); emit();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  if (!silent) toast('Theme applied', THEMES.find(t => t.id === id)!.name, 'palette');
}
export function setSetting(k: string, v: any) { S.settings = { ...S.settings, [k]: v }; save(); emit(); }

export function reorderAgents(fromId: string, toId: string) {
  const from = S.agents.findIndex(a => a.id === fromId), to = S.agents.findIndex(a => a.id === toId);
  if (from < 0 || to < 0 || from === to) return;
  const [m] = S.agents.splice(from, 1); S.agents.splice(to, 0, m);
  save(); emit(); toast('Dock reordered', 'Neural map rewired.', 'link');
}
export function updateAgent(id: string, patch: Partial<Agent>) {
  const a = byId(id); if (!a) return;
  Object.assign(a, patch);
  save(); emit();
  toast(`${a.name} customized`, 'Live across dock, map and workspace.', 'edit');
}
export function dismissAgent(id: string) {
  const i = S.agents.findIndex(a => a.id === id); if (i < 0) return;
  const [a] = S.agents.splice(i, 1);
  if (S.summoned === id) closePanel();
  save(); emit();
  toast(`${a.name} dismissed`, 'Removed from the council.', 'users', () => { S.agents.splice(i, 0, a); save(); emit(); });
}
export function addAgent(data: { name: string; domain: string; color: string; shape: ShapeKey }) {
  const a = makeAgent({ id: 'bot' + uid(), name: data.name, domain: data.domain || 'Custom Domain', color: data.color, shape: data.shape, model: 'gemini-2.5-flash', provider: 'Gemini', personality: 'Balanced', autonomy: 60, tasks: [{ title: 'First directive cycle', steps: ['Sync with MainBrain', 'Pull Brain context', 'Execute domain work', 'Self-review', 'Deliver artifact'], lines: ['› neural link established', '✓ context pulled from Brain', '› executing domain work…', '✓ self-review passed', '✓ artifact → Librarian'] }], replies: ['Wired and ready. My outputs flow through the Librarian like every custodian.', 'Directive received — executing in my domain with full Brain context.'] });
  a.custom = true;
  S.agents.push(a);
  save(); emit();
  log(a.id, `${a.name} created and wired to the neural node.`, 'system');
  toast(`${a.name} joined the council`, 'Wired to MainBrain.', 'bot');
  summon(a.id, true);
}

/** Ingest a raw source — the Librarian walks it through the full pipeline, stage by stage. */
export function ingestSource(title: string, kind: SourceKind, body: string, opts?: { fast?: boolean }) {
  closeModal();
  const src: Source = { id: 'src' + uid(), title, kind, note: body || 'Ingested source.', created: 'now', status: 'queued' };
  S.sources.unshift(src);
  if (S.sources.length > 60) S.sources.length = 60;
  const lib = byId('librarian');
  log('librarian', `Source queued: ${title}`, 'artifact');
  toast('Source queued', 'Librarian pipeline engaged — raw layer preserved.', 'book');
  emit();
  const known = ['Solar CRM', 'Jobber', 'ServiceTitan', 'SolarNinja', 'Installer Ian', 'OAuth', 'OpenAPI', 'Stripe', 'Qdrant', 'pgvector'];
  const text = `${title} ${body}`;
  const stages: { status?: SourceStatus; line: string; run?: () => void }[] = [
    { line: `› raw/${src.id}.txt preserved (immutable)` },
    { status: 'normalized', line: '✓ normalizer: whitespace, encoding, section splits' },
    { status: 'classified', line: '✓ classifier: labels applied, type locked' },
    { status: 'extracted', line: '✓ entity + concept extraction complete', run: () => {
      known.filter(k => text.includes(k)).forEach(k => {
        if (!S.entities.some(e => e.name === k)) S.entities.push({ id: 'ent' + uid(), name: k, type: 'entity', sourceId: src.id });
      });
      if (!S.entities.some(e => e.name === title)) S.entities.push({ id: 'ent' + uid(), name: title.length > 28 ? title.slice(0, 28) + '…' : title, type: 'concept', sourceId: src.id });
    } },
    { line: '✓ relationship mapping: graph edges merged' },
    { status: 'linked', line: '✓ linked into the project graph', run: () => {
      S.artifacts.unshift({ id: uid(), agentId: 'librarian', agentName: 'Librarian', title: `Summary — ${title}`, kind: 'summary', state: 'ingested', created: now() });
      if (S.artifacts.length > 60) S.artifacts.length = 60;
    } },
    { line: '✓ artifact created (summary)', run: () => {
      S.wiki.unshift({ title, type: 'summary', summary: `${body || 'Ingested source.'} — preserved in raw/, summarized by the Chief Librarian, entities extracted and rippled through related pages with citations.`, links: ['Agent Routing', 'Event-Driven Architecture'], updated: 'now', citations: [src.id] });
      S.metrics.pages++;
      if (S.wiki.length > 60) S.wiki.length = 60;
    } },
    { line: '✓ wiki page written — cited to the raw source' },
    { line: '✓ graph updated: nodes + edges live' },
    { status: 'indexed', line: '✓ vector index: embeddings upserted', run: () => pushSyncLog(`source ingested: ${title} → wiki + graph + index`) },
    { status: 'audited', line: '✓ audit: citations verified, receipts filed', run: () => {
      log('librarian', `Source ingested: ${title} → wiki + graph + index · ${S.metrics.pages} pages`, 'artifact', 'Source → Librarian → wiki · graph · index → Brain');
      toast('Source ingested', `${title} → wiki + graph + index.`, 'book');
      sfx.ingest();
      save();
    } }
  ];
  stages.forEach((st, i) => {
    setTimeout(() => {
      if (st.status) src.status = st.status;
      st.run?.();
      if (lib) pushOutput(lib, st.line, st.line.startsWith('✓') ? 'ok' : 'info');
      emit();
    }, (i + 1) * (opts?.fast ? 380 : 850));
  });
}

export function addProvider(p: Omit<Provider, 'id'>) {
  S.providers.push({ ...p, id: 'pv' + uid() });
  save(); emit();
  toast(`${p.name} wired`, 'Any model behind it is now routable.', 'plug');
  sfx.done();
}
// NOTE: provider toggling / removal lives in lib/provider-gateway.ts only —
// gatewayToggleProvider() and removeProvider() there reroute dependents through
// the model-router. No component may mutate providers directly (constitution:
// provider calls go through the gateway/router).
export function routeModel(agentId: string, model: string) {
  const a = byId(agentId); if (!a) return null;
  const provider = providerOfModel(model)?.name || a.provider;
  a.model = model; a.provider = provider;
  S.modelProfile.perAgentOverrides[agentId] = model; // per-agent routing override — reflected in the agent chip
  save(); emit();
  return { model, provider };
}
export function updateModelProfile(patch: Partial<ModelProfile>) {
  S.modelProfile = { ...S.modelProfile, ...patch };
  save(); emit();
  toast('Model profile updated', 'Routing chain adjusted.', 'cpu');
}

export function searchBrain(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return { pages: S.wiki, artifacts: S.artifacts, agents: S.agents };
  return {
    pages: S.wiki.filter(w => w.title.toLowerCase().includes(s) || w.summary.toLowerCase().includes(s) || w.type.includes(s)),
    artifacts: S.artifacts.filter(x => x.title.toLowerCase().includes(s) || x.agentName.toLowerCase().includes(s) || x.kind.includes(s)),
    agents: S.agents.filter(a => a.name.toLowerCase().includes(s) || a.domain.toLowerCase().includes(s))
  };
}

export function getWarRoomState(): WarRoomState {
  return {
    agentsActive: S.agents.filter(a => a.status === 'working' || a.status === 'review').length,
    agentsTotal: S.agents.length,
    tasksRunning: S.agents.filter(a => a.status === 'working').length,
    wikiPages: S.metrics.pages,
    buildPct: buildPct(),
    health: S.metrics.health,
    artifactsPending: S.artifacts.filter(x => x.state === 'pending').length,
    artifactsIngested: S.artifacts.filter(x => x.state === 'ingested').length,
    events: S.activity.length
  };
}

export function councilAction(q: 'status' | 'pause' | 'resume' | 'priority') {
  const mb = byId('mainbrain')!;
  if (q === 'status') {
    S.agents.filter(a => !a.core).forEach(a => pushOutput(mb, `← ${a.name}: ${a.status}${a.task ? ' · ' + a.task.title : ''}`, 'info'));
    toast('Status report broadcast', 'All custodians reported to MainBrain.', 'users');
  } else if (q === 'pause') {
    setSetting('paused', true); pushOutput(mb, ':: council paused. Rail guards hold all work.', 'warn'); toast('Simulation paused', 'Council on hold.', 'pause');
  } else if (q === 'resume') {
    setSetting('paused', false); pushOutput(mb, ':: council resumed. Sequencing continues.', 'ok'); toast('Council resumed', 'Sequencing continues.', 'play');
  } else {
    pushOutput(mb, 'Priority set: Solar CRM. Sequencing Discovery → Product → Design → Architecture → Development → QA → Release.', 'agent');
    toast('Solar CRM prioritized', 'Council sequencing updated.', 'target');
  }
  sfx.send(); emit();
}

/* ———————————————————————— harness — the execution cockpit ———————————————————————— */

/** Knowledge-sync log — Librarian pipeline receipts shown in the War Room. */
export function pushSyncLog(text: string, ok = true) {
  S.syncLog.unshift({ t: now(), text, ok });
  if (S.syncLog.length > 40) S.syncLog.pop();
}

export function activeSession(): HarnessSession | null { return S.harness.sessions.find(s => s.id === S.harness.activeSession) ?? null; }

export function setHarnessLayout(l: HarnessLayout) {
  S.harness.layout = l;
  const s = activeSession(); if (s) s.layout = l;
  save(); emit();
}

export function setActiveSession(id: string) {
  S.harness.activeSession = id;
  const s = activeSession(); if (s) S.harness.layout = s.layout;
  sfx.tick(); emit();
}

export function createSession(name: string) {
  const s: HarnessSession = { id: 'ses' + uid(), name, project: 'Solar CRM', agents: S.agents.slice(0, 4).map(a => a.id), profileName: S.modelProfile.name, sandbox: 'isolated-demo', layout: S.harness.layout, created: 'now' };
  S.harness.sessions.unshift(s);
  S.harness.activeSession = s.id;
  save(); emit();
  toast('Session created', s.name, 'terminal');
  return s;
}

export function renameSession(id: string, name: string) {
  const s = S.harness.sessions.find(x => x.id === id); if (!s || !name.trim()) return;
  s.name = name.trim(); save(); emit();
}

export function deleteSession(id: string) {
  const i = S.harness.sessions.findIndex(s => s.id === id); if (i < 0) return;
  const [s] = S.harness.sessions.splice(i, 1);
  if (S.harness.activeSession === id) S.harness.activeSession = S.harness.sessions[0]?.id ?? null;
  save(); emit();
  toast('Session deleted', s.name, 'trash', () => { S.harness.sessions.splice(i, 0, s); if (!S.harness.activeSession) S.harness.activeSession = s.id; save(); emit(); });
}

/* ———————————————————————— terminal — demo + live engines, tabbed ———————————————————————— */

/** Push a line into a specific terminal tab (default: the active one). */
export function pushTermLine(tabId: string, text: string, cls?: string) {
  const t = S.war.termTabs.find(x => x.id === tabId) ?? S.war.termTabs[0];
  if (!t) return;
  t.lines.push({ text, cls });
  if (t.lines.length > 220) t.lines.shift();
  emit();
}
/** Back-compat helper: push into the active terminal tab. */
export function pushTerm(text: string, cls?: string) { pushTermLine(S.war.activeTerm ?? '', text, cls); }

export function activeTermTab(): TermTab | null {
  return S.war.termTabs.find(t => t.id === S.war.activeTerm) ?? S.war.termTabs[0] ?? null;
}

export function addTermTab(engine: TermEngine = 'demo'): string {
  const id = 't' + uid();
  S.war.termTabs.push({
    id, title: engine === 'live' ? 'live' : `demo ${S.war.termTabs.filter(t => t.engine === 'demo').length + 1}`, engine,
    lines: [{ text: engine === 'live' ? 'CortexOS live terminal — connecting to the PTY service…' : 'CortexOS demo terminal — app-state engine · type help', cls: 'info' }],
    history: [], liveStatus: engine === 'live' ? 'connecting' : 'off'
  });
  S.war.activeTerm = id;
  save(); emit();
  return id;
}

export function closeTermTab(id: string) {
  if (S.war.termTabs.length <= 1) return; // never close the last tab
  const i = S.war.termTabs.findIndex(t => t.id === id); if (i < 0) return;
  S.war.termTabs.splice(i, 1);
  if (S.war.activeTerm === id) S.war.activeTerm = S.war.termTabs[Math.max(0, i - 1)].id;
  save(); emit();
}

export function setActiveTerm(id: string) { S.war.activeTerm = id; save(); emit(); }

export function setTermEngine(id: string, engine: TermEngine) {
  const t = S.war.termTabs.find(x => x.id === id); if (!t) return;
  t.engine = engine;
  t.title = engine === 'live' ? 'live' : 'demo';
  t.liveStatus = engine === 'live' ? 'connecting' : 'off';
  pushTermLine(id, engine === 'live' ? ':: switching to LIVE engine — connecting to PTY service…' : ':: switching to DEMO engine — app-state commands', 'info');
  save(); emit();
}

export function setTermLiveStatus(id: string, status: TermTab['liveStatus'], err?: string) {
  const t = S.war.termTabs.find(x => x.id === id); if (!t) return;
  t.liveStatus = status;
  t.liveError = err;
  emit();
}

/** Harness terminal — every command mutates real app state, never fake text. */
export function runTermCommand(raw: string) {
  const line = raw.trim(); if (!line) return;
  const tab = activeTermTab();
  const tabId = tab?.id ?? '';
  if (tab?.engine === 'live') {
    // LIVE commands are handled by the PTY bridge (lib/live-terminal-client) —
    // it echoes into this tab. Never fall through to demo simulation here.
    return;
  }
  if (tab) {
    tab.history.push(line);
    if (tab.history.length > 50) tab.history.shift();
  }
  pushTermLine(tabId, `$ ${line}`, 'cmd');
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(' ');
  const low = cmd.toLowerCase();
  if (low === 'help') {
    ['commands:',
      '  status                    council phase · working agents · build %',
      '  agents                    list custodians · status · model',
      '  route <agent> <task>      dispatch work through MainBrain',
      '  browser <task>            send the governed web agent out',
      '  ingest <title>            push a raw source to the Librarian',
      '  wiki search <query>       search the synthesized wiki',
      '  providers                 provider gateway · health · api mode',
      '  theme <name>              cortex | notebook | hermes | deepseek | harness | graphite',
      '  pause / resume            hold or resume the whole council'
    ].forEach(l => pushTermLine(tabId, l));
  } else if (low === 'status') {
    pushTermLine(tabId, `phase: ${currentPhase()} · project: Solar CRM`, 'ok');
    pushTermLine(tabId, `agents: ${S.agents.filter(a => a.status === 'working').length} working / ${S.agents.length} connected`);
    pushTermLine(tabId, `build: ${buildPct()}% · wiki: ${S.metrics.pages} pages · health ${S.metrics.health.toFixed(1)}%`);
  } else if (low === 'agents') {
    S.agents.forEach(a => pushTermLine(tabId, `  ${a.name.padEnd(12)} ${a.status.padEnd(8)} ${a.model} @ ${a.provider}`));
  } else if (low === 'route') {
    const target = (rest[0] || '').toLowerCase();
    const agent = S.agents.find(a => a.id === target || a.name.toLowerCase() === target || a.name.toLowerCase().startsWith(target));
    const task = rest.slice(1).join(' ');
    if (!agent || !task) pushTermLine(tabId, 'usage: route <agent> <task> — e.g. route development build auth module', 'warn');
    else {
      pushTermLine(tabId, `→ routing "${task}" to ${agent.name} via MainBrain…`, 'info');
      const j = createJob('terminal', `route ${agent.name}: ${task.slice(0, 42)}`);
      updateJob(j.id, { progress: 100, status: 'done', ended: now(), tokens: 180 + Math.floor(Math.random() * 420), costUsd: +(0.0008 + Math.random() * 0.004).toFixed(4) });
      // Dispatch without summoning: the harness stays open and the Focus pane picks it up.
      sendCommand(agent, task, 'workspace');
    }
  } else if (low === 'browser') {
    if (!arg) pushTermLine(tabId, 'usage: browser <task> — e.g. browser research solar pricing and save findings', 'warn');
    else {
      pushTermLine(tabId, `→ dispatching web agent: "${arg}"`, 'info');
      import('@/lib/browser/demo-engine').then(m => m.runBrowserTaskFromTerminal(arg)).catch(() => pushTermLine(tabId, ':: browser engine unavailable in this build', 'warn'));
    }
  } else if (low === 'ingest') {
    if (!arg) pushTermLine(tabId, 'usage: ingest <title>', 'warn');
    else {
      pushTermLine(tabId, `→ raw source queued: "${arg}"`, 'info');
      const j = createJob('ingest', `ingest: ${arg.slice(0, 42)}`);
      updateJob(j.id, { progress: 100, status: 'done', ended: now() });
      ingestSource(arg, 'markdown', 'Ingested from the harness terminal.');
    }
  } else if (low === 'wiki') {
    const q = (rest[0] || '').toLowerCase() === 'search' ? rest.slice(1).join(' ') : '';
    if (!q) pushTermLine(tabId, 'usage: wiki search <query>', 'warn');
    else {
      const r = searchBrain(q);
      pushTermLine(tabId, `wiki: ${r.pages.length} page(s) match "${q}"`, 'ok');
      r.pages.slice(0, 6).forEach(w => pushTermLine(tabId, `  [${w.type}] ${w.title}`));
      if (!r.pages.length) pushTermLine(tabId, '  no matches — the wiki is derived, ingest more sources', 'dim');
    }
  } else if (low === 'providers') {
    S.providers.forEach(p => pushTermLine(tabId, `  ${p.name.padEnd(16)} ${p.connected ? p.health : 'offline'} · ${p.apiMode} · ${p.baseUrl}`));
  } else if (low === 'theme') {
    const t = THEMES.find(x => x.id === arg.toLowerCase() || x.name.toLowerCase().startsWith(arg.toLowerCase()));
    if (!t) pushTermLine(tabId, `unknown theme "${arg}" — cortex | notebook | hermes | deepseek | harness | graphite`, 'warn');
    else { applyTheme(t.id, true); pushTermLine(tabId, `theme → ${t.name}`, 'ok'); }
  } else if (low === 'pause') { councilAction('pause'); pushTermLine(tabId, ':: council paused — rail guards hold all work', 'warn'); }
  else if (low === 'resume') { councilAction('resume'); pushTermLine(tabId, ':: council resumed — sequencing continues', 'ok'); }
  else pushTermLine(tabId, `unknown command: ${cmd} — type help`, 'warn');
  save(); emit();
}

/** Approve / request-changes on a file artifact — real gates, real events. */
export function setFileReview(path: string, verdict: 'approved' | 'changes') {
  const f = S.harness.files.find(x => x.path === path); if (!f) return;
  f.review = verdict;
  save(); emit();
  if (verdict === 'approved') {
    log('mainbrain', `Approved ${f.path} — gate recorded.`, 'artifact', 'Review → Artifact → Brain');
    toast('File approved', f.name, 'check');
  } else {
    log('mainbrain', `Changes requested on ${f.path} — sent back to ${f.createdBy}.`, 'artifact', 'Review → Studio → Artifact');
    toast('Changes requested', `${f.name} → ${f.createdBy}`, 'edit');
    const a = byId(f.createdBy.toLowerCase());
    if (a) pushOutput(a, `:: changes requested on ${f.path} — revising`, 'warn');
  }
}

/** File artifacts enter the Brain the same way as every studio output — through the Librarian. */
export function sendFileToLibrarian(path: string) {
  const f = S.harness.files.find(x => x.path === path); if (!f) return;
  log('librarian', `Ingesting file artifact: ${f.path}`, 'artifact', `${f.createdBy} → Artifact → Librarian → Brain`);
  toast('Sent to Librarian', f.name, 'book');
  emit();
  setTimeout(() => {
    S.wiki.unshift({ title: `${f.name} — review notes`, type: 'summary', summary: `File artifact ${f.path} ingested by the Chief Librarian. Created by ${f.createdBy}; linked decisions: ${f.decisions.join(' · ') || 'none'}. Raw preserved, entities extracted, pages rippled with citations.`, links: f.decisions, updated: 'now' });
    S.metrics.pages++;
    if (S.wiki.length > 60) S.wiki.length = 60;
    pushSyncLog(`file artifact ingested: ${f.path}`);
    save(); emit();
    log('librarian', `Wiki rippled from ${f.name} — now ${S.metrics.pages} pages.`, 'artifact', 'Librarian → wiki · graph · index → Brain');
  }, 1200);
}

/* ———————————————————————— governance — Jarvis owns the lifecycle ———————————————————————— */

/** Approve the current phase gate: record the approval, unlock + start the next studio. */
export function approvePhase() {
  const p = currentPhaseInfo(); if (!p) return;
  const wasBlocked = p.status === 'blocked';
  p.status = 'approved';
  S.gov.blockers = S.gov.blockers.filter(b => b.phase !== p.key);
  // Gate artifacts enter the Brain through the Librarian — approval is the pass.
  S.artifacts.filter(x => x.agentId === p.studio && x.state === 'pending').forEach(x => { x.state = 'ingested'; });
  log('mainbrain', `${p.label} approved — gate recorded${wasBlocked ? ' (blocker cleared)' : ''}.`, 'system', 'Jarvis review → Approved → Brain');
  const next = S.gov.phases[S.gov.phaseIdx + 1];
  const mb = byId('mainbrain');
  if (next) {
    S.gov.phaseIdx++;
    next.status = 'active';
    if (p.key === 'qa') log('mainbrain', 'QA PASS → Release unlocked.', 'system');
    else log('mainbrain', `${p.label} approved → ${next.label} unlocked.`, 'system');
    log('mainbrain', `Jarvis routed objective to ${next.label}.`, 'system', 'Approved → next studio starts');
    if (mb) pushOutput(mb, `:: gate approved — ${next.label} starts now`, 'ok');
    const ns = byId(next.studio);
    if (ns) nextTask(ns);
  } else {
    if (mb) pushOutput(mb, ':: all phases approved — Solar CRM shipped. Council stands down.', 'ok');
    log('mainbrain', 'All phases approved — project shipped. Council stands down.', 'system');
  }
  save(); emit();
  toast('Phase approved', `${p.label} gate passed${next ? ` — ${next.label} unlocked` : ''}.`, 'check');
}

/** Request changes: the phase returns to active and the studio gets a real revision task. */
export function requestPhaseChanges(reason: string) {
  const p = currentPhaseInfo(); if (!p || !reason.trim()) return;
  p.status = 'active';
  const a = byId(p.studio);
  log('mainbrain', `Changes requested on ${p.label}: ${reason.trim()} — revision task created for ${a?.name ?? p.label}.`, 'system', 'Gate → Studio → Artifact');
  if (a) {
    pushOutput(a, `:: Jarvis requested changes — ${reason.trim()}`, 'warn');
    startTask(a, {
      title: `Revise ${p.label} deliverable`,
      steps: ['Read Jarvis review notes', `Address: ${reason.trim().slice(0, 42)}`, 'Re-review vs constraints', 'Re-deliver artifact → Librarian'],
      lines: [`› review notes: ${reason.trim().slice(0, 60)}`, '✓ gaps identified against rail guards', '› revising deliverable…', '✓ self-review: constraints satisfied', '✓ revised artifact → Librarian', '✓ revision delivered — gate re-armed']
    });
    summon(a.id, true);
  }
  save(); emit();
  toast('Changes requested', `${p.label} studio re-engaged.`, 'edit');
}

/** Block (or unblock) the current phase — blockers surface in the MainBrain workspace + War Room. */
export function blockPhase(reason: string) {
  const p = currentPhaseInfo(); if (!p) return;
  if (p.status === 'blocked') {
    p.status = 'review';
    S.gov.blockers = S.gov.blockers.filter(b => b.phase !== p.key);
    log('mainbrain', `${p.label} phase unblocked — back at the review gate.`, 'system');
  } else {
    p.status = 'blocked';
    S.gov.blockers.unshift({ id: 'blk' + uid(), text: reason.trim() || 'Blocked by Jarvis', phase: p.key, raised: now() });
    const a = byId(p.studio);
    if (a) { a.status = 'idle'; pushOutput(a, `:: phase blocked — ${reason.trim() || 'held at the gate'}`, 'warn'); }
    log('mainbrain', `${p.label} phase blocked — ${reason.trim() || 'held at the gate'}.`, 'system');
  }
  save(); emit();
}

/** Constraints apply to every studio — Jarvis enforces them at each gate. */
export function addConstraint(text: string) {
  if (!text.trim()) return;
  S.gov.constraints.push(text.trim());
  log('mainbrain', `Constraint added: ${text.trim()} — applies to every studio.`, 'system');
  save(); emit();
  toast('Constraint added', 'Rail guards updated for all studios.', 'shield');
}
export function removeConstraint(i: number) {
  const [c] = S.gov.constraints.splice(i, 1);
  save(); emit();
  if (c) toast('Constraint removed', c, 'trash', () => { S.gov.constraints.splice(i, 0, c); save(); emit(); });
}

/* ———————————————————————— librarian — wiki actions ———————————————————————— */

/** Deprecate a wiki page (with undo) — kept for provenance, excluded from synthesis + graph. */
export function deprecatePage(title: string) {
  const w = S.wiki.find(x => x.title === title); if (!w) return;
  w.deprecated = true;
  log('librarian', `Wiki page deprecated: ${title} — kept for provenance, excluded from synthesis.`, 'artifact');
  save(); emit();
  toast('Page deprecated', title, 'trash', () => { w.deprecated = false; save(); emit(); });
}

/** Create a wiki page from synthesis — must cite raw sources. */
export function createWikiPage(data: { title: string; type: string; summary: string; links: string[]; citations: string[] }) {
  if (!data.title.trim()) return;
  S.wiki.unshift({ title: data.title.trim(), type: data.type, summary: data.summary, links: data.links, updated: 'now', citations: data.citations });
  S.metrics.pages++;
  if (S.wiki.length > 60) S.wiki.length = 60;
  log('librarian', `Wiki page synthesized: ${data.title.trim()} — every claim cites raw sources.`, 'artifact', 'Synthesis → citations → wiki');
  pushSyncLog(`wiki page synthesized: ${data.title.trim()} · ${data.citations.length} citation(s)`);
  save(); emit();
  toast('Page created', 'Synthesized with citations to raw sources.', 'book');
}

/* ———————————————————————— librarian — audit ———————————————————————— */

/** Librarian audit: re-scan the wiki, file findings. Raw layers are never touched. */
export function runAudit() {
  const found: AuditFinding[] = [];
  const active = S.wiki.filter(w => !w.deprecated);
  const titles = new Set(active.map(w => w.title));
  active.forEach(w => {
    w.links.forEach(l => { if (!titles.has(l)) found.push({ id: 'fnd' + uid(), kind: 'broken-reference', target: w.title, detail: `Links to missing page "${l}".`, severity: 'medium', status: 'open' }); });
    if (!active.some(x => x !== w && x.links.includes(w.title))) found.push({ id: 'fnd' + uid(), kind: 'orphan-page', target: w.title, detail: 'No other page references this — link it or deprecate it.', severity: 'low', status: 'open' });
    if ((w.summary ?? '').trim().length < 60) found.push({ id: 'fnd' + uid(), kind: 'missing-summary', target: w.title, detail: 'Summary is too thin to synthesize from.', severity: 'low', status: 'open' });
    if (!w.citations?.length) found.push({ id: 'fnd' + uid(), kind: 'unverified-claim', target: w.title, detail: 'No raw source cited for its claims.', severity: 'medium', status: 'open' });
    const days = /(\d+)d/.exec(w.updated);
    if (days && +days[1] >= 5) found.push({ id: 'fnd' + uid(), kind: 'stale-claim', target: w.title, detail: `Not touched for ${days[1]} days — re-verify against sources.`, severity: 'low', status: 'open' });
  });
  // Keep verdicts already recorded; add anything new (dedup by kind + target).
  const kept = S.findings.filter(f => f.status !== 'open' || !found.some(n => n.kind === f.kind && n.target === f.target));
  S.findings = [...found, ...kept].slice(0, 60);
  const lib = byId('librarian');
  if (lib) startTask(lib, {
    title: 'Audit the wiki — receipts, orphans, contradictions',
    steps: ['Scan every page for dangling links', 'Detect orphan + duplicate pages', 'Check citations + freshness', 'File findings with receipts', 'Report to MainBrain'],
    lines: [`› scanning ${active.length} active pages…`, `✓ ${found.filter(f => f.kind === 'broken-reference').length} broken references`, `✓ ${found.filter(f => f.kind === 'orphan-page').length} orphan pages`, `✓ ${found.filter(f => f.kind === 'unverified-claim').length} unverified claims`, `✓ ${found.length} finding(s) filed — fix mechanical, ask before major rewrite`]
  });
  log('librarian', `Audit complete — ${found.length} finding(s). Raw layers untouched.`, 'artifact', 'Librarian → audit → findings');
  save(); emit();
  toast('Audit complete', `${found.length} finding(s) filed.`, 'shield');
}

export function resolveFinding(id: string) {
  const f = S.findings.find(x => x.id === id); if (!f) return;
  f.status = 'resolved';
  log('librarian', `Finding resolved: ${f.target} (${FINDING_META[f.kind].label}).`, 'artifact');
  save(); emit();
  toast('Finding resolved', f.target, 'check', () => { f.status = 'open'; save(); emit(); });
}
export function dismissFinding(id: string) {
  const f = S.findings.find(x => x.id === id); if (!f) return;
  f.status = 'dismissed';
  log('librarian', `Finding dismissed: ${f.target} — ${FINDING_META[f.kind].label}.`, 'artifact');
  save(); emit();
  toast('Finding dismissed', f.target, 'x', () => { f.status = 'open'; save(); emit(); });
}

/* ———————————————————————— librarian — knowledge graph ———————————————————————— */

/** Projected graph: nodes + edges derived from every memory layer (nothing is duplicated). */
export function buildGraph(): { nodes: GraphVNode[]; edges: GraphVEdge[] } {
  const nodes: GraphVNode[] = [{ id: 'p:proj', kind: 'project', label: S.gov?.project ?? 'Project', meta: 'objective' }];
  const edges: GraphVEdge[] = [];
  S.sources.forEach(s => {
    nodes.push({ id: 's:' + s.id, kind: 'source', label: s.title, meta: SOURCE_KINDS[s.kind]?.label ?? s.kind });
    edges.push({ from: 'p:proj', to: 's:' + s.id, rel: 'CONTAINS' });
  });
  S.wiki.filter(w => !w.deprecated).forEach(w => {
    nodes.push({ id: 'w:' + w.title, kind: 'wikipage', label: w.title, meta: w.type });
    edges.push({ from: 'p:proj', to: 'w:' + w.title, rel: 'CONTAINS' });
    w.links.forEach(l => { if (S.wiki.some(x => x.title === l && !x.deprecated)) edges.push({ from: 'w:' + w.title, to: 'w:' + l, rel: 'REFERENCES' }); });
    (w.citations || []).forEach(c => { if (S.sources.some(s => s.id === c)) edges.push({ from: 'w:' + w.title, to: 's:' + c, rel: 'DERIVED_FROM' }); });
  });
  S.artifacts.slice(0, 24).forEach(x => {
    const id = 'a:' + x.id;
    nodes.push({ id, kind: 'artifact', label: x.title, meta: x.kind });
    edges.push({ from: 'p:proj', to: id, rel: 'CONTAINS' });
    if (S.agents.some(a => a.id === x.agentId)) edges.push({ from: id, to: 'ag:' + x.agentId, rel: 'CREATED_BY' });
  });
  S.entities.forEach(e => {
    nodes.push({ id: 'e:' + e.id, kind: e.type === 'concept' ? 'concept' : 'entity', label: e.name });
    if (e.sourceId && S.sources.some(s => s.id === e.sourceId)) edges.push({ from: 's:' + e.sourceId, to: 'e:' + e.id, rel: 'CONTAINS' });
    else edges.push({ from: 'p:proj', to: 'e:' + e.id, rel: 'CONTAINS' });
  });
  S.agents.forEach(a => {
    nodes.push({ id: 'ag:' + a.id, kind: 'agent', label: a.name, meta: a.domain });
    if (a.core || a.id === 'librarian') edges.push({ from: 'p:proj', to: 'ag:' + a.id, rel: 'OWNS' });
  });
  return { nodes, edges };
}

/** Subgraph around a center node (BFS to `depth` hops) — used by the Graph tab focus view. */
export function subgraph(centerId: string, depth = 1): { nodes: GraphVNode[]; edges: GraphVEdge[] } {
  const g = buildGraph();
  const keep = new Set<string>([centerId]);
  for (let d = 0; d < depth; d++) {
    const ring = [...keep];
    g.edges.forEach(e => { if (keep.has(e.from)) ring.push(e.to); if (keep.has(e.to)) ring.push(e.from); });
    ring.forEach(id => keep.add(id));
  }
  return { nodes: g.nodes.filter(n => keep.has(n.id)), edges: g.edges.filter(e => keep.has(e.from) && keep.has(e.to)) };
}

/* ———————————————————————— MCP / tools marketplace ———————————————————————— */

export function toggleConnector(id: string) {
  const c = S.harness.connectors.find(x => x.id === id); if (!c) return;
  c.connected = !c.connected; save(); emit();
  toast(c.name, c.connected ? 'MCP connector enabled.' : 'Connector disabled.', c.connected ? 'link' : 'info');
  log('mainbrain', `${c.name} connector ${c.connected ? 'enabled' : 'disabled'} — tool access updated.`, 'system');
}

export function addConnector(data: { name: string; desc: string; icon?: string }) {
  const c: Connector = { id: 'mcp' + uid(), name: data.name, icon: data.icon || 'plug', desc: data.desc, connected: true, auth: 'demo', allowedAgents: ['mainbrain'], custom: true };
  S.harness.connectors.push(c);
  save(); emit();
  toast('Connector added', c.name, 'plug');
  return c;
}

export function removeConnector(id: string) {
  const i = S.harness.connectors.findIndex(x => x.id === id); if (i < 0) return;
  const [c] = S.harness.connectors.splice(i, 1);
  save(); emit();
  toast('Connector removed', c.name, 'trash', () => { S.harness.connectors.splice(i, 0, c); save(); emit(); });
}

export function resetDemoData() {
  try { localStorage.removeItem(LS_KEY); localStorage.removeItem('cortexos-t3'); localStorage.removeItem('cortexos-t1'); } catch { /* ignore */ }
  location.reload();
}

/* ———————————————————————— war room v2 — navigation + layout system ———————————————————————— */

/** Constitution v2: War Room is where work happens. Home stays the calm landing view. */
export function enterWarRoom(opts?: { centerMode?: CenterMode; dockTab?: DockTab }) {
  S.war.inside = true;
  S.overlay = null; S.themePop = false; S.notifOpen = false;
  if (opts?.centerMode && MODES_BY_LEVEL[S.war.userMode].includes(opts.centerMode)) setCenterMode(opts.centerMode);
  if (opts?.dockTab) setDockTab(opts.dockTab, true);
  sfx.summon(); emit();
}

export function exitWarRoom() {
  S.war.inside = false;
  emit(); save();
}

function syncLayout() { S.war.layoutByMode[S.war.userMode] = { ...S.war.layout }; }

export function setUserMode(m: UserMode) {
  S.war.userMode = m;
  const lm = { ...S.war.layoutByMode[m] };
  if (!MODES_BY_LEVEL[m].includes(lm.centerMode)) lm.centerMode = m === 'simple' ? 'chat' : 'dashboard';
  if (m === 'simple') { lm.dockOpen = false; lm.rightOpen = false; }
  S.war.layoutByMode[m] = lm;
  S.war.layout = lm;
  save(); emit();
  toast('Workspace mode', m === 'simple' ? 'Simple — chat, knowledge and tasks only.' : m === 'advanced' ? 'Advanced — full execution deck unlocked.' : 'Custom — your panels, your rules.', 'layout');
}

export function setCenterMode(m: CenterMode) {
  if (!MODES_BY_LEVEL[S.war.userMode].includes(m)) return;
  S.war.layout.centerMode = m;
  syncLayout();
  sfx.tick(); emit();
}

export function setDockTab(t: DockTab, open = true) {
  S.war.layout.dockTab = t;
  if (open) S.war.layout.dockOpen = true;
  syncLayout(); save(); emit();
}

export function toggleDock() { S.war.layout.dockOpen = !S.war.layout.dockOpen; syncLayout(); save(); emit(); }
export function setDockSize(n: number) { S.war.layout.dockSize = Math.max(18, Math.min(70, Math.round(n))); syncLayout(); save(); emit(); }
/** Resize drag ticks — mutate + emit only; commitLayout() persists on drag end. */
export function nudgeDockSize(n: number) { S.war.layout.dockSize = Math.max(18, Math.min(70, Math.round(n))); syncLayout(); emit(); }
export function nudgeSideSizes(left: number, right: number) {
  S.war.layout.leftSize = Math.max(10, Math.min(24, Math.round(left)));
  S.war.layout.rightSize = Math.max(16, Math.min(38, Math.round(right)));
  syncLayout(); emit();
}
export function commitLayout() { save(); }
export function toggleRightPanel() { S.war.layout.rightOpen = !S.war.layout.rightOpen; syncLayout(); save(); emit(); }
export function setRightTab(t: RightTab) { S.war.layout.rightTab = t; S.war.layout.rightOpen = true; syncLayout(); emit(); }
export function toggleSidebar() { S.war.layout.sidebarCollapsed = !S.war.layout.sidebarCollapsed; syncLayout(); save(); emit(); }
export function setSideSizes(left: number, right: number) {
  S.war.layout.leftSize = Math.max(10, Math.min(24, Math.round(left)));
  S.war.layout.rightSize = Math.max(16, Math.min(38, Math.round(right)));
  syncLayout(); save(); emit();
}

export function saveCurrentLayout(name: string) {
  if (!name.trim()) return;
  S.war.savedLayouts.unshift({ id: 'lay' + uid(), name: name.trim(), userMode: S.war.userMode, layout: { ...S.war.layout }, createdAt: 'now' });
  if (S.war.savedLayouts.length > 12) S.war.savedLayouts.length = 12;
  save(); emit();
  toast('Layout saved', `"${name.trim()}" — restored on every reload.`, 'pin');
}

export function applySavedLayout(id: string) {
  const l = S.war.savedLayouts.find(x => x.id === id) ?? LAYOUT_PRESETS.find(x => x.id === id);
  if (!l) return;
  S.war.userMode = l.userMode;
  S.war.layout = { ...l.layout };
  S.war.layoutByMode[l.userMode] = { ...l.layout };
  save(); emit();
  toast('Layout applied', l.name, 'layout');
}

export function deleteSavedLayout(id: string) {
  const i = S.war.savedLayouts.findIndex(x => x.id === id); if (i < 0) return;
  const [l] = S.war.savedLayouts.splice(i, 1);
  save(); emit();
  toast('Layout removed', l.name, 'trash', () => { S.war.savedLayouts.splice(i, 0, l); save(); emit(); });
}

export function setPopoutTerminal(v: boolean) { S.war.popoutTerminal = v; emit(); }

/* ———————————————————————— war room — Jarvis chat ———————————————————————— */

export function pushChatMessage(m: ChatMessage) {
  S.war.chat.push(m);
  if (S.war.chat.length > 80) S.war.chat.shift();
  emit();
}

export function updateChatMessage(id: string, patch: Partial<ChatMessage>) {
  const m = S.war.chat.find(x => x.id === id); if (!m) return;
  Object.assign(m, patch);
  emit();
}

export function clearChat() {
  const copy = [...S.war.chat];
  S.war.chat = [{ ...CHAT_WELCOME }];
  emit();
  toast('Chat cleared', 'History stays in the Brain.', 'trash', () => { S.war.chat = copy; emit(); });
}

/** One click on an Action Card = one real state change + audit receipt. */
export function runChatAction(a: ChatAction) {
  switch (a.kind) {
    case 'terminal':
      setDockTab('terminal', true);
      runTermCommand(a.payload);
      log('mainbrain', `Action card → terminal: ${a.payload}`, 'task');
      break;
    case 'browser':
      setCenterMode('browser');
      import('@/lib/browser/demo-engine').then(m => m.startBrowserTask(a.payload)).catch(() => toast('Browser engine unavailable', 'The demo engine could not load.', 'warn'));
      log('mainbrain', `Action card → browser deck: ${a.payload}`, 'task');
      break;
    case 'task':
      addTask({ title: a.payload, owner: 'Jarvis', source: 'chat', detail: 'Created from a Jarvis action card.' });
      break;
    case 'ingest':
      ingestSource(a.payload, 'markdown', 'Ingested via a Jarvis action card from chat.', { fast: true });
      log('mainbrain', `Action card → librarian ingest: ${a.payload}`, 'task');
      break;
    case 'squad': {
      setCenterMode('agent');
      const sq = a.target ? S.war.squads.find(x => x.id === a.target) : S.war.squads[0];
      if (sq) import('@/lib/squad-engine').then(m => m.startSquadRun(sq.id, a.payload)).catch(() => toast('Squad engine unavailable', 'Could not start the run.', 'warn'));
      break;
    }
    case 'workflow': {
      setCenterMode('workflow');
      const wf = a.target ? S.war.workflows.find(x => x.id === a.target) : S.war.workflows[0];
      if (wf) import('@/lib/workflow-engine').then(m => m.runWorkflow(wf.id)).catch(() => toast('Workflow engine unavailable', 'Could not start the run.', 'warn'));
      break;
    }
  }
}

/* ———————————————————————— war room — tasks ———————————————————————— */

export function addTask(input: { title: string; detail?: string; owner?: string; source?: TaskItem['source'] }): TaskItem {
  const t: TaskItem = { id: 'tsk' + uid(), title: input.title.trim(), detail: input.detail?.trim() || '', status: 'open', owner: input.owner || 'You', source: input.source || 'manual', created: now() };
  S.war.tasks.unshift(t);
  if (S.war.tasks.length > 60) S.war.tasks.length = 60;
  log('mainbrain', `Task created: ${t.title}`, 'task');
  save(); emit();
  return t;
}

export function setTaskStatus(id: string, status: TaskStatus) {
  const t = S.war.tasks.find(x => x.id === id); if (!t) return;
  const prev = t.status;
  t.status = status;
  if (status === 'done') t.done = now();
  save(); emit();
  toast(status === 'done' ? 'Task completed' : `Task ${status}`, t.title, status === 'done' ? 'check' : 'edit', () => { t.status = prev; save(); emit(); });
}

export function removeTask(id: string) {
  const i = S.war.tasks.findIndex(x => x.id === id); if (i < 0) return;
  const [t] = S.war.tasks.splice(i, 1);
  save(); emit();
  toast('Task removed', t.title, 'trash', () => { S.war.tasks.splice(i, 0, t); save(); emit(); });
}

/* ———————————————————————— war room — jobs (unified execution queue) ———————————————————————— */

export function createJob(kind: JobKind, label: string, note?: string): Job {
  const j: Job = { id: 'job' + uid(), kind, label, status: 'running', progress: 0, tokens: 0, costUsd: 0, started: now(), note, demo: !isLive() };
  S.war.jobs.unshift(j);
  if (S.war.jobs.length > 40) S.war.jobs.length = 40;
  emit();
  return j;
}

export function updateJob(id: string, patch: Partial<Job>) {
  const j = S.war.jobs.find(x => x.id === id); if (!j) return;
  if (j.status === 'cancelled' && patch.status !== 'cancelled') return; // cancelled stays cancelled
  Object.assign(j, patch);
  emit();
}

export function cancelJob(id: string) {
  const j = S.war.jobs.find(x => x.id === id); if (!j) return;
  if (j.status !== 'running' && j.status !== 'queued') return;
  j.status = 'cancelled'; j.ended = now();
  log('mainbrain', `Job cancelled: ${j.label}`, 'system');
  save(); emit();
}

export const activeJobs = () => S.war.jobs.filter(j => j.status === 'running' || j.status === 'queued');

/* ———————————————————————— war room — squads ———————————————————————— */

export function addSquad(data: { name: string; mission: string; color?: string }): Squad {
  const sq: Squad = { id: 'sq' + uid(), name: data.name.trim(), mission: data.mission.trim() || 'Custom squad', color: data.color || '#22d3ee', budgetUsd: 2, members: [], custom: true, run: null };
  S.war.squads.push(sq);
  save(); emit();
  toast('Squad created', sq.name, 'users');
  return sq;
}

export function updateSquad(id: string, patch: Partial<Squad>) {
  const sq = S.war.squads.find(x => x.id === id); if (!sq) return;
  Object.assign(sq, patch);
  save(); emit();
}

export function removeSquad(id: string) {
  const i = S.war.squads.findIndex(x => x.id === id); if (i < 0) return;
  if (!S.war.squads[i].custom) return; // seeded squads are part of the product
  const [sq] = S.war.squads.splice(i, 1);
  save(); emit();
  toast('Squad removed', sq.name, 'trash', () => { S.war.squads.splice(i, 0, sq); save(); emit(); });
}

export function addSquadMember(squadId: string, m: Omit<SquadMemberDef, 'id'>) {
  const sq = S.war.squads.find(x => x.id === squadId); if (!sq) return;
  sq.members.push({ ...m, id: 'sqm' + uid() });
  save(); emit();
}

export function removeSquadMember(squadId: string, memberId: string) {
  const sq = S.war.squads.find(x => x.id === squadId); if (!sq) return;
  sq.members = sq.members.filter(m => m.id !== memberId);
  save(); emit();
}

/* ———————————————————————— war room — workflows ———————————————————————— */

export function addWorkflow(data: { name: string; desc?: string; nodes: Omit<WorkflowNode, 'id'>[] }): WorkflowDef {
  const wf: WorkflowDef = { id: 'wf' + uid(), name: data.name.trim(), desc: data.desc?.trim() || '', nodes: data.nodes.map(n => ({ ...n, id: 'wfn' + uid() })), custom: true };
  S.war.workflows.push(wf);
  save(); emit();
  toast('Workflow created', wf.name, 'flow');
  return wf;
}

export function updateWorkflow(id: string, patch: Partial<WorkflowDef>) {
  const wf = S.war.workflows.find(x => x.id === id); if (!wf) return;
  Object.assign(wf, patch);
  save(); emit();
}

export function removeWorkflow(id: string) {
  const i = S.war.workflows.findIndex(x => x.id === id); if (i < 0) return;
  if (!S.war.workflows[i].custom) return;
  const [wf] = S.war.workflows.splice(i, 1);
  if (S.war.wfRun?.workflowId === id) S.war.wfRun = null;
  save(); emit();
  toast('Workflow removed', wf.name, 'trash', () => { S.war.workflows.splice(i, 0, wf); save(); emit(); });
}

export function setWfRun(state: WorkflowRunState | null) { S.war.wfRun = state; emit(); }

/* ———————————————————————— war room — canvas ———————————————————————— */

export function addCanvasCard(card: Omit<CanvasCard, 'id'>) {
  S.war.canvas.push({ ...card, id: 'cc' + uid() });
  save(); emit();
}

export function moveCanvasCard(id: string, x: number, y: number) {
  const c = S.war.canvas.find(k => k.id === id); if (!c) return;
  c.x = Math.max(8, x); c.y = Math.max(8, y);
  save(); emit();
}

export function updateCanvasCard(id: string, patch: Partial<CanvasCard>) {
  const c = S.war.canvas.find(k => k.id === id); if (!c) return;
  Object.assign(c, patch);
  save(); emit();
}

export function removeCanvasCard(id: string) {
  const i = S.war.canvas.findIndex(k => k.id === id); if (i < 0) return;
  const [c] = S.war.canvas.splice(i, 1);
  save(); emit();
  toast('Card removed', c.title, 'trash', () => { S.war.canvas.splice(i, 0, c); save(); emit(); });
}

/** Canvas cards enter the Brain through the Librarian — like every studio output. */
export function sendCanvasCardToLibrarian(id: string) {
  const c = S.war.canvas.find(k => k.id === id); if (!c) return;
  log('librarian', `Canvas card queued for ingestion: ${c.title}`, 'artifact', 'Canvas → Librarian → Brain');
  ingestSource(c.title, 'markdown', c.text, { fast: true });
}

/* ———————————————————————— war room — browser deck (state; engine in lib/browser) ———————————————————————— */

/** Policy check shared by the manual address bar and the agent loop. */
export function browserAllowed(session: BrowserSession, url: string): boolean {
  let host = '';
  try { host = new URL(url).hostname; } catch { return false; }
  if (session.policy.prohibitedDomains.some(d => host === d || host.endsWith('.' + d))) return false;
  if (session.policy.allowedDomains.length && !session.policy.allowedDomains.some(d => host === d || host.endsWith('.' + d))) return false;
  return true;
}

export function createBrowserSession(input?: { name?: string; url?: string; policy?: Partial<BrowserPolicy> }): BrowserSession {
  const s: BrowserSession = {
    id: 'bs' + uid(), name: input?.name?.trim() || `Session ${S.war.browser.sessions.length + 1}`, url: input?.url || 'https://search.cortex.example', title: '',
    policy: { mode: 'read-only', allowedDomains: DEFAULT_ALLOWED_DOMAINS.slice(), prohibitedDomains: [], maxSteps: 14, maxCostUsd: 0.5, ...(input?.policy || {}) },
    history: [], steps: [], extractions: [], approval: null, status: 'idle', task: '', verdict: null,
    engine: 'demo', takeover: false, costUsd: 0, tokens: 0, artifacts: [], created: 'now'
  };
  S.war.browser.sessions.unshift(s);
  S.war.browser.activeSession = s.id;
  save(); emit();
  return s;
}

export function closeBrowserSession(id: string) {
  const i = S.war.browser.sessions.findIndex(s => s.id === id); if (i < 0) return;
  if (S.war.browser.sessions.length <= 1) return;
  const [s] = S.war.browser.sessions.splice(i, 1);
  if (S.war.browser.activeSession === id) S.war.browser.activeSession = S.war.browser.sessions[0].id;
  save(); emit();
  toast('Session closed', s.name, 'trash', () => { S.war.browser.sessions.splice(i, 0, s); S.war.browser.activeSession = s.id; save(); emit(); });
}

export function setActiveBrowserSession(id: string) { S.war.browser.activeSession = id; save(); emit(); }

export function setBrowserPolicy(id: string, patch: Partial<BrowserPolicy>) {
  const s = S.war.browser.sessions.find(x => x.id === id); if (!s) return;
  Object.assign(s.policy, patch);
  save(); emit();
}

export function pushBrowserStep(id: string, step: Omit<BrowserStep, 'id' | 'at'>): BrowserStep {
  const s = S.war.browser.sessions.find(x => x.id === id)!;
  const st: BrowserStep = { ...step, id: 'bst' + uid(), at: now() };
  s.steps.push(st);
  if (s.steps.length > 80) s.steps.shift();
  s.tokens += st.tokens;
  s.costUsd = +(s.costUsd + st.costUsd).toFixed(4);
  emit();
  return st;
}

export function setBrowserStatus(id: string, status: BrowserSession['status'], verdict?: BrowserVerdict) {
  const s = S.war.browser.sessions.find(x => x.id === id); if (!s) return;
  s.status = status;
  if (verdict) s.verdict = verdict;
  save(); emit();
}

export function setBrowserApproval(id: string, approval: BrowserApproval | null) {
  const s = S.war.browser.sessions.find(x => x.id === id); if (!s) return;
  s.approval = approval;
  if (approval) s.status = 'paused';
  emit();
}

/** Approve or deny a sensitive browser action — a Jarvis approval gate, in the deck. */
export function resolveBrowserApproval(id: string, approve: boolean) {
  const s = S.war.browser.sessions.find(x => x.id === id); if (!s || !s.approval) return;
  const ap = s.approval;
  s.approval = null;
  const step = s.steps.find(x => x.id === ap.stepId);
  if (step) {
    step.result = approve ? 'ok' : 'blocked';
    step.detail += approve ? ' · approved by you' : ' · denied by you';
  }
  log('mainbrain', approve ? `Browser approval granted: ${ap.action} on ${ap.domain}` : `Browser action denied: ${ap.action} on ${ap.domain} — agent will not proceed`, 'system', approve ? undefined : 'Jarvis approval → denied');
  save(); emit();
}

export function addBrowserExtraction(id: string, e: Omit<BrowserExtraction, 'id' | 'saved'>): BrowserExtraction {
  const s = S.war.browser.sessions.find(x => x.id === id)!;
  const ex: BrowserExtraction = { ...e, id: 'bx' + uid(), saved: false };
  s.extractions.push(ex);
  if (s.extractions.length > 24) s.extractions.shift();
  emit();
  return ex;
}

/** [Save as Source] — the real 11-stage Librarian ingest pipeline, with citations. */
export function saveBrowserExtraction(sessionId: string, extractionId: string) {
  const s = S.war.browser.sessions.find(x => x.id === sessionId);
  const e = s?.extractions.find(x => x.id === extractionId);
  if (!s || !e || e.saved) return;
  e.saved = true;
  log('librarian', `Browser extraction queued: ${e.title}`, 'artifact', 'Browser Deck → Librarian → wiki · graph · index');
  ingestSource(e.title, 'url', `${e.text}\n\nExtracted from ${e.url} by the CortexOS Web Agent (Browser Deck).`, { fast: true });
  s.artifacts.push(`Source — ${e.title}`);
  save(); emit();
}

export function setBrowserTakeover(id: string, v: boolean) {
  const s = S.war.browser.sessions.find(x => x.id === id); if (!s) return;
  s.takeover = v;
  if (v && s.status === 'running') s.status = 'paused';
  log('mainbrain', v ? `Manual takeover: you are driving the browser session.` : `Agent resumed control of the browser session.`, 'system');
  save(); emit();
}

export function setBrowserEngine(id: string, engine: BrowserSession['engine']) {
  const s = S.war.browser.sessions.find(x => x.id === id); if (!s) return;
  s.engine = engine;
  save(); emit();
  toast('Browser engine', engine === 'demo' ? 'Demo engine — simulated web, fully governed.' : engine === 'native' ? 'Native engine — Chromium via CDP (live).' : 'browser-use sidecar (live, optional).', 'compass');
}

/* ———————————————————————— war room — harness compare ———————————————————————— */

export function setComparePrompt(p: string) { S.war.compare.prompt = p; emit(); }
export function setCompareRunning(v: boolean) { S.war.compare.running = v; emit(); }
export function setCompareWinner(id: string | null) { S.war.compare.winnerId = id; emit(); }

export function addComparePanel(model?: string) {
  if (S.war.compare.panels.length >= 4) return;
  const first = allModels().find(m => m.model !== 'auto/router');
  S.war.compare.panels.push({
    id: 'cmp' + uid(), model: model || first?.model || 'gemini-2.5-pro', providerId: model ? (providerOfModel(model)?.id ?? '') : (first?.provider.id ?? ''),
    text: '', status: 'idle', firstTokenMs: 0, totalMs: 0, tokens: 0, costUsd: 0, finish: '', demo: !isLive()
  });
  emit();
}

export function removeComparePanel(id: string) {
  if (S.war.compare.panels.length <= 1) return;
  S.war.compare.panels = S.war.compare.panels.filter(p => p.id !== id);
  emit();
}

export function setComparePanelModel(id: string, model: string) {
  const p = S.war.compare.panels.find(x => x.id === id); if (!p) return;
  p.model = model;
  p.providerId = providerOfModel(model)?.id ?? p.providerId;
  p.text = ''; p.status = 'idle'; p.tokens = 0; p.costUsd = 0; p.firstTokenMs = 0; p.totalMs = 0; p.finish = '';
  emit();
}

export function updateComparePanel(id: string, patch: Partial<ComparePanel>) {
  const p = S.war.compare.panels.find(x => x.id === id); if (!p) return;
  Object.assign(p, patch);
  emit();
}

/** Pick a winner → files a Decision artifact to the Librarian with the transcript as immutable source. */
export function saveDecisionArtifact(winnerId: string) {
  const c = S.war.compare;
  const winner = c.panels.find(p => p.id === winnerId); if (!winner) return;
  const provider = S.providers.find(p => p.id === winner.providerId)?.name ?? winner.providerId;
  const transcript = c.panels.map(p => `— ${p.model} @ ${S.providers.find(x => x.id === p.providerId)?.name ?? p.providerId} · ${p.firstTokenMs}ms first token · ${p.tokens} tokens · $${p.costUsd.toFixed(4)} · ${p.finish || 'n/a'}\n${p.text}`).join('\n\n');
  setCompareWinner(winnerId);
  const srcTitle = `Harness compare — ${winner.model} wins`;
  // transcript preserved as an immutable raw source through the real pipeline
  ingestSource(srcTitle, 'chat-logs', `Prompt: ${c.prompt}\n\nVerdict: ${winner.model} (${provider}).\n\nTranscript:\n${transcript}`, { fast: true });
  // decision page + artifact
  S.wiki.unshift({
    title: `Decision: ${winner.model} for “${c.prompt.slice(0, 42)}”`, type: 'decision',
    summary: `Harness compare verdict: ${winner.model} via ${provider} won on ${winner.firstTokenMs}ms first token · ${winner.tokens} tokens · $${winner.costUsd.toFixed(4)} per call. Full transcript preserved as the raw source “${srcTitle}” — every claim cites it.`,
    links: ['Qdrant vs pgvector', 'OAuth Provider Decision'], updated: 'now', citations: [S.sources[0]?.id ?? 'src-transcript']
  });
  S.metrics.pages++;
  if (S.wiki.length > 60) S.wiki.length = 60;
  S.artifacts.unshift({ id: uid(), agentId: 'librarian', agentName: 'Librarian', title: `Decision — ${winner.model} wins the compare`, kind: 'decision', state: 'ingested', created: now() });
  if (S.artifacts.length > 60) S.artifacts.length = 60;
  pushSyncLog(`compare verdict filed: ${winner.model} · transcript preserved as raw source`);
  log('librarian', `Decision artifact filed: ${winner.model} wins the compare — transcript preserved.`, 'artifact', 'Compare → Decision artifact → Librarian → Brain');
  save(); emit();
  toast('Decision filed', `${winner.model} — citations preserved in the Vault.`, 'check');
}

/* deterministic seed runs at module load — safe on the server (pure data, no DOM) */
seed();
