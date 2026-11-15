// agent-panel.tsx — summoned agent workspace (right drawer / mobile bottom sheet)
'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  S, useCortex, byId, closePanel, openModal, councilAction, openOverlay,
  setPanelTab, setWikiPreview, WIKI_TYPES, currentPhaseInfo, removeConstraint, type Agent
} from './cortex';
import { sendWorkRequest, approvePhase, requestChanges, holdPhase, addProjectConstraint } from '@/lib/api/jarvis-client';
import { Icon, BlobAvatar } from './icons';

function Steps({ a }: { a: Agent }) {
  if (!a.task) return <><div id="p-task-title">Awaiting directive</div><div className="step"><span className="sic" />Idle — autonomy {a.autonomy}%</div><div className="prog"><i style={{ width: 0 }} /></div></>;
  const pct = Math.round(100 * a.task.stepsDone / a.task.steps.length);
  return (
    <>
      <div id="p-task-title">{a.task.title}</div>
      <div>{a.task.steps.map((s, i) => <div key={i} className={`step ${i < a.task!.stepsDone ? 'done' : i === a.task!.stepsDone && a.status === 'working' ? 'cur' : ''}`}><span className="sic">{i < a.task!.stepsDone ? <Icon name="check" size={10} /> : null}</span>{s.label}</div>)}</div>
      <div className="prog"><i style={{ width: `${pct}%` }} /></div>
    </>
  );
}

