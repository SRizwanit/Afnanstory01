// Bg_Land.jsx (Step P2.3) — the fallow land (পতিত জমি) at night: dry weeds, cracked earth, stones, a dead tree with a crow,
//                           ground mist, optional far-away lit house, and 0..3 mud huts that rise one by one.
// Exports : BgLand (named + default); const HUTS_MAX = 3; pure helpers landCtx(L, seed), hutXs(ctx), hutShapes(i, ctx),
//           riseAmount(huts, i), hutRise(a), litAmount(lit), flicker(f, seed, i), sway(f, phase, amp), layerXform(layer, view),
//           treeLinePath(ctx), trunkShapes(ctx), weedShapes(ctx, layer), stoneShapes(ctx), crackShapes(ctx), houseShape(ctx),
//           mistPuffs(ctx, f)   (all testable in Node)
// Props   : { progress = 0, huts = 0, lit = 0, house = 0, mist = 0.5, camX = 0, sky = true, mood = 'calm', moonX = 72, moonY = 24,
//             lightning = [], seed = 'a' }
//             huts     -> 0..3 (fractions allowed). Hut k (0 = left) is built while huts goes k -> k+1: it grows from the ground
//                         (back-ease, small overshoot), with a dust puff at its base. 0 = empty land, 1/2/3 = that many huts finished.
//                         Animate it from the scene: huts = interpolate(f, [cue1, cue1+14, cue2, cue2+14, ...], [0,1,1,2,2,3])
//             lit      -> true/false or 0..1: amber window light of FINISHED huts (flickers, each hut its own phase)
//             house    -> 0..1: a tiny far-away house with ONE lit window on the horizon (the old family house); 0 = hidden
//             mist     -> 0..1 ground mist (a band + 7 slowly drifting puffs; no filters)
//             progress -> 0..1 "approach": layers zoom about the middle hut at different rates (far 4 %, mid 18 %, near 45 %)
//             camX     -> sideways camera in % of the frame WIDTH (far 0.25x, mid 0.6x, near 1.2x); keep |camX| <= 12
//             sky      -> true = also draws <BgSky/> behind (sky, stars, moon, clouds); false = transparent above the horizon so the
//                         scene can mount its own BgSky. mood/moonX/moonY/lightning are passed to BgSky (moonX/Y = % of the content zone)
// Layer   : sky = BgSky (zIndex LAYERS.bg) + land = full-bleed AbsoluteFill zIndex LAYERS.bg + 1. No text. Behind scenes/characters/fx/captions.
// Zones   : horizon y = content zone 78 %; trunk, crow, huts (base <= hy + 70·u) and the far house all stand INSIDE the content zone
//           (above the caption band). Ground, weeds and cracks run on under the caption band but stay very dark (low contrast).
//           The horizon never moves while zooming (layers scale about (middle hut x, horizon y)).
// Method  : ONE <svg>; paths/rects/ellipses + linear/radial gradients; NO blur/SVG filters. Deterministic: positions from
//           random('land-<seed>-…'), sway/flicker/mist drift from sin()/modulo; no Math.random, no CSS animation.
//           Counts (vertical/horizontal): weeds 14+16 / 22+24 tufts, <= 40 trunk limbs, 3 huts, 8 stones, 7 cracks, 7 mist puffs.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, LAYERS, useLayout} from './theme.js';
import BgSky from './Bg_Sky.jsx';

