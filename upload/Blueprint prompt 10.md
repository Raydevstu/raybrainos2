PROMPT 10 — CORTEXOS WAR ROOM: FINAL PACKAGING
Product Requirement + UX Vision + Implementation Contract
==========================================================

ROLE
You are the lead product engineer for CortexOS / RAYBRAIN-OS. Prompts 1–9 are
already implemented in this repository. This is the final packaging prompt.
You are NOT starting from scratch. You are upgrading an existing, working
demo-mode application into the unified AI operating environment described
below, without breaking anything that already works.

----------------------------------------------------------
0. REQUIRED READING — BEFORE WRITING ANY CODE
----------------------------------------------------------
Read and honor these existing documents in this repo:
- cortexos/README.md  (the locked product constitution + architecture invariants)
- upload/Provider Gateway  Any-Provider Wiring .md
- upload/Hermes  DeepSeek Harness Layer.md
- upload/War Room Monitoring Layer.md
- upload/6 — Jarvis Governance  Operating Model.md
- upload/7--- Chief Librarian  Wiki Deep Build.md
- upload/8 — Tier-1 Polish  QA Pass.md
- upload/Brain-Service Integration Adapter.MD
- agent-ctx/2-a-governance-ui.md and agent-ctx/2-b-librarian-hq-builder.md
- src/components/cortex/cortex.ts (the store — all state contracts live here)
- src/lib/provider-types.ts, provider-gateway.ts, model-router.ts
- src/lib/api/types.ts (canonical view models — demo and live speak the same types)

----------------------------------------------------------
1. CURRENT STATE (AUDIT — BUILD ON THIS, DO NOT REBUILD)
----------------------------------------------------------
Verified in the repo today:
- Two frontends exist: (a) cortexos/ — the original Vite + React 18 AI Studio
  app with metadata.json; (b) src/ — the Next.js 16 + React 19 + Tailwind +
  shadcn port, rendered at / via src/components/cortex/cortex-os.tsx.
  CANONICAL TARGET = the Next.js app under src/. The cortexos/ folder is the
  AI Studio preview entry: keep it importable, and record feature parity in
  docs/PARITY.md. Never let the two drift silently.
- Working today (demo mode, seeded Solar CRM): MainBrain neural map, Agent-Bot
  Dock, summoned agent workspaces, 7-phase Jarvis governance with approval
  gates, Chief Librarian HQ (Task/Wiki/Sources/Graph/Audit, 11-stage ingest),
  War Room monitoring overlay, Harness (sessions, layout presets, simulated
  terminal, files/review, MCP marketplace, sandbox status strip), provider
  gateway UI with fallback simulation, 6 theme presets.
- NOT real yet: the terminal executes app-state commands only (no shell);
  provider-gateway.ts only BUILDS a payload — no inference happens anywhere;
  mini-services/ is empty; the only API route is a hello-world; Prisma schema
  is still the scaffold User/Post template; all persistence is localStorage.
- Hosting platform (.zscripts) supports: Next.js server, Bun mini-services
  (mini-services/mini-service-*.js), and a Python 3.12 runtime via uv
  (requirements.txt or pyproject.toml). Plan real backends accordingly.
- AI Studio preview CANNOT run containers, shells, or Chromium. Therefore
  every execution feature ships as: DEMO ENGINE (works in preview, mutates
  real app state) + LIVE ENGINE (same interface, real backend) — exactly like
  the existing cortex-adapter pattern. Every panel must show a DEMO/LIVE
  badge. Never present simulated output as real execution.

----------------------------------------------------------
2. CONSTITUTION v2 — FORMAL AMENDMENT
----------------------------------------------------------
The old constitution says "War Room is monitoring, not primary navigation"
and "Agent-Bot Dock replaces tab navigation." This prompt AMENDS those two
clauses. All other clauses remain locked.

Amended clauses:
- 4v2: The War Room is the primary operating environment of CortexOS. The
  Agent-Bot Dock survives as a quick-summon strip INSIDE the War Room.
- 6v2: Home = MainBrain neural map + dock, and remains the calm landing view.
  "Enter War Room" is the primary CTA. War Room is where work happens.

