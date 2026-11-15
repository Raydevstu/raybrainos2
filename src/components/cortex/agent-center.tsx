// agent-center.tsx — Agent Command Center (stub; full implementation in Task 6d).
'use client';
import { S, useCortex } from './cortex';
import { Icon } from './icons';

export default function AgentCenter() {
  useCortex();
  return <div className="wr-empty"><Icon name="bot" size={26} /><b>Agent Command Center</b><span>Squads, telemetry and budgets are being wired — {S.war.squads.length} squads seeded.</span></div>;
}
