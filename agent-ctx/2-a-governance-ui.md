# 2-a — Jarvis Governance workspace UI (agent-panel.tsx)

## Scope
Edited ONLY `/home/z/my-project/src/components/cortex/agent-panel.tsx` (as instructed). No other file touched. No lint/dev commands run (ran `bunx tsc --noEmit` once as a pure type check; agent-panel.tsx is clean).

## What was built
Replaced the MainBrain (core agent) workspace in the summoned-agent drawer with a `GovernanceView` component. Panel shell (p-head, p-model, p-scroll, p-cmd, command input, librarian tabs + HQ button, WikiView) untouched. Non-core agents render identically to before (Steps is now non-core only; its hardcoded core pipeline branch was deleted; the "Current task" h4 renders the same text as before for non-core).

Cards rendered for core agents, in order (inside GovernanceView, then one card from the parent):
1. Project governance (Icon target) — `.gov-objective` with project bold + objective; current phase line (Icon gate + label + status `.chip` with ok/warn/danger variants); active studio line (Icon users + `byId(cur.studio)` name + status). Shipped guard shows Icon verified "Project shipped — every gate approved. Council stands down." and skips cards 2-5.
2. Phase pipeline · approval gates (Icon route) — `.gov-strip` of `.gov-ph` chips (status class + `cur`), `.gov-join` connectors with `done` when the earlier phase is approved, `.gov-note` "Jarvis owns transitions…".
3. Approval gate (Icon gate) — review/blocked: `.gov-gate` with h5 (ban icon + "— BLOCKED" when blocked), `.gg-sub` deliverable · deadline, up to 3 studio artifacts as `.gov-art` buttons opening `openModal({ type: 'review', artifactId })`, empty note when none. `.gov-acts`: Approve phase (primary sm check → `void approvePhase()`), Request changes (sm edit), Block/Unblock phase (danger sm ban), Add constraint (ghost sm shield). The latter three reveal ONE shared inline input (local useState `gateForm` + `gateTxt`, toggle on re-click, exact spec placeholders, Send submit + Cancel). Submit → `void requestChanges/holdPhase/addProjectConstraint(text)`, then clears. active: `.gov-gate ok` "studio is working" + studio's current task title + note "The gate arms when the deliverable lands." pending: `.gov-note` "Phase queued — waiting for the previous gate."
4. Blockers · risks · constraints (Icon shield) — `.gov-kv` rows: blockers (ban, var(--danger)), risks (warn, var(--warn) high/medium, var(--dim) low, `<b>{level}</b> — text`), constraints (lock + `.gk-x` x-icon-11 button → `removeConstraint(i)`); dim empty states for all three.
5. Deliverables · deadlines (Icon calendar) — `.gov-kv` rows per phase: list icon (check + var(--ok) when approved), `<b>{label}</b> — {deliverable}`, right-aligned `<small>` deadline (marginLeft auto, fontSize 10, var(--dim)).
6. Council broadcast — exact previous markup (4 councilAction buttons), moved into GovernanceView so it stays core-only.
7. Live output — exact previous markup, kept in AgentPanel parent (renders after GovernanceView for core, after Current-task card for non-core); outRef + auto-scroll effect unchanged.

## Deviations / judgment calls (all flagged in task reply)
- Shipped guard is `!cur || (cur.status === 'approved' && !phases[phaseIdx + 1])` — the current store's `approvePhase` never moves phaseIdx past the last phase, so `!cur` alone never fires; the extra clause makes the "all phases approved → Project shipped" state actually reachable and prevents a wrong "Phase queued" note after final approval.
- Card 3's h4 title was unspecified; chose "Approval gate" (Icon gate).
- Colored icons use a `<span style={{ color, display: 'flex' }}>` wrapper because `Icon` accepts no `style` prop (matches the pattern in cortex-os.tsx).
- Gate Send button is disabled when the note is empty, EXCEPT for the hold action (block defaults its reason in the store / unblock ignores it).
- Council broadcast + live output render as cards 6/7 in the same visual order; live output stayed in the parent component rather than inside GovernanceView (keeps the ref/scroll logic untouched).

## Contracts consumed (for later agents)
- From `./cortex`: `currentPhaseInfo`, `removeConstraint`, `openModal`, `councilAction`, `byId`, `S.gov`, `S.artifacts`.
- From `@/lib/api/jarvis-client`: `approvePhase()`, `requestChanges(reason)`, `holdPhase(reason)`, `addProjectConstraint(text)` (all called fire-and-forget with `void`).
- Expects the `review` modal (`{ type: 'review'; artifactId }`) to be implemented by another agent; artifact rows pass `x.id` from `S.artifacts`.
