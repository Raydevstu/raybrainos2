Refine CortexOS War Room into a Tier-1 monitoring layer.

Do not turn War Room into the main navigation. Home remains Agent-Bot Dock + MainBrain neural map. War Room opens from the rail or “View details”.

Build full War Room overlay with three columns:

LEFT: Activity Feed
- live events from all agents
- filters:
  - All
  - Task
  - Artifact
  - System
- clear feed with undo
- event timestamps
- agent color dot
- artifact events clearly show:
  Agent → Artifact → Librarian → Brain

CENTER: Mission Board
- one card per phase custodian
- current task
- progress bar
- status:
  - idle
  - working
  - review
- sort by:
  - status
  - progress
  - name
- clicking card summons that agent workspace

RIGHT: System / Global Output
- agents connected
- tasks running
- wiki pages
- build progress
- system health
- events logged
- global terminal output aggregated from agents
- knowledge sync log

War Room must feel like Hermes / DeepSeek harness monitoring:
- dense but readable
- clean panels
- no neon spam
- no emoji icons
- terminal monospace
- strong status hierarchy

Mobile:
- columns stack
- no horizontal overflow
- close button always reachable
- notifications must not cover header

Acceptance:
- War Room reflects live simulation state.
- Filters and sort work.
- Clicking mission card opens correct agent.
- Clear feed undo works.
- Theme changes affect War Room too.