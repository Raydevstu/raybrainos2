// war-room.tsx — the War Room workspace shell (constitution v2).
//
// The War Room is the PRIMARY operating environment of CortexOS:
//   left sidebar  · navigation + live Active Resources
//   center        · modes: Chat / Tasks / Knowledge / Dashboard / Agents /
//                   Automations / Canvas / Browser, with the Agent-Bot Dock
//                   surviving as the quick-summon strip
//   right panel   · context: Agent Activity / Knowledge Context / Task Context
//   bottom dock   · the Execution Deck: Terminal / Sandbox / Harness /
//                   Browser / Jobs
//
// Layout system: SIMPLE (Chat, Knowledge, Tasks only) / ADVANCED (full deck) /
// CUSTOM (user panels) with saved + preset layouts, persisted per workspace.
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  S, useCortex, byId, openOverlay, openModal,
  exitWarRoom, setUserMode, setCenterMode, setDockTab, toggleDock,
  nudgeDockSize, nudgeSideSizes, commitLayout, toggleRightPanel, setRightTab,
  toggleSidebar, saveCurrentLayout, applySavedLayout, deleteSavedLayout,
  setPopoutTerminal,
  MODES_BY_LEVEL, CENTER_MODE_META, DOCK_TAB_META, LAYOUT_PRESETS,
  runChatAction, clearChat, addTask, setTaskStatus, removeTask, cancelJob,
  currentPhase, currentPhaseInfo, buildPct, activeJobs, providerOfModel,
  type CenterMode, type DockTab, type RightTab, type UserMode,
  type ChatMessage, type ChatAction, type TaskStatus, type Job
} from './cortex';
import { Icon, BlobAvatar } from './icons';
import { sendJarvisChat, CHAT_SUGGESTIONS } from '@/lib/chat-engine';
import { summonAgent, approvePhase, requestChanges, holdPhase } from '@/lib/api/jarvis-client';
import { cortexEnv } from '@/lib/api/http';
import { DashboardBoard, KnowledgeBoard } from './overlays';
import DockTerminal from './dock-terminal';
import AgentCenter from './agent-center';
import WorkflowModeView from './workflow-mode';
import CanvasBoard from './canvas-mode';
import BrowserDeck from './browser-deck';

/* ———————————————————————— left sidebar ———————————————————————— */

function ActiveResources() {
  const gov = S.gov;
  const cur = currentPhaseInfo();
  const squad = S.war.squads.find(s => s.run?.status === 'running') ?? S.war.squads[0];
  const jobs = activeJobs();
  const online = S.providers.filter(p => p.connected && p.health === 'online').length;
  return (
    <div className="wr-resources">
      <header>Active resources</header>
      <button className="wr-res" onClick={() => setCenterMode('dashboard')}>
        <span className="wr-res-ic" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="target" size={13} /></span>
        <span className="wr-res-tx"><b>{gov.project}</b><small>{cur ? `${cur.label} · ${cur.status}` : 'shipped'}</small></span>
      </button>
      <button className="wr-res" onClick={() => setCenterMode('agent')}>
        <span className="wr-res-ic" style={{ background: (squad?.color ?? '#22d3ee') + '1c', color: squad?.color ?? '#22d3ee' }}><Icon name="users" size={13} /></span>
        <span className="wr-res-tx"><b>{squad?.name ?? 'No squad'}</b>
          <span className="wr-dots">{squad?.members.map(m => <i key={m.id} style={{ background: m.color }} title={m.name} />)}</span>
        </span>
      </button>
      <button className="wr-res" onClick={() => setRightTab('knowledge')}>
        <span className="wr-res-ic" style={{ background: 'rgba(245,166,35,.14)', color: '#f5a623' }}><Icon name="brain" size={13} /></span>
        <span className="wr-res-tx"><b>{S.sources.length} grounded sources</b><small>{S.metrics.pages} wiki pages · {S.entities.length} entities</small></span>
      </button>
      <button className="wr-res" onClick={() => openOverlay('settings')}>
        <span className="wr-res-ic" style={{ background: 'rgba(52,211,153,.13)', color: 'var(--ok)' }}><Icon name="cpu" size={13} /></span>
        <span className="wr-res-tx"><b>{online}/{S.providers.length} models online</b>
          <span className="wr-dots">{S.providers.map(p => <i key={p.id} className={p.connected ? p.health : 'off'} title={`${p.name} — ${p.connected ? p.health : 'offline'}`} />)}</span>
        </span>
      </button>
      <button className="wr-res" onClick={() => setDockTab('jobs', true)}>
        <span className="wr-res-ic" style={{ background: 'rgba(96,165,250,.13)', color: 'var(--info)' }}><Icon name="clock" size={13} /></span>
        <span className="wr-res-tx"><b>{jobs.length} running job{jobs.length === 1 ? '' : 's'}</b><small>{jobs.length ? jobs[0].label.slice(0, 30) : 'queue is clear'}</small></span>
        {jobs.length > 0 && <span className="wr-spin" aria-hidden="true" />}
      </button>
    </div>
  );
}

