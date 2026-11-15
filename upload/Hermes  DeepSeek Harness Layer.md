Add the CortexOS Harness layer inspired by Hermes and DeepSeek-style developer harnesses.

This is not a separate generic dashboard. It is the execution cockpit behind Jarvis/MainBrain.

Add a new OS rail item or War Room tab called “Harness”.

Harness must include:

1. Sessions
- session list seeded with:
  - Solar CRM build
  - Design review
  - API contract generation
- active session indicator
- create session
- rename session
- delete session with undo
- each session binds:
  - project
  - active agents
  - model profile
  - sandbox status
  - layout

2. Layout system
Add visible layout controls:
- Simple
- Focus
- Terminal Deck
- Council
- Quad
- Custom saved layout

Simple:
- command + activity only

Focus:
- active agent workspace + terminal

Terminal Deck:
- terminal large
- files/review side panel
- activity below

Council:
- MainBrain + agent council feed
- artifact review panel

Quad:
- sources
- council
- terminal
- files/review

Allow drag-resizable panes if feasible. If not, implement clean preset layouts with live switching and persist selected layout.

3. Terminal
- xterm-like styled terminal panel using monospace UI
- seeded command history
- command input
- commands:
  - help
  - status
  - agents
  - route <agent> <task>
  - ingest <title>
  - wiki search <query>
  - providers
  - theme <name>
  - pause
  - resume
- terminal output must be real app state, not fake static text

4. Files / Review
- file tree seeded from Solar CRM:
  - /src/components
  - /src/agents
  - /src/styles
  - /api
  - /docs/prd.md
  - /docs/openapi.yaml
- clicking file opens preview/review pane
- review pane shows:
  - artifact type
  - created by agent
  - linked decisions
  - “Send to Librarian” action
  - “Approve” / “Request changes” actions

5. MCP / Tools Marketplace
Seed connectors:
- GitHub
- Linear
- Ray Memory
- Aion Knowledge
- Canva
- Filesystem
- Browser Search
Each connector:
- icon
- description
- connected toggle
- auth state
- allowed agents
- remove custom connector with undo

6. Sandbox Status
Show status strip:
- Backend ready / demo adapter
- Sandbox isolated
- Provider gateway online/offline
- Local model status
- GPU placeholder metric only if demo mode
- Current working directory
- Active profile

IMPORTANT:
AI Studio cannot run real containers or SSH. Implement demo sandbox adapter now, but structure it so real sandbox WebSocket/API can replace it later.

Acceptance:
- Harness opens with populated session.
- Layout presets switch live.
- Terminal commands mutate real app state.
- Files/review actions create artifacts or approvals.
- MCP toggles persist.
- Mobile does not overflow.