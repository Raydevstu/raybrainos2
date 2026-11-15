// browser-deck.tsx — Browser Deck (stub; full implementation in Task 6a).
'use client';
import { S, useCortex } from './cortex';
import { Icon } from './icons';

export default function BrowserDeck({ center = false }: { center?: boolean }) {
  useCortex();
  return <div className="wr-empty"><Icon name="compass" size={26} /><b>Browser Deck</b><span>The governed web agent assembles here{center ? ' (center mode)' : ''} — {S.war.browser.sessions.length} session(s).</span></div>;
}
