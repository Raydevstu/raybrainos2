// cortex-os.tsx — CortexOS root shell
// Fixed top bar · OS rail · Agent-Bot Dock · Neural map · War strip ·
// workspace drawer · notification drawer · toasts · theme popover
import React, { useEffect, useRef, useState } from 'react';
import {
  S, useCortex, byId, simTick, summon, closePanel, closeOverlay, openOverlay,
  closeModal, setThemePop, setNotifOpen, toggleNotif, toggleThemePop,
  applyTheme, setSetting, routeCommand, dismissToast, reorderAgents,
  openModal, clearActivity, initCortex, unlockAudio, log,
  buildPct, THEMES, type Agent
} from './cortex';
import { summonAgent, sendWorkRequest } from '../lib/api/jarvis-client';
import { subscribe as subscribeEvents } from '../lib/api/events-client';
import { isLive } from '../lib/api/http';
import { Icon, BlobAvatar } from './icons';
import NeuralCanvas from './neural-canvas';
import AgentPanel from './agent-panel';
import Overlays from './overlays';
import Modals from './modals';

function ThemePreview({ t }: { t: (typeof THEMES)[number] }) {
  return <div className="tt-preview" style={{ background: t.bg }}><i style={{ left: '6%', top: '14%', width: '26%', height: '72%', background: t.sf, border: `1px solid ${t.ac}33` }} /><i style={{ left: '38%', top: '14%', width: '56%', height: '30%', background: t.ac, opacity: .9 }} /><i style={{ left: '38%', top: '52%', width: '26%', height: '34%', background: t.sf, border: `1px solid ${t.ac}33` }} /><i style={{ left: '68%', top: '52%', width: '26%', height: '34%', background: t.ac2, opacity: .75 }} /></div>;
}

function TopBar() {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); } };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = q.trim(); if (!text) return;
    const r = routeCommand(text);
    summon(r.agent.id); // open the routed workspace immediately
    const explicit = new RegExp('^' + r.agent.name, 'i').test(text);
    if (!explicit || text.length > r.agent.name.length + 2) {
      await sendWorkRequest(r.agent.id, r.cmd, 'command-bar');
    }
    setQ(''); inputRef.current?.blur();
  };
  return (
    <header id="topbar">
      <div className="brand"><div className="brand-mark"><Icon name="spark" size={18} /></div><div><h1>CortexOS</h1><small>ONE BRAIN · MANY AGENTS · EVERYTHING CONNECTED</small></div></div>
      <form id="summonbar" onSubmit={submit}>
        <Icon name="search" size={15} /><input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder='Summon an agent — try "design the pricing screen"' aria-label="Summon an agent" /><kbd>⌘K</kbd>
      </form>
      <div className="top-actions">
        <button className={`icon-btn ${S.themePop ? 'on' : ''}`} onClick={toggleThemePop} title="Theme presets" aria-label="Theme presets"><Icon name="palette" size={16} /></button>
        <button className={`icon-btn ${S.notifOpen ? 'on' : ''}`} onClick={toggleNotif} title="Notifications" aria-label="Notifications"><Icon name="bell" size={16} /><span id="bell-badge" className={S.unread ? 'show' : ''}>{S.unread > 99 ? '99+' : S.unread}</span></button>
        <button className="icon-btn" onClick={() => setSetting('sound', !S.settings.sound)} title={S.settings.sound ? 'Mute sounds' : 'Unmute sounds'} aria-label="Toggle sound"><Icon name={S.settings.sound ? 'vol' : 'volx'} size={16} /></button>
        <div className="user-chip"><div className="ava">R</div><div><b>You</b><span>Creator</span></div></div>
      </div>
    </header>
  );
}

function Rail() {
  const items = [
    { k: 'home', icon: 'home', label: 'Home' },
    { k: 'harness', icon: 'terminal', label: 'Harness' },
    { k: 'war', icon: 'target', label: 'War Room' },
    { k: 'agents', icon: 'bot', label: 'Agents' },
    { k: 'knowledge', icon: 'book', label: 'Librarian' },
    { k: 'settings', icon: 'gear', label: 'Settings' }
  ];
  const act = (k: string) => {
    if (k === 'home') { closeOverlay(); closePanel(); }
    else if (k === 'harness') openOverlay('harness');
    else if (k === 'war') openOverlay('war');
    else if (k === 'agents') openOverlay('roster');
    else if (k === 'knowledge') openOverlay('knowledge');
    else openOverlay('settings');
  };
  const current = S.overlay === 'war' ? 'war' : S.overlay === 'harness' ? 'harness' : S.overlay === 'roster' ? 'agents' : S.overlay === 'settings' ? 'settings' : S.overlay === 'knowledge' ? 'knowledge' : 'home';
  return <nav id="rail" aria-label="OS navigation">{items.map(i => <button key={i.k} className={`rail-btn ${current === i.k ? 'on' : ''}`} onClick={() => act(i.k)}><Icon name={i.icon} size={17} /><span>{i.label}</span></button>)}<div className="rail-foot"><b>CortexOS</b> v1.0<br />Human + AI<br />Better Together</div></nav>;
}

