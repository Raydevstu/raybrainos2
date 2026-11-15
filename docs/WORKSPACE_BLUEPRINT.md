# RayBrainOS2 — Chat-First Workspace Blueprint (Index & Batch Plan)

> Canonical full specification: `DOCS/RAYBRAINOS2 — CHAT-FIRST WORKSPACE IMPLEMENTATION BLUEPRINT.md` (Sections 1–26).  
> Status tracker: `docs/IMPLEMENTATION_STATUS.md`.

---

## 1. Design Invariants

1. **Chat-first home (`/`)**: Opens directly into the workspace — no dashboard cards, agent dock, orbital `NeuralCanvas`, health graphs, or KPI strip on the default screen.
2. **Compact Header**: Sidebar/tool toggles, workspace/project selector & branch, command palette trigger (`⌘K` / fallback), and compact menu/settings links.
3. **One Left Sidebar (`Files` | `Chats`)**: Project file tree and project conversations only. No permanent 7-item OS rail beside the file tree.
4. **Center Workspace (`Chat` + Editor Tabs)**: `Chat` is a permanent tab; opening files adds editor tabs without destroying conversation state; dirty indicators and unsaved-close confirmation; no auto-saving AI edits without configured approval policy.
5. **Optional Bottom Terminal Drawer**: Below the center column **only** (never shrinks left or right sidebars); starts **closed**; hiding the drawer is distinct from terminating the underlying session.
6. **One Right Sidebar (`Changes` | `Preview` | `Browser` | `Debug`)**: Starts **closed**; shows one active tool at a time with an "Expand into workspace" option where needed.
7. **Independent Collapse & Resize**: Both sidebars collapse and resize independently with keyboard accessibility, `ResizeObserver` viewport protection, focus mode, and `< 1200px` drawer responsiveness.
8. **Secondary Pages**: Preserve advanced capabilities (`/projects`, `/agents`, `/automations`, `/knowledge`, `/runs`, `/governance`, `/settings/general`, `/settings/providers`, `/settings/integrations`, `/settings/security`) on uncluttered secondary routes reachable via menu / command palette / settings links.
9. **Honest Infrastructure Boundaries**: Implement real functionality where backend/runtime capabilities exist. Never simulate terminal execution, fake Git diffs, invent health metrics, or disguise unavailable services as working. Preserve clear `DEMO` labeling if any demo mode remains, and never fall back silently from live failures to fabricated success.

---

## 2. Batch Execution Plan (Mapped to Blueprint Sections 1–26)

| Batch | Work | Blueprint Sections |
|---|---|---|
| **0** | Repository audit and baseline (docs only) | 1, 2, 22, 25 |
| **1** | Front-page shell and visual layout | 3, 4, 6–11 |
| **2** | Navigation and secondary pages | 5, 21 |
| **3** | Shared contracts, authorization, persistence | 6, 12, 13, 19, 20 |
| **4** | Real chat and run lifecycle | 14, 20 |
| **5** | Files and editor | 12, 13, 15 |
| **6** | Terminal and runtime | 16 |
| **7** | Git Changes | 17 |
| **8** | Project preview | 18 |
| **9** | Browser and Debug | 18 |
| **10** | Full verification and handover | 22–26 |

Tests should accompany every batch; Batch 10 is the final regression pass, not the first time testing happens.

---

## 3. Working Rules & Process

For every batch:
1. Inspect actual code and callers before editing; preserve framework, working engines, and project data.
2. State a concise implementation plan before coding.
3. Implement only the explicitly approved batch.
4. Run available relevant checks (`tsc --noEmit`, `lint`, `build`, and applicable tests); mark unrun checks `NOT RUN` with reasons.
5. Update `docs/IMPLEMENTATION_STATUS.md` and stop for review.
