// graph-view.tsx — SVG knowledge-graph renderer (deterministic ring layout,
// no physics loop). Projects every memory layer — project, agents, sources,
// wiki pages, artifacts, entities, concepts — into one navigable graph.
'use client';
import { useState } from 'react';
import { S, useCortex, buildGraph, subgraph, type GraphNodeKind, type GraphVNode } from './cortex';
import { Icon } from './icons';

const NODE_R: Record<GraphNodeKind, number> = { project: 16, agent: 10, source: 9, wikipage: 9, artifact: 8, entity: 7, concept: 7 };
/** Ring assignment by kind: agents hug the center, sources + artifacts ring 2, wiki/entities/concepts ring 3. */
const RING: Record<GraphNodeKind, number> = { project: 1, agent: 1, source: 2, artifact: 2, wikipage: 3, entity: 3, concept: 3 };
const RING_R = [0, 130, 210, 290];
const KIND_C: Record<GraphNodeKind, string> = { project: '#8b5cf6', agent: '#4f8cff', source: '#f59e0b', wikipage: '#22d3ee', artifact: '#34d399', entity: '#60a5fa', concept: '#f472b6' };
const LEGEND: [string, string][] = [
  ['Project', '#8b5cf6'], ['Agent', '#4f8cff'], ['Source', '#f59e0b'], ['Wiki page', '#22d3ee'],
  ['Artifact', '#34d399'], ['Entity', '#60a5fa'], ['Concept', '#f472b6']
];
const RELS = ['CONTAINS', 'REFERENCES', 'DERIVED_FROM', 'CREATED_BY', 'OWNS'];

export default function GraphView() {
  useCortex();
  const [center, setCenter] = useState<string | null>(null);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [hover, setHover] = useState<string | null>(null);

  const full = buildGraph();
  // a focused node may vanish (page deprecated, source trimmed) — fall back to the full graph
  const effCenter = center && full.nodes.some(n => n.id === center) ? center : null;
  const { nodes, edges } = effCenter ? subgraph(effCenter, depth) : full;

  if (!nodes.length) return (
    <div className="graph-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 480 }}>
      <div className="empty" style={{ margin: 'auto' }}><Icon name="network" size={22} />No graph yet — ingest a source to project one.</div>
    </div>
  );

  // deterministic layout — the focused node (else the project) anchors the center, everything else rings around it
  const anchor = effCenter ?? (nodes.some(n => n.id === 'p:proj') ? 'p:proj' : nodes[0].id);
  const pos: Record<string, { x: number; y: number }> = { [anchor]: { x: 450, y: 310 } };
  const rings: GraphVNode[][] = [[], [], []];
  nodes.filter(n => n.id !== anchor).forEach(n => rings[RING[n.kind] - 1].push(n));
  rings.forEach((ring, ri) => {
    const r = RING_R[ri + 1];
    ring.forEach((n, i) => {
      const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      pos[n.id] = { x: 450 + r * Math.cos(a), y: 310 + r * Math.sin(a) };
    });
  });

  const colorOf = (n: GraphVNode) => n.kind === 'agent'
    ? (S.agents.find(a => 'ag:' + a.id === n.id)?.color ?? '#4f8cff')
    : KIND_C[n.kind];

  // focus = hovered node, else the selected center — highlights its edges + dims non-adjacent nodes
  const focusId = hover ?? effCenter;
  const near = new Set<string>(focusId ? [focusId] : []);
  if (focusId) edges.forEach(e => { if (e.from === focusId) near.add(e.to); if (e.to === focusId) near.add(e.from); });

  const pick = (id: string) => setCenter(id === effCenter ? null : id);

  return (
    <div className="graph-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 480 }}>
      <div className="g-hud">
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)' }}>Focus</span>
        <select value={effCenter ?? ''} onChange={e => setCenter(e.target.value || null)} aria-label="Focus a node">
          <option value="">Full graph</option>
          {full.nodes.filter(n => n.kind === 'source' || n.kind === 'artifact' || n.kind === 'wikipage').map(n => (
            <option key={n.id} value={n.id}>{n.kind === 'source' ? 'Source' : n.kind === 'artifact' ? 'Artifact' : 'Wiki'} — {n.label}</option>
          ))}
        </select>
        <select value={depth} onChange={e => setDepth(e.target.value === '2' ? 2 : 1)} disabled={!effCenter} aria-label="Hop depth">
          <option value={1}>1 hop</option>
          <option value={2}>2 hops</option>
        </select>
        <span className="chip">{nodes.length} nodes · {edges.length} edges</span>
        {effCenter && <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setCenter(null)} title="Clear focus"><Icon name="x" size={11} /></button>}
      </div>
      <svg className="graph-svg" viewBox="0 0 900 620" preserveAspectRatio="xMidYMid meet" style={{ flex: 1, minHeight: 380 }} role="img" aria-label="Knowledge graph">
        {edges.map((e, i) => {
          const a = pos[e.from]; const b = pos[e.to];
          if (!a || !b) return null;
          const hl = !!focusId && (e.from === focusId || e.to === focusId);
          return (
            <g key={'e' + i}>
              <line className={`gedge ${hl ? 'hl' : ''}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              {hl && <text className="g-edge-label" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle">{e.rel}</text>}
            </g>
          );
        })}
        {nodes.map(n => {
          const p = pos[n.id]; if (!p) return null;
          const r = NODE_R[n.kind];
          const meta = (n.kind === 'source' || n.kind === 'wikipage' || n.kind === 'agent') && n.meta
            ? (n.meta.length > 18 ? n.meta.slice(0, 17) + '…' : n.meta) : null;
          return (
            <g key={n.id} className={`gnode ${n.id === effCenter ? 'sel' : ''} ${focusId && !near.has(n.id) ? 'dim' : ''}`}
              transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`Focus ${n.label}`}
              onClick={() => pick(n.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n.id); } }}
              onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
              <circle r={r} fill={colorOf(n)} />
              <text y={r + 12} textAnchor="middle">{n.label.length > 16 ? n.label.slice(0, 15) + '…' : n.label}</text>
              {meta && <text className="gmeta" y={r + 22} textAnchor="middle">{meta}</text>}
            </g>
          );
        })}
      </svg>
      <div className="g-legend">
        {LEGEND.map(([l, c]) => <span className="gl-item" key={l}><i style={{ background: c }} />{l}</span>)}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: '.04em' }}>{RELS.join(' · ')}</span>
      </div>
    </div>
  );
}