function Dock() {
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  return (
    <section id="dockwrap" aria-label="Agent-Bot Dock">
      <div className="section-head"><div className="sh-ic"><Icon name="bot" size={14} /></div><h2>Agent-Bot Dock</h2><span className="sh-sub">Click · Summon · Customize · Interact</span><span className="chip ok"><span className="dot" style={{ background: 'var(--ok)' }} />{S.agents.length}/{S.agents.length} connected</span></div>
      <div id="dock">
        {S.agents.map(a => (
          <button key={a.id} className={`tile ${S.summoned === a.id ? 'on' : ''} ${a.status === 'working' ? 'working' : ''} ${over === a.id ? 'drag-over' : ''}`} style={{ ['--tc' as any]: a.color }} draggable
            onDragStart={() => { dragId.current = a.id; }}
            onDragOver={e => { e.preventDefault(); if (a.id !== dragId.current) setOver(a.id); }}
            onDragLeave={() => setOver(null)}
            onDrop={e => { e.preventDefault(); if (dragId.current && dragId.current !== a.id) reorderAgents(dragId.current, a.id); dragId.current = null; setOver(null); }}
            onClick={() => { void summonAgent(a.id); }} title={`${a.name} — ${a.domain} (drag to reorder)`}>
            <div className="ava-wrap"><div className="halo" /><BlobAvatar a={a} size={52} /><span className={`status-dot dot ${a.status}`} /></div>
            <b>{a.name}</b><span>{a.domain.split('·')[0].trim()}</span>
          </button>
        ))}
        <button className="tile add" onClick={() => openModal({ type: 'add' })}><Icon name="plus" size={24} /><span>Add Agent</span></button>
      </div>
    </section>
  );
}

function WarStrip() {
  const work = S.agents.filter(a => a.status === 'working').length;
  const build = buildPct();
  const pending = S.artifacts.filter(x => x.state === 'pending').length;
  const cards = [
    { icon: 'users', label: 'Agents Active', value: `${S.agents.filter(a => a.status !== 'idle').length} / ${S.agents.length}`, spark: S.sparks.active, chart: 'var(--chart-1)' },
    { icon: 'zap', label: 'Tasks Running', value: String(work), spark: S.sparks.tasks, chart: 'var(--chart-2)' },
    { icon: 'book', label: 'Knowledge Sync', value: `${S.metrics.pages}p · ${pending} queued`, spark: S.sparks.sync, chart: 'var(--chart-3)' },
    { icon: 'box', label: 'Build Status', value: build >= 100 ? 'In Review' : `${build}% built`, spark: S.sparks.build, chart: 'var(--chart-4)' },
    { icon: 'heart', label: 'System Health', value: `${S.metrics.health.toFixed(1)}%`, spark: S.sparks.health, chart: 'var(--chart-5)' }
  ];
  const spark = (arr: number[]) => {
    if (arr.length < 2) return null;
    const min = Math.min(...arr), max = Math.max(...arr), rng = (max - min) || 1;
    const pts = arr.map((v, i) => `${(i / (arr.length - 1) * 100).toFixed(1)},${(26 - ((v - min) / rng) * 22 - 2).toFixed(1)}`).join(' ');
    return <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity=".9" /><polyline points={`0,28 ${pts} 100,28`} fill="currentColor" stroke="none" opacity=".08" /></svg>;
  };
  return (
    <section id="warstrip">
      <div className="section-head"><div className="sh-ic"><Icon name="target" size={14} /></div><h2>War Room</h2><span className="sh-sub">Real-time activity across all agents</span><span className="chip ok"><span className="dot" style={{ background: 'var(--ok)' }} />Operational</span><button className="btn sm" onClick={() => openOverlay('war')}>View details<Icon name="chevR" size={12} /></button></div>
      <div id="war-cards">{cards.map(c => <div className="wcard" key={c.label} style={{ color: c.chart }}><div className="wl"><span className="wi" style={{ background: 'currentColor', opacity: .14 }}><span style={{ display: 'grid', placeItems: 'center' }}><Icon name={c.icon} size={12} /></span></span>{c.label}</div><div className="wv">{c.value}</div>{spark(c.spark)}</div>)}</div>
    </section>
  );
}

