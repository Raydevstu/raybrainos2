// overlays.tsx — full-screen work surfaces: War Room · Agent Roster ·
// Librarian HQ · Harness · Settings
'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  S, useCortex, byId, closeOverlay, openModal, setSetting, applyTheme,
  clearActivity, setWarFilter, setWarSort,
  setRosterQ, setRosterStatus, setRosterSort, resetDemoData, buildPct,
  updateModelProfile, routeModel, allModels, providerOfModel,
  THEMES, WIKI_TYPES, SOURCE_KINDS, INGEST_STAGES, FINDING_META,
  runAudit, resolveFinding, dismissFinding, deprecatePage,
  type Agent, type WikiPage, type Theme, type Provider,
  type SourceStatus, type AuditFinding, type KnowledgeTab
} from './cortex';
import { summonAgent } from '@/lib/api/jarvis-client';
import { searchBrain } from '@/lib/api/brain-client';
import type { BrainSearchResult } from '@/lib/api/types';
import { providerGroups, gatewayToggleProvider, removeProvider, addCustomEndpoint, API_MODES, describeMode } from '@/lib/provider-gateway';
import type { ApiMode } from '@/lib/provider-types';
import { Icon, BlobAvatar } from './icons';
import GraphView from './graph-view';

/* ———————————————————————— War Room Dashboard (constitution v2: the monitoring view lives on as a War Room mode) ———————————————————————— */

