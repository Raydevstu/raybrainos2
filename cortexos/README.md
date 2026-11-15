# CortexOS — Neural Agent Operating System

MainBrain-centered agent OS with a summonable Agent-Bot Dock, Chief Librarian
Wiki, provider gateway, Jarvis governance, and War Room monitoring.

Runs immediately in **demo mode** — a local seeded adapter powers every
interaction. No backend services are required for preview.

## Locked product constitution

1. **MainBrain is the center.**
2. **Librarian is the Wiki/Knowledge Brain.**
3. **Seven phase custodians:** Discovery, Product, Design, Architecture, Development, QA, Release.
4. **Agent-Bot Dock replaces tab navigation.**
5. **Agent domains open only when summoned.**
6. **War Room is monitoring/execution, not primary navigation.**
7. **Every studio output becomes Artifact → Librarian → Brain.**
8. **Wiki is derived knowledge, never source of truth.**
9. **Jarvis/MainBrain governs routing and approvals.**
10. **Provider calls go through gateway/router.**
11. **UI is Tier-1, not vibe-coded.**
12. **Notifications never block close buttons.**
13. **Mobile has no overflow or clipped controls.**
14. **Theme presets work:** Cortex, NotebookLM, Hermes, DeepSeek, Terminal Harness, Graphite.

## Run

```bash
npm install        # or: bun install
npm run dev        # Vite dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

Open in Google AI Studio by importing this folder — `metadata.json` and
`index.html`/`index.tsx` are the entry points. Preview boots in demo mode.

## Environment boundary

**Demo mode (default, zero config):** every client call resolves through the
local seeded adapter (`lib/cortex-adapter.ts`) against the in-browser store.
The Solar CRM council, wiki, sources, providers and governance lifecycle are
all seeded — the preview is fully interactive out of the box.

**Live mode:** set the following before building/serving:

| Variable | Service |
| --- | --- |
| `VITE_CORTEX_MODE` | `live` to switch every client to HTTP |
| `VITE_BRAIN_SERVICE_URL` | brain-service — projects, artifacts, sources, search, graph, librarian pipeline |
| `VITE_JARVIS_SERVICE_URL` | jarvis-service — work requests, phase gates, council state |
| `VITE_STUDIO_SERVICE_URL` | studio-service — studio environments, playbooks, memory |
| `VITE_EVENTS_URL` | event stream (SSE) — `SourceCreated`, `ArtifactCreated`, … |

Both sides speak the identical view models in `lib/api/types.ts`, so the UI
cannot tell demo from live. Provider credentials never enter the browser —
live inference is proxied by a server-side provider gateway
(`lib/provider-gateway.ts` builds the structured payload; keys are stored as
reference labels only).

## Structure

```
metadata.json          AI Studio app manifest
package.json           deps + scripts (Vite + React 18 + TypeScript)
index.html             entry document (fonts, #root, module script)
index.tsx              React root mount
App.tsx                renders the CortexOS shell
styles.css             complete self-contained theme system (6 presets)
components/
  cortex.ts            neural store — state, seeds, simulation, governance,
                       librarian pipeline, harness terminal, persistence
  cortex-os.tsx        root shell — top bar, OS rail, dock, war strip,
                       notification drawer, toasts, theme popover
  agent-panel.tsx      summoned agent workspace + MainBrain governance view
  neural-canvas.tsx    animated MainBrain neural map (canvas, pan/zoom, pulses)
  overlays.tsx         War Room · Agent Roster · Librarian HQ · Settings
  modals.tsx           customize/add agent · ingest · review · wiki page · confirm
  harness.tsx          execution cockpit — sessions, layouts, terminal, files,
                       MCP marketplace, sandbox strip
  graph-view.tsx       SVG knowledge graph (deterministic ring layout)
  icons.tsx            inline SVG icon set + blob agent avatars
lib/
  provider-types.ts    provider gateway type system
  provider-gateway.ts  the single boundary between CortexOS and providers
  model-router.ts      agent affinity → provider/model resolution + fallbacks
  cortex-adapter.ts    local demo adapter (async, latency-shaped)
  api/
    types.ts           canonical view models + events + errors
    http.ts            runtime mode + live transport
    brain-client.ts    projects, artifacts, sources, search, graph, librarian
    jarvis-client.ts   supervisor surface — work, gates, council
    studio-client.ts   studio environments + memory
    events-client.ts   event stream (SSE live / store bridge demo)
```

## Architecture invariants

- **You talk to MainBrain only.** Directives route through the supervisor;
  studios never self-organize or skip Jarvis gates.
- **Nothing enters the Brain except through the Chief Librarian.** Studio
  outputs become artifacts; the Librarian ingests, ripples the wiki, syncs
  the graph + index and files audit receipts.
- **The wiki is derived.** Raw sources are immutable; every synthesized claim
  cites its source. Deprecation keeps provenance without excluding history.
- **All provider traffic flows through the gateway/router.** Components never
  import a provider SDK or call a provider URL; the model router resolves
  provider + model with a visible fallback chain.
