# Task 2-b — Chief Librarian HQ workspace (Librarian HQ · Graph · Modals)

Agent: librarian-hq-builder
Date: 2026-06-27
Scope: exactly 3 files owned; nothing else touched (cortex.ts, agent-panel.tsx, cortex-os.tsx, cortex.css, icons.tsx, harness.tsx, neural-canvas.tsx, src/lib untouched).

## Files written

### 1. `src/components/cortex/graph-view.tsx` (NEW)
Self-contained `'use client'` `export default function GraphView()`.
- Store: `S, useCortex, buildGraph, subgraph` (+ `GraphNodeKind`, `GraphVNode` types).
- State: `center: string | null`, `depth: 1 | 2`, `hover: string | null`.
- Data: `full = buildGraph()`; `effCenter` guards against a vanished focus node (falls back to full graph); `subgraph(effCenter, depth)` when focused.
- HUD (`.g-hud`): "Focus" label + select (Full graph `''` + every source/artifact/wiki node id with `Source — title` style labels), depth select (1 hop / 2 hops, disabled when no center), `.chip` "{nodes} nodes · {edges} edges", 24px x button to clear focus.
- Layout: deterministic rings, no physics. Anchor = focused node, else project (`p:proj`), else first node, at (450,310). Rings 130/210/290 by kind (project+agent ring 1, source+artifact ring 2, wikipage+entity+concept ring 3), evenly angled: `a = (i/len)*2π - π/2`. Node radius 16/10/9/9/8/7/7 by kind. Colors: project #8b5cf6, agent = agent's own color from `S.agents` (strip `ag:` prefix, fallback #4f8cff), source #f59e0b, wikipage #22d3ee, artifact #34d399, entity #60a5fa, concept #f472b6.
- Edges under nodes (`.gedge`, `.hl` when touching focus); `.g-edge-label` text at midpoint only for highlighted edges.
- Nodes `.gnode` (+ `.sel` when center, `.dim` when focus exists and not adjacent): circle + label (16-char truncation) + optional `.gmeta` (source/wikipage/agent kinds, 18-char truncation). Click toggles focus (clicking the focused node returns to full graph); hover sets focus for highlight/dim; keyboard accessible (role=button, tabIndex, Enter/Space).
- Legend `.g-legend`: 7 `.gl-item` kind dots + dim mono rels `CONTAINS · REFERENCES · DERIVED_FROM · CREATED_BY · OWNS`.
- Wrap: `.graph-wrap` as flex column (HUD absolute per CSS, svg flex:1 minHeight 380, legend at end), inline minHeight 480. Empty state when no nodes.

### 2. `src/components/cortex/overlays.tsx` (Knowledge → LIBRARIAN HQ)
- Root `Overlays`: knowledge title `'LIBRARIAN HQ'`, sub `'Chief Librarian · Memory OS · derived layer, never source of truth'` (icon kept `book`).
- WarRoom / Roster / Settings / Harness kept byte-identical.
- `Knowledge` reworked: local `useState<KnowledgeTab>('wiki')` tabs **Task | Wiki | Sources | Graph | Audit** in `.k-tabs` (Wiki/Sources counts + open-findings count via `.k-count`); global `.k-search` kept with async `searchBrain` + stale-response guard (req ref); search drives the Wiki list when active and hides raw sources in Sources tab (existing behavior). `LibrarianWiki` is keyed by the trimmed query so a new global search resets preview/filters (matches previous "clear preview on query" behavior).
- `LibrarianTask`: librarian header card (BlobAvatar, name, domain, `.p-status` chip, model chip), current task (`.step` done/cur by `stepsDone` + `.prog`), live output in `#p-output` (same ln classes, auto-scroll via ref+useEffect, placeholder line when empty), buttons `Run audit` (btn primary sm, Icon audit → `runAudit()`) and `Ingest source` (btn sm, Icon plus → ingest modal). Guard when librarian missing.
- `LibrarianWiki`: controls row (local filter input + `all`+WIKI_TYPES `.fchip` chips + `Create page from synthesis` btn sm primary → `{ type: 'wiki-page' }` modal); `#w-list` of `.wpage` buttons (`.dep` + `.dep-badge` when deprecated, `.wt` type chip, updated time); preview `#w-preview` in `.p-card` with back button, Links (clickable chips when the target page exists, dim when missing), Backlinks (`.bl-sec`, "No backlinks yet" fallback), Citations (`.ct-sec` rows: `.sr-raw` badge with Icon db + title + SOURCE_KINDS label, "Synthesized — no direct citations" fallback), actions row `Deprecate page` (btn danger sm, Icon trash, only when !deprecated → `deprecatePage(title)`) + footer note "Derived layer · maintained by Chief Librarian · never the source of truth".
- `LibrarianSources`: header + `Add source` (btn primary sm → ingest modal) + immutable dim note; live **pipeline viz** for `S.sources.find(s => s.status !== 'audited')` — `.p-card` "Ingestion pipeline — {title}", 11 `INGEST_STAGES` as `.pipe-stage` joined by `.pipe-link` (done when the stage it feeds is done/running), `PIPE_PROGRESS: Record<SourceStatus, number> = { queued:1, normalized:2, classified:3, extracted:4, linked:6, indexed:10, audited:11 }` drives `.done`/`.run` + Icon check dots, `.gov-note` receipt line; source list `.src-row` (`.sr-ic` kind icon, `.sr-kind` + `.sr-raw` "raw · immutable" + created + `.sr-status {status}` badges, no edit/delete); Artifacts `.k-col` section with existing `.art-row` markup for ALL artifacts + existing `.k-note`; search hides raw sources behind the existing empty-state.
- `LibrarianAudit`: `Run audit` + all/open/resolved/dismissed `.fchip` filters, dim summary "x open · y resolved · z dismissed — findings never touch raw sources", `.aud-row` per finding (status class, `.ad-ic` FINDING_META icon, kind label + `sev-{severity}` `.aud-kind` badges, 28px icon-btns check/x → `resolveFinding`/`dismissFinding` when open, `.chip` status otherwise), `.empty` fallback.
- Graph tab: `<div style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}><GraphView /></div>`.

