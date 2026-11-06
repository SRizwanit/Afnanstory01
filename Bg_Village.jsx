// Bg_Village.jsx (Step 18) — rural Bengal village at night (1970s): parallax layers, mud huts with thatch roofs, palms, banana,
//                            bamboo, pond with moon glints, dirt path, grass, ONE lit window with flicker.
// Exports : BgVillage (named + default); pure helpers villageCtx(L, seed), layerXform(layer, view), treeLinePath(ctx),
//           hutShapes(i, n, ctx), palmXs(ctx), palmShapes(i, x, ctx), bananaShapes(i, x, ctx), bambooShapes(i, x, ctx), pondShapes(ctx, moonRefX),
//           pathShape(ctx, doorX), grassShapes(ctx), litAmount(lit), flicker(f, seed), sway(f, phase, amp)   (testable in Node)
// Props   : { progress = 0, lit = true, camX = 0, moonX = 72, seed = 'a' }
//             progress -> 0..1 "approach": layers zoom about the lit hut at different rates (far 4 %, mid 18 %, near 45 %) = parallax push-in
//             lit      -> true/false, or a number 0..1 (fade the window light in/out)
//             camX     -> sideways camera in % of the frame WIDTH (parallax: far 0.25x, mid 0.6x, near 1.2x). Keep |camX| <= 12
//                         (everything is drawn across -35 % .. +135 % of the width)
//             moonX    -> where the moon sits (% of the CONTENT zone, same number you gave BgSky) so the pond reflects it
// Layer   : full-bleed AbsoluteFill, zIndex = LAYERS.bg + 1 (draws OVER <BgSky/>, behind scenes/characters/fx/captions). Transparent above
//           the horizon, so the sky shows through. No text.
// Zones   : horizon y = content zone 80 % (so huts, palms and the lit window all stand in the CONTENT zone, above the caption band);
//           ground, path and grass run on under the caption band but are kept very dark (low contrast) so captions stay readable.
//           The horizon stays fixed while zooming (layers scale about (lit hut x, horizon y)).
// Method  : ONE <svg>; plain paths/rects/ellipses, linear/radial gradients; NO blur/SVG filters. Deterministic: positions from
//           random('vil-<seed>-…'), sway/shimmer/flicker from sin(); no Math.random, no CSS animation.
//           Counts: vertical 3 huts / horizontal 5; palms 4/6, banana 2/3, bamboo 4/5 (incl. 2 edge clumps), 26 grass tufts.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, LAYERS, useLayout} from './theme.js';

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const n1 = (v) => v.toFixed(1);
const C = {far: '#0c1c28', haze: '#2a5a6a', g0: '#07101a', g1: '#03060c', wall: '#1a130e', roof: '#0a0805', straw: '#4a3a20',
  plant: '#050b12', water: '#0b2430', path: '#17110c', grass: '#02040a', glow: COLORS.amber, moon: COLORS.bone};
const LAYERS_K = {far: {par: 0.25, k: 0.04}, mid: {par: 0.6, k: 0.18}, near: {par: 1.2, k: 0.45}};

// ---------------------------------------------------------------- pure helpers
export function villageCtx(L, seed = 'a') {
  const hy = L.cy(80); // horizon, inside the content zone
  return {w: L.width, h: L.height, u: L.u, hy, seed, isV: L.isVertical, content: L.content, caption: L.caption};
}
const R = (ctx, ...k) => random(`vil-${ctx.seed}-${k.join('-')}`);

export const litAmount = (lit) => (lit === true ? 1 : lit === false || lit == null ? 0 : clamp01(num(lit, 0)));
export const sway = (f, phase, amp) => Math.sin(f * 0.035 + phase) * amp;
// warm window light: slow wobble + fast shimmer + occasional dips, always within 0.45..1
export function flicker(f, seed = 'a') {
  const dip = random(`vil-${seed}-fl-${Math.floor(f / 3)}`) < 0.08 ? -0.22 : 0;
  return Math.max(0.45, Math.min(1, 0.82 + 0.1 * Math.sin(f * 0.37 + 1.1) + 0.06 * Math.sin(f * 0.91 + 2.3) + dip));
}

