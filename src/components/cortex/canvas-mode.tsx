// canvas-mode.tsx — research board (stub; full implementation in Task 6c).
'use client';
import { S, useCortex } from './cortex';
import { Icon } from './icons';

export default function CanvasBoard() {
  useCortex();
  return <div className="wr-empty"><Icon name="frame" size={26} /><b>Canvas</b><span>Freeform research board — {S.war.canvas.length} cards seeded.</span></div>;
}