Unchanged invariants (enforce in code, not just UI):
- You talk to MainBrain/Jarvis only. Jarvis governs routing and approvals.
- Nothing enters the Brain except through the Chief Librarian.
- Every studio/agent output becomes an Artifact → Librarian → Brain.
- Wiki is derived knowledge, never source of truth; raw sources immutable.
- ALL provider traffic flows through the gateway/router. No component ever
  imports a provider SDK or calls a provider URL.
- No raw API keys client-side, ever. Key references only; secrets resolve
  server-side.
- Tier-1 UI: dense but readable, no neon spam, no emoji icons, monospace
  terminals, strong status hierarchy, 6 theme presets apply everywhere,
  mobile has zero overflow and close buttons always reachable.

----------------------------------------------------------
3. PRODUCT DEFINITION
----------------------------------------------------------
Problem: AI work is fragmented across ChatGPT, Claude, Gemini, terminal,
VS Code, GitHub, Notion, browser, and file explorer. Users pay a constant
context-switching tax.

CortexOS War Room = "Mission Control for Human + AI Collaboration."
One workspace that unifies: AI chat, terminal, agent orchestration, file
system, knowledge base, tasks, model routing, automation execution, sandbox
environments, and a governed web browser.

Core doctrine (must be visible in the UX, not just the docs):
- Knowledge becomes execution: wiki pages and playbooks have "Run" actions.
- Conversations become actions: every Jarvis reply can emit Action Cards —
  [Run in Terminal] [Open in Browser Deck] [Create Task] [Ingest to Vault]
  [Route to Squad] [Launch Workflow]. One click, real state change, audit
  receipt.
- Agents become teammates: named squads, visible work, visible cost.
- Jarvis is the operating system layer, not a chatbot.

