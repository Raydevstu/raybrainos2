// modals.tsx — Customize agent · Add agent · Ingest source · Constraint ·
// Artifact review · Create wiki page · Confirm dialogs
'use client';
import React, { useState } from 'react';
import {
  S, useCortex, byId, closeModal, updateAgent, dismissAgent, addAgent,
  PALETTE, SHAPES, allModels, providerOfModel, WIKI_TYPES, SOURCE_KINDS,
  currentPhaseInfo, createWikiPage,
  type Agent, type ShapeKey, type SourceKind
} from './cortex';
import { Icon, BlobAvatar } from './icons';
import { ingest } from '@/lib/api/brain-client';
import { approvePhase, requestChanges, holdPhase, addProjectConstraint } from '@/lib/api/jarvis-client';

function Customize({ a }: { a: Agent }) {
  const [name, setName] = useState(a.name);
  const [domain, setDomain] = useState(a.domain);
  const [color, setColor] = useState(a.color);
  const [shape, setShape] = useState<ShapeKey>(a.shape);
  const [personality, setPersonality] = useState(a.personality);
  const [model, setModel] = useState(a.model);
  const [autonomy, setAutonomy] = useState(a.autonomy);
  const provider = providerOfModel(model)?.name || a.provider;
  const modelOpts = allModels().map(m => <option key={m.provider.id + m.model} value={m.model}>{m.model} — {m.provider.name}</option>);
  return (
    <>
      <h3><BlobAvatar a={{ ...a, color, shape }} size={34} />Customize {a.name}</h3>
      <div className="frow"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} maxLength={18} /></div>
      <div className="frow"><label>Domain</label><input value={domain} onChange={e => setDomain(e.target.value)} maxLength={30} /></div>
      <div className="frow" style={{ alignItems: 'flex-start' }}><label>Color</label><div className="swatches">{PALETTE.map(c => <button key={c} className={`swatch ${c === color ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />)}<input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 34, height: 30, padding: 2, borderRadius: 8 }} title="Custom color" /></div></div>
      <div className="frow"><label>Blob shape</label><select value={shape} onChange={e => setShape(e.target.value as ShapeKey)}>{Object.keys(SHAPES).map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="frow"><label>Personality</label><select value={personality} onChange={e => setPersonality(e.target.value)}>{['Precise', 'Balanced', 'Creative'].map(p => <option key={p}>{p}</option>)}</select></div>
      <div className="frow"><label>Model <b>{provider}</b></label><select value={model} onChange={e => setModel(e.target.value)}>{modelOpts}</select></div>
      <div className="frow"><label>Autonomy <b>{autonomy}%</b></label><input type="range" min="0" max="100" value={autonomy} onChange={e => setAutonomy(+e.target.value)} /></div>
      <div className="modal-actions">
        {a.custom && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => { dismissAgent(a.id); closeModal(); }}>Dismiss agent</button>}
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" onClick={() => { updateAgent(a.id, { name: name.trim() || a.name, domain: domain.trim() || a.domain, color, shape, personality, model, provider, autonomy }); closeModal(); }}>Save</button>
      </div>
    </>
  );
}

function Add() {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [color, setColor] = useState(PALETTE[9]);
  const [shape, setShape] = useState<ShapeKey>('blob');
  return (
    <>
      <h3><Icon name="plus" size={18} />Summon a new Agent-Bot</h3>
      <div className="frow"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Connector" maxLength={18} /></div>
      <div className="frow"><label>Domain</label><input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. Integrations" maxLength={30} /></div>
      <div className="frow" style={{ alignItems: 'flex-start' }}><label>Color</label><div className="swatches">{PALETTE.map(c => <button key={c} className={`swatch ${c === color ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />)}</div></div>
      <div className="frow"><label>Blob shape</label><select value={shape} onChange={e => setShape(e.target.value as ShapeKey)}>{Object.keys(SHAPES).map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="modal-actions"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" disabled={!name.trim()} onClick={() => { addAgent({ name: name.trim(), domain: domain.trim(), color, shape }); closeModal(); }}>Create &amp; wire to Brain</button></div>
    </>
  );
}

function Ingest() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SourceKind>('markdown');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    // the store's ingestSource closes this modal itself once the client resolves — no closeModal here
    await ingest({ title: title.trim(), type, body: body.trim() });
  };
  return (
    <>
      <h3><Icon name="book" size={18} />Ingest a source</h3>
      <p style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 12 }}>Raw preserved → classified → entities &amp; concepts → rippled through the wiki. Nothing enters the Brain except through the Librarian.</p>
      <div className="frow"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Customer interview — Ian" /></div>
      <div className="frow"><label>Type</label><select value={type} onChange={e => setType(e.target.value as SourceKind)}>{Object.entries(SOURCE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
      <div className="frow" style={{ alignItems: 'flex-start' }}><label>Content</label><textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Paste notes, transcript, PRD…" /></div>
      <p className="gov-note" style={{ marginBottom: 0 }}>Raw layer preserved immutably · 11-stage pipeline · wiki + graph + index updated.</p>
      <div className="modal-actions"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" disabled={!title.trim() || busy} onClick={() => void submit()}>Ingest → Librarian</button></div>
    </>
  );
}

function Constraint() {
  const [text, setText] = useState('');
  return (
    <>
      <h3><Icon name="shield" size={18} />Add project constraint</h3>
      <p style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 12 }}>Constraints are rail guards — Jarvis enforces them on every studio at every gate.</p>
      <div className="frow" style={{ alignItems: 'flex-start' }}><label>Constraint</label><textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="e.g. No external calls without approval" /></div>
      <div className="modal-actions"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" disabled={!text.trim()} onClick={() => { void addProjectConstraint(text.trim()); closeModal(); }}>Add constraint</button></div>
    </>
  );
}