function SideBar() {
  const collapsed = S.war.layout.sidebarCollapsed;
  const mode = S.war.layout.centerMode;
  const items: { k: string; icon: string; label: string; act: () => void; on?: boolean }[] = [
    { k: 'home', icon: 'home', label: 'Home', act: () => { exitWarRoom(); closeSideDrawer(); } },
    { k: 'workspaces', icon: 'layout', label: 'Workspaces', act: () => { setDockTab('harness', true); closeSideDrawer(); }, on: S.war.layout.dockOpen && S.war.layout.dockTab === 'harness' },
    { k: 'projects', icon: 'target', label: 'Projects', act: () => { setCenterMode('dashboard'); closeSideDrawer(); }, on: mode === 'dashboard' },
    { k: 'knowledge', icon: 'book', label: 'Knowledge Vault', act: () => { setCenterMode('knowledge'); closeSideDrawer(); }, on: mode === 'knowledge' },
    { k: 'agents', icon: 'bot', label: 'Agents', act: () => { setCenterMode('agent'); closeSideDrawer(); }, on: mode === 'agent' },
    { k: 'automations', icon: 'flow', label: 'Automations', act: () => { setCenterMode('workflow'); closeSideDrawer(); }, on: mode === 'workflow' },
    { k: 'tasks', icon: 'list', label: 'Tasks', act: () => { setCenterMode('tasks'); closeSideDrawer(); }, on: mode === 'tasks' },
    { k: 'memory', icon: 'brain', label: 'Memory', act: () => { setRightTab('knowledge'); closeSideDrawer(); }, on: S.war.layout.rightOpen && S.war.layout.rightTab === 'knowledge' },
    { k: 'settings', icon: 'gear', label: 'Settings', act: () => { openOverlay('settings'); closeSideDrawer(); } }
  ];
  return (
    <aside id="wr-side" className={collapsed ? 'collapsed' : ''} aria-label="War Room navigation">
      <div className="wr-side-head">
        <button className="icon-btn" onClick={toggleSidebar} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label="Toggle sidebar">
          <Icon name={collapsed ? 'chevR' : 'chevL'} size={15} />
        </button>
        {!collapsed && <b>War Room</b>}
      </div>
      <nav className="wr-nav">
        {items.map(i => (
          <button key={i.k} className={`wr-nav-btn ${i.on ? 'on' : ''}`} onClick={i.act} title={i.label}>
            <Icon name={i.icon} size={16} />
            {!collapsed && <span>{i.label}</span>}
          </button>
        ))}
      </nav>
      {!collapsed && <ActiveResources />}
      <div className="wr-side-foot">
        {!collapsed && <><b>CortexOS</b> v2.0 · War Room</>}
        {collapsed && <span title="CortexOS v2.0 · War Room">v2</span>}
      </div>
    </aside>
  );
}

/* Mobile: the sidebar becomes a drawer toggled from the toolbar. */
function closeSideDrawer() { document.getElementById('warroom')?.classList.remove('side-open'); }

/* ———————————————————————— quick-summon strip (Agent-Bot Dock lives here) ———————————————————————— */

function QuickSummon() {
  return (
    <div id="wr-summon" aria-label="Agent-Bot Dock quick summon">
      {S.agents.map(a => (
        <button key={a.id} className={`qs-tile ${S.summoned === a.id ? 'on' : ''} ${a.status === 'working' ? 'working' : ''}`} style={{ ['--tc' as any]: a.color }}
          onClick={() => void summonAgent(a.id)} title={`${a.name} — ${a.domain}`}>
          <span className="ava-wrap"><BlobAvatar a={a} size={30} /><span className={`status-dot dot ${a.status}`} /></span>
          <span className="qs-name">{a.name}</span>
        </button>
      ))}
      <button className="qs-tile add" onClick={() => openModal({ type: 'add' })} title="Summon a new Agent-Bot"><Icon name="plus" size={16} /></button>
    </div>
  );
}

/* ———————————————————————— mode toolbar + layout system ———————————————————————— */