### 3. `src/components/cortex/modals.tsx`
Customize / Add / Confirm unchanged. Ingest reworked + 3 new modals wired into the switch:
- **Ingest**: Type select now from `SOURCE_KINDS` (value=kind key, label=label), default `'markdown'`, state typed `SourceKind`; same `ingest({ title: title.trim(), type, body: body.trim() })` call (store closes the modal); added `.gov-note` "Raw layer preserved immutably · 11-stage pipeline · wiki + graph + index updated."
- **Constraint** (`{ type: 'constraint' }`): Icon shield h3, textarea rows 3, Cancel + `Add constraint` (disabled when empty) → `void addProjectConstraint(text.trim()); closeModal();`.
- **Review** (`{ type: 'review'; artifactId }`): Icon gate h3; `.art-row` meta row (agentName · kind · created + `.ar-state` badge); `.gov-gate` wrapper with `.gg-sub` "Phase gate: {currentPhaseInfo()?.label} — {status}" (ok tint when approved); `.ct-sec` Linked sources (up to 3 `S.sources` rows with `.sr-raw` badge + title); `.k-note` librarian summary "{open} open finding(s) across the wiki — citations verified on ingest"; `.modal-actions`: `Approve phase` (btn primary → `void approvePhase(); closeModal();`), `Request changes` (toggles local state revealing a reason textarea + `Send changes` → `void requestChanges(reason.trim()); closeModal();`, with Cancel to back out), `Block phase` (btn danger Icon ban → `void holdPhase('Held at artifact review'); closeModal();`). Missing artifact → dim "Artifact no longer exists." + Close.
- **Wiki-page** (`{ type: 'wiki-page' }`): Icon plus h3; Title input, Type select (WIKI_TYPES keys), Summary textarea rows 3, Links comma input, Citations checkbox list of ALL sources (`.chip` labels + kind), Cancel + `Create page` (disabled without title) → `createWikiPage({ title: title.trim(), type, summary, links: split/trim/filter, citations }); closeModal();`.
- Click-outside-to-close behavior kept.

## Store contract confirmed (cortex.ts)
SOURCE_KINDS (L129), INGEST_STAGES (L144), SOURCE_STATUSES (L145), WIKI_TYPES (L123), FINDING_META (L157), KnowledgeTab (L19), Source/SourceKind/SourceStatus (L47-51), AuditFinding/FindingKind (L99-100), GraphVNode/GraphVEdge (L102-103), runAudit (L1170), resolveFinding/dismissFinding (L1196/1203), deprecatePage (L1147), createWikiPage (L1156), buildGraph (L1214), subgraph (L1246), currentPhaseInfo (L682). Clients: jarvis-client approvePhase/requestChanges/holdPhase/addProjectConstraint; brain-client searchBrain/ingest.

## Deviations / judgment calls
- Pipeline `.pipe-link` done rule: a link is green when the stage it feeds is done **or running** (`i <= done`) so the green path reaches the spinner (spec only specified stage states).
- Graph node click toggles focus (clicking the focused node returns to the full graph) — the HUD x button also clears, per spec.
- HUD "Focus" label rendered as a small uppercase span next to the select (spec: 'a select "Focus:"').
- Wiki tab: local filter + type chips apply on top of the global search results; `LibrarianWiki` keyed by trimmed global query to preserve the old "clear preview on new query" behavior.
- `.ar-state` / `.gg-sub` CSS is scoped to `.art-row` / `.gov-gate`, so the Review modal reuses them by wrapping rows in those parents (spec said "reuse classes").
- Task/Audit tab containers capped at maxWidth 760/1150 respectively for readability in the full-screen overlay; empty-output placeholder line added in the Task terminal.
- `SOURCE_KINDS.prd.icon` is `'doc'` which is not in icons.tsx — `Icon` falls back to the info glyph (store data, not touched).
- Added a dim intro line to the Constraint and Wiki-page modals for consistency with the Ingest modal's house style.

## Verification
- dev.log tail: only `✓ Compiled` + `GET / 200` after writes — no compile/type errors.
- Did not run lint/dev commands per task instructions (dev server is system-managed).
