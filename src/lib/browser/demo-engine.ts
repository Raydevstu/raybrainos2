// demo-engine.ts — DEMO engine for the Browser Deck (stub; full implementation in Task 6a).
// The real engine runs the governed agent loop against the simulated web.
import { toast } from '@/components/cortex/cortex';

export function startBrowserTask(_task: string): void {
  toast('Browser Deck', 'Demo engine assembling — open the Browser tab.', 'compass');
}
export function runBrowserTaskFromTerminal(_task: string): void {
  toast('Browser Deck', 'Demo engine assembling.', 'compass');
}
