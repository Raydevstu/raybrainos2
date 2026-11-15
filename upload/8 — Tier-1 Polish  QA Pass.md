Perform a strict Tier-1 product polish pass on CortexOS.

Fix anything that looks vibe-coded, generic, cramped, or unfinished.

Design audit:
- Remove emoji icons if any remain.
- Use consistent SVG icon system.
- Reduce excessive glow.
- Reduce shouting uppercase tracking.
- Make spacing consistent.
- Make all cards use theme tokens.
- Make light themes truly readable.
- Make dark themes restrained and premium.
- Ensure NotebookLM, Hermes, DeepSeek, Terminal Harness, and Graphite presets feel distinct.
- Ensure canvas colors adapt to every theme.
- Ensure scrollbars are themed.

Notification audit:
- Toasts must never block X/close buttons.
- Ambient agent completions should go to bell/feed, not repeated toast spam.
- Max 3 toasts desktop.
- Max 1 toast mobile.
- Toasts suppressed when mobile drawer/overlay is open.
- Notification drawer is canonical event history.
- Clear feed has undo.

Mobile audit:
- No horizontal overflow.
- Settings form labels stack above inputs.
- Provider rows wrap cleanly.
- Endpoint text truncates with ellipsis.
- Switches remain reachable.
- Model routing selects fit viewport.
- Agent panel becomes bottom sheet.
- Overlay close button always reachable.
- Dock scrolls horizontally with snap.
- War cards scroll horizontally if needed.

Interaction audit:
- Every prominent button works.
- Add Agent works.
- Customize Agent works.
- Dismiss custom agent has undo.
- Drag reorder dock works.
- Theme switch works.
- Provider add/remove/toggle works.
- Model routing works.
- Wiki ingest works.
- Wiki search works.
- War Room filters/sort work.
- Harness terminal commands work if Harness exists.
- Cmd/Ctrl+K focuses summon input.
- Esc closes topmost modal/overlay/drawer.

Performance:
- One requestAnimationFrame loop for canvas.
- No duplicate intervals.
- Pause simulation when tab hidden.
- Cap terminal logs.
- Cap activity feed.
- Cap notification list.
- No memory leaks from listeners.
- Resize canvas correctly.

Constitution audit:
- MainBrain remains center.
- Librarian owns Wiki.
- Seven phase custodians remain studios/custodians, not random tabs.
- War Room remains monitoring/execution layer.
- Wiki remains derived, not source of truth.
- Raw sources remain immutable.
- Artifacts flow through Librarian.
- Jarvis/MainBrain governs lifecycle.
- Provider calls go through gateway/router abstraction.

Return only the repaired implementation. No explanations.