function ModeToolbar() {
  const l = S.war.layout;
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const modes = MODES_BY_LEVEL[S.war.userMode];
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (presetsOpen && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPresetsOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [presetsOpen]);
  return (
    <div id="wr-toolbar">
      <button className="icon-btn wr-burger" onClick={() => document.getElementById('warroom')?.classList.toggle('side-open')} title="Menu" aria-label="Open navigation"><Icon name="list" size={15} /></button>
      <div className="wr-modes" role="tablist" aria-label="Center modes">
        {modes.map(m => (
          <button key={m} role="tab" aria-selected={l.centerMode === m} className={`wr-mode ${l.centerMode === m ? 'on' : ''}`} onClick={() => setCenterMode(m)}>
            <Icon name={CENTER_MODE_META[m].icon} size={13} /><span>{CENTER_MODE_META[m].label}</span>
          </button>
        ))}
      </div>
      <div className="wr-tools">
        <div className="wr-usermode" role="group" aria-label="Workspace level">
          {(['simple', 'advanced', 'custom'] as UserMode[]).map(u => (
            <button key={u} className={`um-btn ${S.war.userMode === u ? 'on' : ''}`} onClick={() => setUserMode(u)} title={u === 'simple' ? 'Chat, Knowledge and Tasks only' : u === 'advanced' ? 'Full execution deck' : 'Your panels, your rules'}>{u === 'simple' ? 'Simple' : u === 'advanced' ? 'Advanced' : 'Custom'}</button>
          ))}
        </div>
        <div className="wr-presets" ref={wrapRef}>
          <button className="icon-btn" onClick={() => setPresetsOpen(o => !o)} title="Layout presets & saved layouts" aria-label="Layout presets"><Icon name="sliders" size={15} /></button>
          {presetsOpen && (
            <div className="wr-preset-pop" role="menu">
              <header>Presets</header>
              {LAYOUT_PRESETS.map(p => (
                <button key={p.id} role="menuitem" onClick={() => { applySavedLayout(p.id); setPresetsOpen(false); }}>
                  <Icon name="layout" size={12} />{p.name}<small>{p.layout.centerMode} · dock {p.layout.dockTab}</small>
                </button>
              ))}
              {S.war.savedLayouts.length > 0 && <header>Saved</header>}
              {S.war.savedLayouts.map(p => (
                <div key={p.id} className="wr-preset-row">
                  <button role="menuitem" onClick={() => { applySavedLayout(p.id); setPresetsOpen(false); }}><Icon name="pin" size={12} />{p.name}<small>{p.userMode}</small></button>
                  <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => deleteSavedLayout(p.id)} title="Remove layout"><Icon name="trash" size={11} /></button>
                </div>
              ))}
              {saving ? (
                <form className="wr-preset-save" onSubmit={e => { e.preventDefault(); saveCurrentLayout(saveName); setSaving(false); setSaveName(''); setPresetsOpen(false); }}>
                  <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Layout name — e.g. My Research" maxLength={24} aria-label="Layout name" />
                  <button className="btn sm primary" type="submit" disabled={!saveName.trim()}>Save</button>
                </form>
              ) : (
                <button role="menuitem" className="wr-preset-add" onClick={() => setSaving(true)}><Icon name="plus" size={12} />Save current layout…</button>
              )}
            </div>
          )}
        </div>
        <button className={`icon-btn ${l.rightOpen ? 'on' : ''}`} onClick={toggleRightPanel} title="Context panel" aria-label="Toggle context panel"><Icon name="frame" size={15} /></button>
        <button className={`icon-btn ${l.dockOpen ? 'on' : ''}`} onClick={toggleDock} title="Execution deck" aria-label="Toggle execution deck"><Icon name="layout" size={15} /></button>
      </div>
    </div>
  );
}

/* ———————————————————————— chat mode ———————————————————————— */

const ACTION_ICON: Record<ChatAction['kind'], string> = {
  terminal: 'terminal', browser: 'compass', task: 'list', ingest: 'book', squad: 'users', workflow: 'flow'
};
const ACTION_VERB: Record<ChatAction['kind'], string> = {
  terminal: 'Run in Terminal', browser: 'Open in Browser Deck', task: 'Create Task',
  ingest: 'Ingest to Vault', squad: 'Route to Squad', workflow: 'Launch Workflow'
};

function ActionCard({ a }: { a: ChatAction }) {
  return (
    <button className="wr-action-card" onClick={() => runChatAction(a)}>
      <span className="ac-ic"><Icon name={ACTION_ICON[a.kind]} size={13} /></span>
      <span className="ac-tx"><b>{ACTION_VERB[a.kind]}</b><small>{a.payload.length > 56 ? a.payload.slice(0, 56) + '…' : a.payload}</small></span>
      <Icon name="chevR" size={12} />
    </button>
  );
}

function ChatBubble({ m }: { m: ChatMessage }) {
  if (m.role === 'you') {
    return <div className="wr-msg you"><div className="wr-msg-bubble"><p>{m.text}</p></div></div>;
  }
  return (
    <div className="wr-msg jarvis">
      <div className="wr-msg-ava" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="spark" size={14} /></div>
      <div className="wr-msg-body">
        <div className="wr-msg-head">
          <b>Jarvis</b>
          <span className="chip demo-chip" title="Demo engine — replies generated locally from live project state. Live mode streams through the provider gateway.">DEMO</span>
          <time>{m.at}</time>
        </div>
        {!!m.tools?.length && <div className="wr-msg-tools">{m.tools.map(t => <span key={t} className="tool-chip"><Icon name="zap" size={9} />{t}</span>)}</div>}
        <div className="wr-msg-bubble"><p>{m.text}{m.streaming && <span className="wr-caret" />}</p></div>
        {!!m.cites?.length && (
          <div className="wr-msg-cites">
            <small>Grounded on</small>
            {m.cites.map(c => <span key={c} className="cite-chip"><Icon name="cite" size={9} />{c}</span>)}
          </div>
        )}
        {!m.streaming && !!m.actions?.length && (
          <div className="wr-msg-actions">{m.actions.map(a => <ActionCard key={a.id} a={a} />)}</div>
        )}
      </div>
    </div>
  );
}