// Transform of one parallax layer: shift by camX (parallax) + zoom about the focal point (fx, fy).
export function layerXform(layer, {progress = 0, camX = 0, w, fx, fy}) {
  const {par, k} = LAYERS_K[layer];
  const tx = (-num(camX, 0) / 100) * w * par;
  const s = 1 + k * clamp01(num(progress, 0));
  return {tx, s, str: `translate(${n1(tx)} 0) translate(${n1(fx)} ${n1(fy)}) scale(${s.toFixed(4)}) translate(${n1(-fx)} ${n1(-fy)})`};
}

// far tree line: smooth blobby silhouette across -35 %..135 % of the width, base slightly under the horizon
export function treeLinePath(ctx) {
  const {w, hy, u} = ctx, x0 = -0.35 * w, x1 = 1.35 * w, step = u(34);
  const pts = [];
  for (let x = x0, i = 0; x <= x1 + step; x += step, i++) pts.push([x, hy - u(52 + 70 * R(ctx, 'tree', i)) - u(14) * Math.sin(i * 0.5)]);
  let d = `M${n1(x0)} ${n1(hy + u(6))} L${n1(pts[0][0])} ${n1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) d += ` Q${n1(pts[i][0])} ${n1(pts[i][1])} ${n1((pts[i][0] + pts[i + 1][0]) / 2)} ${n1((pts[i][1] + pts[i + 1][1]) / 2)}`;
  return d + ` L${n1(x1 + step)} ${n1(hy + u(6))} Z`;
}

// Hut i of n (lit hut = the middle one). Returns every number/path needed to draw it.
export function hutShapes(i, n, ctx) {
  const {w, hy, u} = ctx;
  const mid = (n - 1) / 2;
  const litHut = i === Math.round(mid);
  const cx = w * (0.5 + ((i - mid) / Math.max(1, n - 1)) * (n === 3 ? 0.68 : 0.78)) + (litHut ? 0 : u(30) * (R(ctx, 'hx', i) - 0.5));
  const sc = 0.92 + 0.14 * R(ctx, 'hs', i);
  const baseY = hy + u(28) + (litHut ? 0 : u(14 + 14 * R(ctx, 'hy', i)));
  const bw = u(215 + 70 * R(ctx, 'hw', i)) * sc, wh = u(100 + 30 * R(ctx, 'hh', i)) * sc, rh = u(105 + 30 * R(ctx, 'hr', i)) * sc;
  const ov = u(34) * sc, x0 = cx - bw / 2, x1 = cx + bw / 2, wallTop = baseY - wh, apex = wallTop - rh;
  const roof = `M${n1(x0 - ov)} ${n1(wallTop + u(8))} Q${n1(x0 - ov * 0.2)} ${n1(apex + u(22))} ${n1(cx)} ${n1(apex)} Q${n1(x1 + ov * 0.2)} ${n1(apex + u(22))} ${n1(x1 + ov)} ${n1(wallTop + u(8))} Q${n1(cx)} ${n1(wallTop + u(34))} ${n1(x0 - ov)} ${n1(wallTop + u(8))} Z`;
  const straw = [];
  for (let k = 0; k < 7; k++) {
    const t = (k + 0.5) / 7, ex = x0 - ov + (bw + 2 * ov) * t;
    straw.push(`M${n1(cx + (ex - cx) * 0.18)} ${n1(apex + u(14))} L${n1(ex)} ${n1(wallTop + u(12) + u(6) * R(ctx, 'st', i, k))}`);
  }
  const doorW = u(44) * sc, doorH = u(78) * sc, side = R(ctx, 'hd', i) < 0.5 ? -1 : 1;
  const door = {x: cx - side * bw * 0.12 - doorW / 2, y: baseY - doorH, w: doorW, h: doorH};
  const win = {x: cx + side * bw * 0.27 - u(17) * sc, y: wallTop + wh * 0.2, w: u(34) * sc, h: u(30) * sc};
  return {i, litHut, cx, baseY, x0, x1, wallTop, apex, topY: apex, roof, straw, wall: {x: x0, y: wallTop, w: bw, h: wh, flare: u(6)}, door, win,
    winC: [win.x + win.w / 2, win.y + win.h / 2]};
}

const leaf = (x, y, ang, len, wid, droop) => { // curved leaf from (x,y) along angle (rad), tip drooping down
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const tx = x + dx * len, ty = y + dy * len + len * droop;
  const mx = x + dx * len * 0.55, my = y + dy * len * 0.55 - len * 0.12;
  return `M${n1(x)} ${n1(y)} Q${n1(mx)} ${n1(my - wid)} ${n1(tx)} ${n1(ty)} Q${n1(mx)} ${n1(my + wid)} ${n1(x)} ${n1(y)} Z`;
};

// Palm x positions: in the gaps between the huts + one at each edge (vertical 4, horizontal 6).
export const palmXs = (ctx) => (ctx.isV ? [-0.08, 0.33, 0.68, 1.08] : [-0.08, 0.2, 0.4, 0.6, 0.8, 1.08]).map((fx, i) => ctx.w * fx + ctx.u(24) * (R(ctx, 'px', i) - 0.5));

// Coconut/areca palm at x: tapered curved trunk + 7 drooping fronds. `top` = crown centre (for sway pivot use base).
export function palmShapes(i, x, ctx) {
  const {hy, u} = ctx;
  const sc = 0.85 + 0.3 * R(ctx, 'ps', i), ht = u(300 + 90 * R(ctx, 'ph', i)) * sc, lean = u(60) * (R(ctx, 'pl', i) - 0.5) * 2;
  const by = hy + u(40 + 22 * R(ctx, 'pb', i)), tx = x + lean, ty = by - ht, tw = u(11) * sc, cxm = x + lean * 0.2 - lean * 0.4;
  const trunk = `M${n1(x - tw)} ${n1(by)} Q${n1(cxm - tw)} ${n1(by - ht * 0.5)} ${n1(tx - tw * 0.5)} ${n1(ty)} L${n1(tx + tw * 0.5)} ${n1(ty)} Q${n1(cxm + tw)} ${n1(by - ht * 0.5)} ${n1(x + tw)} ${n1(by)} Z`;
  const fronds = [];
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI / 2 + (k - 3) * 0.5 + (R(ctx, 'pf', i, k) - 0.5) * 0.25;
    fronds.push(leaf(tx, ty, ang, u(105 + 55 * R(ctx, 'pq', i, k)) * sc, u(9) * sc, 0.45 + 0.25 * R(ctx, 'pd', i, k)));
  }
  return {x, baseY: by, topY: ty - u(60) * sc, trunk, fronds, phase: R(ctx, 'pp', i) * TAU};
}

export function bananaShapes(i, x, ctx) {
  const {hy, u} = ctx, sc = 0.9 + 0.25 * R(ctx, 'bs', i), by = hy + u(46), ty = by - u(78) * sc;
  const leaves = [];
  for (let k = 0; k < 6; k++) leaves.push(leaf(x, ty, -Math.PI / 2 + (k - 2.5) * 0.62 + (R(ctx, 'bl', i, k) - 0.5) * 0.2, u(120 + 40 * R(ctx, 'bq', i, k)) * sc, u(24) * sc, 0.5 + 0.2 * R(ctx, 'bd', i, k)));
  return {x, baseY: by, topY: ty - u(110) * sc, stem: `M${n1(x - u(7) * sc)} ${n1(by)} L${n1(x - u(4) * sc)} ${n1(ty)} L${n1(x + u(4) * sc)} ${n1(ty)} L${n1(x + u(7) * sc)} ${n1(by)} Z`, leaves, phase: R(ctx, 'bp', i) * TAU};
}

export function bambooShapes(i, x, ctx) {
  const {hy, u} = ctx, by = hy + u(36), stems = [];
  const cnt = 5 + Math.floor(3 * R(ctx, 'bb', i));
  for (let k = 0; k < cnt; k++) {
    const sx = x + (k - cnt / 2) * u(15) + (R(ctx, 'bx', i, k) - 0.5) * u(10);
    const ht = u(250 + 120 * R(ctx, 'bh', i, k)), lean = (R(ctx, 'bn', i, k) - 0.5) * u(70);
    const tipX = sx + lean, tipY = by - ht;
    const nodes = [0.2, 0.4, 0.6, 0.8].map((t) => [sx + lean * t * t, by - ht * t]);
    const tufts = [0, 1, 2].map((j) => leaf(tipX, tipY + u(18) * j, -Math.PI / 2 + (j - 1) * 0.9 + (R(ctx, 'bf', i, k, j) - 0.5) * 0.3, u(46), u(4), 0.55));
    stems.push({d: `M${n1(sx)} ${n1(by)} Q${n1(sx + lean * 0.2)} ${n1(by - ht * 0.6)} ${n1(tipX)} ${n1(tipY)}`, w: u(5 + 2 * R(ctx, 'bw', i, k)), nodes, tufts, tip: [tipX, tipY]});
  }
  return {x, baseY: by, topY: Math.min(...stems.map((s) => s.tip[1])) - u(20), stems, phase: R(ctx, 'bp2', i) * TAU};
}

export function pondShapes(ctx, moonRefX) {
  const {w, hy, u} = ctx;
  const cx = w * (ctx.isV ? 0.24 : 0.2), ry = u(38), cy = hy + Math.min(u(100), ctx.content.bottom - hy - ry - u(8)), rx = w * (ctx.isV ? 0.28 : 0.18);
  const mx = Math.max(cx - rx * 0.6, Math.min(cx + rx * 0.6, moonRefX));
  return {cx, cy, rx, ry, mx, streaks: [0, 1, 2, 3, 4, 5].map((k) => ({dy: (k - 2.5) * ry * 0.28, hw: u(40 - 5 * Math.abs(k - 2.5) * 2) * (0.7 + 0.5 * R(ctx, 'pw', k)), ph: R(ctx, 'pq2', k) * TAU}))};
}

// dirt path from the lit hut's door to below the frame (wide at the bottom)
export function pathShape(ctx, doorX) {
  const {h, hy, u} = ctx, top = hy + u(30), bot = h * 1.15, bend = ctx.w * 0.06;
  return `M${n1(doorX - u(22))} ${n1(top)} L${n1(doorX + u(22))} ${n1(top)} Q${n1(doorX + u(60) + bend)} ${n1((top + bot) / 2)} ${n1(doorX + u(250))} ${n1(bot)} L${n1(doorX - u(250) - bend)} ${n1(bot)} Q${n1(doorX - u(60))} ${n1((top + bot) / 2)} ${n1(doorX - u(22))} ${n1(top)} Z`;
}

// 26 grass tufts along the bottom (under the caption band; very dark). Each: {d, x, y, phase}
export function grassShapes(ctx) {
  const {w, h, u, content} = ctx, out = [];
  for (let i = 0; i < 26; i++) {
    const x = w * (-0.3 + 1.6 * ((i + R(ctx, 'gx', i)) / 26)), y = content.bottom + (h - content.bottom) * (0.35 + 0.65 * R(ctx, 'gy', i)), s = 0.8 + 0.6 * R(ctx, 'gs', i);
    let d = '';
    for (let k = 0; k < 5; k++) { const a = (k - 2) * 0.28, bl = u(46 + 36 * R(ctx, 'gb', i, k)) * s; d += `M${n1(x + (k - 2) * u(5))} ${n1(y)} Q${n1(x + (k - 2) * u(5) + Math.sin(a) * bl * 0.5)} ${n1(y - bl * 0.6)} ${n1(x + (k - 2) * u(5) + Math.sin(a) * bl)} ${n1(y - bl)} L${n1(x + (k - 2) * u(5) + u(5))} ${n1(y)} Z `; }
    out.push({d, x, y, phase: R(ctx, 'gp', i) * TAU});
  }
  return out;
}

// ---------------------------------------------------------------- component
export function BgVillage({progress = 0, lit = true, camX = 0, moonX = 72, seed = 'a'}) {
  const f = useCurrentFrame();
  const L = useLayout();
  const ctx = villageCtx(L, seed);
  const {w, h, hy, u} = ctx;
  const nH = ctx.isV ? 3 : 5, nB = ctx.isV ? 2 : 3, nM = ctx.isV ? 3 : 4;
  const huts = Array.from({length: nH}, (_, i) => hutShapes(i, nH, ctx));
  const litH = huts.find((x) => x.litHut);
  const view = {progress, camX, w, fx: litH.cx, fy: hy};
  const far = layerXform('far', view), mid = layerXform('mid', view), near = layerXform('near', view);
  const la = litAmount(lit), fl = flicker(f, seed), id = `vil-${String(seed).replace(/[^A-Za-z0-9]/g, '_')}`;
  const pond = pondShapes(ctx, L.cx(num(moonX, 72)));
  const palms = palmXs(ctx).map((x, i) => palmShapes(i, x, ctx));
  const bananas = Array.from({length: nB}, (_, i) => bananaShapes(i, litH.cx + (i % 2 ? 1 : -1) * (u(300) + i * u(200)), ctx));
  const bamboos = [-0.1, ...Array.from({length: nM - 1}, (_, i) => 0.18 + (0.8 * (i + 0.5)) / (nM - 1)), 1.1].map((fx, i) => bambooShapes(i, w * fx, ctx));
  const sw = (phase, amp) => `rotate(${sway(f, phase, amp).toFixed(3)})`;

  return (
    <AbsoluteFill style={{zIndex: LAYERS.bg + 1}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block'}}>
        <defs>
          <linearGradient id={`${id}-gr`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.g0} /><stop offset="1" stopColor={C.g1} /></linearGradient>
          <linearGradient id={`${id}-hz`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.haze} stopOpacity="0" /><stop offset="1" stopColor={C.haze} stopOpacity="0.32" /></linearGradient>
          <radialGradient id={`${id}-gl`}><stop offset="0" stopColor={C.glow} stopOpacity="0.9" /><stop offset="0.4" stopColor={C.glow} stopOpacity="0.25" /><stop offset="1" stopColor={C.glow} stopOpacity="0" /></radialGradient>
        </defs>

        <g transform={far.str}>
          <path d={treeLinePath(ctx)} fill={C.far} />
          <rect x={-0.4 * w} y={hy - u(120)} width={1.8 * w} height={u(126)} fill={`url(#${id}-hz)`} />
        </g>

        <g transform={mid.str}>
          <rect x={-w} y={hy} width={3 * w} height={h * 1.6} fill={`url(#${id}-gr)`} />
          <ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx} ry={pond.ry} fill={C.water} />
          {pond.streaks.map((s, k) => (
            <rect key={`ps${k}`} x={pond.mx - s.hw + Math.sin(f * 0.05 + s.ph) * u(8)} y={pond.cy + s.dy - u(1.5)} width={s.hw * 2} height={u(3)} rx={u(1.5)} fill={C.moon} opacity={0.12 + 0.12 * (0.5 + 0.5 * Math.sin(f * 0.08 + s.ph))} />
          ))}
          {[0, 1].map((k) => { const t = ((f * 0.012 + k * 0.5) % 1); return <ellipse key={`rp${k}`} cx={pond.cx - pond.rx * 0.25} cy={pond.cy + u(4)} rx={pond.rx * 0.5 * t} ry={pond.ry * 0.5 * t} fill="none" stroke={C.moon} strokeWidth={u(1.5)} opacity={0.18 * (1 - t)} />; })}

          {bamboos.map((b, i) => (
            <g key={`bb${i}`} transform={`translate(${n1(b.x)} ${n1(b.baseY)}) ${sw(b.phase, 1.1)} translate(${n1(-b.x)} ${n1(-b.baseY)})`} fill="none">
              {b.stems.map((s, k) => (
                <g key={k}>
                  <path d={s.d} stroke={C.plant} strokeWidth={s.w} strokeLinecap="round" />
                  {s.nodes.map(([nx, ny], j) => <line key={j} x1={nx - s.w * 0.8} y1={ny} x2={nx + s.w * 0.8} y2={ny} stroke={C.far} strokeWidth={u(2)} />)}
                  {s.tufts.map((d, j) => <path key={`t${j}`} d={d} fill={C.plant} />)}
                </g>
              ))}
            </g>
          ))}

          {palms.map((p, i) => (
            <g key={`pm${i}`} transform={`translate(${n1(p.x)} ${n1(p.baseY)}) ${sw(p.phase, 0.9)} translate(${n1(-p.x)} ${n1(-p.baseY)})`} fill={C.plant}>
              <path d={p.trunk} />
              {p.fronds.map((d, k) => <path key={k} d={d} />)}
            </g>
          ))}

          {huts.map((hu) => (
            <g key={`h${hu.i}`}>
              <path d={`M${n1(hu.wall.x)} ${n1(hu.baseY)} L${n1(hu.wall.x + hu.wall.flare)} ${n1(hu.wall.y)} L${n1(hu.wall.x + hu.wall.w - hu.wall.flare)} ${n1(hu.wall.y)} L${n1(hu.wall.x + hu.wall.w)} ${n1(hu.baseY)} Z`} fill={C.wall} />
              <rect x={hu.door.x} y={hu.door.y} width={hu.door.w} height={hu.door.h} rx={u(3)} fill="#050403" />
              <rect x={hu.win.x} y={hu.win.y} width={hu.win.w} height={hu.win.h} rx={u(2)} fill={hu.litHut ? C.glow : '#07050a'} opacity={hu.litHut ? 0.12 + 0.88 * la * fl : 1} />
              <path d={hu.roof} fill={C.roof} />
              <path d={hu.straw.join(' ')} stroke={C.straw} strokeWidth={u(2)} opacity={0.35} fill="none" />
              {hu.litHut && la > 0 ? (
                <g opacity={la * fl}>
                  <circle cx={hu.winC[0]} cy={hu.winC[1]} r={u(125)} fill={`url(#${id}-gl)`} opacity={0.55} />
                  <ellipse cx={hu.cx} cy={hu.baseY + u(10)} rx={u(120)} ry={u(16)} fill={C.glow} opacity={0.14} />
                </g>
              ) : null}
            </g>
          ))}

          {bananas.map((b, i) => (
            <g key={`bn${i}`} transform={`translate(${n1(b.x)} ${n1(b.baseY)}) ${sw(b.phase, 1.4)} translate(${n1(-b.x)} ${n1(-b.baseY)})`} fill={C.plant}>
              <path d={b.stem} />
              {b.leaves.map((d, k) => <path key={k} d={d} />)}
            </g>
          ))}
        </g>

        <g transform={near.str}>
          <path d={pathShape(ctx, litH.door.x + litH.door.w / 2)} fill={C.path} opacity={0.85} />
          {grassShapes(ctx).map((g, i) => <path key={`gr${i}`} d={g.d} fill={C.grass} transform={`translate(${n1(g.x)} ${n1(g.y)}) ${sw(g.phase, 2.2)} translate(${n1(-g.x)} ${n1(-g.y)})`} />)}
        </g>
      </svg>
    </AbsoluteFill>
  );
}

export default BgVillage;
