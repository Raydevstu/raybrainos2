// harness.tsx — the Hermes / DeepSeek-style execution cockpit behind Jarvis.
// Sessions · layout presets · real-state terminal · files/review · MCP
// marketplace · sandbox status. The sandbox adapter is a demo boundary:
// a real sandbox WebSocket/API can replace it later without UI changes.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  S, useCortex, byId, activeSession, setHarnessLayout, setActiveSession,
  createSession, renameSession, deleteSession, runTermCommand, setFileReview,
  sendFileToLibrarian, toggleConnector, addConnector, removeConnector,
  councilAction, currentPhase, buildPct,
  type HarnessFile, type HarnessLayout
} from './cortex';
import { sendWorkRequest, summonAgent } from '../lib/api/jarvis-client';
import { cortexEnv } from '../lib/api/http';
import { Icon, BlobAvatar } from './icons';

const LAYOUTS: { id: HarnessLayout; label: string; hint: string }[] = [
  { id: 'simple', label: 'Simple', hint: 'command + activity' },
  { id: 'focus', label: 'Focus', hint: 'agent workspace + terminal' },
  { id: 'deck', label: 'Terminal Deck', hint: 'terminal · files/review · activity' },
  { id: 'council', label: 'Council', hint: 'council feed + artifact review' },
  { id: 'quad', label: 'Quad', hint: 'sources · council · terminal · files' }
];

/* ———————————————————————— panes ———————————————————————— */

function ActivityPane({ compact = false }: { compact?: boolean }) {
  return (
    <div className="ov-col" style={{ minHeight: 200 }}>
      <header><Icon name="activity" size={12} />Activity</header>
      <div className="col-body">
        {S.activity.slice(0, compact ? 10 : 30).map((x, i) => {
          const a = byId(x.agentId);
          return (
            <div className="feed-item" key={i}>
              <time>{x.t}</time>
              <span className="fa" style={{ background: a?.color || 'var(--dim)' }} />
              <span><b style={{ color: a?.color || 'var(--muted)' }}>{a?.name || 'System'}</b> — {x.text}</span>
            </div>
          );
        })}
        {!S.activity.length && <div className="empty"><Icon name="activity" size={20} />No events yet.</div>}
      </div>
    </div>
  );
}

function CommandPane() {
  const [q, setQ] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = q.trim(); if (!text) return;
    setQ('');
    await sendWorkRequest('mainbrain', text, 'command-bar');
  };
  return (
    <div className="ov-col">
      <header><Icon name="terminal" size={12} />Command</header>
      <div className="col-body">
        <form className="hn-cmd" onSubmit={submit}>
          <Icon name="chevR" size={13} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Directive through MainBrain — try &quot;design pricing screen&quot;" aria-label="Harness directive" />
          <button className="btn sm primary" type="submit"><Icon name="send" size={12} />Route</button>
        </form>
        <div className="k-note">You talk to MainBrain only. It routes to the right custodian; outputs return as artifacts through the Librarian.</div>
        <div id="p-quick" style={{ marginTop: 10 }}>
          <button className="btn sm" onClick={() => void councilAction('status')}>All: status report</button>
          <button className="btn sm" onClick={() => void councilAction('pause')}>Pause all</button>
          <button className="btn sm" onClick={() => void councilAction('resume')}>Resume all</button>
          <button className="btn sm" onClick={() => void councilAction('priority')}>Prioritize Solar CRM</button>
        </div>
        <h4 className="hn-sub-h">Phase · {currentPhase()} · build {buildPct()}%</h4>
      </div>
    </div>
  );
}

function FocusPane() {
  const a = byId(S.summoned ?? '') ?? S.agents.find(x => x.status === 'working') ?? byId('mainbrain');
  const outRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = outRef.current; if (el) el.scrollTop = el.scrollHeight; }, [a?.output.length]);
  if (!a) return null;
  return (
    <div className="ov-col">
      <header>
        <span className="fa" style={{ background: a.color }} />
        Focus · {a.name}
        <span className={`p-status ${a.status}`} style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px' }}>{a.status}</span>
      </header>
      <div className="col-body">
        <div className="hn-focus-head">
          <BlobAvatar a={a} size={38} />
          <div><b>{a.name}</b><small>{a.model} @ {a.provider}</small></div>
        </div>
        <div className="hn-task">{a.task?.title || 'Awaiting directive'}</div>
        {a.task && (
          <>
            <div>{a.task.steps.map((s, i) => (
              <div key={i} className={`step ${i < a.task!.stepsDone ? 'done' : i === a.task!.stepsDone && a.status === 'working' ? 'cur' : ''}`}>
                <span className="sic">{i < a.task!.stepsDone ? <Icon name="check" size={10} /> : null}</span>{s.label}
              </div>
            ))}</div>
            <div className="prog"><i style={{ width: `${Math.round(100 * a.task.stepsDone / a.task.steps.length)}%` }} /></div>
          </>
        )}
        <div id="hn-focus-out" ref={outRef}>
          {a.output.slice(-24).map((l, i) => <div key={i} className={`ln ${l.cls || ''}`}>{l.text}</div>)}
        </div>
      </div>
    </div>
  );
}