function ChatMode() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [S.war.chat.length, S.war.chat[S.war.chat.length - 1]?.text]);
  const mentionMatch = /(?:^|\s)@([\w-]*)$/.exec(input);
  const mentionPages = mentionMatch
    ? S.wiki.filter(w => w.title.toLowerCase().replace(/\s+/g, '-').includes(mentionMatch[1].toLowerCase())).slice(0, 4)
    : [];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || S.war.chatStreaming) return;
    sendJarvisChat(input);
    setInput('');
  };
  return (
    <div className="wr-chat">
      <div className="wr-board-head">
        <span className="wr-bh-title"><Icon name="chat" size={14} /> Jarvis — the operating system layer</span>
        <span className="chip demo-chip">DEMO ENGINE</span>
        <span className="chip">{S.war.chat.length} messages</span>
        <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={clearChat}><Icon name="trash" size={11} />Clear</button>
      </div>
      <div className="wr-chat-scroll" ref={scrollRef}>
        {S.war.chat.map(m => <ChatBubble key={m.id} m={m} />)}
      </div>
      {mentionPages.length > 0 && (
        <div className="wr-mentions">
          <small>Ground on</small>
          {mentionPages.map(w => (
            <button key={w.title} type="button" className="cite-chip" onClick={() => setInput(input.replace(/@[\w-]*$/, `@${w.title.replace(/\s+/g, '-')} `))}><Icon name="cite" size={9} />{w.title}</button>
          ))}
        </div>
      )}
      <div className="wr-chat-suggest">
        {CHAT_SUGGESTIONS.map(s => <button key={s} type="button" className="fchip" onClick={() => setInput(s)}>{s}</button>)}
      </div>
      <form className="wr-chat-input" onSubmit={submit}>
        <Icon name="chat" size={15} />
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Tell Jarvis what to do — @page grounds the reply on the vault…" aria-label="Message Jarvis" />
        <button className="send" type="submit" disabled={S.war.chatStreaming} title="Send"><Icon name="send" size={15} /></button>
      </form>
    </div>
  );
}

/* ———————————————————————— tasks mode ———————————————————————— */

const TASK_STATUS_META: Record<TaskStatus, { icon: string; cls: string }> = {
  open: { icon: 'list', cls: 'open' }, active: { icon: 'play', cls: 'active' },
  done: { icon: 'check', cls: 'done' }, blocked: { icon: 'ban', cls: 'blocked' }
};

