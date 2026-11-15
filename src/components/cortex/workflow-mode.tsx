// workflow-mode.tsx — automation builder (stub; full implementation in Task 6c).
'use client';
import { S, useCortex } from './cortex';
import { Icon } from './icons';

export default function WorkflowModeView() {
  useCortex();
  return <div className="wr-empty"><Icon name="flow" size={26} /><b>Workflow builder</b><span>Node graphs land here — {S.war.workflows.length} workflows seeded.</span></div>;
}
