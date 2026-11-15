// neural-canvas.tsx — NeuralCanvas: the animated neural map
// (MainBrain at the center, Librarian + phase custodians orbiting, live wires,
//  data pulses, pan/zoom, hover tooltips, click-to-summon, canvas toolbar)
// Ported from the RAYBRAIN-OS Vite slice into the Next.js runtime:
//  - SSR-safe: prefers-reduced-motion is resolved inside the mount effect
//  - display font is read from --font-disp (next/font family chain) in readTheme()
//  - summoning routes through the async cortex-adapter instead of the store
'use client';
import { useEffect, useRef } from 'react';
import { S, useCortex, byId, setSetting, sfx, SHAPES, type Agent } from './cortex';
import { Icon } from './icons';
import { summonAgent } from '@/lib/cortex-adapter';

type View = { zoom: number; pan: { x: number; y: number }; target: { x: number; y: number }; hover: Agent | null; dragging: boolean; dragStart: any; moved: number };

export default function NeuralCanvas() {
  useCortex();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ zoom: 1, pan: { x: 0, y: 0 }, target: { x: 0, y: 0 }, hover: null, dragging: false, dragStart: null, moved: 0 });
  const themeRef = useRef<any>({});
  const brainRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<Record<string, HTMLCanvasElement>>({});
  const pulsesRef = useRef<any[]>([]);
  const starsRef = useRef<any[]>([]);
  const spawnRef = useRef<Record<string, number>>({});
  const sizeRef = useRef({ W: 0, H: 0, CX: 0, CY: 0, DPR: 1, k: 1 });
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const rmRef = useRef(false); // prefers-reduced-motion — resolved on mount (matchMedia is browser-only)
  const paths = useRef<Record<string, Path2D>>({});

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const g = (k: string) => cs.getPropertyValue(k).trim();
    // --font-disp lives on the .cortex-os root (next/font family chain);
    // try documentElement first, then fall back to the .cortex-os element.
    let dispFont = g('--font-disp');
    if (!dispFont) { const os = document.querySelector('.cortex-os'); if (os) dispFont = getComputedStyle(os).getPropertyValue('--font-disp').trim(); }
    themeRef.current = { star: g('--cv-star'), ring: g('--cv-ring'), label: g('--cv-label'), label2: g('--cv-label2'), brain1: g('--cv-brain1'), brain2: g('--cv-brain2'), brain3: g('--cv-brain3'), fissure: g('--cv-fissure'), glow: parseFloat(g('--glow')) || 1, light: parseFloat(g('--is-light')) === 1, dispFont: dispFont || '"Space Grotesk",sans-serif' };
  }
  function glowSprite(color: string) {
    if (glowRef.current[color]) return glowRef.current[color];
    const s = document.createElement('canvas'); s.width = s.height = 128;
    const c = s.getContext('2d')!;
    const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, color + 'cc'); gr.addColorStop(.4, color + '44'); gr.addColorStop(1, color + '00');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    glowRef.current[color] = s; return s;
  }
  function makeBrain() {
    readTheme();
    const T = themeRef.current;
    const s = document.createElement('canvas'); s.width = s.height = 360;
    const c = s.getContext('2d')!;
    c.translate(180, 178); c.scale(1.5, 1.5); c.translate(-100, -80);
    const p = new Path2D('M100 18 C60 10 30 34 28 62 C12 70 12 96 30 104 C30 128 58 146 84 138 C92 146 108 146 116 138 C142 146 170 128 170 104 C188 96 188 70 172 62 C170 34 140 10 100 18 Z');
    c.shadowColor = T.brain2; c.shadowBlur = 34 * T.glow;
    const g = c.createLinearGradient(30, 20, 170, 140);
    g.addColorStop(0, T.brain1); g.addColorStop(.55, T.brain2); g.addColorStop(1, T.brain3);
    c.fillStyle = g; c.fill(p); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(147,197,253,.7)'; c.lineWidth = 1.4; c.stroke(p);
    c.strokeStyle = T.brain3 + '99'; c.lineWidth = 1.1;
    [[45,45,60,38,72,50],[40,70,58,62,70,74],[45,95,60,88,74,100],[55,118,68,110,80,120],[128,45,142,38,156,50],[126,72,142,62,158,74],[124,96,140,88,156,100],[120,118,134,110,146,120]].forEach(q => { c.beginPath(); c.moveTo(q[0], q[1]); c.quadraticCurveTo(q[2], q[3], q[4], q[5]); c.stroke(); });
    c.strokeStyle = T.fissure; c.beginPath(); c.moveTo(100, 20); c.bezierCurveTo(95, 60, 105, 100, 100, 140); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)';
    [[60,55],[75,90],[52,105],[130,52],[146,88],[122,112],[100,70],[88,40],[112,42]].forEach(pt => { c.beginPath(); c.arc(pt[0], pt[1], 1.4, 0, 7); c.fill(); });
    brainRef.current = s;
  }
  function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function layout() {
    const { W, H, CX, CY } = sizeRef.current;
    const orbit = S.agents.filter(a => !a.core);
    const lib = orbit.find(a => a.id === 'librarian');
    const rest = orbit.filter(a => a.id !== 'librarian');
    const ordered = lib ? [lib, ...rest] : rest;
    const n = ordered.length;
    const rx = Math.min(W * .37, 430), ry = Math.min(H * .34, 255);
    ordered.forEach((a, i) => { const ang = -Math.PI / 2 + i * (Math.PI * 2 / n); a.wx = CX + Math.cos(ang) * rx; a.wy = CY + Math.sin(ang) * ry; a.wr = 25; a.hoverT = a.hoverT || 0; });
    const mb = byId('mainbrain'); if (mb) { mb.wx = CX; mb.wy = CY; }
  }
  function fit() {
    const r = wrapRef.current!.getBoundingClientRect();
    const W = r.width, H = r.height;
    const DPR = Math.min(devicePixelRatio || 1, 2);
    // Short stages scale the whole scene down so the brain, orbit and labels never collide.
    const k = Math.max(.55, Math.min(1, H / 620));
    sizeRef.current = { W, H, CX: W / 2, CY: H / 2 + 8, DPR, k };
    const cv = canvasRef.current!;
    cv.width = W * DPR; cv.height = H * DPR;
    starsRef.current = Array.from({ length: Math.round(110 * S.settings.density) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .3, tw: Math.random() * 6.28, sp: .3 + Math.random() * .7 }));
    layout();
    // Narrow stages (mobile) start zoomed out so every orbit label clears the edges + toolbar.
    const rx = Math.min(W * .37, 430);
    if (W < 700) view.current.zoom = Math.max(.55, Math.min(1, (W / 2 - 24) / (rx + 80)));
  }
  function wirePts(a: Agent) {
    const mb = byId('mainbrain')!;
    const mx = (a.wx! + mb.wx!) / 2, my = (a.wy! + mb.wy!) / 2;
    const dx = mb.wx! - a.wx!, dy = mb.wy! - a.wy!, len = Math.hypot(dx, dy) || 1;
    const off = a.id === 'librarian' ? 0 : 26 * ((S.agents.indexOf(a) % 2) ? 1 : -1);
    return { ax: a.wx!, ay: a.wy!, cx: mx - dy / len * off, cy: my + dx / len * off, bx: mb.wx!, by: mb.wy! };
  }
  function qPoint(w: any, t: number) { const u = 1 - t; return { x: u * u * w.ax + 2 * u * t * w.cx + t * t * w.bx, y: u * u * w.ay + 2 * u * t * w.cy + t * t * w.by }; }
  function toWorld(sx: number, sy: number) { const { CX, CY } = sizeRef.current; const v = view.current; return { x: (sx - CX - v.pan.x) / v.zoom + CX, y: (sy - CY - v.pan.y) / v.zoom + CY }; }
  function hitNode(sx: number, sy: number) {
    const w = toWorld(sx, sy);
    for (const a of S.agents) { if (a.core) continue; if (Math.hypot(w.x - a.wx!, w.y - a.wy!) < (a.wr || 25) + 9) return a; }
    const mb = byId('mainbrain'); if (mb && Math.hypot(w.x - mb.wx!, w.y - mb.wy!) < Math.max(55, 78 * sizeRef.current.k)) return mb;
    return null;
  }
  function drawNode(a: Agent, t: number) {
    const c = canvasRef.current!.getContext('2d')!;
    const T = themeRef.current;
    const hov = view.current.hover === a, sum = S.summoned === a.id;
    a.hoverT = (a.hoverT || 0) + (((hov || sum) ? 1 : 0) - (a.hoverT || 0)) * .15;
    const s = (a.wr! * 2) * (1 + a.hoverT * .22);
    c.save(); c.translate(a.wx!, a.wy!);
    const gs = s * 2.5;
    c.globalAlpha = (a.status === 'working' ? .75 + .15 * Math.sin(t / 300) : .45) * T.glow * S.settings.glow;
    c.drawImage(glowSprite(a.color), -gs / 2, -gs / 2, gs, gs);
    c.globalAlpha = 1;
    if (a.status === 'working') { c.strokeStyle = a.color; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, s * .66, t / 400, t / 400 + 4.4); c.stroke(); }
    if (sum) { c.strokeStyle = a.color; c.lineWidth = 1.5; c.setLineDash([3, 5]); c.beginPath(); c.arc(0, 0, s * .78, -t / 600, -t / 600 + 6.28); c.stroke(); c.setLineDash([]); }
    c.save(); c.translate(-s / 2, -s / 2); c.scale(s / 100, s / 100);
    if (!rmRef.current) c.rotate(Math.sin(t / 900 + a.wx!) * .04);
    const path = paths.current[a.shape] || paths.current.blob;
    c.fillStyle = a.color; c.fill(path);
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2; c.stroke(path);
    c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.ellipse(35, 25, 14, 8, 0, 0, 7); c.fill();
    const blink = Math.sin(t / 1000 + a.wy!) > .985 ? .1 : 1;
    c.fillStyle = '#0a0a0a';
    [[38.75, 46], [58.75, 42]].forEach(e => { c.save(); c.translate(e[0], e[1]); c.rotate(.31); c.scale(1, blink); rr(c, -3.75, -8, 7.5, 16, 3.75); c.fill(); c.restore(); });
    c.restore();
    if (S.settings.labels) {
      const ls = .55 + .45 * sizeRef.current.k; // label offsets shrink on short stages
      // Nodes in the top half draw labels above the blob so their wire never crosses the text.
      const above = a.wy! < sizeRef.current.CY - 60;
      const ny = above ? -(s * .72 + 22) * ls - 2 : (s * .72 + 12) * ls;
      const dy = above ? -(s * .72 + 22) * ls + 10 : (s * .72 + 24) * ls;
      c.textAlign = 'center'; c.font = '700 11px ' + T.dispFont;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillText(a.name.toUpperCase(), 1, ny + 1);
      c.fillStyle = hov || sum ? T.label : T.label; c.fillText(a.name.toUpperCase(), 0, ny);
      c.font = '500 8.5px ' + T.dispFont; c.fillStyle = T.label2;
      c.fillText(a.domain.split('·')[0].trim(), 0, dy);
    }
    c.restore();
  }
  function frame(t: number) {
    rafRef.current = requestAnimationFrame(frame);
    const dt = Math.min(t - lastRef.current, 50); lastRef.current = t;
    const v = view.current;
    const RM = rmRef.current;
    v.pan.x += (v.target.x - v.pan.x) * .08; v.pan.y += (v.target.y - v.pan.y) * .08;
    const { W, H, CX, CY, DPR } = sizeRef.current;
    const c = canvasRef.current!.getContext('2d')!;
    const T = themeRef.current;
    c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
    if (S.settings.fx) {
      starsRef.current.forEach(s => { const al = (.25 + .45 * Math.abs(Math.sin(t / 1400 * s.sp + s.tw))) * (T.light ? .5 : 1); c.globalAlpha = al; c.fillStyle = T.star; c.beginPath(); c.arc(s.x + v.pan.x * .25, s.y + v.pan.y * .25, s.r, 0, 7); c.fill(); });
      c.globalAlpha = 1;
    }
    c.save(); c.translate(CX + v.pan.x, CY + v.pan.y); c.scale(v.zoom, v.zoom); c.translate(-CX, -CY);
    const k = sizeRef.current.k;
    const mb = byId('mainbrain')!;
    c.strokeStyle = T.ring; c.lineWidth = 1;
    [150, 230, 310].forEach(r => { c.beginPath(); c.arc(mb.wx!, mb.wy!, r * k, 0, 7); c.stroke(); });
    S.agents.filter(a => !a.core).forEach(a => {
      const w = wirePts(a); const work = a.status === 'working';
      c.strokeStyle = a.color + (work ? (T.light ? '88' : '55') : (T.light ? '44' : '26')); c.lineWidth = work ? 2 : 1.3;
      c.beginPath(); c.moveTo(w.ax, w.ay); c.quadraticCurveTo(w.cx, w.cy, w.bx, w.by); c.stroke();
      if (S.settings.flow && !S.settings.paused) {
        spawnRef.current[a.id] = (spawnRef.current[a.id] || 0) + dt;
        const rate = (work ? (RM ? 1600 : 650) : (RM ? 9000 : 4200)) / S.settings.density;
        if (spawnRef.current[a.id] > rate) { spawnRef.current[a.id] = 0; if (pulsesRef.current.length < 70) pulsesRef.current.push({ a, t: 0, sp: .00045 + Math.random() * .0003, dir: a.id === 'librarian' && Math.random() < .4 ? -1 : 1 }); }
      }
    });
    pulsesRef.current = pulsesRef.current.filter(p => {
      p.t += p.sp * dt; if (p.t >= 1 || !byId(p.a.id)) return false;
      const w = wirePts(p.a); const pt = qPoint(w, p.dir === 1 ? p.t : 1 - p.t);
      c.globalAlpha = .9 * T.glow; c.drawImage(glowSprite(p.a.color), pt.x - 11, pt.y - 11, 22, 22);
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.beginPath(); c.arc(pt.x, pt.y, 1.8, 0, 7); c.fill();
      return true;
    });
    const pulse = 1 + (RM ? 0 : .02 * Math.sin(t / 700));
    const bs = 250 * k * pulse;
    c.globalAlpha = .92 + .08 * Math.sin(t / 700);
    if (brainRef.current) c.drawImage(brainRef.current, mb.wx! - bs / 2, mb.wy! - bs / 2 - 14 * k, bs, bs);
    c.globalAlpha = 1;
    c.strokeStyle = T.ring; c.lineWidth = 1.2; c.setLineDash([5, 7]);
    c.beginPath(); c.arc(mb.wx!, mb.wy! - 10 * k, 118 * k, t / 2600, t / 2600 + 5); c.stroke();
    c.beginPath(); c.arc(mb.wx!, mb.wy! - 10 * k, 136 * k, -t / 3400, -t / 3400 + 4); c.stroke(); c.setLineDash([]);
    if (view.current.hover === mb || S.summoned === 'mainbrain') { c.strokeStyle = mb.color; c.lineWidth = 1.5; c.beginPath(); c.arc(mb.wx!, mb.wy! - 10 * k, 128 * k, 0, 7); c.stroke(); }
    if (S.settings.labels) {
      c.textAlign = 'center'; c.font = '700 15px ' + T.dispFont; c.fillStyle = T.label;
      c.shadowColor = '#000'; c.shadowBlur = 6; c.fillText('MAINBRAIN', mb.wx!, mb.wy! + 52 * k);
      c.font = '600 8.5px ' + T.dispFont; c.fillStyle = T.label2; c.fillText('T H E   C E N T E R', mb.wx!, mb.wy! + 66 * k); c.shadowBlur = 0;
    }
    S.agents.filter(a => !a.core).forEach(a => drawNode(a, t));
    c.restore();
  }

  useEffect(() => {
    rmRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Object.entries(SHAPES).forEach(([k, d]) => { paths.current[k] = new Path2D(d); });
    makeBrain(); fit();
    const cv = canvasRef.current!;
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top;
      const v = view.current;
      if (v.dragging) { v.target.x = v.dragStart.px + (e.clientX - v.dragStart.x); v.target.y = v.dragStart.py + (e.clientY - v.dragStart.y); v.moved += Math.abs(e.movementX) + Math.abs(e.movementY); return; }
      if (!rmRef.current) { v.target.x = Math.max(-40, Math.min(40, (sx - sizeRef.current.CX) * .03)); v.target.y = Math.max(-30, Math.min(30, (sy - sizeRef.current.CY) * .03)); }
      const h = hitNode(sx, sy); v.hover = h;
      cv.style.cursor = h ? 'pointer' : v.dragging ? 'grabbing' : 'grab';
      const tip = tipRef.current!;
      if (h) {
        tip.innerHTML = `<b style="color:${h.color}">${h.name}</b><div class="tt-dom">${h.domain}</div><span class="dot ${h.status}"></span> ${h.core ? 'Supervisor · project-aware' : h.status + (h.task ? ' · ' + h.task.title : '')}<div class="tt-hint">CLICK TO SUMMON</div>`;
        tip.style.left = Math.min(sx + 16, sizeRef.current.W - 230) + 'px'; tip.style.top = Math.max(8, sy - 14) + 'px'; tip.style.opacity = '1';
      } else tip.style.opacity = '0';
    };
    const down = (e: PointerEvent) => { const v = view.current; v.dragging = true; v.moved = 0; v.dragStart = { x: e.clientX, y: e.clientY, px: v.target.x, py: v.target.y }; cv.setPointerCapture(e.pointerId); };
    const up = (e: PointerEvent) => { const v = view.current; v.dragging = false; if (v.moved < 6) { const r = cv.getBoundingClientRect(); const h = hitNode(e.clientX - r.left, e.clientY - r.top); if (h) void summonAgent(h.id); } };
    const leave = () => { view.current.hover = null; tipRef.current!.style.opacity = '0'; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); view.current.zoom = Math.max(.6, Math.min(1.8, view.current.zoom * (e.deltaY < 0 ? 1.09 : .92))); };
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerdown', down); cv.addEventListener('pointerup', up); cv.addEventListener('pointerleave', leave); cv.addEventListener('wheel', wheel, { passive: false });
    const ro = new ResizeObserver(() => fit()); ro.observe(wrapRef.current!);
    lastRef.current = performance.now(); rafRef.current = requestAnimationFrame(frame);
    const vis = () => { if (document.visibilityState === 'hidden') { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; } else if (!rafRef.current) { lastRef.current = performance.now(); rafRef.current = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', vis);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); ro.disconnect(); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointerleave', leave); cv.removeEventListener('wheel', wheel); document.removeEventListener('visibilitychange', vis); };
  }, []);

  useEffect(() => { makeBrain(); glowRef.current = {}; }, [S.settings.theme]);
  useEffect(() => { fit(); }, [S.agents.length, S.settings.density]);

  const zoom = (f: number) => { view.current.zoom = Math.max(.6, Math.min(1.8, view.current.zoom * f)); sfx.tick(); };
  const reset = () => { view.current.zoom = 1; view.current.target = { x: 0, y: 0 }; sfx.tick(); };

  return (
    <section id="stage" ref={wrapRef} aria-label="Neural map">
      <canvas id="scene" ref={canvasRef} />
      <div id="stage-hint"><Icon name="target" size={13} /><span><b>MainBrain</b> at the center · click any custodian to summon</span></div>
      <div id="tooltip" ref={tipRef} role="tooltip" />
      <div id="scene-tools">
        <button onClick={() => zoom(1 / 1.15)} title="Zoom out"><Icon name="zout" size={15} /></button>
        <button onClick={() => zoom(1.15)} title="Zoom in"><Icon name="zin" size={15} /></button>
        <button onClick={reset} title="Reset view"><Icon name="reset" size={15} /></button>
        <button className={S.settings.labels ? 'on' : ''} onClick={() => setSetting('labels', !S.settings.labels)} title="Toggle labels"><Icon name="eye" size={15} /></button>
        <button className={S.settings.flow ? 'on' : ''} onClick={() => setSetting('flow', !S.settings.flow)} title="Toggle data flow"><Icon name="activity" size={15} /></button>
        <button className={S.settings.fx ? 'on' : ''} onClick={() => setSetting('fx', !S.settings.fx)} title="Toggle particles"><Icon name="spark" size={15} /></button>
        <button className={S.settings.paused ? 'on' : ''} onClick={() => setSetting('paused', !S.settings.paused)} title="Pause simulation"><Icon name={S.settings.paused ? 'play' : 'pause'} size={15} /></button>
      </div>
    </section>
  );
}
