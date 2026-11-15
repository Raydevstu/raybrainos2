// dock-terminal.tsx — the Execution Deck terminal.
//
// Engine selector: DEMO (app-state commands — every command mutates real store
// state) / LIVE (a real PTY on a Bun mini-service over WebSocket, exposed when
// the service is reachable). The LIVE badge appears ONLY when a real engine is
// connected — never simulated. Multiple tabs, scrollback, history arrows,
// kill switch, pop-out to a second window (BroadcastChannel-synced).
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  S, useCortex, activeTermTab, addTermTab, closeTermTab, setActiveTerm,
  setTermEngine, setTermLiveStatus, runTermCommand, pushTermLine,
  type TermTab, type TermEngine
} from './cortex';
import { Icon } from './icons';

/** PTY service port (mini-services/terminal-service). Routed through the
 *  platform gateway via the XTransformPort query — never a direct port URL. */
const TERMINAL_SERVICE_PORT = 3030;

/**
 * Live engine bridge: connects the active LIVE tab to the PTY mini-service.
 * Demo tabs never touch the socket. All failures surface as honest statuses.
 */
function useLiveTerm(tab: TermTab | null) {
  const socketRef = useRef<Socket | null>(null);
  const id = tab?.id;
  const engine = tab?.engine;
  useEffect(() => {
    if (!id || engine !== 'live') return;
    let dead = false;
    setTermLiveStatus(id, 'connecting');
    const socket = io(`/?XTransformPort=${TERMINAL_SERVICE_PORT}`, {
      path: '/', transports: ['websocket', 'polling'],
      reconnectionAttempts: 3, timeout: 6000
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      if (dead) return;
      setTermLiveStatus(id, 'connected');
      socket.emit('term:attach', { id });
      pushTermLine(id, ':: PTY service connected — real shell, real processes', 'ok');
    });
    socket.on('term:data', (d: { id: string; data: string }) => {
      if (dead || d.id !== id) return;
      d.data.split('\n').forEach(l => { if (l.trim()) pushTermLine(id, l, ''); });
    });
    socket.on('term:exit', (d: { id: string; code: number | null }) => {
      if (dead || d.id !== id) return;
      pushTermLine(id, `:: process exited (code ${d.code ?? 0})`, 'dim');
    });
    socket.on('connect_error', (e: Error) => {
      if (dead) return;
      setTermLiveStatus(id, 'error', e.message);
    });
    socket.on('disconnect', () => { if (!dead) setTermLiveStatus(id, 'error', 'disconnected'); });
    return () => {
      dead = true;
      try { socket.emit('term:detach', { id }); socket.close(); } catch { /* already closed */ }
      socketRef.current = null;
      setTermLiveStatus(id, 'off');
    };
  }, [id, engine]);
  return {
    send: (line: string) => socketRef.current?.emit('term:input', { id, data: line }),
    kill: () => socketRef.current?.emit('term:kill', { id })
  };
}

function LiveBadge({ tab }: { tab: TermTab }) {
  if (tab.engine !== 'live') return null;
  const map: Record<TermTab['liveStatus'], { label: string; cls: string }> = {
    off: { label: 'LIVE OFF', cls: 'off' },
    connecting: { label: 'CONNECTING', cls: 'warn' },
    connected: { label: 'LIVE', cls: 'live' },
    error: { label: 'UNREACHABLE', cls: 'err' }
  };
  const m = map[tab.liveStatus];
  return <span className={`dt-live ${m.cls}`} title={tab.liveError ? `PTY service: ${tab.liveError} — the demo engine keeps working.` : 'Real PTY on the terminal mini-service'}>{m.label}</span>;
}

export default function DockTerminal() {
  useCortex();
  const [cmd, setCmd] = useState('');
  const [menu, setMenu] = useState(false);
  const histIdx = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tab = activeTermTab();
  const live = useLiveTerm(tab);
  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [tab?.lines.length, tab?.id]);
  if (!tab) return null;

  const onKey = (e: React.KeyboardEvent) => {
    const h = tab.history;
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const line = cmd.trim();
    if (!line) return;
    if (tab.engine === 'live') {
      if (tab.liveStatus !== 'connected') {
        pushTermLine(tab.id, ':: live engine not connected — switch to DEMO or start the terminal service', 'warn');
        return;
      }
      live.send(line);
      tab.history.push(line);
    } else {
      runTermCommand(line);
    }
    setCmd(''); histIdx.current = null;
  };

  return (
    <div className="dt">
      <div className="dt-head">
        <div className="dt-tabs" role="tablist">
          {S.war.termTabs.map(t => (
            <div key={t.id} className={`dt-tab ${S.war.activeTerm === t.id ? 'on' : ''}`} role="tab" aria-selected={S.war.activeTerm === t.id} tabIndex={0}
              onClick={() => setActiveTerm(t.id)} onKeyDown={e => { if (e.key === 'Enter') setActiveTerm(t.id); }}>
              <Icon name="terminal" size={11} />
              <span>{t.title}</span>
              {t.engine === 'live' && <i className={`dt-dot ${t.liveStatus}`} title={t.liveStatus} />}
              {S.war.termTabs.length > 1 && (
                <button className="dt-tab-x" onClick={e => { e.stopPropagation(); closeTermTab(t.id); }} title="Close tab" aria-label={`Close ${t.title}`}><Icon name="x" size={9} /></button>
              )}
            </div>
          ))}
          <div className="dt-new">
            <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setMenu(m => !m)} title="New terminal tab" aria-label="New terminal tab"><Icon name="plus" size={12} /></button>
            {menu && (
              <div className="dt-new-menu" role="menu">
                <button role="menuitem" onClick={() => { addTermTab('demo'); setMenu(false); }}><Icon name="terminal" size={11} />Demo tab — app-state engine</button>
                <button role="menuitem" onClick={() => { addTermTab('live'); setMenu(false); }}><Icon name="zap" size={11} />Live tab — real PTY</button>
              </div>
            )}
          </div>
        </div>
        <div className="dt-tools">
          <div className="dt-engine" role="group" aria-label="Terminal engine">
            <button className={`dt-eng ${tab.engine === 'demo' ? 'on' : ''}`} onClick={() => setTermEngine(tab.id, 'demo')}>DEMO</button>
            <button className={`dt-eng ${tab.engine === 'live' ? 'on' : ''}`} onClick={() => setTermEngine(tab.id, 'live')}>LIVE</button>
          </div>
          <LiveBadge tab={tab} />
          {tab.engine === 'live' && tab.liveStatus === 'connected' && (
            <button className="btn sm danger" onClick={() => live.kill()} title="Kill the running process"><Icon name="stop" size={11} />Kill</button>
          )}
        </div>
      </div>
      <div className="hn-term dt-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
        {tab.lines.map((l, i) => <div key={i} className={`tl ${l.cls || ''}`}>{l.text}</div>)}
      </div>
      <form className="hn-term-in dt-input" onSubmit={submit}>
        <span className="hn-prompt">{tab.engine === 'live' ? 'bash' : 'cortex'}&gt;</span>
        <input ref={inputRef} value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={onKey}
          placeholder={tab.engine === 'live' ? 'a real shell — try: ls, uname -a' : 'help · status · route <agent> <task> · browser <task> · wiki search …'}
          aria-label="Terminal input" autoComplete="off" />
      </form>
      {tab.engine === 'demo' && (
        <div className="hn-term-chips">
          {['help', 'status', 'agents', 'providers'].map(c => <button key={c} className="fchip" type="button" onClick={() => runTermCommand(c)}>{c}</button>)}
        </div>
      )}
    </div>
  );
}
