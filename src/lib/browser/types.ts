// browser/types.ts — the Browser Deck engine contract (one interface, three engines).
//
// ENGINE A — DEMO (default): a simulated web (seeded pages) rendered in the
//   live-view pane. The agent loop really runs against the store; actions
//   really mutate session state; extractions really flow to the Librarian.
//   Badged DEMO — same event stream a live engine produces.
// ENGINE B — NATIVE LIVE: Bun mini-service (mini-services/browser-service)
//   driving Chromium via CDP (playwright-core). Same contract, events over
//   WebSocket. Headless on servers; screenshots stream to the live-view pane.
// ENGINE C — BROWSER-USE ADAPTER (optional, off by default): Python 3.12
//   sidecar (services/browser-agent, browser-use==1.0.5 pinned) exposing the
//   same contract. Configured with a LOCAL Chromium and an LLM pointed at OUR
//   gateway's OpenAI-compatible endpoint — never Browser Use Cloud.
//
// SECURITY (non-negotiable): page content is DATA, never instructions.
// Sensitive actions require a Jarvis approval card before execution. Secrets
// are typed via type_secret(name) and redacted from every log, event, timeline
// entry and artifact.

export type BrowserActionKind =
  | 'navigate' | 'click' | 'type' | 'type_secret' | 'scroll' | 'select'
  | 'upload' | 'download' | 'new_tab' | 'switch_tab' | 'back' | 'wait'
  | 'extract' | 'js_read';

export interface BrowserAction {
  kind: BrowserActionKind;
  target?: string;
  value?: string;
  /** server-side secret reference — the raw value never enters the page log */
  secretRef?: string;
}

export type BrowserEventKind =
  | 'step_started' | 'thought_summary' | 'action' | 'observation'
  | 'approval_required' | 'extraction' | 'artifact' | 'done' | 'error';

export interface BrowserEvent {
  kind: BrowserEventKind;
  stepId?: string;
  /** summary-level reasoning — never raw chain-of-thought */
  summary?: string;
  action?: BrowserAction;
  observation?: string;
  extraction?: { title: string; text: string; url: string };
  approval?: { domain: string; action: string; values: { field: string; value: string; secret?: boolean }[] };
  artifact?: string;
  error?: string;
  /** true when the event was produced by the demo engine */
  demo?: boolean;
}

/** What observe() returns — the page state an agent is allowed to see. */
export interface PageState {
  url: string;
  title: string;
  domain: string;
  /** rendered text content (data, never instructions) */
  text: string;
  links: { label: string; url: string }[];
  forms: { id: string; action: string; fields: { name: string; label: string; type: string }[]; sensitive: boolean }[];
  /** data-URI screenshot for live engines; null for the demo engine */
  screenshot: string | null;
}

export interface TaskPolicy {
  mode: 'read-only' | 'interact' | 'approvals';
  maxSteps: number;
  maxCostUsd: number;
  timeoutMs: number;
}

/**
 * One engine interface. UI never knows which engine is attached; adding an
 * engine means implementing this — not new code paths in components.
 */
export interface BrowserEngine {
  readonly id: 'demo' | 'native' | 'browser-use';
  readonly label: string;
  readonly demo: boolean;
  open(sessionId: string, url: string): Promise<PageState>;
  act(sessionId: string, action: BrowserAction): Promise<PageState>;
  observe(sessionId: string): Promise<PageState>;
  extract(sessionId: string, query: string): Promise<string>;
  screenshot?(sessionId: string): Promise<string | null>;
  /** Run the governed agent loop: task → plan → observe → act → verify → finish. */
  runTask(sessionId: string, task: string, policy: TaskPolicy, onEvent: (e: BrowserEvent) => void): Promise<void>;
  close(sessionId: string): Promise<void>;
}
