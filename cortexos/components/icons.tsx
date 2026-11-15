// icons.tsx — consistent inline SVG icon set (no emoji) + blob agent avatars
import React from 'react';
import type { Agent, ShapeKey } from './cortex';
import { SHAPES } from './cortex';

const P: Record<string, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  bot: <><rect x="4.5" y="8" width="15" height="11" rx="3.5" /><path d="M12 8V4.5M9 4.5h6" /><circle cx="9.3" cy="13" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.7" cy="13" r="1.1" fill="currentColor" stroke="none" /><path d="M9.5 16.5h5" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></>,
  bell: <><path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-2 0-3h2.5A4.5 4.5 0 0 0 21 11.5 9 9 0 0 0 12 3z" /><circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" /><circle cx="11" cy="7.5" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" /></>,
  vol: <><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>,
  volx: <><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <><path d="M21 3 10.5 13.5" /><path d="M21 3 14 21l-3.5-7.5L3 10z" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevR: <path d="m9 5 7 7-7 7" />,
  chevL: <path d="m15 5-7 7 7 7" />,
  spark: <path d="M12 3l1.8 5.7L19.5 10l-5.7 1.8L12 17.5l-1.8-5.7L4.5 10l5.7-1.8z" />,
  activity: <path d="M3 12h4l2.5-7 4 14 2.5-7h5" />,
  box: <><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>,
  file: <><path d="M6 3h8l4.5 4.5V21H6z" /><path d="M14 3v5h4.5" /><path d="M9 13h6M9 16.5h6" /></>,
  db: <><ellipse cx="12" cy="5.5" rx="7" ry="2.8" /><path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13" /><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" /></>,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3.5 3.5 0 0 1 0 6.5M17.5 14.5a5.5 5.5 0 0 1 3 5.5" /></>,
  zap: <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z" /></>,
  plug: <><path d="M9 3v5M15 3v5" /><path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0z" /><path d="M12 16.5V21" /></>,
  trash: <><path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5 7.5 20h9l1-13.5" /><path d="M10 10.5v6M14 10.5v6" /></>,
  edit: <><path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17z" /><path d="m14.5 6.5 3 3" /></>,
  play: <path d="M7 4.5v15l12-7.5z" />,
  pause: <path d="M7 4.5v15M17 4.5v15" />,
  zin: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8M11 8.5v5M8.5 11h5" /></>,
  zout: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8M8.5 11h5" /></>,
  reset: <><path d="M4 10a8 8 0 1 1 2 6.9" /><path d="M4 4.5V10h5.5" /></>,
  link: <><path d="M9.5 14.5 14.5 9.5" /><path d="M7 17a3.5 3.5 0 0 1 0-5l2-2M17 7a3.5 3.5 0 0 1 0 5l-2 2" /></>,
  terminal: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="m7 9.5 3 2.5-3 2.5M12.5 15h4.5" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 7.8v.4" /></>,
  warn: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 9.5v4.5M12 17v.4" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  heart: <path d="M12 20s-7.5-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-1.5 4.5-9 9-9 9z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  git: <><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="8" r="2.5" /><path d="M6 8.5v7M6 13c6 0 6-3.5 9-3.5" /></>,
  folder: <><path d="M3 6.5a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  shield: <><path d="M12 3 4.5 6v6c0 4.5 3.2 7.5 7.5 9 4.3-1.5 7.5-4.5 7.5-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  layout: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M9.5 9.5v10" /></>,
  monitor: <><rect x="3" y="4.5" width="18" height="12.5" rx="2" /><path d="M9 20.5h6M12 17v3.5" /></>,
  gate: <><path d="M4 21V9.5L12 3l8 6.5V21" /><path d="M2.5 21h19M8 21v-5h8v5" /></>,
  lock: <><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /><circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" /></>,
  unlock: <><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2" /><circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" /></>,
  network: <><circle cx="12" cy="5.2" r="2.2" /><circle cx="5" cy="17.5" r="2.2" /><circle cx="19" cy="17.5" r="2.2" /><path d="M10.9 7.1 6.2 15.6M13.1 7.1l4.7 8.5M7.2 17.5h9.6" /></>,
  cite: <><path d="M10 8.5 7 12l3 3.5" /><path d="m14 8.5 3 3.5-3 3.5" /></>,
  flag: <><path d="M6 21V4" /><path d="M6 4.8c4-2 8 2 12 .2V13c-4 1.8-8-2.2-12-.2" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="15" rx="2.4" /><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" /></>,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="M6.2 6.2 17.8 17.8" /></>,
  audit: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-3.8-3.8" /><path d="m7.8 10.5 1.9 1.9 3.5-3.9" /></>,
  merge: <><circle cx="6.5" cy="6" r="2.2" /><circle cx="6.5" cy="18" r="2.2" /><circle cx="17" cy="12" r="2.2" /><path d="M8.6 6.9 15 10.8M8.6 17.1 15 13.2" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></>,
  unlink: <><path d="M9 15l6-6" /><path d="M11.5 17.5 10 19a3.5 3.5 0 0 1-5-5l1.5-1.5" /><path d="M12.5 6.5 14 5a3.5 3.5 0 0 1 5 5l-1.5 1.5" /></>,
  list: <><path d="M8.5 6H20M8.5 12H20M8.5 18H20" /><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></>,
  route: <><circle cx="5.5" cy="12" r="2.2" /><circle cx="18.5" cy="5.5" r="2.2" /><circle cx="18.5" cy="18.5" r="2.2" /><path d="M7.7 11.2 16.3 6.7M7.7 12.8l8.6 4.5" /></>,
  verified: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.2 2.5 2.5 4.9-5.4" /></>
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] || P.info}
    </svg>
  );
}

export function BlobAvatar({ a, size }: { a: Agent; size: number }) {
  const bd = (a.id.charCodeAt(0) * 7 % 40) / 10;
  const wd = (a.id.charCodeAt(a.id.length - 1) * 5 % 50) / 10;
  const d = SHAPES[a.shape as ShapeKey] || SHAPES.blob;
  return (
    <svg className="blob-svg" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g className="blob-wob" style={{ ['--wd' as any]: `${wd}s` }}>
        <path d={d} fill={a.color} />
        <path d={d} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="2" />
        <ellipse cx="35" cy="25" rx="14" ry="8" fill="#fff" opacity=".16" />
        <g className="eyes" style={{ ['--bd' as any]: `${bd}s` }} fill="#0b0b0d">
          <rect x="35" y="38" width="7.5" height="16" rx="3.75" transform="rotate(18 38.75 46)" />
          <rect x="55" y="34" width="7.5" height="16" rx="3.75" transform="rotate(18 58.75 42)" />
        </g>
      </g>
    </svg>
  );
}
