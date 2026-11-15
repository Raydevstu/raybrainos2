Prepare CortexOS frontend to connect to the real brain-service.

Keep demo mode working, but add real API adapter boundaries.

Create:
- lib/api/brain-client.ts
- lib/api/jarvis-client.ts
- lib/api/studio-client.ts
- lib/api/events-client.ts
- lib/api/types.ts

Environment:
- VITE_CORTEX_MODE=demo | live
- VITE_BRAIN_SERVICE_URL
- VITE_JARVIS_SERVICE_URL
- VITE_STUDIO_SERVICE_URL
- VITE_EVENTS_URL

brain-client methods:
Projects:
- createProject()
- listProjects()
- getProject()
- patchProject()

Artifacts:
- createArtifact()
- listArtifacts()
- getArtifact()
- patchArtifact()

Sources:
- createSource()
- listSources()
- getSource()

Search:
- searchBrain(query, type, projectId, limit)

Graph:
- getGraphNode()
- getGraphProject()
- getGraphSubgraph()

Librarian:
- ingest()
- classify()
- extract()
- audit()

jarvis-client:
- sendWorkRequest(workRequest)
- getProjectState()
- approvePhase()
- requestChanges()
- getCouncilState()

studio-client:
- listStudios()
- getStudio()
- startStudioWork()
- getStudioMemory()

events-client:
- subscribe via SSE or WebSocket
- fallback to polling in demo mode
- events:
  - SourceCreated
  - ArtifactCreated
  - ArtifactUpdated
  - EntityCreated
  - ConceptCreated
  - DecisionCreated
  - WikiUpdated
  - GraphUpdated
  - IndexUpdated
  - AuditCompleted
  - StudioStarted
  - StudioCompleted
  - ArtifactDelivered

Canonical contracts:
WorkRequest:
- project_id
- objective
- studio
- context_ids
- constraints

WorkResponse:
- status
- artifacts
- decisions
- references
- next_steps

Brain object types:
- Project
- Artifact
- Source
- Entity
- Concept
- Decision
- Meeting
- Task
- Person
- Studio
- Agent
- Pattern
- Doctrine
- Playbook
- WikiPage

Relationship types:
- CONTAINS
- CREATED_BY
- REFERENCES
- USES
- IMPLEMENTS
- DEPENDS_ON
- DERIVED_FROM
- PART_OF
- OWNS
- SUPERSEDES
- INFLUENCES
- BLOCKS

UI must not know whether data came from demo adapter or live brain-service.
Use the same view models.

Acceptance:
- Demo mode still works.
- Live mode can be enabled by env vars.
- API errors show non-blocking inline states and notification feed events.
- No backend URL hardcoding.
- No business logic duplicated across components.