function NotifDrawer() {
  return (
    <aside id="notif" className={S.notifOpen ? 'open' : ''} role="dialog" aria-label="Notifications">
      <div className="notif-head"><span style={{ color: 'var(--accent)' }}><Icon name="bell" size={16} /></span><h3>Notifications</h3><button className="btn ghost sm" onClick={() => clearActivity()}>Clear</button><button className="icon-btn" onClick={() => setNotifOpen(false)} title="Close" aria-label="Close notifications"><Icon name="x" size={15} /></button></div>
      <div className="notif-body">{S.activity.length ? S.activity.map((x, i) => { const a = byId(x.agentId); return <div className="n-item" key={i}><div className="n-ic" style={{ background: (a?.color || '#4f8cff') + '18', color: a?.color || 'var(--accent)' }}><Icon name={x.kind === 'artifact' ? 'box' : x.kind === 'system' ? 'spark' : 'activity'} size={13} /></div><div className="n-tx"><b style={{ color: a?.color }}>{a?.name || 'System'}</b> — {x.text}<time>{x.t}</time></div></div>; }) : <div className="empty"><Icon name="bell" size={24} />No notifications yet.</div>}</div>
      <div className="notif-foot"><button className="btn sm" style={{ flex: 1 }} onClick={() => { setNotifOpen(false); openOverlay('war'); }}><Icon name="target" size={12} />Open War Room</button></div>
    </aside>
  );
}

function Toasts() {
  return <div id="toasts" aria-live="polite">{S.toasts.map(t => <div className="toast" key={t.id}><div className="t-ic"><Icon name={t.icon} size={13} /></div><div className="t-msg"><span className="t-title">{t.title}{t.count > 1 && <span className="t-count">×{t.count}</span>}</span>{t.msg && <span className="t-sub">{t.msg}</span>}</div>{t.undo && <button className="t-undo" onClick={() => { t.undo!(); dismissToast(t.id); }}>Undo</button>}<button className="t-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification"><Icon name="x" size={12} /></button></div>)}</div>;
}

function ThemePopover() {
  if (!S.themePop) return null;
  return <div id="theme-pop" role="dialog" aria-label="Theme presets"><h4><Icon name="palette" size={13} />Theme presets</h4><div className="theme-grid">{THEMES.map(t => <button key={t.id} className={`theme-tile ${S.settings.theme === t.id ? 'on' : ''}`} onClick={() => { applyTheme(t.id); setThemePop(false); }}><ThemePreview t={t} /><b>{t.name}</b><small>{t.desc}</small>{S.settings.theme === t.id && <span className="tt-check"><Icon name="check" size={10} /></span>}</button>)}</div></div>;
}

export default function CortexOS() {
  useCortex();
  const speed = S.settings.speed;
  useEffect(() => { initCortex(); }, []);
  // Live mode: brain events stream into the notification feed through the same
  // channel the store uses — API errors degrade to feed events, never crashes.
  useEffect(() => {
    if (!isLive()) return;
    const off = subscribeEvents(
      ev => { if (ev.title) log(ev.agentId ?? 'mainbrain', ev.title, ev.type.startsWith('Artifact') ? 'artifact' : 'system'); },
      err => log('mainbrain', `Event stream error: ${err.message} — retrying via polling cadence.`, 'system')
    );
    return off;
  }, []);
  useEffect(() => {
    let interval: number | null = null;
    const start = () => { if (interval) window.clearInterval(interval); interval = window.setInterval(simTick, 900 / S.settings.speed); };
    start();
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (S.modal) closeModal();
        else if (S.themePop) setThemePop(false);
        else if (S.notifOpen) setNotifOpen(false);
        else if (S.overlay) closeOverlay();
        else if (S.summoned) closePanel();
      }
    };
    document.addEventListener('keydown', key);
    const vis = () => { if (document.visibilityState === 'hidden') { if (interval) window.clearInterval(interval); interval = null; } else start(); };
    document.addEventListener('visibilitychange', vis);
    return () => { if (interval) window.clearInterval(interval); document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', vis); };
  }, [speed]);
  const shellClass = `cortex-os${S.summoned ? ' panel-open' : ''}${S.overlay ? ' overlay-open' : ''}${S.notifOpen ? ' notif-open' : ''}`;
  return (
    <div className={shellClass}>
      <div className="aurora a" /><div className="aurora b" />
      <TopBar />
      <ThemePopover />
      <div id="app">
        <Rail />
        <main id="main"><Dock /><NeuralCanvas /><WarStrip /></main>
        <AgentPanel />
      </div>
      <NotifDrawer />
      <Overlays />
      <Modals />
      <Toasts />
    </div>
  );
}