UX references (reference ONLY — do not copy any product's identity):
- Hermes Agent: session layouts, multi-panel workspace, Terminal Deck mode,
  execution visibility, provider abstraction.
- DeepSeek-style harnesses: clean sandbox-first execution, tool visibility,
  command transparency, provider independence.
- VS Code: workspace concept, explorer, split layouts, panels.
- Notion: knowledge structure, wiki, long-term memory.
- NotebookLM: source management, context grounding, synthesis with citations.

Do NOT build another AI chatbot, Notion clone, or VS Code clone.

----------------------------------------------------------
4. WAR ROOM SHELL — LAYOUT SPECIFICATION
----------------------------------------------------------
Replace the current War Room overlay with a full workspace route/shell.
Use react-resizable-panels + @dnd-kit (already in package.json) for
drag/resize. The old 3-column monitoring view survives as the Dashboard
mode inside the new shell — do not delete its functionality.

4.1 LEFT SIDEBAR (collapsible, icon rail when collapsed)
Navigation: Home, Workspaces, Projects, Knowledge Vault, Agents,
Automations, Tasks, Memory, Settings.
Active Resources block (live, from store):
- Active Project (name + current phase chip)
- Active Agent Team (squad name + member dots)
- Memory Context (grounded sources count, click to inspect)
- Connected Models (provider health dots)
- Running Jobs (count + spinner, click opens dock Jobs tab)

4.2 CENTER PANEL — MODES (mode switcher + saved layouts)
- Chat Mode: Jarvis conversation. Streaming replies, tool-call chips,
  Action Cards (section 3), @mentions to ground on vault sources/pages.
- Canvas Mode: research board — freeform cards, sources, clips from Browser
  Deck, synthesis blocks; every card can be sent to Librarian.
- Workflow Mode: automation builder — node graph (trigger → steps →
  approvals → outputs); steps can be: model call (via gateway), terminal
  command, browser task, agent task, librarian ingest. Demo engine executes
  workflows against the store; live engine executes via backend jobs.
- Agent Mode: the Agent Command Center (section 7).
- Knowledge Mode: existing Librarian HQ (Task/Wiki/Sources/Graph/Audit)
  embedded as a mode, unchanged contracts.
- Dashboard Mode: the existing War Room monitoring view (activity feed,
  mission board, system/global output) + project overview.
- Browser Mode: the Browser Deck (section 8) can also occupy the center
  when the user expands it from the dock.

4.3 RIGHT SIDEBAR — CONTEXT PANEL (tabs, collapsible)
- Agent Activity: current step ("thinking" summaries only, never raw
  chain-of-thought), tool calls, retrieval actions, research progress,
  memory lookups — streamed from the event bus, filterable per agent.
- Knowledge Context: sources/documents/retrieved chunks currently grounding
  the conversation, with citations and relationship links into the graph.
- Task Context: active objectives, project milestones, execution plan
  (phase pipeline), blockers. Approve/Request-changes/Block inline —
  reusing the existing governance actions.

4.4 BOTTOM DOCK — THE EXECUTION DECK (resizable, tabbed, pop-out-able)
Tabs: Terminal | Sandbox | Harness | Browser | Jobs
- Terminal: keep every existing app-state command (help, status, agents,
  route, ingest, wiki search, providers, theme, pause, resume). Add an
  engine selector: DEMO (current behavior) / LIVE. LIVE connects over
  WebSocket to a Bun mini-service (mini-services/mini-service-terminal.ts)
  exposing a PTY: bash/pwsh, python REPL, node. Docker commands only when
  the host exposes a socket; otherwise show "unavailable on this host" —
  never fake them. Multiple terminal tabs, scrollback, kill switch.
- Sandbox: agent execution environment view — running jobs, agent actions,
  logs, artifacts, outputs. Same demo/live engine contract as Terminal.
  Isolation status strip stays honest: "demo adapter" vs "container".
- Harness: provider testing cockpit (section 6.3).
- Browser: the Browser Deck (section 8).
- Jobs: unified queue of everything running (terminal cmds, workflows,
  agent runs, browser tasks) with status, cost, cancel, and artifact links.

----------------------------------------------------------
5. LAYOUT SYSTEM (REQUIRED)
----------------------------------------------------------
Three user modes, switchable from the top bar, persisted per workspace:
- SIMPLE (beginners): only Chat, Knowledge, Tasks visible. No dock, no
  right sidebar, no jargon. This is the default for a fresh workspace.
- ADVANCED (developers): Terminal, Sandbox, Harness, Browser, agent logs,
  multi-panel splits all enabled.
- CUSTOM: user drags/resizes/docks/undocks any panel, saves named layouts,
  creates templates. Ship presets: Research, Coding, Automation,
  Content Creation, Web Ops.
Implementation: a Layout state tree in the store (panels, sizes, splits,
visibility), serialized to localStorage in demo and to the Layout Prisma
model in live. Multi-monitor support = "Pop out panel" opens a child window
(window.open) synchronized via BroadcastChannel; popping back re-docks it.
Mobile: modes become full-screen stacked views with a bottom tab bar;
no horizontal overflow anywhere; close buttons never covered.

----------------------------------------------------------
6. PROVIDER ARCHITECTURE — FINISH THE GATEWAY (CRITICAL)
----------------------------------------------------------
Jarvis must never be coupled to a provider. The abstraction exists as UI;
now make it real, preserving the existing types and the demo behavior.

6.1 SERVER GATEWAY
Create src/app/api/gateway/route.ts (POST, SSE streaming response):
- Accepts the exact payload buildGatewayPayload() already produces.
- Resolves apiKeyRef against server env/secret store. Keys never reach
  the client, logs, or the store.
- Adapters by apiMode: chat-completions (OpenAI, DeepSeek, OpenRouter,
  Groq, Ollama, any compatible endpoint), responses, anthropic-messages,
  gemini, ollama. One adapter interface: send(), stream(), health(),
  usage(). Adding a provider = adding config, not code paths in components.
- Emits normalized stream events: token, tool_call, usage, error, done —
  identical shape in demo and live, so the UI cannot tell the difference.
- Failover: on error/offline, walk modelProfile.fallbackModels; every hop
  logged to the activity feed ("OpenAI offline → routed to DeepSeek").
- Metering: return tokens + estimated cost per call; store per AgentRun,
  per session, per project. Budget caps per project; exceeding a cap
  creates a Jarvis approval gate instead of silently spending.

6.2 ROUTING
model-router.ts stays the single decision point: agent affinity → provider
+ model, per-agent overrides, auxiliary models. Update Settings UI to test
a connection (real health ping in live mode) and show latency + cost tier.

6.3 HARNESS (COMPARE + BENCHMARK)
Upgrade the Harness tab into a provider testing environment:
- Side-by-side panels (2–4): same prompt streamed to different providers/
  models simultaneously through the gateway.
- Per-panel metrics: latency, tokens, cost, finish reason; pick-a-winner
  button that files a Decision artifact to the Librarian (with the transcript
  as immutable source).
- Prompt bench: save prompt sets, run across providers, table of results.
- Test agents + debug workflows: run a squad or workflow against a chosen
  model profile in the sandbox, with full tool-call visibility.
- Supported out of the box: OpenAI, Anthropic, Gemini, Grok, DeepSeek,
  OpenRouter, Ollama/local, custom endpoints. Demo mode simulates all of
  this with latency-shaped seeded responses, clearly badged DEMO.

----------------------------------------------------------
7. AGENT COMMAND CENTER
----------------------------------------------------------
Agent Mode shows squads, not a flat agent list. Seed three squads (demo):
- Research Squad: Research Agent, Web Agent (Browser Deck), Fact Check Agent
- Development Squad: Architect, Frontend, Backend, QA
- YouTube Squad: Research, Script, SEO, Thumbnail
Users can create/edit squads (Customize modal pattern already exists).
Per agent, always visible: current task, status (idle/working/review/
blocked), live output tail, produced artifacts, progress, tokens, cost.
Squad rollup: total cost, elapsed, phase gate status.
Governance is unchanged: squads never self-start outside the lifecycle
unless autonomy/demo mode explicitly allows; Jarvis routes all work;
every output becomes an Artifact reviewed at the phase gate.
Clicking any agent opens the existing summoned workspace (agent-panel).

----------------------------------------------------------
8. BROWSER DECK — OUR OWN WEB AGENT (NEW FLAGSHIP FEATURE)
----------------------------------------------------------
Build "Browser Deck" — CortexOS-native governed web browsing and web-task
execution. Architecture is INSPIRED BY browser-use (github.com/browser-use/
browser-use, MIT license). We own the feature: our naming, our UI, our
engine interface, our governance, our provider gateway. Do not import their
cloud service, do not require their API key, do not copy their branding.
If any code is vendored, keep the MIT notice in NOTICE.md and pin
browser-use==1.0.5 exactly (never >=) — but vendoring is optional, the
interface below is the requirement.

8.1 ENGINE CONTRACT (one interface, three engines)
lib/browser/types.ts + lib/browser/browser-engine.ts:
  BrowserEngine {
    open(session, url), act(session, action), observe(session) -> PageState,
    extract(session, selector|query) -> content, screenshot(session),
    runTask(session, task, policy) -> stream of BrowserEvents,
    close(session)
  }
  BrowserAction: navigate | click | type | type_secret | scroll | select |
    upload | download | new_tab | switch_tab | back | wait | extract | js_read
  BrowserEvent: step_started, thought_summary, action, observation,
    approval_required, extraction, artifact, done, error
- ENGINE A — DEMO (default, works in AI Studio preview): a simulated web
  (seeded pages: docs sites, a shop, a search results page) rendered in the
  live-view pane; the agent loop really runs against the store, actions
  really mutate session state, extractions really flow to the Librarian.
  Badged DEMO. This is not a video — it is the same event stream a live
  engine produces.
- ENGINE B — NATIVE LIVE: a Bun mini-service (mini-service-browser.ts)
  driving Chromium via CDP (playwright-core). Implements the same contract,
  streams BrowserEvents over WebSocket. Headless on servers; screenshots
  stream to the live-view pane.
- ENGINE C — BROWSER-USE ADAPTER (optional, advanced): a Python 3.12
  sidecar (services/browser-agent/, FastAPI + browser-use==1.0.5, uv lock)
  exposing the same contract over WebSocket/SSE. Configured with a LOCAL
  Browser('chromium') and llm pointed at OUR gateway's OpenAI-compatible
  endpoint — so even this engine stays provider-independent and never
  calls Browser Use Cloud. The platform's python-runtime build supports
  this. Ship it behind a feature flag, documented, off by default.

8.2 AGENT LOOP (all engines)
task → plan → observe (DOM/accessibility snapshot + optional screenshot)
→ model decides next action (via provider gateway, routed by model-router)
→ execute action → observe → verify → finish(result, artifacts).
Bounded: max steps, max cost, timeout — all configurable per task policy.
Every step emits a BrowserEvent so the UI shows exactly what the agent
is doing and why (summary level).

8.3 UI — BROWSER DOCK TAB (expandable to center Browser Mode)
- Tab strip (multi-tab sessions), address bar, back/forward/reload.
- Live view: screenshot stream (live engines) or simulated page (demo),
  with action highlights (bracket flash on the element being clicked).
- Task bar: "Tell the web agent what to do…" + policy chips (read-only /
  interact / approvals required).
- Action timeline: every step with action, target, result, duration,
  tokens, cost; click a step to see its observation.
- Takeover button: pause agent, hand manual control to the user, resume.
- Extraction tray: pages/snippets the agent collected; each has
  [Save as Source] → runs the real 11-stage Librarian ingest pipeline
  (raw immutable source → wiki ripple → graph → index → audit receipt).
- Sessions persist (BrowserSession model); "Follow-up task" reuses the
  same session state.

8.4 GOVERNANCE + SECURITY (non-negotiable)
- Domain policy per session: allowed_domains / prohibited_domains,
  enforced in the engine, listed in the agent's system prompt.
- Sensitive actions REQUIRE a Jarvis approval card before execution:
  login, credential entry, form submit, purchase, delete, send/post.
  The approval card shows domain, action, filled values (secrets masked).
- Secrets: stored server-side, referenced by name; the agent types them
  via type_secret(name); values are redacted from every log, event,
  timeline entry, and artifact. Never place raw secrets in model context.
- Prompt-injection defense: page content is data, never instructions;
  the system prompt states this; navigation caused by page content to a
  new domain triggers a policy check; the run summary flags suspected
  injection attempts.
- Read-only mode by default for new sessions. Downloads land in the
  session workspace and become artifacts only via Librarian ingest.
- Every browser run ends with a judge pass (success/failure/gotchas) and
  files an audit receipt; cost + tokens are metered like any agent run.

8.5 INTEGRATIONS
- Web Agent is a first-class squad member (Research Squad).
- Chat Action Card [Open in Browser Deck] hands a task from Jarvis.
- Workflow Mode has a "Browser task" node type.
- Terminal command: browser <task> routes through the same engine.
- CortexOS search can fall back to a governed web search task whose
  results are ingested as sources with citations.

----------------------------------------------------------
9. PERSISTENCE — REPLACE THE TEMPLATE SCHEMA
----------------------------------------------------------
Replace prisma/schema.prisma User/Post with the real domain (SQLite dev,
Postgres-ready; vector index via pgvector when live):
Workspace, Project, Phase, WorkRequest, Artifact, Source, WikiPage,
GraphNode, GraphEdge, Task, Agent, Squad, AgentRun, Conversation, Message,
ProviderProfile, ModelProfile, Layout, TerminalSession, Job,
BrowserSession, BrowserAction, Approval, AuditEvent, Setting.
Rules:
- Demo mode keeps the seeded in-browser adapter EXACTLY as interactive as
  today. Live mode swaps transports, not view models (src/lib/api/types.ts
  remains the single contract).
- Implement the four live services behind the existing clients:
  brain-service, jarvis-service, studio-service, events (SSE at
  /api/events). They may start as Next.js API route groups backed by
  Prisma; mini-services only where a persistent process is needed
  (terminal PTY, browser engine).
- Add .env.example documenting every variable (DATABASE_URL, provider key
  refs, service URLs, feature flags). Update root README.md with the real
  architecture, run instructions, and demo/live boundary.

----------------------------------------------------------
10. BUILD ORDER + ACCEPTANCE GATES
----------------------------------------------------------
Execute in phases; each phase must leave the app fully working in demo
mode. Do not start a phase with the previous one failing its checks.

10.1 War Room shell + layout system (Simple/Advanced/Custom, presets,
     persistence, pop-out windows, mobile). Old War Room content preserved
     as Dashboard mode. Constitution v2 recorded in cortexos/README.md.
10.2 Live provider gateway + streaming + failover + metering + Harness
     compare/benchmark. Demo parity maintained.
10.3 Execution deck: Terminal/Sandbox engine contract + Bun PTY
     mini-service + Jobs queue. Demo terminal unchanged.
10.4 Browser Deck: types + demo engine + full UI + approvals + Librarian
     ingest + judge receipts. Native engine + optional browser-use sidecar
     behind flags with docs.
10.5 Agent Command Center: squads, telemetry, budgets, Action Cards wired
     end-to-end (chat → terminal/browser/task/workflow/squad).
10.6 Persistence: Prisma schema + live services + SSE; demo/live parity
     verified against src/lib/api/types.ts.
10.7 Tier-1 QA pass: all 6 themes, mobile overflow audit, notification
     placement, undo on every destructive action, empty states, keyboard
     navigation, docs/PARITY.md + NOTICE.md + README refresh.

ACCEPTANCE TESTS (all must pass, demo mode, seeded data):
A1  Fresh workspace opens in Simple mode: only Chat, Knowledge, Tasks.
A2  Switch to Advanced: dock appears with Terminal/Sandbox/Harness/Browser/
    Jobs; switch back and the layout restores exactly.
A3  Drag-resize a panel, save layout as "My Research", reload — restored.
A4  Pop out the terminal to a second window; run a command; state syncs
    back to the main window; re-dock works.
A5  Chat with Jarvis; reply contains an Action Card; clicking [Create Task]
    creates a real task visible in Tasks and Task Context.
A6  Terminal: `agents` and `route dev "build login form"` mutate real store
    state; LIVE badge appears only when a real engine is connected.
A7  Harness: same prompt to 2 providers side by side; latency/tokens/cost
    shown; winner saved as a Decision artifact with citations.
A8  Disconnect a provider in Settings; next call visibly fails over through
    the fallback chain in the activity feed; per-agent chips update.
A9  Browser Deck (demo): task "research X and save findings" produces a
    step-by-step timeline, hits an approval gate on a form submit, and
    [Save as Source] pushes a page through all 11 ingest stages into Wiki/
    Graph/Audit with citations.
A10 Browser policy: navigating outside allowed_domains is blocked and
    logged; a secret typed via type_secret appears nowhere in logs.
A11 Squad run: Research Squad executes a governed objective; per-agent
    cost/tokens/progress visible; outputs arrive as artifacts at the phase
    gate; Approve unlocks the next phase.
A12 Workflow: trigger → model call → browser task → ingest runs end-to-end
    in demo; every step lands in Jobs with artifacts.
A13 Governance: no agent self-starts outside the lifecycle; request-changes
    creates a task for the responsible studio; every ingest files an audit
    receipt; raw sources remain immutable.
A14 All 6 themes render every new surface correctly; mobile (375px) has zero
    horizontal overflow; no notification ever covers a close button.
A15 grep check: no component imports a provider SDK; no raw API key exists
    in client code, localStorage, or logs; no fake "LIVE" states.

----------------------------------------------------------
11. SUCCESS CRITERIA (PRODUCT LEVEL)
----------------------------------------------------------
A user can, without leaving CortexOS:
1. Chat with Jarvis. 2. Execute terminal commands. 3. Run AI agents and
squads. 4. Access project knowledge with citations. 5. Manage tasks and
phase gates. 6. Switch providers instantly. 7. Compare model outputs side
by side. 8. Launch workflows. 9. Monitor every agent's activity and cost.
10. Send a governed web agent to do real browser work and ingest what it
finds. 11. Save and restore their own workspace layouts across sessions
and monitors.

If a feature makes CortexOS feel like "another chat app", it is wrong.
The War Room is where work actually happens — not where conversations
about work happen. Knowledge becomes execution. Conversations become
actions. Agents become teammates. Jarvis is the operating system layer.

END OF PROMPT 10