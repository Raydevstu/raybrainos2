Deepen the Librarian into the true Memory Operating System.

Librarian owns:
- ingestion
- classification
- entity extraction
- concept extraction
- relationship mapping
- wiki maintenance
- graph maintenance
- search indexing
- memory sync
- audit

Librarian does NOT own:
- project planning
- code generation
- design generation
- task execution
- studio workflows

Create Librarian workspace tabs:
1. Task
2. Wiki
3. Sources
4. Graph
5. Audit

Wiki tab:
- seeded pages:
  - Agent Routing
  - Event-Driven Architecture
  - Solar CRM Competitor Scan
  - OAuth Provider Decision
  - Studio Framework
  - Neural Dock UX
  - Qdrant vs pgvector
  - Release Runbook
- search
- type filters:
  - concept
  - doctrine
  - summary
  - decision
  - pattern
  - playbook
- page preview
- backlinks
- citations
- “derived layer, never source of truth” label
- create page from synthesis
- deprecate page with undo

Sources tab:
- raw source list
- source types:
  - GitHub Repo
  - Markdown
  - PDF
  - DOCX
  - TXT
  - Meeting Notes
  - Chat Logs
  - PRD
  - Architecture Doc
  - URL
  - Video Transcript
  - Agent Output
- add source modal
- raw immutable badge
- processing status:
  - queued
  - normalized
  - classified
  - extracted
  - linked
  - indexed
  - audited

Ingestion pipeline UI:
Source Upload
→ Normalizer
→ Classifier
→ Entity Extraction
→ Concept Extraction
→ Relationship Mapping
→ Artifact Creation
→ Wiki Update
→ Graph Update
→ Vector Index
→ Audit

Graph tab:
- node types:
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
- edge types:
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
- show subgraph for selected source/artifact/page

Audit tab:
- duplicate concepts
- orphan pages
- broken references
- contradictions
- stale claims
- missing summaries
- unverified claims
- fix mechanical issue
- ask before major rewrite

Important:
Raw evidence is immutable.
Operational memory evolves.
Wiki knowledge is synthesized and cited.
Never mix these layers.

Acceptance:
- Ingesting a source visibly creates raw source, summary, entities, concepts, relationships, wiki update, graph update, index update, audit event.
- Wiki page cites source.
- Raw source cannot be edited after creation.
- Audit findings can be resolved or dismissed with undo.