export function DashboardBoard() {
  const items = S.activity.filter(x => S.warFilter === 'all' || x.kind === S.warFilter);
  const board = S.agents.filter(a => !a.core);
  const prog = (a: Agent) => a.task ? a.task.stepsDone / a.task.steps.length : 0;
  if (S.warSort === 'name') board.sort((a, b) => a.name.localeCompare(b.name));
  else if (S.warSort === 'progress') board.sort((a, b) => prog(b) - prog(a));
  else board.sort((a, b) => (a.status === 'working' ? 0 : a.status === 'review' ? 1 : 2) - (b.status === 'working' ? 0 : b.status === 'review' ? 1 : 2));
  const work = S.agents.filter(a => a.status === 'working').length;
  const metrics: [string, string | number][] = [
    ['Agents connected', S.agents.length],
    ['Tasks running', work],
    ['Wiki pages', S.metrics.pages],
    ['Artifacts pending', S.artifacts.filter(x => x.state === 'pending').length],
    ['Artifacts ingested', S.artifacts.filter(x => x.state === 'ingested').length],
    ['Build progress', `${buildPct()}%`],
    ['System health', `${S.metrics.health.toFixed(1)}%`],
    ['Events logged', S.activity.length]
  ];
  return (
    <div className="war-grid">
      <div className="ov-col">
        <header>Activity feed
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['all', 'task', 'artifact', 'system'].map(f => <button key={f} className={`fchip ${S.warFilter === f ? 'on' : ''}`} onClick={() => setWarFilter(f)}>{f}</button>)}
            <button className="fchip" onClick={clearActivity}>clear</button>
          </span>
        </header>
        <div className="col-body">
          {items.map((x, i) => {
            const a = byId(x.agentId);
            return (
              <div className="feed-item" key={i}>
                <time>{x.t}</time>
                <span className="fa" style={{ background: a?.color || 'var(--dim)' }} />
                <span className="fbody">
                  <b style={{ color: a?.color || 'var(--muted)' }}>{a?.name || 'System'}</b> — {x.text}
                  {x.flow && <span className="flow">{x.flow.split('→').map((seg, j, arr) => <span key={j}>{seg.trim()}{j < arr.length - 1 && <i> → </i>}</span>)}</span>}
                </span>
              </div>
            );
          })}
          {!items.length && <div className="empty"><Icon name="activity" size={20} />Feed cleared — history stays in the Brain.</div>}
        </div>
      </div>
      <div className="ov-col">
        <header>Mission board
          <select value={S.warSort} onChange={e => setWarSort(e.target.value)} style={{ marginLeft: 'auto', fontSize: 10, padding: '4px 24px 4px 8px' }}>
            <option value="status">Sort: Status</option><option value="progress">Sort: Progress</option><option value="name">Sort: Name</option>
          </select>
        </header>
        <div className="col-body">
          {board.map(a => (
            <button className="board-card" key={a.id} onClick={() => void summonAgent(a.id)}>
              <div className="bc-top"><BlobAvatar a={a} size={30} /><b>{a.name}</b><span className={`p-status ${a.status}`} style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px' }}><span className={`dot ${a.status}`} />{a.status}</span></div>
              <div className="bc-task">{a.task?.title || 'Awaiting directive'}</div>
              <div className="prog"><i style={{ width: `${Math.round(prog(a) * 100)}%` }} /></div>
            </button>
          ))}
        </div>
      </div>
      <div className="ov-col">
        <header>System / Global output</header>
        <div className="col-body">
          {metrics.map(m => <div className="metric-big" key={m[0]}><span>{m[0]}</span><b>{m[1]}</b></div>)}
          <h4 style={{ fontSize: 10, letterSpacing: '.14em', color: 'var(--muted)', margin: '12px 0 6px', textTransform: 'uppercase' }}>Global output</h4>
          <div id="global-term">
            {S.agents.flatMap(a => a.output.slice(-4).map(l => ({ a, l }))).slice(-40).map((x, i) => <div key={i}><span style={{ color: x.a.color }}>{x.a.name}</span> {x.l.text}</div>)}
          </div>
          <h4 style={{ fontSize: 10, letterSpacing: '.14em', color: 'var(--muted)', margin: '12px 0 6px', textTransform: 'uppercase' }}>Knowledge sync</h4>
          <div id="sync-log">
            {S.syncLog.length ? S.syncLog.slice(0, 12).map((l, i) => (
              <div className="sl" key={i}><time>{l.t}</time><b className={l.ok ? 'ok' : ''}>{l.ok ? '✓' : '!'} {l.text}</b></div>
            )) : <div className="sl"><time>--</time><b>no sync events yet — the Librarian posts receipts here</b></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ———————————————————————— Agent Roster ———————————————————————— */

function Roster() {
  let list = S.agents.filter(a => a.name.toLowerCase().includes(S.rosterQ.toLowerCase()) || a.domain.toLowerCase().includes(S.rosterQ.toLowerCase()));
  if (S.rosterStatus !== 'all') list = list.filter(a => a.status === S.rosterStatus);
  if (S.rosterSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (S.rosterSort === 'autonomy') list.sort((a, b) => b.autonomy - a.autonomy);
  else list.sort((a, b) => (a.status === 'working' ? 0 : a.status === 'review' ? 1 : 2) - (b.status === 'working' ? 0 : b.status === 'review' ? 1 : 2));
  return (
    <>
      <div className="filters">
        <input placeholder="Search agents…" value={S.rosterQ} onChange={e => setRosterQ(e.target.value)} />
        <select value={S.rosterStatus} onChange={e => setRosterStatus(e.target.value)}>
          <option value="all">All statuses</option><option value="working">Working</option><option value="review">In review</option><option value="idle">Idle</option>
        </select>
        <select value={S.rosterSort} onChange={e => setRosterSort(e.target.value)}>
          <option value="name">Sort: Name</option><option value="status">Sort: Status</option><option value="autonomy">Sort: Autonomy</option>
        </select>
        <button className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={() => openModal({ type: 'add' })}><Icon name="plus" size={12} />Add agent</button>
      </div>
      <div className="roster-grid">
        {list.map(a => (
          <div className="r-card" key={a.id}>
            <div className="rc-top"><BlobAvatar a={a} size={44} /><div><b>{a.name}</b><div className="rd">{a.domain}</div></div><span className={`dot ${a.status}`} style={{ marginLeft: 'auto' }} /></div>
            <div className="rc-model">{a.model} · via {a.provider} · autonomy {a.autonomy}%</div>
            <div className="rc-actions">
              <button className="btn sm primary" onClick={() => void summonAgent(a.id)}>Summon</button>
              <button className="btn sm" onClick={() => openModal({ type: 'customize', id: a.id })}>Customize</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ———————————————————————— Librarian HQ ———————————————————————— */

/** Coarse pipeline position per source status — maps onto the 11 INGEST_STAGES. */
const PIPE_PROGRESS: Record<SourceStatus, number> = { queued: 1, normalized: 2, classified: 3, extracted: 4, linked: 6, indexed: 10, audited: 11 };

function LibrarianTask() {
  const lib = byId('librarian');
  const outRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = outRef.current; if (el) el.scrollTop = el.scrollHeight; }, [lib?.output.length]);
  if (!lib) return <div className="empty"><Icon name="bot" size={22} />Librarian agent not found on the neural rail.</div>;
  // capture the task into a const so narrowing survives the map() closure (TS18047)
  const task = lib.task;
  const pct = task ? Math.round(100 * task.stepsDone / task.steps.length) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
      <div className="p-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <BlobAvatar a={lib} size={46} />
          <div style={{ flex: 1, minWidth: 150 }}>
            <b style={{ fontSize: 14 }}>{lib.name}</b>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lib.domain}</div>
          </div>
          <span className={`p-status ${lib.status}`}><span className={`dot ${lib.status}`} />{lib.status}</span>
          <span className="chip" style={{ borderColor: lib.color + '66', color: lib.color }}>{lib.model}</span>
        </div>
      </div>
      <div className="p-card">
        <h4><Icon name="clock" size={12} />Current task</h4>
        {task ? (
          <>
            <div id="p-task-title">{task.title}</div>
            <div>{task.steps.map((s, i) => (
              <div key={i} className={`step ${i < task.stepsDone ? 'done' : i === task.stepsDone && lib.status === 'working' ? 'cur' : ''}`}>
                <span className="sic">{i < task.stepsDone ? <Icon name="check" size={10} /> : null}</span>{s.label}
              </div>
            ))}</div>
            <div className="prog"><i style={{ width: `${pct}%` }} /></div>
          </>
        ) : (
          <><div id="p-task-title">Awaiting directive</div><div className="step"><span className="sic" />Idle — autonomy {lib.autonomy}%</div><div className="prog"><i style={{ width: 0 }} /></div></>
        )}
      </div>
      <div className="p-card">
        <h4><Icon name="terminal" size={12} />Live output</h4>
        <div id="p-output" ref={outRef}>
          {lib.output.length ? lib.output.map((l, i) => (
            <div key={i} className={`ln ${l.cls || ''}`}>{l.cls === 'agent' ? <span className="agent" style={{ color: lib.color }}>{l.text}</span> : l.text}</div>
          )) : <div className="ln info">› awaiting pipeline events…</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary sm" onClick={runAudit}><Icon name="audit" size={12} />Run audit</button>
        <button className="btn sm" onClick={() => openModal({ type: 'ingest' })}><Icon name="plus" size={12} />Ingest source</button>
      </div>
    </div>
  );
}

function LibrarianWiki({ hit }: { hit: BrainSearchResult | null }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [preview, setPreview] = useState<WikiPage | null>(null);
  const low = q.trim().toLowerCase();
  const base: WikiPage[] = hit ? hit.pages : S.wiki;
  const pages = base.filter(w =>
    (type === 'all' || w.type === type) &&
    (!low || w.title.toLowerCase().includes(low) || w.summary.toLowerCase().includes(low) || w.type.toLowerCase().includes(low))
  );
  const backlinks = preview ? S.wiki.filter(w => w !== preview && w.links.includes(preview.title)) : [];
  const cited = preview ? (preview.citations || []).flatMap(c => { const s = S.sources.find(x => x.id === c); return s ? [s] : []; }) : [];

  if (preview) return (
    <div className="p-card" style={{ maxWidth: 760 }}>
      <div id="w-preview">
        <button className="btn sm" onClick={() => setPreview(null)}><Icon name="chevL" size={12} />All pages</button>
        <h5 style={{ marginTop: 10 }}>{preview.title}</h5>
        <span className="wt" style={{ color: WIKI_TYPES[preview.type] || '#22d3ee', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>{preview.type}</span>
        {preview.deprecated && <span className="dep-badge" style={{ marginLeft: 8, fontSize: 8, fontWeight: 700, letterSpacing: '.06em', color: 'var(--warn)', textTransform: 'uppercase' }}>deprecated</span>}
        <p style={{ marginTop: 8 }}>{preview.summary}</p>
        <div className="bl-sec">
          <small>Links</small>
          <div className="links">
            {preview.links.map(l => {
              const t = S.wiki.find(w => w.title === l);
              return t
                ? <button key={l} className="chip" style={{ fontSize: 10, cursor: 'pointer' }} title={`Open ${l}`} onClick={() => setPreview(t)}>{l}</button>
                : <span key={l} className="chip" style={{ fontSize: 10, opacity: .5 }} title="Missing page">{l}</span>;
            })}
            {!preview.links.length && <span style={{ fontSize: 10.5, color: 'var(--dim)' }}>No outbound links</span>}
          </div>
        </div>
        <div className="bl-sec">
          <small>Backlinks</small>
          <div className="links">
            {backlinks.map(b => <button key={b.title} className="chip" style={{ fontSize: 10, cursor: 'pointer' }} title={`Open ${b.title}`} onClick={() => setPreview(b)}>{b.title}</button>)}
            {!backlinks.length && <span style={{ fontSize: 10.5, color: 'var(--dim)' }}>No backlinks yet</span>}
          </div>
        </div>
        <div className="ct-sec">
          <small>Cites raw sources</small>
          {cited.length ? cited.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', flexWrap: 'wrap' }}>
              <span className="sr-raw"><Icon name="db" size={9} />raw</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.title}</span>
              <span style={{ fontSize: 9, color: 'var(--dim)' }}>{SOURCE_KINDS[s.kind].label}</span>
            </div>
          )) : <div style={{ fontSize: 10.5, color: 'var(--dim)' }}>Synthesized — no direct citations</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {!preview.deprecated && <button className="btn danger sm" onClick={() => deprecatePage(preview.title)}><Icon name="trash" size={12} />Deprecate page</button>}
          <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 'auto' }}>Derived layer · maintained by Chief Librarian · never the source of truth</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="filters">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter pages — title, summary, type…" aria-label="Filter wiki pages" />
        <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['all', ...Object.keys(WIKI_TYPES)].map(t => <button key={t} className={`fchip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>{t}</button>)}
        </span>
        <button className="btn sm primary" style={{ marginLeft: 'auto' }} onClick={() => openModal({ type: 'wiki-page' })}><Icon name="plus" size={12} />Create page from synthesis</button>
      </div>
      <div id="w-list" style={{ maxWidth: 760 }}>
        {pages.map((w, i) => (
          <button className={`wpage ${w.deprecated ? 'dep' : ''}`} key={i} onClick={() => setPreview(w)}>
            <span className="wt" style={{ color: WIKI_TYPES[w.type] || '#22d3ee', borderColor: (WIKI_TYPES[w.type] || '#22d3ee') + '55', background: (WIKI_TYPES[w.type] || '#22d3ee') + '12' }}>{w.type}</span>
            <b>{w.title}</b>
            {w.deprecated && <span className="dep-badge">deprecated</span>}
            <span>{w.updated}</span>
          </button>
        ))}
        {!pages.length && <div className="empty"><Icon name="book" size={22} />{hit ? 'No wiki pages match the query.' : (low || type !== 'all') ? 'No pages match this filter.' : 'No wiki pages yet. Ingest a source to grow the wiki.'}</div>}
      </div>
    </>
  );
}

function LibrarianSources({ hit }: { hit: BrainSearchResult | null }) {
  const pending = S.sources.find(s => s.status !== 'audited');
  const done = pending ? PIPE_PROGRESS[pending.status] : 11;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: 13 }}>Raw sources · immutable</b>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>Raw sources are immutable — preserved in raw/, never edited after creation.</div>
        </div>
        <button className="btn primary sm" onClick={() => openModal({ type: 'ingest' })}><Icon name="plus" size={12} />Add source</button>
      </div>

      {pending && (
        <div className="p-card">
          <h4><Icon name="merge" size={12} />Ingestion pipeline — {pending.title}</h4>
          <div className="pipe">
            {INGEST_STAGES.map((st, i) => (
              <Fragment key={st}>
                {i > 0 && <span className={`pipe-link ${i <= done ? 'done' : ''}`} />}
                <div className={`pipe-stage ${i < done ? 'done' : i === done ? 'run' : ''}`}>
                  <span className="ps-dot">{i < done ? <Icon name="check" size={10} /> : null}</span>
                  <span className="ps-lbl">{st}</span>
                </div>
              </Fragment>
            ))}
          </div>
          <div className="gov-note" style={{ marginTop: 4 }}>raw preserved · entities extracted · wiki + graph + index synced</div>
        </div>
      )}

      {hit ? (
        <div className="empty"><Icon name="db" size={22} />Search covers the wiki, artifacts and agents. Raw sources stay immutable — clear the query to browse them.</div>
      ) : S.sources.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {S.sources.map(s => (
            <div className="src-row" key={s.id}>
              <span className="sr-ic"><Icon name={SOURCE_KINDS[s.kind]?.icon || 'db'} size={14} /></span>
              <div className="sr-tx">
                <b>{s.title}</b>
                <small>{s.note}</small>
                <span className="sr-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="sr-kind">{SOURCE_KINDS[s.kind]?.label ?? s.kind}</span>
                  <span className="sr-raw">raw · immutable</span>
                  <span>{s.created}</span>
                  <span className={`sr-status ${s.status}`}>{s.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty"><Icon name="db" size={22} />No raw sources yet. Ingest a source to seed the Brain.</div>
      )}

      <div className="k-col">
        <header><Icon name="box" size={12} />Artifacts · studio outputs</header>
        <div className="col-body">
          {S.artifacts.length ? S.artifacts.map(x => {
            const st = x.state === 'pending' ? 'var(--warn)' : 'var(--ok)';
            return (
              <div className="art-row" key={x.id}>
                <span className="ar-ic" style={{ color: st, background: `color-mix(in srgb, ${st} 9%, transparent)` }}><Icon name="file" size={14} /></span>
                <div className="ar-tx"><b>{x.title}</b><small>{x.agentName} · {x.kind} · {x.created}</small></div>
                <span className={`ar-state ${x.state}`}>{x.state}</span>
              </div>
            );
          }) : <div className="empty"><Icon name="box" size={22} />No artifacts yet. Studio outputs land here for Librarian review.</div>}
          <div className="k-note">Every studio output becomes an artifact. Artifacts flow to the Chief Librarian before entering the Brain — no studio writes knowledge directly.</div>
        </div>
      </div>
    </div>
  );
}

function LibrarianAudit() {
  const [filter, setFilter] = useState<'all' | AuditFinding['status']>('all');
  const open = S.findings.filter(f => f.status === 'open').length;
  const resolved = S.findings.filter(f => f.status === 'resolved').length;
  const dismissed = S.findings.filter(f => f.status === 'dismissed').length;
  const list = filter === 'all' ? S.findings : S.findings.filter(f => f.status === filter);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 1150 }}>
      <div className="filters" style={{ marginBottom: 0 }}>
        <button className="btn primary sm" onClick={runAudit}><Icon name="audit" size={12} />Run audit</button>
        <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['all', 'open', 'resolved', 'dismissed'] as const).map(f => <button key={f} className={`fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dim)' }}>{open} open · {resolved} resolved · {dismissed} dismissed — findings never touch raw sources</span>
      </div>
      {list.length ? list.map(f => (
        <div className={`aud-row ${f.status !== 'open' ? f.status : ''}`} key={f.id}>
          <span className="ad-ic"><Icon name={FINDING_META[f.kind].icon} size={14} /></span>
          <div className="ad-tx">
            <b>{f.target}</b>
            <small>{f.detail}</small>
            <span className="aud-kind" style={{ color: 'var(--muted)', borderColor: 'var(--line2)' }}>{FINDING_META[f.kind].label}</span>
            <span className={`aud-kind sev-${f.severity}`} style={{ marginLeft: 4 }}>{f.severity}</span>
          </div>
          <div className="ad-acts">
            {f.status === 'open' ? (
              <>
                <button className="icon-btn" style={{ width: 28, height: 28 }} title="Resolve" onClick={() => resolveFinding(f.id)}><Icon name="check" size={13} /></button>
                <button className="icon-btn" style={{ width: 28, height: 28 }} title="Dismiss" onClick={() => dismissFinding(f.id)}><Icon name="x" size={13} /></button>
              </>
            ) : <span className="chip">{f.status}</span>}
          </div>
        </div>
      )) : (
        <div className="empty"><Icon name="audit" size={22} />{S.findings.length ? `No ${filter} findings.` : 'No findings — run an audit to scan the wiki.'}</div>
      )}
    </div>
  );
}

function Knowledge() {
  const [tab, setTab] = useState<KnowledgeTab>('wiki');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<BrainSearchResult | null>(null);
  const req = useRef(0);

  const onQuery = async (v: string) => {
    setQ(v);
    const term = v.trim();
    if (!term) { setHits(null); return; }
    const id = ++req.current;
    const r = await searchBrain(term);
    if (req.current === id) setHits(r); // ignore stale responses
  };

  const query = q.trim();
  const hit = query !== '' && hits !== null && hits.query === query ? hits : null;

  return (
    <>
      <div className="k-head-row">
        <label className="k-search">
          <Icon name="search" size={14} />
          <input value={q} onChange={e => void onQuery(e.target.value)} placeholder="Search the brain — wiki, artifacts, agents…" aria-label="Search the brain" />
        </label>
        <div className="k-tabs">
          <button className={tab === 'task' ? 'on' : ''} onClick={() => setTab('task')}>Task</button>
          <button className={tab === 'wiki' ? 'on' : ''} onClick={() => setTab('wiki')}>Wiki<span className="k-count">{S.wiki.length}</span></button>
          <button className={tab === 'sources' ? 'on' : ''} onClick={() => setTab('sources')}>Sources<span className="k-count">{S.sources.length}</span></button>
          <button className={tab === 'graph' ? 'on' : ''} onClick={() => setTab('graph')}>Graph</button>
          <button className={tab === 'audit' ? 'on' : ''} onClick={() => setTab('audit')}>Audit<span className="k-count">{S.findings.filter(f => f.status === 'open').length}</span></button>
        </div>
      </div>

      {tab === 'task' && <LibrarianTask />}
      {tab === 'wiki' && <LibrarianWiki key={query} hit={hit} />}
      {tab === 'sources' && <LibrarianSources hit={hit} />}
      {tab === 'graph' && <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}><GraphView /></div>}
      {tab === 'audit' && <LibrarianAudit />}
    </>
  );
}

/** The Librarian HQ board — embedded as the Knowledge center mode in the War Room. */
export function KnowledgeBoard() { return <Knowledge />; }

/* ———————————————————————— Settings ———————————————————————— */

function ThemePreview({ t }: { t: Theme }) {
  return (
    <div className="tc-preview" style={{ background: t.bg }}>
      <i style={{ left: '6%', top: '14%', width: '26%', height: '72%', background: t.sf, border: `1px solid ${t.ac}33` }} />
      <i style={{ left: '38%', top: '14%', width: '56%', height: '30%', background: t.ac, opacity: .9 }} />
      <i style={{ left: '38%', top: '52%', width: '26%', height: '34%', background: t.sf, border: `1px solid ${t.ac}33` }} />
      <i style={{ left: '68%', top: '52%', width: '26%', height: '34%', background: t.ac2, opacity: .75 }} />
    </div>
  );
}

function ProviderRow({ p }: { p: Provider }) {
  return (
    <div className="prov" key={p.id}>
      <div className="pv-ic" style={{ background: p.color + '22', color: p.color, border: `1px solid ${p.color}55` }}><Icon name={p.icon} size={15} /></div>
      <div className="pv-info"><b>{p.name}</b><small>{describeMode(p.apiMode)} · {p.baseUrl}</small></div>
      <span className={`pv-health ${p.connected ? p.health : 'offline'}`} title={p.connected ? p.health : 'offline'} />
      <span className="pv-mode">{p.models.length} model{p.models.length === 1 ? '' : 's'}</span>
      <button className={`switch ${p.connected ? 'on' : ''}`} onClick={() => gatewayToggleProvider(p.id)} aria-label={`Toggle ${p.name}`} />
      {p.custom && <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeProvider(p.id)} title="Remove"><Icon name="trash" size={12} /></button>}
    </div>
  );
}

function ProviderGroup({ label, list }: { label: string; list: Provider[] }) {
  return (
    <>
      <div className="pg-head">{label}<span className="chip">{list.length}</span></div>
      {list.length ? list.map(p => <ProviderRow key={p.id} p={p} />) : <div className="set-note">No {label.toLowerCase()} wired yet.</div>}
    </>
  );
}

function Settings() {
  const [pn, setPn] = useState('');
  const [pu, setPu] = useState('');
  const [pm, setPM] = useState<ApiMode>('chat-completions');
  const [pmod, setPMod] = useState('');
  const [pcw, setPCW] = useState('');
  const [pk, setPk] = useState('');
  const [fbAdd, setFbAdd] = useState('');
  const groups = providerGroups();
  const modelOpts = allModels().map(m => <option key={m.provider.id + m.model} value={m.model}>{m.model} — {m.provider.name}</option>);
  const profile = S.modelProfile;
  const fbCandidates = allModels().filter(m => !profile.fallbackModels.includes(m.model) && m.model !== profile.mainModel && m.model !== profile.auxiliaryModel);

  const wire = () => {
    const ok = addCustomEndpoint({ name: pn, url: pu, apiMode: pm, defaultModel: pmod, contextWindow: pcw ? +pcw : undefined, apiKeyRef: pk });
    if (ok) { setPn(''); setPu(''); setPMod(''); setPCW(''); setPk(''); }
  };

  return (
    <div className="set-grid">
      <div className="set-card wide">
        <h3><Icon name="palette" size={13} />Appearance · theme presets</h3>
        <div className="appearance-grid">
          {THEMES.map(t => (
            <button key={t.id} className={`theme-card ${S.settings.theme === t.id ? 'on' : ''}`} onClick={() => applyTheme(t.id)}>
              <ThemePreview t={t} />
              <b>{t.name}</b><small>{t.desc}</small>
              {S.settings.theme === t.id && <span className="tc-check"><Icon name="check" size={10} /></span>}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="frow"><label>Glow intensity <b>{S.settings.glow.toFixed(2)}×</b></label><input type="range" min="0" max="1.5" step="0.05" value={S.settings.glow} onChange={e => setSetting('glow', +e.target.value)} /></div>
          <div className="frow"><label>Particle density <b>{S.settings.density.toFixed(2)}×</b></label><input type="range" min="0.3" max="1.5" step="0.05" value={S.settings.density} onChange={e => setSetting('density', +e.target.value)} /></div>
          <div className="frow"><label>Simulation speed <b>{S.settings.speed}×</b></label><input type="range" min="0.5" max="2" step="0.25" value={S.settings.speed} onChange={e => setSetting('speed', +e.target.value)} /></div>
        </div>
      </div>

      <div className="set-card">
        <h3><Icon name="plug" size={13} />Providers · gateway</h3>
        <ProviderGroup label="Accounts" list={groups.accounts} />
        <ProviderGroup label="API keys" list={groups.apiKeys} />
        <ProviderGroup label="Custom endpoints" list={groups.custom} />
        <ProviderGroup label="Local models" list={groups.local} />
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 12 }}>
          <div className="frow"><label>Endpoint name</label><input value={pn} onChange={e => setPn(e.target.value)} placeholder="e.g. opencode/zen" /></div>
          <div className="frow"><label>Endpoint URL</label><input value={pu} onChange={e => setPu(e.target.value)} placeholder="https://…/v1" /></div>
          <div className="frow"><label>API mode</label><select value={pm} onChange={e => setPM(e.target.value as ApiMode)}>{API_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
          <div className="frow"><label>Default model</label><input value={pmod} onChange={e => setPMod(e.target.value)} placeholder="e.g. zen-maverick" /></div>
          <div className="frow"><label>Context window</label><input value={pcw} onChange={e => setPCW(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 200000" inputMode="numeric" /></div>
          <div className="frow"><label>API key ref</label><input type="password" value={pk} onChange={e => setPk(e.target.value)} placeholder="${CORTEX_API_KEY}" /></div>
          <button className="btn primary sm" onClick={wire} disabled={!pn.trim() || !/^https?:\/\/.+/.test(pu.trim())}><Icon name="plus" size={12} />Wire endpoint</button>
          <div className="set-note">Keys are stored as reference labels only — never raw. Real credentials live behind the server-side gateway route in live mode.</div>
        </div>
      </div>

      <div className="set-card">
        <h3><Icon name="cpu" size={13} />Model · routing profile</h3>
        <div className="frow"><label>Main model</label><select value={profile.mainModel} onChange={e => updateModelProfile({ mainModel: e.target.value })}>{modelOpts}</select></div>
        <div className="frow"><label>Auxiliary model <b style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}>extraction</b></label><select value={profile.auxiliaryModel} onChange={e => updateModelProfile({ auxiliaryModel: e.target.value })}>{modelOpts}</select></div>
        <div className="pg-head">Fallback chain<span className="chip">{profile.fallbackModels.length}</span></div>
        <div className="fb-chain">
          <div className="fb-step"><span className="fb-idx">★</span><b>{profile.mainModel}</b><span className="fb-prov">{providerOfModel(profile.mainModel)?.name ?? '—'}</span></div>
          {profile.fallbackModels.map((m, i) => (
            <div className="fb-step" key={m + i}>
              <span className="fb-idx">{i + 1}</span>
              <b>{m}</b>
              <span className="fb-prov">{providerOfModel(m)?.name ?? '—'}</span>
              <button className="icon-btn" onClick={() => updateModelProfile({ fallbackModels: profile.fallbackModels.filter((_, j) => j !== i) })} title="Remove from chain"><Icon name="x" size={11} /></button>
            </div>
          ))}
          <div className="fb-add">
            <select value={fbAdd} onChange={e => setFbAdd(e.target.value)}>
              <option value="">Add fallback…</option>
              {fbCandidates.map(m => <option key={m.provider.id + m.model} value={m.model}>{m.model} — {m.provider.name}</option>)}
            </select>
            <button className="btn sm" disabled={!fbAdd || profile.fallbackModels.length >= 4} onClick={() => { if (fbAdd) { updateModelProfile({ fallbackModels: [...profile.fallbackModels, fbAdd] }); setFbAdd(''); } }}><Icon name="plus" size={11} />Add</button>
          </div>
        </div>
        <div className="set-note">If the primary provider is offline, directives walk this chain — visibly, in the activity feed and the agent terminal.</div>
      </div>

      <div className="set-card">
        <h3><Icon name="bot" size={13} />Per-agent routing</h3>
        {S.agents.map(a => (
          <div className="route-row" key={a.id}>
            <span className="rdot" style={{ background: a.color }} />
            <span className="rr-name">{a.name}</span>
            <span className="rr-prov">{providerOfModel(a.model)?.name ?? a.provider}</span>
            <select value={a.model} onChange={e => void routeModel(a.id, e.target.value)}>{modelOpts}</select>
          </div>
        ))}
      </div>

      <div className="set-card">
        <h3><Icon name="gear" size={13} />Experience</h3>
        <div className="frow"><label>Sound effects</label><button className={`switch ${S.settings.sound ? 'on' : ''}`} onClick={() => setSetting('sound', !S.settings.sound)} aria-label="Toggle sound effects" /></div>
        <div className="frow"><label>Node labels</label><button className={`switch ${S.settings.labels ? 'on' : ''}`} onClick={() => setSetting('labels', !S.settings.labels)} aria-label="Toggle node labels" /></div>
        <div className="frow"><label>Data-flow pulses</label><button className={`switch ${S.settings.flow ? 'on' : ''}`} onClick={() => setSetting('flow', !S.settings.flow)} aria-label="Toggle data-flow pulses" /></div>
        <div className="frow"><label>Ambient particles</label><button className={`switch ${S.settings.fx ? 'on' : ''}`} onClick={() => setSetting('fx', !S.settings.fx)} aria-label="Toggle ambient particles" /></div>
      </div>

      <div className="set-card">
        <h3><Icon name="layers" size={13} />Data</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>Customizations, custom agents, dock order, providers, model profile, harness sessions and MCP connectors persist locally. Reset restores the seeded Solar CRM council.</p>
        <button className="btn danger sm" onClick={() => openModal({ type: 'confirm', title: 'Reset all demo data?', body: 'Customizations, custom agents, wired endpoints, sessions and connectors will be cleared. The seeded Solar CRM council is restored.', action: resetDemoData })}><Icon name="trash" size={12} />Reset demo data</button>
      </div>
    </div>
  );
}

/* ———————————————————————— root ———————————————————————— */

export default function Overlays() {
  useCortex();
  const kind = S.overlay;
  if (!kind) return null;
  // Constitution v2: War Room + Harness are center modes / dock tabs inside the
  // War Room shell — the overlay hosts Roster, Librarian HQ and Settings only.
  const title = kind === 'roster' ? 'AGENT ROSTER' : kind === 'knowledge' ? 'LIBRARIAN HQ' : 'SETTINGS';
  const sub = kind === 'roster' ? 'Every custodian · one brain' : kind === 'knowledge' ? 'Chief Librarian · Memory OS · derived layer, never source of truth' : 'Providers · model routing · experience';
  const icon = kind === 'roster' ? 'bot' : kind === 'knowledge' ? 'book' : 'gear';
  return (
    <div id="overlay">
      <div className="ov-head">
        <div className="ov-ic"><Icon name={icon} size={16} /></div>
        <div><h2>{title}</h2><small>{sub}</small></div>
        <button className="icon-btn" onClick={closeOverlay} title="Close"><Icon name="x" size={15} /></button>
      </div>
      <div id="ov-body">{kind === 'roster' ? <Roster /> : kind === 'knowledge' ? <Knowledge /> : <Settings />}</div>
    </div>
  );
}
