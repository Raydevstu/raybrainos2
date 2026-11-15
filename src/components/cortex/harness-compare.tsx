// harness-compare.tsx — provider testing cockpit (stub; full implementation in Task 6b).
'use client';
import { S, useCortex } from './cortex';
import { Icon } from './icons';

export default function HarnessCompare() {
  useCortex();
  return <div className="wr-empty"><Icon name="cpu" size={26} /><b>Provider compare</b><span>Side-by-side streaming lands here — {S.war.compare.panels.length} panel(s) ready.</span></div>;
}
