// popout.tsx — multi-monitor support: pop any panel out to a child window.
//
// The popout is a thin view over the SAME store state, synchronized with the
// main window via BroadcastChannel('cortexos-warroom'):
//   main  → popout : { type:'sync', tabs, activeTerm, engine, liveStatus }
//   popout → main  : { type:'term-cmd', line } — commands execute in the main
//                    window against the real store, then sync back
//   popout → main  : { type:'redock' }  — re-dock and close
//
// The main window mounts <PopoutBridge/> alongside the shell; the popout
// window renders <PopoutTerminal/> (cortex-os.tsx switches on ?popout=).
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { S, useCortex, setPopoutTerminal, type TermTab } from './cortex';
import { Icon } from './icons';

const CHANNEL = 'cortexos-warroom';

type SyncMsg = { type: 'sync'; tabs: TermTab[]; activeTerm: string | null };
type CmdMsg = { type: 'term-cmd'; line: string };
type RedockMsg = { type: 'redock' };

/* ———————————————————————— main-window side ———————————————————————— */

/** Mounted in the main window whenever the terminal is popped out. */
export function PopoutBridge() {
  useCortex();
  useEffect(() => {
    if (typeof window === 'undefined' || !S.war.popoutTerminal) return;
    let ch: BroadcastChannel | null = null;
    try { ch = new BroadcastChannel(CHANNEL); } catch { return; }
    const post = () => ch?.postMessage({ type: 'sync', tabs: S.war.termTabs, activeTerm: S.war.activeTerm } satisfies SyncMsg);
    post(); // initial snapshot
    const iv = window.setInterval(post, 800); // gentle cadence; store emits are bursty
    ch.onmessage = (e: MessageEvent<CmdMsg | RedockMsg>) => {
      const d = e.data;
      if (d?.type === 'term-cmd') {
        // execute against the REAL store in the main window
        import('./cortex').then(m => m.runTermCommand(d.line));
      } else if (d?.type === 'redock') {
        setPopoutTerminal(false);
      }
    };
    return () => { window.clearInterval(iv); ch?.close(); };
  }, [S.war.popoutTerminal]);
  return null;
}

/* ———————————————————————— popout-window side ———————————————————————— */

/** Rendered in the child window (/?popout=terminal). */
export function PopoutTerminal() {
  const [tabs, setTabs] = useState<TermTab[]>([]);
  const [activeTerm, setActive] = useState<string | null>(null);
  const [cmd, setCmd] = useState('');
  const [connected, setConnected] = useState(false);
  const chRef = useRef<BroadcastChannel | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const histIdx = useRef<number | null>(null);

  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try { ch = new BroadcastChannel(CHANNEL); } catch { /* unsupported — show offline state */ }
    chRef.current = ch;
    if (!ch) return;
    ch.onmessage = (e: MessageEvent<SyncMsg>) => {
      if (e.data?.type === 'sync') {
        setTabs(e.data.tabs);
        setActive(a => a ?? e.data.activeTerm);
        setConnected(true);
      }
    };
    const bye = () => { try { ch?.postMessage({ type: 'redock' } satisfies RedockMsg); } catch { /* closing */ } };
    window.addEventListener('beforeunload', bye);
    return () => { window.removeEventListener('beforeunload', bye); ch?.close(); };
  }, []);

  const tab = tabs.find(t => t.id === activeTerm) ?? tabs[0] ?? null;
  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [tab?.lines.length]);

  const send = (line: string) => {
    chRef.current?.postMessage({ type: 'term-cmd', line } satisfies CmdMsg);
  };

  const redock = () => {
    chRef.current?.postMessage({ type: 'redock' } satisfies RedockMsg);
    window.close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const h = tab?.history ?? [];
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!h.length) return;
      histIdx.current = histIdx.current === null ? h.length - 1 : Math.max(0, histIdx.current - 1);
      setCmd(h[histIdx.current]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx.current === null) return;
      histIdx.current++;
      if (histIdx.current >= h.length) { histIdx.current = null; setCmd(''); } else setCmd(h[histIdx.current]);
    }
  };

  return (
    <div className="cortex-os popout">
      <div className="dt popout-term">
        <div className="dt-head">
          <div className="dt-tabs">
            {tabs.map(t => (
              <div key={t.id} className={`dt-tab ${tab?.id === t.id ? 'on' : ''}`} role="tab" aria-selected={tab?.id === t.id} tabIndex={0}
                onClick={() => setActive(t.id)} onKeyDown={e => { if (e.key === 'Enter') setActive(t.id); }}>
                <Icon name="terminal" size={11} /><span>{t.title}</span>
                {t.engine === 'live' && <i className={`dt-dot ${t.liveStatus}`} title={t.liveStatus} />}
              </div>
            ))}
          </div>
          <div className="dt-tools">
            <span className={`chip ${connected ? 'ok' : 'warn'}`}><span className="dot" style={{ background: connected ? 'var(--ok)' : 'var(--warn)' }} />{connected ? 'synced' : 'syncing'}</span>
            <button className="btn sm" onClick={redock}><Icon name="chevL" size={11} />Re-dock</button>
          </div>
        </div>
        <div className="hn-term dt-body" ref={bodyRef}>
          {tab ? tab.lines.map((l, i) => <div key={i} className={`tl ${l.cls || ''}`}>{l.text}</div>)
            : <div className="tl dim">waiting for the main window to sync…</div>}
        </div>
        <form className="hn-term-in dt-input" onSubmit={e => { e.preventDefault(); if (cmd.trim()) { send(cmd.trim()); setCmd(''); histIdx.current = null; } }}>
          <span className="hn-prompt">cortex&gt;</span>
          <input autoFocus value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={onKey} placeholder="run a command — it executes in the main window…" aria-label="Terminal input" autoComplete="off" />
          <button className="send" type="submit" title="Send"><Icon name="send" size={14} /></button>
        </form>
      </div>
    </div>
  );
}