function Review({ artifactId }: { artifactId: string }) {
  const [changes, setChanges] = useState(false);
  const [reason, setReason] = useState('');
  const art = S.artifacts.find(x => x.id === artifactId);
  const phase = currentPhaseInfo();
  const open = S.findings.filter(f => f.status === 'open').length;
  if (!art) return (
    <>
      <h3><Icon name="gate" size={18} />Artifact review</h3>
      <p style={{ fontSize: 13, color: 'var(--dim)' }}>Artifact no longer exists.</p>
      <div className="modal-actions"><button className="btn" onClick={closeModal}>Close</button></div>
    </>
  );
  return (
    <>
      <h3><Icon name="gate" size={18} />Artifact review — {art.title}</h3>
      <div className="art-row" style={{ margin: '12px 0 10px' }}>
        <div className="ar-tx"><small>{art.agentName} · {art.kind} · {art.created}</small></div>
        <span className={`ar-state ${art.state}`}>{art.state}</span>
      </div>
      <div className={`gov-gate ${phase?.status === 'approved' ? 'ok' : ''}`}>
        <div className="gg-sub">Phase gate: {phase?.label ?? '—'} — {phase?.status ?? '—'}</div>
      </div>
      <div className="ct-sec">
        <small>Linked sources</small>
        {S.sources.slice(0, 3).map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
            <span className="sr-raw"><Icon name="db" size={9} />raw</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.title}</span>
          </div>
        ))}
        {!S.sources.length && <div style={{ fontSize: 10.5, color: 'var(--dim)' }}>No raw sources in the Brain yet — evidence lands here as sources are ingested.</div>}
      </div>
      <div className="k-note" style={{ marginTop: 10 }}>{open} open finding{open === 1 ? '' : 's'} across the wiki — citations verified on ingest</div>
      {changes && (
        <div className="frow" style={{ alignItems: 'flex-start', marginTop: 12 }}><label>Changes</label><textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="What must change before approval?" /></div>
      )}
      <div className="modal-actions">
        <button className="btn primary" onClick={() => { void approvePhase(); closeModal(); }}><Icon name="check" size={13} />Approve phase</button>
        {changes ? (
          <>
            <button className="btn" onClick={() => { setChanges(false); setReason(''); }}>Cancel</button>
            <button className="btn primary" disabled={!reason.trim()} onClick={() => { void requestChanges(reason.trim()); closeModal(); }}><Icon name="send" size={13} />Send changes</button>
          </>
        ) : (
          <button className="btn" onClick={() => setChanges(true)}><Icon name="edit" size={13} />Request changes</button>
        )}
        <button className="btn danger" onClick={() => { void holdPhase('Held at artifact review'); closeModal(); }}><Icon name="ban" size={13} />Block phase</button>
      </div>
    </>
  );
}

function WikiPageForm() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState(Object.keys(WIKI_TYPES)[0]);
  const [summary, setSummary] = useState('');
  const [links, setLinks] = useState('');
  const [cites, setCites] = useState<string[]>([]);
  const toggle = (id: string) => setCites(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  return (
    <>
      <h3><Icon name="plus" size={18} />Create wiki page from synthesis</h3>
      <p style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 12 }}>Synthesis writes the derived layer — every claim must trace back to a raw source.</p>
      <div className="frow"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Agent Routing" /></div>
      <div className="frow"><label>Type</label><select value={type} onChange={e => setType(e.target.value)}>{Object.keys(WIKI_TYPES).map(t => <option key={t}>{t}</option>)}</select></div>
      <div className="frow" style={{ alignItems: 'flex-start' }}><label>Summary</label><textarea rows={3} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Synthesized summary — every claim traces to a raw source." /></div>
      <div className="frow"><label>Links</label><input value={links} onChange={e => setLinks(e.target.value)} placeholder="Agent Routing, Event-Driven Architecture" /></div>
      <div className="frow" style={{ alignItems: 'flex-start' }}><label>Citations</label>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          {S.sources.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={cites.includes(s.id)} onChange={() => toggle(s.id)} style={{ accentColor: 'var(--accent)' }} />
              <span className="chip" style={{ fontSize: 10, height: 22 }}>{s.title}</span>
              <small style={{ fontSize: 9, color: 'var(--dim)' }}>{SOURCE_KINDS[s.kind]?.label}</small>
            </label>
          ))}
          {!S.sources.length && <small style={{ color: 'var(--dim)' }}>No raw sources yet — ingest one first.</small>}
        </div>
      </div>
      <div className="modal-actions"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" disabled={!title.trim()} onClick={() => { createWikiPage({ title: title.trim(), type, summary, links: links.split(',').map(l => l.trim()).filter(Boolean), citations: cites }); closeModal(); }}>Create page</button></div>
    </>
  );
}

export default function Modals() {
  useCortex();
  const m = S.modal;
  if (!m) return null;
  let inner: React.ReactNode = null;
  if (m.type === 'customize') { const a = byId(m.id); if (a) inner = <Customize a={a} />; }
  else if (m.type === 'add') inner = <Add />;
  else if (m.type === 'ingest') inner = <Ingest />;
  else if (m.type === 'constraint') inner = <Constraint />;
  else if (m.type === 'review') inner = <Review artifactId={m.artifactId} />;
  else if (m.type === 'wiki-page') inner = <WikiPageForm />;
  else if (m.type === 'confirm') inner = (
    <>
      <h3><Icon name="warn" size={18} />{m.title}</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>{m.body}</p>
      <div className="modal-actions"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn danger" onClick={() => { closeModal(); m.action(); }}>Confirm</button></div>
    </>
  );
  return <div id="modal" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}><div id="modal-card">{inner}</div></div>;
}