/** GovernanceView — the MainBrain workspace: Jarvis owns the lifecycle, studios never skip gates. */
function GovernanceView() {
  const [gateForm, setGateForm] = useState<null | 'changes' | 'hold' | 'constraint'>(null);
  const [gateTxt, setGateTxt] = useState('');
  const gov = S.gov;
  const cur = currentPhaseInfo();
  // The store parks phaseIdx on the last phase after the final approval — that is "shipped" too.
  const shipped = !cur || (cur.status === 'approved' && !gov.phases[gov.phaseIdx + 1]);
  const studio = cur ? byId(cur.studio) : undefined;
  const atGate = cur?.status === 'review' || cur?.status === 'blocked';
  const arts = cur ? S.artifacts.filter(x => x.agentId === cur.studio).slice(0, 3) : [];
  const PH: Record<'changes' | 'hold' | 'constraint', string> = { changes: 'Revision notes for the studio…', hold: 'Why is this phase blocked?', constraint: 'New constraint for every studio…' };
  const openForm = (k: 'changes' | 'hold' | 'constraint') => { setGateForm(f => (f === k ? null : k)); setGateTxt(''); };
  const submitForm = () => {
    if (!gateForm) return;
    const t = gateTxt.trim();
    if (gateForm === 'changes') { if (t) void requestChanges(t); }
    else if (gateForm === 'hold') void holdPhase(t); // empty is fine: store blocks with a default reason (or unblocks)
    else if (t) void addProjectConstraint(t);
    setGateTxt(''); setGateForm(null);
  };
  return (
    <>
      <div className="p-card">
        <h4><Icon name="target" size={12} />Project governance</h4>
        <div className="gov-objective"><b>{gov.project}</b> — {gov.objective}</div>
        {shipped ? (
          <div className="gov-kv" style={{ marginTop: 9 }}>
            <div className="gk-row" style={{ color: 'var(--ok)' }}><Icon name="verified" size={14} /><span><b style={{ color: 'var(--ok)' }}>Project shipped</b> — every gate approved. Council stands down.</span></div>
          </div>
        ) : cur && (
          <div className="gov-kv" style={{ marginTop: 9 }}>
            <div className="gk-row" style={{ alignItems: 'center' }}>
              <Icon name="gate" size={12} />
              <span>Current phase: <b>{cur.label}</b> <span className={`chip ${cur.status === 'approved' ? 'ok' : cur.status === 'review' ? 'warn' : ''}`} style={{ fontSize: 9, height: 16, padding: '0 7px', ...(cur.status === 'blocked' ? { color: 'var(--danger)', borderColor: 'color-mix(in srgb,var(--danger) 45%,transparent)' } : {}) }}>{cur.status}</span></span>
            </div>
            <div className="gk-row"><Icon name="users" size={12} /><span>Active studio: <b>{studio?.name ?? cur.studio}</b> · {studio?.status ?? 'unassigned'}</span></div>
          </div>
        )}
      </div>
      {!shipped && cur && <>
        <div className="p-card" style={{ marginTop: 12 }}>
          <h4><Icon name="route" size={12} />Phase pipeline · approval gates</h4>
          <div className="gov-strip">
            {gov.phases.map((p, i) => (
              <React.Fragment key={p.key}>
                {i > 0 && <div className={`gov-join${gov.phases[i - 1].status === 'approved' ? ' done' : ''}`} />}
                <div className={`gov-ph ${p.status}${i === gov.phaseIdx ? ' cur' : ''}`}>
                  <span className="gp-lbl">{p.label}</span>
                  <span className="gp-st">{p.status}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="gov-note" style={{ marginTop: 7 }}>Jarvis owns transitions: Phase complete → review → approved → next studio starts. Studios never skip gates.</div>
        </div>
        <div className="p-card" style={{ marginTop: 12 }}>
          <h4><Icon name="gate" size={12} />Approval gate</h4>
          {atGate ? (
            <>
              <div className="gov-gate">
                <h5><Icon name={cur.status === 'blocked' ? 'ban' : 'gate'} size={13} />{cur.label} — {cur.status === 'blocked' ? 'BLOCKED' : 'awaiting Jarvis review'}</h5>
                <div className="gg-sub">Deliverable: {cur.deliverable} · Deadline: {cur.deadline}</div>
                {arts.length ? arts.map(x => (
                  <button key={x.id} className="gov-art" onClick={() => openModal({ type: 'review', artifactId: x.id })}>
                    <span className="ga-ic"><Icon name="file" size={13} /></span>
                    <b>{x.title}</b>
                    <small>{x.state} · {x.created}</small>
                  </button>
                )) : <div className="gov-note">No artifacts recorded for this phase yet.</div>}
              </div>
              <div className="gov-acts" style={{ marginTop: 10 }}>
                <button className="btn sm primary" disabled={!atGate} onClick={() => void approvePhase()}><Icon name="check" size={12} />Approve phase</button>
                <button className="btn sm" onClick={() => openForm('changes')}><Icon name="edit" size={12} />Request changes</button>
                <button className="btn sm danger" onClick={() => openForm('hold')}><Icon name="ban" size={12} />{cur.status === 'blocked' ? 'Unblock phase' : 'Block phase'}</button>
                <button className="btn sm ghost" onClick={() => openForm('constraint')}><Icon name="shield" size={12} />Add constraint</button>
              </div>
              {gateForm && (
                <form style={{ display: 'flex', gap: 6, marginTop: 8 }} onSubmit={e => { e.preventDefault(); submitForm(); }}>
                  <input value={gateTxt} onChange={e => setGateTxt(e.target.value)} placeholder={PH[gateForm]} style={{ flex: 1 }} autoFocus aria-label="Gate note" />
                  <button className="btn sm primary" type="submit" disabled={!gateTxt.trim() && gateForm !== 'hold'}><Icon name="send" size={12} />Send</button>
                  <button className="btn sm ghost" type="button" onClick={() => { setGateForm(null); setGateTxt(''); }}>Cancel</button>
                </form>
              )}
            </>
          ) : cur.status === 'active' ? (
            <div className="gov-gate ok">
              <h5><Icon name="users" size={13} />{cur.label} studio is working</h5>
              <div className="gg-sub">{byId(cur.studio)?.task?.title ?? 'Awaiting directive'}</div>
              <div className="gov-note">The gate arms when the deliverable lands.</div>
            </div>
          ) : (
            <div className="gov-note">Phase queued — waiting for the previous gate.</div>
          )}
        </div>
        <div className="p-card" style={{ marginTop: 12 }}>
          <h4><Icon name="shield" size={12} />Blockers · risks · constraints</h4>
          <div className="gov-kv">
            {gov.blockers.map(b => <div className="gk-row" key={b.id}><span style={{ color: 'var(--danger)', display: 'flex' }}><Icon name="ban" size={12} /></span><span>{b.text}</span></div>)}
            {!gov.blockers.length && <div className="gk-row" style={{ color: 'var(--dim)' }}><Icon name="ban" size={12} /><span>No blockers — council is clear.</span></div>}
            {gov.risks.map(r => <div className="gk-row" key={r.id}><span style={{ color: r.level === 'low' ? 'var(--dim)' : 'var(--warn)', display: 'flex' }}><Icon name="warn" size={12} /></span><span><b>{r.level}</b> — {r.text}</span></div>)}
            {!gov.risks.length && <div className="gk-row" style={{ color: 'var(--dim)' }}><Icon name="warn" size={12} /><span>No risks tracked.</span></div>}
            {gov.constraints.map((c, i) => (
              <div className="gk-row" key={c + i}>
                <Icon name="lock" size={12} /><span>{c}</span>
                <button className="gk-x" onClick={() => removeConstraint(i)} title="Remove constraint" aria-label={`Remove constraint: ${c}`}><Icon name="x" size={11} /></button>
              </div>
            ))}
            {!gov.constraints.length && <div className="gk-row" style={{ color: 'var(--dim)' }}><Icon name="lock" size={12} /><span>No constraints — add one from the gate card.</span></div>}
          </div>
        </div>
        <div className="p-card" style={{ marginTop: 12 }}>
          <h4><Icon name="calendar" size={12} />Deliverables · deadlines</h4>
          <div className="gov-kv">
            {gov.phases.map(p => (
              <div className="gk-row" key={p.key}>
                {p.status === 'approved' ? <span style={{ color: 'var(--ok)', display: 'flex' }}><Icon name="check" size={12} /></span> : <Icon name="list" size={12} />}
                <span><b>{p.label}</b> — {p.deliverable}</span>
                <small style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dim)' }}>{p.deadline}</small>
              </div>
            ))}
          </div>
        </div>
      </>}
      <div className="p-card" style={{ marginTop: 12 }}><h4><Icon name="users" size={12} />Council broadcast</h4><div id="p-quick">
        <button className="btn sm" onClick={() => councilAction('status')}>All: status report</button>
        <button className="btn sm" onClick={() => councilAction('pause')}>Pause all</button>
        <button className="btn sm" onClick={() => councilAction('resume')}>Resume all</button>
        <button className="btn sm" onClick={() => councilAction('priority')}>Prioritize Solar CRM</button>
      </div></div>
    </>
  );
}

function WikiView() {
  const [q, setQ] = useState('');
  const preview = S.wikiPreview;
  const pages = S.wiki.filter(w => w.title.toLowerCase().includes(q.toLowerCase()) || w.type.includes(q.toLowerCase()));
  if (preview) return (
    <div className="p-card"><div id="w-preview">
      <button className="btn sm" onClick={() => setWikiPreview(null)}><Icon name="chevL" size={12} />All pages</button>
      <h5 style={{ marginTop: 10 }}>{preview.title}</h5>
      <span className="wt" style={{ color: WIKI_TYPES[preview.type], fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>{preview.type}</span>
      <p style={{ marginTop: 8 }}>{preview.summary}</p>
      <div className="links">{preview.links.map(l => <span className="chip" style={{ fontSize: 10 }} key={l}>[[{l}]]</span>)}</div>
      <p style={{ marginTop: 10, fontSize: 10, color: 'var(--dim)' }}>Cited from raw sources · maintained by Chief Librarian · never the source of truth</p>
    </div></div>
  );
  return (
    <div className="p-card">
      <h4><Icon name="book" size={12} />LLM Wiki · {S.metrics.pages} pages</h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the wiki…" style={{ flex: 1 }} />
        <button className="btn sm primary" onClick={() => openModal({ type: 'ingest' })}><Icon name="plus" size={12} />Ingest</button>
      </div>
      <div id="w-list">
        {pages.length ? pages.map((w, i) => (
          <button className="wpage" key={i} onClick={() => setWikiPreview(w)}>
            <span className="wt" style={{ color: WIKI_TYPES[w.type] || '#22d3ee', borderColor: (WIKI_TYPES[w.type] || '#22d3ee') + '55', background: (WIKI_TYPES[w.type] || '#22d3ee') + '12' }}>{w.type}</span>
            <b>{w.title}</b><span>{w.updated}</span>
          </button>
        )) : <div className="empty"><Icon name="book" size={22} />No pages match. Ingest a source to grow the wiki.</div>}
      </div>
    </div>
  );
}

export default function AgentPanel() {
  useCortex();
  const a = S.summoned ? byId(S.summoned) : null;
  const [cmd, setCmd] = useState('');
  const outRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = outRef.current; if (el) el.scrollTop = el.scrollHeight; }, [a?.output.length, S.summoned]);
  if (!a) return <aside id="panel" aria-hidden="true" />;
  return (
    <aside id="panel" className="open" role="dialog" aria-label={`${a.name} workspace`}>
      <div className="p-head">
        <div className="ava-wrap"><BlobAvatar a={a} size={54} /></div>
        <div className="pi"><h3>{a.name}</h3><div className="pd">{a.domain}</div><span className={`p-status ${a.status}`}><span className={`dot ${a.status}`} />{a.status === 'working' ? 'Working' : a.status === 'review' ? 'In review' : 'Idle'}</span></div>
        <div className="pa"><button className="icon-btn" onClick={() => openModal({ type: 'customize', id: a.id })} title="Customize agent"><Icon name="gear" size={15} /></button><button className="icon-btn" onClick={closePanel} title="Dismiss workspace"><Icon name="x" size={15} /></button></div>
      </div>
      <div id="p-model"><span className="chip" style={{ borderColor: a.color + '66', color: a.color }}>{a.model}</span><span>via {a.provider}</span><span>·</span><span>{a.personality}</span><span>·</span><span>autonomy {a.autonomy}%</span></div>
      {a.id === 'librarian' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', margin: '12px 16px 0' }}>
          <div id="p-tabs" style={{ flex: 1, margin: 0 }}>
            <button className={S.panelTab === 'task' ? 'on' : ''} onClick={() => setPanelTab('task')} style={{ width: '100%' }}>Task</button>
            <button className={S.panelTab === 'wiki' ? 'on' : ''} onClick={() => setPanelTab('wiki')} style={{ width: '100%' }}>Wiki</button>
          </div>
          <button className="btn sm" onClick={() => openOverlay('knowledge')} title="Open the full Librarian workspace"><Icon name="layers" size={12} />HQ</button>
        </div>
      )}
      <div className="p-scroll">
        {S.panelTab === 'wiki' && a.id === 'librarian' ? <WikiView /> : (
          <div id="p-taskview">
            {a.core ? <GovernanceView /> : <div className="p-card"><h4><Icon name="clock" size={12} />Current task</h4><Steps a={a} /></div>}
            <div className="p-card" style={{ marginTop: 12 }}><h4><Icon name="terminal" size={12} />Live output</h4><div id="p-output" ref={outRef}>{a.output.map((l, i) => <div key={i} className={`ln ${l.cls || ''}`}>{l.cls === 'agent' ? <span className="agent" style={{ color: a.color }}>{l.text}</span> : l.text}</div>)}</div></div>
          </div>
        )}
      </div>
      <form id="p-cmd" onSubmit={e => { e.preventDefault(); if (cmd.trim()) { void sendWorkRequest(a.id, cmd.trim(), 'workspace'); setCmd(''); } }}>
        <input value={cmd} onChange={e => setCmd(e.target.value)} placeholder={`Give ${a.name} a command…`} aria-label="Command" />
        <button className="send" type="submit" title="Send"><Icon name="send" size={16} /></button>
      </form>
    </aside>
  );
}