function TerminalPane({ tall = false }: { tall?: boolean }) {
  const [cmd, setCmd] = useState('');
  const histIdx = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [S.harness.term.length]);
  const onKey = (e: React.KeyboardEvent) => {
    const h = S.harness.termHistory;
    if (e.key === 'ArrowUp') { e.preventDefault(); if (!h.length) return; histIdx.current = histIdx.current === null ? h.length - 1 : Math.max(0, histIdx.current - 1); setCmd(h[histIdx.current]); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (histIdx.current === null) return; histIdx.current = histIdx.current + 1; if (histIdx.current >= h.length) { histIdx.current = null; setCmd(''); } else setCmd(h[histIdx.current]); }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    runTermCommand(cmd);
    setCmd(''); histIdx.current = null;
  };
  return (
    <div className="ov-col">
      <header><Icon name="terminal" size={12} />Terminal{tall && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--dim)', letterSpacing: 0 }}>harness · session scope</span>}</header>
      <div className="hn-term" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
        {S.harness.term.map((l, i) => <div key={i} className={`tl ${l.cls || ''}`}>{l.text}</div>)}
      </div>
      <form className="hn-term-in" onSubmit={submit}>
        <span className="hn-prompt">cortex&gt;</span>
        <input ref={inputRef} value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={onKey} placeholder="help · status · route <agent> <task> · wiki search …" aria-label="Harness terminal" />
      </form>
      <div className="hn-term-chips">
        {['help', 'status', 'agents', 'providers'].map(c => <button key={c} className="fchip" type="button" onClick={() => runTermCommand(c)}>{c}</button>)}
      </div>
    </div>
  );
}