function TasksMode() {
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const gov = S.gov;
  const list = (filter === 'all' ? S.war.tasks : S.war.tasks.filter(t => t.status === filter));
  const counts = {
    open: S.war.tasks.filter(t => t.status === 'open').length,
    active: S.war.tasks.filter(t => t.status === 'active').length,
    done: S.war.tasks.filter(t => t.status === 'done').length,
    blocked: S.war.tasks.filter(t => t.status === 'blocked').length
  };
  return (
    <div className="wr-tasks">
      <div className="wr-board-head">
        <span className="wr-bh-title"><Icon name="list" size={14} /> Tasks & objectives</span>
        <span className="fchips">
          {(['all', 'open', 'active', 'done', 'blocked'] as const).map(f => (
            <button key={f} className={`fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}{f !== 'all' ? ` ${counts[f]}` : ''}</button>
          ))}
        </span>
      </div>
      <form className="wr-task-add" onSubmit={e => { e.preventDefault(); if (draft.trim()) { addTask({ title: draft.trim() }); setDraft(''); } }}>
        <Icon name="plus" size={14} />
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a task — it shows up in Task Context instantly…" aria-label="Add task" />
        <button className="btn sm primary" type="submit" disabled={!draft.trim()}>Add</button>
      </form>
      <div className="wr-task-list">
        {list.map(t => (
          <div key={t.id} className={`wr-task ${t.status}`}>
            <button className="wr-task-check" onClick={() => setTaskStatus(t.id, t.status === 'done' ? 'open' : 'done')} title={t.status === 'done' ? 'Reopen' : 'Complete'} aria-label={`Toggle ${t.title}`}>
              <Icon name={TASK_STATUS_META[t.status].icon} size={12} />
            </button>
            <div className="wr-task-tx">
              <b className={t.status === 'done' ? 'strike' : ''}>{t.title}</b>
              {t.detail && <small>{t.detail}</small>}
              <span className="wr-task-meta">
                <span className="chip">{t.owner}</span>
                <span className="chip src-{t.source}">{t.source}</span>
                <span className="wr-task-date">{t.done ? `done ${t.done}` : `created ${t.created}`}</span>
              </span>
            </div>
            <div className="wr-task-acts">
              {t.status !== 'done' && <button className="icon-btn" style={{ width: 26, height: 26 }} title={t.status === 'active' ? 'Pause' : 'Activate'} onClick={() => setTaskStatus(t.id, t.status === 'active' ? 'open' : 'active')}><Icon name={t.status === 'active' ? 'pause' : 'play'} size={11} /></button>}
              <button className="icon-btn" style={{ width: 26, height: 26 }} title="Remove" onClick={() => removeTask(t.id)}><Icon name="trash" size={11} /></button>
            </div>
          </div>
        ))}
        {!list.length && <div className="empty"><Icon name="list" size={22} />No {filter === 'all' ? '' : filter + ' '}tasks — add one above.</div>}
      </div>
      <div className="p-card" style={{ marginTop: 14 }}>
        <h4><Icon name="route" size={12} />Milestones — the phase pipeline</h4>
        <div className="gov-strip">
          {gov.phases.map((p, i) => (
            <React.Fragment key={p.key}>
              {i > 0 && <div className={`gov-join${gov.phases[i - 1].status === 'approved' ? ' done' : ''}`} />}
              <div className={`gov-ph ${p.status}${i === gov.phaseIdx ? ' cur' : ''}`}><span className="gp-lbl">{p.label}</span><span className="gp-st">{p.status}</span></div>
            </React.Fragment>
          ))}
        </div>
        <div className="gov-note" style={{ marginTop: 7 }}>
          {gov.blockers.length ? `${gov.blockers.length} blocker(s) — ${gov.blockers[0].text}` : 'No blockers. Jarvis owns transitions; studios never skip gates.'}
        </div>
      </div>
    </div>
  );
}

/* ———————————————————————— dashboard mode (the old War Room content lives on) ———————————————————————— */

function DashboardMode() {
  const gov = S.gov;
  const cur = currentPhaseInfo();
  return (
    <div className="wr-dashboard">
      <div className="wr-proj-head">
        <div>
          <b>{gov.project}</b>
          <small>{gov.objective}</small>
        </div>
        <div className="wr-proj-meta">
          <span className="chip">{cur ? `${cur.label} · ${cur.status}` : 'shipped'}</span>
          <span className="chip">build {buildPct()}%</span>
          <span className="chip ok"><span className="dot" style={{ background: 'var(--ok)' }} />{S.metrics.health.toFixed(1)}% health</span>
        </div>
      </div>
      <DashboardBoard />
    </div>
  );
}

/* ———————————————————————— right context panel ———————————————————————— */

function ActivityContext() {
  const [agent, setAgent] = useState('all');
  const feed = S.activity.filter(x => agent === 'all' || x.agentId === agent).slice(0, 40);
  const sel = byId(agent);
  return (
    <div className="wr-ctx">
      <div className="wr-ctx-filter">
        <select value={agent} onChange={e => setAgent(e.target.value)} aria-label="Filter by agent">
          <option value="all">All agents</option>
          {S.agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      {sel && (
        <div className="wr-ctx-agent">
          <div className="wr-ctx-agent-head"><BlobAvatar a={sel} size={26} /><b>{sel.name}</b><span className={`p-status ${sel.status}`}><span className={`dot ${sel.status}`} />{sel.status}</span></div>
          <div className="wr-ctx-out">
            {sel.output.length ? sel.output.slice(-10).map((l, i) => <div key={i} className={`ln ${l.cls || ''}`}>{l.text}</div>) : <div className="ln dim">› no live steps — summary-level only</div>}
          </div>
        </div>
      )}
      <div className="wr-ctx-feed">
        {feed.map((x, i) => {
          const a = byId(x.agentId);
          return (
            <div className="feed-item" key={i}>
              <time>{x.t}</time>
              <span className="fa" style={{ background: a?.color || 'var(--dim)' }} />
              <span className="fbody"><b style={{ color: a?.color || 'var(--muted)' }}>{a?.name || 'System'}</b> — {x.text}</span>
            </div>
          );
        })}
        {!feed.length && <div className="empty"><Icon name="activity" size={18} />No events for this filter.</div>}
      </div>
    </div>
  );
}

function KnowledgeContext() {
  return (
    <div className="wr-ctx">
      <div className="wr-ctx-sec">
        <header><Icon name="db" size={11} />Grounding the conversation</header>
        {S.sources.slice(0, 6).map(s => (
          <div className="wr-ctx-src" key={s.id}>
            <span className="sr-raw"><Icon name="db" size={9} />raw</span>
            <span className="wr-ctx-src-tx"><b>{s.title}</b><small>{s.note.slice(0, 64)}{s.note.length > 64 ? '…' : ''}</small></span>
          </div>
        ))}
        {!S.sources.length && <div className="empty small"><Icon name="db" size={16} />No sources yet.</div>}
      </div>
      <div className="wr-ctx-sec">
        <header><Icon name="book" size={11} />Retrieved wiki chunks</header>
        {S.wiki.slice(0, 5).map(w => (
          <button className="wr-ctx-wiki" key={w.title} onClick={() => setCenterMode('knowledge')}>
            <span className="wt" style={{ color: 'var(--accent2)' }}>{w.type}</span>
            <b>{w.title}</b>
            <small>{w.summary.slice(0, 70)}…</small>
          </button>
        ))}
      </div>
      <div className="wr-ctx-sec">
        <header><Icon name="network" size={11} />Graph</header>
        <div className="wr-ctx-graph">
          <span className="chip">{S.wiki.length} pages</span>
          <span className="chip">{S.sources.length} sources</span>
          <span className="chip">{S.entities.length} entities</span>
          <span className="chip">{S.artifacts.length} artifacts</span>
        </div>
      </div>
    </div>
  );
}

function TaskContext() {
  const gov = S.gov;
  const cur = currentPhaseInfo();
  const atGate = cur?.status === 'review' || cur?.status === 'blocked';
  const [gateForm, setGateForm] = useState<null | 'changes' | 'hold'>(null);
  const [gateTxt, setGateTxt] = useState('');
  const openTasks = S.war.tasks.filter(t => t.status !== 'done');
  return (
    <div className="wr-ctx">
      <div className="wr-ctx-sec">
        <header><Icon name="gate" size={11} />Phase gate — {cur?.label ?? 'shipped'}</header>
        {cur ? (
          atGate ? (
            <>
              <div className="gov-note">{cur.deliverable} · {cur.deadline}</div>
              <div className="wr-ctx-gate-acts">
                <button className="btn sm primary" onClick={() => void approvePhase()}><Icon name="check" size={11} />Approve</button>
                <button className="btn sm" onClick={() => setGateForm(g => g === 'changes' ? null : 'changes')}><Icon name="edit" size={11} />Changes</button>
                <button className="btn sm danger" onClick={() => setGateForm(g => g === 'hold' ? null : 'hold')}><Icon name="ban" size={11} />{cur.status === 'blocked' ? 'Unblock' : 'Block'}</button>
              </div>
              {gateForm && (
                <form className="wr-ctx-gate-form" onSubmit={e => { e.preventDefault(); const t = gateTxt.trim(); if (gateForm === 'changes' && t) void requestChanges(t); else void holdPhase(t); setGateTxt(''); setGateForm(null); }}>
                  <input autoFocus value={gateTxt} onChange={e => setGateTxt(e.target.value)} placeholder={gateForm === 'changes' ? 'Revision notes for the studio…' : 'Why is this phase blocked?'} aria-label="Gate note" />
                  <button className="btn sm primary" type="submit" disabled={gateForm === 'changes' && !gateTxt.trim()}><Icon name="send" size={11} /></button>
                </form>
              )}
            </>
          ) : <div className="gov-note">{cur.status === 'active' ? `${byId(cur.studio)?.name ?? cur.studio} is working — the gate arms when the deliverable lands.` : 'Phase queued — waiting for the previous gate.'}</div>
        ) : <div className="gov-note">All phases approved — project shipped.</div>}
      </div>
      <div className="wr-ctx-sec">
        <header><Icon name="list" size={11} />Active objectives ({openTasks.length})</header>
        {openTasks.slice(0, 6).map(t => (
          <div className="wr-ctx-task" key={t.id}>
            <span className={`dot ${t.status === 'active' ? 'working' : t.status === 'blocked' ? 'review' : 'idle'}`} />
            <span className="wr-ctx-task-tx"><b>{t.title}</b><small>{t.owner} · {t.source}</small></span>
          </div>
        ))}
        {!openTasks.length && <div className="empty small"><Icon name="check" size={16} />All clear.</div>}
      </div>
      {gov.blockers.length > 0 && (
        <div className="wr-ctx-sec">
          <header><Icon name="ban" size={11} />Blockers</header>
          {gov.blockers.map(b => <div key={b.id} className="wr-ctx-task"><span className="dot review" /><span className="wr-ctx-task-tx"><b>{b.text}</b><small>{b.raised}</small></span></div>)}
        </div>
      )}
    </div>
  );
}

function RightPanel() {
  const l = S.war.layout;
  const tabs: { k: RightTab; label: string; icon: string }[] = [
    { k: 'activity', label: 'Agent activity', icon: 'activity' },
    { k: 'knowledge', label: 'Knowledge', icon: 'brain' },
    { k: 'task', label: 'Task', icon: 'list' }
  ];
  return (
    <aside id="wr-right" aria-label="Context panel">
      <div className="wr-right-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.k} role="tab" aria-selected={l.rightTab === t.k} className={`wr-rtab ${l.rightTab === t.k ? 'on' : ''}`} onClick={() => setRightTab(t.k)}>
            <Icon name={t.icon} size={12} /><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="wr-right-body">
        {l.rightTab === 'activity' && <ActivityContext />}
        {l.rightTab === 'knowledge' && <KnowledgeContext />}
        {l.rightTab === 'task' && <TaskContext />}
      </div>
    </aside>
  );
}

/* ———————————————————————— jobs pane ———————————————————————— */

const JOB_ICON: Record<Job['kind'], string> = {
  terminal: 'terminal', workflow: 'flow', agent: 'bot', browser: 'compass', ingest: 'book', compare: 'cpu'
};

function JobsPane() {
  return (
    <div className="wr-jobs">
      <div className="wr-board-head">
        <span className="wr-bh-title"><Icon name="clock" size={14} />Jobs — everything running</span>
        <span className="chip">{activeJobs().length} active · {S.war.jobs.length} total</span>
      </div>
      <div className="wr-job-list">
        {S.war.jobs.map(j => (
          <div className={`wr-job ${j.status}`} key={j.id}>
            <span className={`wj-ic ${j.demo ? 'demo' : 'live'}`} title={j.demo ? 'demo engine' : 'live engine'}><Icon name={JOB_ICON[j.kind]} size={13} /></span>
            <div className="wj-tx">
              <b>{j.label}</b>
              <span className="wj-meta">
                <span className={`wj-status ${j.status}`}>{j.status}</span>
                {j.tokens > 0 && <span>{j.tokens.toLocaleString()} tok</span>}
                {j.costUsd > 0 && <span>${j.costUsd < 0.01 ? j.costUsd.toFixed(4) : j.costUsd.toFixed(2)}</span>}
                <span>{j.started}{j.ended ? ` → ${j.ended}` : ''}</span>
                {j.demo && <span className="chip demo-chip">DEMO</span>}
              </span>
              {(j.status === 'running' || j.status === 'queued') && <div className="prog"><i style={{ width: `${j.progress}%` }} /></div>}
              {j.artifact && <small className="wj-art"><Icon name="box" size={9} />{j.artifact}</small>}
              {j.note && <small className="wj-note">{j.note}</small>}
            </div>
            {(j.status === 'running' || j.status === 'queued')
              ? <button className="btn sm danger" onClick={() => cancelJob(j.id)}><Icon name="stop" size={11} />Cancel</button>
              : <span className="wj-done"><Icon name={j.status === 'done' ? 'check' : j.status === 'cancelled' ? 'ban' : 'warn'} size={13} /></span>}
          </div>
        ))}
        {!S.war.jobs.length && <div className="empty"><Icon name="clock" size={22} />No jobs yet — terminal commands, squads, workflows and browser tasks all land here.</div>}
      </div>
    </div>
  );
}

/* ———————————————————————— sandbox pane ———————————————————————— */

function SandboxPane() {
  const env = cortexEnv();
  const running = S.war.jobs.filter(j => (j.kind === 'agent' || j.kind === 'browser' || j.kind === 'workflow') && (j.status === 'running' || j.status === 'queued'));
  const working = S.agents.filter(a => a.status === 'working');
  return (
    <div className="wr-sandbox">
      <div className="hn-sandbox" role="status">
        <span className="hn-sb-title"><Icon name="shield" size={12} />Sandbox</span>
        <span className="hn-sb-chip"><b>Engine</b>{env.mode === 'live' ? 'Live services' : 'demo adapter'}</span>
        <span className="hn-sb-chip"><b>Isolation</b>{env.mode === 'live' ? 'container (live)' : 'demo adapter — no container'}</span>
        <span className="hn-sb-chip"><b>cwd</b>/workspace/solar-crm</span>
        <span className="hn-sb-chip"><b>Profile</b>{S.modelProfile.name}</span>
        <span className="hn-sb-chip"><b>Session</b>{S.harness.activeSession ? S.harness.sessions.find(s => s.id === S.harness.activeSession)?.name ?? '—' : '—'}</span>
      </div>
      <div className="wr-sb-grid">
        <div className="wr-sb-col">
          <header><Icon name="zap" size={12} />Running jobs</header>
          <div className="col-body">
            {running.map(j => (
              <div className="wr-sb-job" key={j.id}>
                <span className={`wj-ic ${j.demo ? 'demo' : 'live'}`}><Icon name={JOB_ICON[j.kind]} size={12} /></span>
                <div className="wj-tx"><b>{j.label}</b><div className="prog"><i style={{ width: `${j.progress}%` }} /></div></div>
              </div>
            ))}
            {!running.length && <div className="empty small"><Icon name="zap" size={16} />No running jobs.</div>}
          </div>
        </div>
        <div className="wr-sb-col">
          <header><Icon name="bot" size={12} />Agent actions — live tails</header>
          <div className="col-body">
            {working.map(a => (
              <button className="wr-sb-agent" key={a.id} onClick={() => void summonAgent(a.id)}>
                <BlobAvatar a={a} size={24} />
                <div className="wj-tx"><b>{a.name}</b><small>{a.task?.title ?? '—'}</small><div className="ln dim">{a.output.slice(-1)[0]?.text ?? '›'}</div></div>
              </button>
            ))}
            {!working.length && <div className="empty small"><Icon name="bot" size={16} />No agent is executing right now.</div>}
          </div>
        </div>
        <div className="wr-sb-col">
          <header><Icon name="box" size={12} />Artifacts produced</header>
          <div className="col-body">
            {S.artifacts.slice(0, 8).map(x => (
              <div className="art-row" key={x.id}>
                <span className="ar-ic"><Icon name="file" size={13} /></span>
                <div className="ar-tx"><b>{x.title}</b><small>{x.agentName} · {x.created}</small></div>
                <span className={`ar-state ${x.state}`}>{x.state}</span>
              </div>
            ))}
            {!S.artifacts.length && <div className="empty small"><Icon name="box" size={16} />No artifacts yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ———————————————————————— execution dock ———————————————————————— */

function ExecDock() {
  const l = S.war.layout;
  const tabs = (['terminal', 'sandbox', 'harness', 'browser', 'jobs'] as DockTab[]).map(t => ({ t, ...DOCK_TAB_META[t] }));
  return (
    <section id="wr-dock" aria-label="Execution deck">
      <div className="wr-dock-head">
        <div className="wr-dock-tabs" role="tablist">
          {tabs.map(x => (
            <button key={x.t} role="tab" aria-selected={l.dockTab === x.t} className={`wr-dtab ${l.dockTab === x.t ? 'on' : ''}`} onClick={() => setDockTab(x.t)}>
              <Icon name={x.icon} size={13} /><span>{x.label}</span>
              {x.t === 'jobs' && activeJobs().length > 0 && <span className="wr-dtab-badge">{activeJobs().length}</span>}
              {x.t === 'browser' && S.war.browser.sessions.some(s => s.status === 'running') && <span className="wr-dtab-badge run" />}
            </button>
          ))}
        </div>
        <div className="wr-dock-tools">
          {l.dockTab === 'terminal' && (
            <button className="icon-btn" onClick={() => { setPopoutTerminal(true); window.open('/?popout=terminal', 'cortex-terminal', 'width=780,height=540'); }} title="Pop out terminal to a second window" aria-label="Pop out terminal"><Icon name="ext" size={14} /></button>
          )}
          <button className="icon-btn" onClick={toggleDock} title="Collapse execution deck" aria-label="Collapse execution deck"><Icon name="chevL" size={14} /></button>
        </div>
      </div>
      <div className="wr-dock-body">
        {l.dockTab === 'terminal' && <DockTerminal />}
        {l.dockTab === 'sandbox' && <SandboxPane />}
        {l.dockTab === 'jobs' && <JobsPane />}
      </div>
    </section>
  );
}

/* ———————————————————————— center modes ———————————————————————— */

function CenterMode() {
  const m = S.war.layout.centerMode;
  if (m === 'chat') return <ChatMode />;
  if (m === 'tasks') return <TasksMode />;
  if (m === 'knowledge') return <div className="wr-mode-wrap"><KnowledgeBoard /></div>;
  if (m === 'dashboard') return <div className="wr-mode-wrap"><DashboardMode /></div>;
  if (m === 'agent') return <div className="wr-mode-wrap"><AgentCenter /></div>;
  if (m === 'workflow') return <div className="wr-mode-wrap"><WorkflowModeView /></div>;
  if (m === 'canvas') return <div className="wr-mode-wrap"><CanvasBoard /></div>;
  if (m === 'browser') return <div className="wr-mode-wrap"><BrowserDeck center /></div>;
  return null;
}

/* ———————————————————————— mobile tab bar ———————————————————————— */

function MobileTabBar() {
  const modes = MODES_BY_LEVEL[S.war.userMode];
  return (
    <nav id="wr-mobile-tabs" aria-label="Modes">
      {modes.map(m => (
        <button key={m} className={`wr-mtab ${S.war.layout.centerMode === m ? 'on' : ''}`} onClick={() => setCenterMode(m)} aria-label={CENTER_MODE_META[m].label}>
          <Icon name={CENTER_MODE_META[m].icon} size={16} />
        </button>
      ))}
      <button className={`wr-mtab ${S.war.layout.dockOpen ? 'on' : ''}`} onClick={toggleDock} aria-label="Execution deck"><Icon name="layout" size={16} /></button>
      <button className={`wr-mtab ${S.war.layout.rightOpen ? 'on' : ''}`} onClick={toggleRightPanel} aria-label="Context panel"><Icon name="frame" size={16} /></button>
    </nav>
  );
}

/* ———————————————————————— root shell ———————————————————————— */

export default function WarRoom() {
  useCortex();
  const l = S.war.layout;
  return (
    <div id="warroom" className={l.sidebarCollapsed ? 'side-collapsed' : ''}>
      <SideBar />
      <div className="wr-main">
        <ModeToolbar />
        <QuickSummon />
        <PanelGroup direction="horizontal" className="wr-center-row" onLayout={sizes => { if (l.rightOpen && sizes.length === 2) nudgeSideSizes(100 - sizes[1], sizes[1]); }}>
          <Panel minSize={45} className="wr-center-panel">
            <div className="wr-center">
              <PanelGroup direction="vertical" onLayout={sizes => { if (l.dockOpen && sizes.length === 2) nudgeDockSize(sizes[1]); }}>
                <Panel minSize={28}>
                  <div className="wr-content">
                    <CenterMode />
                  </div>
                </Panel>
                {l.dockOpen && (
                  <>
                    <PanelResizeHandle className="wr-rh-h" onDragging={d => { if (!d) commitLayout(); }} />
                    <Panel defaultSize={l.dockSize} minSize={16} maxSize={72}>
                      <ExecDock />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </div>
          </Panel>
          {l.rightOpen && (
            <>
              <PanelResizeHandle className="wr-rh-v" onDragging={d => { if (!d) commitLayout(); }} />
              <Panel className="wr-right-panel" defaultSize={l.rightSize} minSize={16} maxSize={38}>
                <RightPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      <MobileTabBar />
    </div>
  );
}