export const HUTS_MAX = 3;
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const n1 = (v) => v.toFixed(1);
const wrap = (v, lo, hi) => (((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo) + lo;
const C = {far: '#0a1822', haze: '#2a5a6a', g0: '#0b151c', g1: '#03060c', crack: '#03060b', stone: '#0e1a22', plant: '#050b12', seedHead: '#17140c',
  trunk: '#040608', wall: '#22180f', roof: '#0a0805', straw: '#5a4624', door: '#050403', glow: COLORS.amber, mist: '#9fb4c8',
  crow: '#020306', eye: COLORS.blood, house: '#07121a'};
const LAYERS_K = {far: {par: 0.25, k: 0.04}, mid: {par: 0.6, k: 0.18}, near: {par: 1.2, k: 0.45}};

// ---------------------------------------------------------------- pure helpers
export function landCtx(L, seed = 'a') {
  const hy = L.cy(78); // horizon, inside the content zone
  return {w: L.width, h: L.height, u: L.u, hy, seed, isV: L.isVertical, content: L.content, caption: L.caption};
}
const R = (ctx, ...k) => random(`land-${ctx.seed}-${k.join('-')}`);

export const litAmount = (lit) => (lit === true ? 1 : lit === false || lit == null ? 0 : clamp01(num(lit, 0)));
export const sway = (f, phase, amp) => Math.sin(f * 0.035 + phase) * amp;
// warm window light, always within 0.45..1; every hut has its own phase (i)
export function flicker(f, seed = 'a', i = 0) {
  const dip = random(`land-${seed}-fl-${i}-${Math.floor(f / 3)}`) < 0.08 ? -0.22 : 0;
  return Math.max(0.45, Math.min(1, 0.82 + 0.1 * Math.sin(f * 0.37 + 1.1 + i * 1.7) + 0.06 * Math.sin(f * 0.91 + 2.3 + i) + dip));
}

// Transform of one parallax layer: shift by camX + zoom about (fx, fy).
export function layerXform(layer, {progress = 0, camX = 0, w, fx, fy}) {
  const {par, k} = LAYERS_K[layer];
  const tx = (-num(camX, 0) / 100) * w * par;
  const s = 1 + k * clamp01(num(progress, 0));
  return {tx, s, str: `translate(${n1(tx)} 0) translate(${n1(fx)} ${n1(fy)}) scale(${s.toFixed(4)}) translate(${n1(-fx)} ${n1(-fy)})`};
}

// Hut k is "built" while `huts` goes k -> k+1 (0..1); clamp for safety.
export const riseAmount = (huts, i) => clamp01(num(huts, 0) - i);
// Growth of one hut at build amount a (0..1): back-ease height (0 -> ~1.05 -> 1), width 0.9 -> 1, fade-in, dust puff strength.
export function hutRise(a) {
  if (!(a > 0)) return {sx: 0, sy: 0, op: 0, dust: 0};
  const t = clamp01(a), c1 = 1.4, c3 = c1 + 1, e = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  const dust = Math.sin(Math.PI * t);
  return {sx: 0.9 + 0.1 * (1 - Math.pow(1 - t, 3)), sy: t >= 1 ? 1 : Math.max(0, e), op: clamp01(t * 4), dust: dust < 0.002 ? 0 : dust};
}

// far tree line: blobby silhouette across -35 %..135 % of the width
export function treeLinePath(ctx) {
  const {w, hy, u} = ctx, x0 = -0.35 * w, x1 = 1.35 * w, step = u(36), pts = [];
  for (let x = x0, i = 0; x <= x1 + step; x += step, i++) pts.push([x, hy - u(26 + 50 * R(ctx, 'tree', i)) - u(10) * Math.sin(i * 0.45)]);
  let d = `M${n1(x0)} ${n1(hy + u(6))} L${n1(pts[0][0])} ${n1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) d += ` Q${n1(pts[i][0])} ${n1(pts[i][1])} ${n1((pts[i][0] + pts[i + 1][0]) / 2)} ${n1((pts[i][1] + pts[i + 1][1]) / 2)}`;
  return d + ` L${n1(x1 + step)} ${n1(hy + u(6))} Z`;
}

// x centres of the three huts (left -> right)
export const hutXs = (ctx) => (ctx.isV ? [0.34, 0.6, 0.86] : [0.38, 0.6, 0.82]).map((f) => ctx.w * f);

// Hut i (0..2): every number/path needed to draw it (same look as the village huts, slightly lighter = new walls).
export function hutShapes(i, ctx) {
  const {u, hy} = ctx, hs = ctx.isV ? 0.8 : 1;
  const cx = hutXs(ctx)[i] + u(8) * (R(ctx, 'hx', i) * 2 - 1), sc = hs * (0.94 + 0.12 * R(ctx, 'hs', i));
  const baseY = hy + u(52) + u(16) * R(ctx, 'hy', i);
  const bw = u(215 + 40 * R(ctx, 'hw', i)) * sc, wh = u(100 + 24 * R(ctx, 'hh', i)) * sc, rh = u(105 + 24 * R(ctx, 'hr', i)) * sc;
  const ov = u(30) * sc, x0 = cx - bw / 2, x1 = cx + bw / 2, wallTop = baseY - wh, apex = wallTop - rh;
  const roof = `M${n1(x0 - ov)} ${n1(wallTop + u(8))} Q${n1(x0 - ov * 0.2)} ${n1(apex + u(22))} ${n1(cx)} ${n1(apex)} Q${n1(x1 + ov * 0.2)} ${n1(apex + u(22))} ${n1(x1 + ov)} ${n1(wallTop + u(8))} Q${n1(cx)} ${n1(wallTop + u(34))} ${n1(x0 - ov)} ${n1(wallTop + u(8))} Z`;
  const straw = [];
  for (let k = 0; k < 7; k++) {
    const t = (k + 0.5) / 7, ex = x0 - ov + (bw + 2 * ov) * t;
    straw.push(`M${n1(cx + (ex - cx) * 0.18)} ${n1(apex + u(14))} L${n1(ex)} ${n1(wallTop + u(12) + u(6) * R(ctx, 'st', i, k))}`);
  }
  const doorW = u(44) * sc, doorH = u(78) * sc, side = i === 1 ? 1 : -1; // doors face the middle hut
  const door = {x: cx - side * bw * 0.12 - doorW / 2, y: baseY - doorH, w: doorW, h: doorH};
  const win = {x: cx + side * bw * 0.27 - u(17) * sc, y: wallTop + wh * 0.2, w: u(34) * sc, h: u(30) * sc};
  return {i, cx, baseY, x0, x1, wallTop, apex, topY: apex, sc, bw, roof, straw, wall: {x: x0, y: wallTop, w: bw, h: wh, flare: u(6)}, door, win,
    winC: [win.x + win.w / 2, win.y + win.h / 2], left: x0 - ov, right: x1 + ov};
}

// Dead tree: tapered limbs as stroked quadratic paths. Returns {x, baseY, limbs:[{d,w,depth,ex,ey}], perch:{x,y}}.
export function trunkShapes(ctx) {
  const {u, hy, w} = ctx, x = w * (ctx.isV ? 0.11 : 0.12), by = hy + u(46), ht = u(ctx.isV ? 330 : 340), limbs = [];
  const limb = (x0, y0, ang, len, wid, depth, key) => {
    const a2 = ang + (R(ctx, 'tb', key) - 0.5) * 0.55;
    const ex = x0 + Math.cos(a2) * len, ey = y0 + Math.sin(a2) * len, mx = x0 + Math.cos(ang) * len * 0.55, my = y0 + Math.sin(ang) * len * 0.55;
    limbs.push({d: `M${n1(x0)} ${n1(y0)} Q${n1(mx)} ${n1(my)} ${n1(ex)} ${n1(ey)}`, w: Math.max(u(2), wid), depth, ex, ey});
    if (depth <= 0) return;
    const kids = depth >= 2 ? 2 : 2 + (R(ctx, 'tk', key) < 0.45 ? 1 : 0);
    for (let k = 0; k < kids; k++) limb(ex, ey, a2 + (k - (kids - 1) / 2) * (0.5 + 0.35 * R(ctx, 'ts', key, k)), len * (0.66 + 0.1 * R(ctx, 'tl2', key, k)), wid * 0.6, depth - 1, `${key}-${k}`);
  };
  limb(x, by, -Math.PI / 2 + (R(ctx, 'tl') - 0.5) * 0.2, ht * 0.5, u(21), 3, 't');
  const tips = limbs.filter((l) => l.depth === 1);
  const top = tips.reduce((a, b) => (b.ey < a.ey ? b : a), tips[0]);
  return {x, baseY: by, limbs, perch: {x: top.ex, y: top.ey}, root: `M${n1(x - u(34))} ${n1(by + u(6))} Q${n1(x - u(8))} ${n1(by - u(30))} ${n1(x - u(14))} ${n1(by - u(70))} L${n1(x + u(14))} ${n1(by - u(70))} Q${n1(x + u(10))} ${n1(by - u(30))} ${n1(x + u(36))} ${n1(by + u(6))} Z`};
}

// Dry weed tufts. layer 'mid' (behind huts, on the horizon strip) or 'near' (in front, down to the frame bottom; very dark).
export function weedShapes(ctx, layer) {
  const {w, h, hy, u} = ctx, n = layer === 'mid' ? (ctx.isV ? 14 : 22) : (ctx.isV ? 16 : 24), out = [], nearTop = hy + u(84);
  for (let i = 0; i < n; i++) {
    const x = w * (-0.3 + 1.6 * ((i + R(ctx, layer, 'wx', i)) / n));
    const y = layer === 'mid' ? hy + u(8) + u(70) * R(ctx, 'wmy', i) : nearTop + (h * 1.02 - nearTop) * R(ctx, 'wny', i);
    const s = (layer === 'mid' ? 0.8 : 1.1) * (0.75 + 0.5 * R(ctx, layer, 'ws', i)), cnt = 5 + Math.floor(3 * R(ctx, layer, 'wc', i));
    let d = ''; const heads = [];
    for (let k = 0; k < cnt; k++) {
      const a = (k - (cnt - 1) / 2) * 0.24 + (R(ctx, layer, 'wa', i, k) - 0.5) * 0.12, len = u(60 + 60 * R(ctx, layer, 'wl', i, k)) * s;
      const bx = x + (k - cnt / 2) * u(4), tx = bx + Math.sin(a) * len, ty = y - Math.cos(a) * len;
      d += `M${n1(bx)} ${n1(y)} Q${n1(bx + Math.sin(a) * len * 0.3)} ${n1(y - len * 0.6)} ${n1(tx)} ${n1(ty)} `;
      if (k % 2 === 0) heads.push({cx: tx, cy: ty, r: u(3.5) * s});
    }
    out.push({d, heads, x, y, phase: R(ctx, layer, 'wp', i) * TAU, w: u(2.4) * s});
  }
  return out;
}

export function stoneShapes(ctx) {
  const {w, hy, u} = ctx;
  return Array.from({length: 8}, (_, i) => ({cx: w * (-0.1 + 1.2 * ((i + R(ctx, 'sx', i)) / 8)), cy: hy + u(24) + u(80) * R(ctx, 'sy', i), rx: u(10 + 16 * R(ctx, 'sw', i)), ry: u(5 + 7 * R(ctx, 'sh', i))}));
}

// 7 cracks in the dry earth: polylines going toward the viewer, kept above the caption band
export function crackShapes(ctx) {
  const {w, hy, u, content} = ctx, bottom = content.bottom - u(10);
  return Array.from({length: 7}, (_, i) => {
    let x = w * (0.05 + 0.9 * ((i + R(ctx, 'kx', i)) / 7)), y = hy + u(30) + u(40) * R(ctx, 'ky', i), d = `M${n1(x)} ${n1(y)}`;
    for (let k = 0; k < 5; k++) { x += u(34) * (R(ctx, 'kd', i, k) - 0.5) * 2; y = Math.min(bottom, y + u(26 + 30 * R(ctx, 'kl', i, k))); d += ` L${n1(x)} ${n1(y)}`; }
    return d;
  });
}

// tiny far-away house with one lit window (the old family house) on the horizon
export function houseShape(ctx) {
  const {w, hy, u} = ctx, cx = w * 0.5, by = hy + u(2), bw = u(78), wh = u(30), rh = u(30);
  return {cx, by, wall: `M${n1(cx - bw / 2)} ${n1(by)} L${n1(cx - bw / 2)} ${n1(by - wh)} L${n1(cx + bw / 2)} ${n1(by - wh)} L${n1(cx + bw / 2)} ${n1(by)} Z`,
    roof: `M${n1(cx - bw / 2 - u(8))} ${n1(by - wh + u(3))} Q${n1(cx - u(10))} ${n1(by - wh - rh * 0.9)} ${n1(cx)} ${n1(by - wh - rh)} Q${n1(cx + u(10))} ${n1(by - wh - rh * 0.9)} ${n1(cx + bw / 2 + u(8))} ${n1(by - wh + u(3))} Z`,
    win: {x: cx + bw * 0.12, y: by - wh * 0.72, w: u(11), h: u(10)}, topY: by - wh - rh};
}

// 7 ground-mist puffs drifting slowly; x wraps in [-0.7w, 1.7w) so the wrap always happens off-screen (rx <= 0.28 w)
export function mistPuffs(ctx, f) {
  const {w, hy, u} = ctx;
  return Array.from({length: 7}, (_, i) => {
    const rx = w * (0.16 + 0.12 * R(ctx, 'mr', i)), x = wrap(w * (-0.7 + 2.4 * R(ctx, 'mx', i)) + f * u(0.18 + 0.5 * R(ctx, 'ms', i)) * (i % 3 === 2 ? -1 : 1), -0.7 * w, 1.7 * w);
    return {x, y: hy + u(-20 + 90 * R(ctx, 'my', i)), rx, ry: u(24 + 22 * R(ctx, 'mh', i)), a: 0.55 + 0.45 * Math.sin(f * 0.02 + i * 1.3) * 0.5 + 0.2};
  });
}

// ---------------------------------------------------------------- component
export function BgLand({progress = 0, huts = 0, lit = 0, house = 0, mist = 0.5, camX = 0, sky = true, mood = 'calm', moonX = 72, moonY = 24, lightning = [], seed = 'a'}) {
  const f = useCurrentFrame();
  const L = useLayout();
  const ctx = landCtx(L, seed);
  const {w, h, hy, u} = ctx;
  const hs = [0, 1, 2].map((i) => hutShapes(i, ctx));
  const view = {progress, camX, w, fx: hs[1].cx, fy: hy};
  const far = layerXform('far', view), mid = layerXform('mid', view), near = layerXform('near', view);
  const la = litAmount(lit), ho = clamp01(num(house, 0)), mi = clamp01(num(mist, 0.5)), id = `land-${String(seed).replace(/[^A-Za-z0-9]/g, '_')}`;
  const tr = trunkShapes(ctx), hseShape = houseShape(ctx), px = tr.perch.x, py = tr.perch.y;
  const sw = (phase, amp) => `rotate(${sway(f, phase, amp).toFixed(3)})`;
  const blink = f % 90 < 4 ? 0.15 : 0.9, bob = Math.sin(f * 0.07) * u(1.2);

  return (
    <>
      {sky ? <BgSky mood={mood} moonX={moonX} moonY={moonY} lightning={lightning} seed={seed} /> : null}
      <AbsoluteFill style={{zIndex: LAYERS.bg + 1}}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block'}}>
          <defs>
            <linearGradient id={`${id}-gr`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.g0} /><stop offset="1" stopColor={C.g1} /></linearGradient>
            <linearGradient id={`${id}-hz`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.haze} stopOpacity="0" /><stop offset="1" stopColor={C.haze} stopOpacity="0.3" /></linearGradient>
            <linearGradient id={`${id}-mb`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.mist} stopOpacity="0" /><stop offset="0.5" stopColor={C.mist} stopOpacity="0.2" /><stop offset="1" stopColor={C.mist} stopOpacity="0" /></linearGradient>
            <radialGradient id={`${id}-mp`}><stop offset="0" stopColor={C.mist} stopOpacity="0.5" /><stop offset="0.6" stopColor={C.mist} stopOpacity="0.18" /><stop offset="1" stopColor={C.mist} stopOpacity="0" /></radialGradient>
            <radialGradient id={`${id}-gl`}><stop offset="0" stopColor={C.glow} stopOpacity="0.9" /><stop offset="0.4" stopColor={C.glow} stopOpacity="0.25" /><stop offset="1" stopColor={C.glow} stopOpacity="0" /></radialGradient>
          </defs>

          <g transform={far.str}>
            <path d={treeLinePath(ctx)} fill={C.far} />
            <rect x={-0.4 * w} y={hy - u(110)} width={1.8 * w} height={u(116)} fill={`url(#${id}-hz)`} />
            {ho > 0 ? (
              <g opacity={ho}>
                <path d={hseShape.wall} fill={C.house} />
                <rect x={hseShape.win.x} y={hseShape.win.y} width={hseShape.win.w} height={hseShape.win.h} fill={C.glow} opacity={0.2 + 0.8 * flicker(f, seed, 9)} />
                <path d={hseShape.roof} fill={C.house} />
                <circle cx={hseShape.win.x + hseShape.win.w / 2} cy={hseShape.win.y + hseShape.win.h / 2} r={u(46)} fill={`url(#${id}-gl)`} opacity={0.4 * flicker(f, seed, 9)} />
              </g>
            ) : null}
          </g>

          <g transform={mid.str}>
            <rect x={-w} y={hy} width={3 * w} height={h * 1.6} fill={`url(#${id}-gr)`} />
            {crackShapes(ctx).map((d, i) => <path key={`ck${i}`} d={d} stroke={C.crack} strokeWidth={u(2.2)} strokeLinejoin="round" fill="none" opacity={0.8} />)}
            {stoneShapes(ctx).map((s, i) => <ellipse key={`st${i}`} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={C.stone} />)}
            {mi > 0 ? <rect x={-0.4 * w} y={hy - u(60)} width={1.8 * w} height={u(170)} fill={`url(#${id}-mb)`} opacity={mi} /> : null}

            {weedShapes(ctx, 'mid').map((g, i) => (
              <g key={`wm${i}`} transform={`translate(${n1(g.x)} ${n1(g.y)}) ${sw(g.phase, 1.8)} translate(${n1(-g.x)} ${n1(-g.y)})`}>
                <path d={g.d} stroke={C.plant} strokeWidth={g.w} strokeLinecap="round" fill="none" />
                {g.heads.map((hd, k) => <circle key={k} cx={hd.cx} cy={hd.cy} r={hd.r} fill={C.seedHead} />)}
              </g>
            ))}

            <g fill="none" stroke={C.trunk} strokeLinecap="round" transform={`translate(${n1(tr.x)} ${n1(tr.baseY)}) rotate(${(Math.sin(f * 0.02) * 0.25).toFixed(3)}) translate(${n1(-tr.x)} ${n1(-tr.baseY)})`}>
              <path d={tr.root} fill={C.trunk} stroke="none" />
              {tr.limbs.map((l, i) => <path key={`l${i}`} d={l.d} strokeWidth={l.w} />)}
              <g stroke="none" transform={`translate(${n1(px)} ${n1(py)})`}>
                <g transform={`translate(${n1(-px)} ${n1(-py)})`}>
                  <line x1={px - u(5)} y1={py - u(2)} x2={px - u(5)} y2={py + u(1)} stroke={C.crow} strokeWidth={u(1.6)} />
                  <ellipse cx={px} cy={py - u(9)} rx={u(17)} ry={u(10)} fill={C.crow} />
                  <path d={`M${n1(px + u(12))} ${n1(py - u(8))} L${n1(px + u(36))} ${n1(py - u(1))} L${n1(px + u(31))} ${n1(py - u(13))} Z`} fill={C.crow} />
                  <g transform={`translate(${n1(bob)} 0)`}>
                    <circle cx={px - u(15)} cy={py - u(17)} r={u(7.5)} fill={C.crow} />
                    <path d={`M${n1(px - u(21))} ${n1(py - u(19))} L${n1(px - u(32))} ${n1(py - u(15))} L${n1(px - u(21))} ${n1(py - u(13))} Z`} fill={C.crow} />
                    <circle cx={px - u(17)} cy={py - u(18)} r={u(1.7)} fill={C.eye} opacity={blink} />
                  </g>
                </g>
              </g>
            </g>

            {hs.map((hu) => {
              const a = riseAmount(huts, hu.i), rz = hutRise(a);
              if (rz.op <= 0) return null;
              const lh = la * clamp01((a - 0.9) / 0.1), fl = flicker(f, seed, hu.i);
              return (
                <g key={`h${hu.i}`}>
                  {rz.dust > 0 ? <ellipse cx={hu.cx} cy={hu.baseY + u(6)} rx={hu.bw * (0.45 + 0.55 * a)} ry={u(14) * (0.5 + a)} fill={C.mist} opacity={0.2 * rz.dust} /> : null}
                  <g opacity={rz.op} transform={`translate(${n1(hu.cx)} ${n1(hu.baseY)}) scale(${rz.sx.toFixed(4)} ${rz.sy.toFixed(4)}) translate(${n1(-hu.cx)} ${n1(-hu.baseY)})`}>
                    <path d={`M${n1(hu.wall.x)} ${n1(hu.baseY)} L${n1(hu.wall.x + hu.wall.flare)} ${n1(hu.wall.y)} L${n1(hu.wall.x + hu.wall.w - hu.wall.flare)} ${n1(hu.wall.y)} L${n1(hu.wall.x + hu.wall.w)} ${n1(hu.baseY)} Z`} fill={C.wall} />
                    <rect x={hu.door.x} y={hu.door.y} width={hu.door.w} height={hu.door.h} rx={u(3)} fill={C.door} />
                    <rect x={hu.win.x} y={hu.win.y} width={hu.win.w} height={hu.win.h} rx={u(2)} fill={lh > 0 ? C.glow : '#07050a'} opacity={lh > 0 ? 0.12 + 0.88 * lh * fl : 1} />
                    <path d={hu.roof} fill={C.roof} />
                    <path d={hu.straw.join(' ')} stroke={C.straw} strokeWidth={u(2)} opacity={0.35} fill="none" />
                  </g>
                  {lh > 0 ? (
                    <g opacity={lh * fl}>
                      <circle cx={hu.winC[0]} cy={hu.winC[1]} r={u(110)} fill={`url(#${id}-gl)`} opacity={0.5} />
                      <ellipse cx={hu.cx} cy={hu.baseY + u(10)} rx={u(110) * hu.sc} ry={u(14)} fill={C.glow} opacity={0.14} />
                    </g>
                  ) : null}
                </g>
              );
            })}

            {mi > 0 ? mistPuffs(ctx, f).map((m, i) => <ellipse key={`mp${i}`} cx={m.x} cy={m.y} rx={m.rx} ry={m.ry} fill={`url(#${id}-mp)`} opacity={Math.min(1, mi * m.a * 0.6)} />) : null}
          </g>

          <g transform={near.str}>
            {weedShapes(ctx, 'near').map((g, i) => (
              <g key={`wn${i}`} transform={`translate(${n1(g.x)} ${n1(g.y)}) ${sw(g.phase, 2.2)} translate(${n1(-g.x)} ${n1(-g.y)})`}>
                <path d={g.d} stroke="#02040a" strokeWidth={g.w * 1.3} strokeLinecap="round" fill="none" />
                {g.heads.map((hd, k) => <circle key={k} cx={hd.cx} cy={hd.cy} r={hd.r} fill="#0b0a06" />)}
              </g>
            ))}
          </g>
        </svg>
      </AbsoluteFill>
    </>
  );
}

export default BgLand;