function FilesPane({ selected, onSelect }: { selected: string | null; onSelect: (p: string) => void }) {
  const groups = useMemo(() => {
    const g = new Map<string, HarnessFile[]>();
    S.harness.files.forEach(f => {
      const dir = f.path.slice(0, f.path.lastIndexOf('/')) || '/';
      if (!g.has(dir)) g.set(dir, []);
      g.get(dir)!.push(f);
    });
    return [...g.entries()];
  }, [S.harness.files]);
  return (
    <div className="ov-col">
      <header><Icon name="folder" size={12} />Files · Solar CRM</header>
      <div className="col-body">
        {groups.map(([dir, files]) => (
          <div key={dir} className="hn-dir">
            <div className="hn-dir-name">{dir}</div>
            {files.map(f => (
              <button key={f.path} className={`hn-file ${selected === f.path ? 'on' : ''}`} onClick={() => onSelect(f.path)}>
                <Icon name="file" size={12} />
                <span>{f.name}</span>
                <i className={`hn-rv ${f.review}`} title={f.review} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPane({ path, onBack }: { path: string | null; onBack: () => void }) {
  const f = S.harness.files.find(x => x.path === path);
  if (!f) return (
    <div className="ov-col">
      <header><Icon name="eye" size={12} />Review</header>
      <div className="col-body"><div className="empty"><Icon name="eye" size={22} />Select a file to review.</div></div>
    </div>
  );
  return (
    <div className="ov-col">
      <header>
        <Icon name="eye" size={12} />Review
        <span className={`hn-rv-badge ${f.review}`}>{f.review === 'changes' ? 'changes requested' : f.review}</span>
      </header>
      <div className="col-body">
        <div className="hn-rv-head">
          <button className="btn sm" onClick={onBack}><Icon name="chevL" size={12} />Files</button>
          <b>{f.path}</b>
        </div>
        <div className="hn-rv-meta">
          <span className="chip">artifact: {f.kind}</span>
          <span className="chip">by {f.createdBy}</span>
          <span className="chip">{f.lang}</span>
        </div>
        {f.decisions.length > 0 && (
          <div className="hn-rv-dec">
            <small>Linked decisions</small>
            <div className="links">{f.decisions.map(d => <span className="chip" key={d}>{d}</span>)}</div>
          </div>
        )}
        <pre className="hn-rv-code">{f.content}</pre>
        <div className="hn-rv-actions">
          <button className="btn sm" onClick={() => sendFileToLibrarian(f.path)}><Icon name="book" size={12} />Send to Librarian</button>
          <button className="btn sm primary" disabled={f.review === 'approved'} onClick={() => setFileReview(f.path, 'approved')}><Icon name="check" size={12} />Approve</button>
          <button className="btn sm danger" disabled={f.review === 'changes'} onClick={() => setFileReview(f.path, 'changes')}><Icon name="edit" size={12} />Request changes</button>
        </div>
      </div>
    </div>
  );
}

function CouncilPane() {
  const mb = byId('mainbrain');
  return (
    <div className="ov-col">
      <header><Icon name="users" size={12} />Council · MainBrain + custodians</header>
      <div className="col-body">
        <div id="hn-mb-out">
          {mb?.output.slice(-14).map((l, i) => <div key={i} className={`ln ${l.cls || ''}`}>{l.text}</div>)}
        </div>
        <h4 className="hn-sub-h">Custodians</h4>
        {S.agents.filter(a => !a.core).map(a => (
          <button key={a.id} className="board-card" onClick={() => void summonAgent(a.id)} title={`Summon ${a.name}`}>
            <div className="bc-top"><BlobAvatar a={a} size={26} /><b>{a.name}</b>
              <span className={`p-status ${a.status}`} style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px' }}>{a.status}</span>
            </div>
            <div className="bc-task">{a.task?.title || 'Awaiting directive'}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcesPane() {
  return (
    <div className="ov-col">
      <header><Icon name="db" size={12} />Raw sources</header>
      <div className="col-body">
        {S.sources.map(s => (
          <div className="src-row" key={s.id}>
            <span className="sr-ic"><Icon name="db" size={14} /></span>
            <div className="sr-tx"><b>{s.title}</b><small>{s.note}</small><span className="sr-meta">{s.kind} · {s.created} · raw/</span></div>
          </div>
        ))}
        {!S.sources.length && <div className="empty"><Icon name="db" size={20} />No raw sources yet.</div>}
      </div>
    </div>
  );
}

/* ———————————————————————— MCP marketplace ———————————————————————— */

function Marketplace() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <section className="hn-mcp">
      <button className="hn-mcp-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name="plug" size={13} />
        <b>MCP · Tools marketplace</b>
        <span className="chip ok"><span className="dot" style={{ background: 'var(--ok)' }} />{S.harness.connectors.filter(c => c.connected).length}/{S.harness.connectors.length} connected</span>
        <Icon name={open ? 'chevL' : 'chevR'} size={13} />
      </button>
      {open && (
        <div className="hn-mcp-body">
          <div className="hn-mcp-grid">
            {S.harness.connectors.map(c => (
              <div className="hn-conn" key={c.id}>
                <div className="hc-top">
                  <span className="hc-ic"><Icon name={c.icon} size={15} /></span>
                  <div><b>{c.name}</b><small>{c.auth}</small></div>
                  <button className={`switch ${c.connected ? 'on' : ''}`} onClick={() => toggleConnector(c.id)} aria-label={`Toggle ${c.name}`} />
                </div>
                <p>{c.desc}</p>
                <div className="hc-agents">
                  {c.allowedAgents.map(id => { const a = byId(id); return a ? <span className="chip" key={id} style={{ borderColor: a.color + '55', color: a.color, fontSize: 9 }}>{a.name}</span> : null; })}
                </div>
                {c.custom && <button className="btn sm danger" style={{ marginTop: 8 }} onClick={() => removeConnector(c.id)}><Icon name="trash" size={11} />Remove</button>}
              </div>
            ))}
          </div>
          <div className="hn-mcp-add">
            <div className="frow"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Notion" maxLength={20} /></div>
            <div className="frow"><label>Description</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this connector gives agents" maxLength={80} /></div>
            <button className="btn sm primary" disabled={!name.trim()} onClick={() => { addConnector({ name: name.trim(), desc: desc.trim() }); setName(''); setDesc(''); }}><Icon name="plus" size={12} />Add connector</button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ———————————————————————— sandbox strip ———————————————————————— */

function SandboxStrip() {
  const env = cortexEnv();
  const gatewayOnline = S.providers.some(p => p.connected);
  const local = S.providers.find(p => p.type === 'local');
  const chips: [string, string, boolean][] = [
    ['Backend', env.mode === 'live' ? 'Live brain-service' : 'Demo adapter', env.mode === 'live'],
    ['Sandbox', env.mode === 'live' ? 'Live session' : 'Isolated (demo)', true],
    ['Provider gateway', gatewayOnline ? 'Online' : 'All offline', gatewayOnline],
    ['Local models', local ? (local.connected ? `${local.name} · up` : 'Down') : 'None', !!local?.connected],
    ['GPU', env.mode === 'live' ? 'n/a' : 'Placeholder (demo)', true],
    ['cwd', '/workspace/solar-crm', true],
    ['Profile', S.modelProfile.name, true]
  ];
  return (
    <div className="hn-sandbox" role="status">
      <span className="hn-sb-title"><Icon name="shield" size={12} />Sandbox</span>
      {chips.map(([k, v, ok]) => (
        <span className={`hn-sb-chip ${ok ? '' : 'bad'}`} key={k}><b>{k}</b>{v}</span>
      ))}
    </div>
  );
}

/* ———————————————————————— root ———————————————————————— */

export default function Harness() {
  useCortex();
  const [file, setFile] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const ses = activeSession();
  const layout = S.harness.layout;
  const pick = (p: string) => setFile(prev => (prev === p ? prev : p));

  const grid = () => {
    switch (layout) {
      case 'simple': return <><CommandPane /><ActivityPane /></>;
      case 'focus': return <><FocusPane /><TerminalPane /></>;
      case 'deck': return <><TerminalPane tall /><FilesPane selected={file} onSelect={pick} /><ActivityPane compact /><div className="hn-span"><ReviewPane path={file} onBack={() => setFile(null)} /></div></>;
      case 'council': return <><CouncilPane /><ReviewPane path={file} onBack={() => setFile(null)} /></>;
      case 'quad': return <><SourcesPane /><CouncilPane /><TerminalPane /><div className="hn-stack"><FilesPane selected={file} onSelect={pick} /><ReviewPane path={file} onBack={() => setFile(null)} /></div></>;
      default: return <><CommandPane /><ActivityPane /></>;
    }
  };

  return (
    <div className="harness">
      <aside className="hn-sessions">
        <header>
          <Icon name="clock" size={12} />Sessions
          <button className="icon-btn" style={{ width: 24, height: 24, marginLeft: 'auto' }} onClick={() => { setCreating(true); setNewName(''); }} title="New session"><Icon name="plus" size={13} /></button>
        </header>
        <div className="col-body">
          {S.harness.sessions.map(s => (
            <div key={s.id} className={`hn-ses ${S.harness.activeSession === s.id ? 'on' : ''}`} onClick={() => setActiveSession(s.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setActiveSession(s.id); }}>
              <span className="dot" style={{ background: S.harness.activeSession === s.id ? 'var(--ok)' : 'var(--dim)' }} />
              {renaming === s.id ? (
                <form className="hn-ses-ren" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); renameSession(s.id, renameVal); setRenaming(null); }}>
                  <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)} maxLength={28} aria-label="Rename session" />
                  <button type="submit" className="btn sm primary">Save</button>
                </form>
              ) : (
                <div className="hn-ses-tx">
                  <b>{s.name}</b>
                  <small>{s.project} · {s.agents.length} agents · {s.layout} · {s.created}</small>
                </div>
              )}
              <span className="hn-ses-act" onClick={e => e.stopPropagation()}>
                <button className="icon-btn" style={{ width: 22, height: 22 }} title="Rename" onClick={() => { setRenaming(s.id); setRenameVal(s.name); }}><Icon name="edit" size={11} /></button>
                <button className="icon-btn" style={{ width: 22, height: 22 }} title="Delete" onClick={() => deleteSession(s.id)}><Icon name="trash" size={11} /></button>
              </span>
            </div>
          ))}
          {!S.harness.sessions.length && <div className="empty"><Icon name="clock" size={20} />No sessions.</div>}
          {creating && (
            <form className="hn-ses-new" onSubmit={e => { e.preventDefault(); if (newName.trim()) { createSession(newName.trim()); setCreating(false); } }}>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Session name" maxLength={28} aria-label="New session name" />
              <div><button type="button" className="btn sm" onClick={() => setCreating(false)}>Cancel</button><button type="submit" className="btn sm primary">Create</button></div>
            </form>
          )}
        </div>
        {ses && (
          <div className="hn-ses-meta">
            <b>{ses.name}</b>
            <span>project · {ses.project}</span>
            <span>profile · {ses.profileName}</span>
            <span>sandbox · {ses.sandbox}</span>
            <span>bound agents · {ses.agents.length}</span>
          </div>
        )}
      </aside>

      <div className="hn-main">
        <div className="hn-toolbar">
          <Icon name="layout" size={13} />
          {LAYOUTS.map(l => (
            <button key={l.id} className={`fchip ${layout === l.id ? 'on' : ''}`} onClick={() => setHarnessLayout(l.id)} title={l.hint}>{l.label}</button>
          ))}
          <span className="hn-layout-hint">{LAYOUTS.find(l => l.id === layout)?.hint ?? 'custom saved layout'}</span>
        </div>
        <div className={`hn-grid ${layout}`}>
          {grid()}
        </div>
        <Marketplace />
        <SandboxStrip />
      </div>
    </div>
  );
}
