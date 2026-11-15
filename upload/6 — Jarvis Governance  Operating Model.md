Implement Jarvis/MainBrain governance UI and state model.

Jarvis is not a worker.
Jarvis is:
- orchestrator
- governor
- supervisor
- project manager
- quality gate owner
- only user-facing commander

Enforce visually and in state:
Rule 1: User never talks directly to Studios.
Rule 2: Studios never assign work.
Rule 3: Every Studio output becomes an Artifact.
Rule 4: No Studio modifies Brain directly.
Rule 5: Jarvis remains project-aware.

Add Project Lifecycle:
Discovery → Product → Design → Architecture → Development → QA → Release

Each phase:
- pending
- active
- review
- approved
- blocked

Jarvis owns transitions:
Phase Complete → Jarvis Review → Approved → Next Studio Starts

MainBrain workspace must show:
- current project
- current phase
- active studio
- blockers
- risks
- deliverables
- deadlines
- phase pipeline
- approval gates
- council broadcast

Approval UI:
- artifact review card
- approve phase
- request changes
- block phase
- add constraint
- view linked sources
- view Librarian audit result

When user commands “build app”:
- Jarvis creates WorkRequest for Discovery first.
- Product waits.
- Design waits for PRD.
- Architecture waits for approved Design.
- Development waits for approved Architecture.
- QA waits for Development artifacts.
- Release waits for QA PASS.

In demo mode, simulate this lifecycle with seeded Solar CRM.
In live mode, send WorkRequest through jarvis-client.

Activity feed must show governance:
- “Jarvis routed objective to Discovery”
- “Product blocked until Discovery approved”
- “Design approved → Architecture unlocked”
- “QA PASS → Release unlocked”

Acceptance:
- Agents do not randomly self-start outside lifecycle unless autonomy/demo mode explicitly allows.
- MainBrain is clearly the governor.
- Phase gates are visible.
- Approval actions mutate state.
- Request changes creates a task for the relevant studio.