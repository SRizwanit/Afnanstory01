// Bg_Interior.jsx (Step 19) — mud-wall hut interior at night (rural Bengal, 1970s): hanging hurricane lantern (flicker + gentle swing),
//                            wooden cot (চৌকি) with kantha quilt, earthen floor, clay pot, barred window with moon beam + dust motes,
//                            long creeping shadows that crawl in from both sides.
// Exports : BgInterior (named + default); pure helpers interiorCtx(L, seed), lanternAmount(v), creepAmount(v), flameFlicker(f, seed, creep),
//           lanternPose(f, ctx), wallShapes(ctx), floorShapes(ctx), cotShapes(ctx), potShapes(ctx), beamGeom(ctx), beamShimmer(f),
//           motes(ctx, f), tendrilPath(i, s, ctx, f), TENDRILS     (all testable in Node)
// Props   : { lantern = 1, shadowCreep = 0, moon = 1, seed = 'a' }
//             lantern     -> 0..1  lantern brightness (0 = flame out, room almost black; the light pool also shrinks a little)
//             shadowCreep -> 0..1  long dark tendrils crawl in from the left and right edges (0 = none, 1 = they almost meet);
//                            also deepens the room darkness, shrinks the lantern light and makes the flame stutter
//             moon        -> 0..1  strength of the moon beam through the window (extra prop)
//             seed        -> any string; changes the wall/floor patches, cracks, motes and tendril layout
// Layer   : full-bleed AbsoluteFill, zIndex = LAYERS.bg (OPAQUE — it replaces BgSky + BgVillage inside the hut; do not mount them together).
//           Scenes, characters, fx and captions draw above it. No text.
// Zones   : floor line (wall base) = content zone 80 %; beam = 6 %; window, lantern, cot and pot all stand INSIDE the content zone
//           (above the caption band). The floor runs on under the caption band but stays very dark so captions stay readable.
// Method  : ONE <svg>; plain paths/rects/ellipses + linear/radial gradients; NO blur/SVG filters. Room darkness = one radial gradient
//           centred on the lantern. Deterministic: layout from random('int-<seed>-…'), motion from sin(); no Math.random, no CSS animation.
//           Element budget < 200 (vertical and horizontal).
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {LAYERS, useLayout} from './theme.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const n1 = (v) => v.toFixed(1);
const C = {
  roof: '#0a0603', straw: '#3a2c16', wall0: '#1f150e', wall1: '#2c2016', beam: '#1c120a', post: '#150c06', crack: '#0d0704',
  floor0: '#2a1b11', floor1: '#0a0604', moon: '#9fd0ff', amber: '#ffb020', warm: '#ff9a2a', hot: '#ffe9a8', night: '#020308',
  wood: '#4a2f1a', wood2: '#3a2414', leg: '#2c1a0e', pot: '#5a2f1c', ink: '#010104',
};
export const TENDRILS = 6; // 3 from the left edge, 3 from the right edge
const R = (ctx, ...k) => random(`int-${ctx.seed}-${k.join('-')}`);

// ---------------------------------------------------------------- pure helpers
export const lanternAmount = (v) => clamp01(num(v, 1));
export const creepAmount = (v) => clamp01(num(v, 0));

export function interiorCtx(L, seed = 'a') {
  const {u} = L, isV = L.isVertical;
  const fy = L.cy(80), beamY = L.cy(6);
  const win = {w: u(isV ? 200 : 230), h: u(isV ? 250 : 230), cx: L.cx(isV ? 72 : 78), top: L.cy(isV ? 16 : 10)};
  win.cy = win.top + win.h * 0.45; win.x0 = win.cx - win.w / 2; win.x1 = win.cx + win.w / 2; win.y0 = win.top; win.y1 = win.top + win.h;
  const hook = {x: L.cx(isV ? 28 : 30), y: beamY + u(12)};
  const lan = {rope: L.cy(isV ? 22 : 20) - hook.y, globe: u(68)}; // globe = distance from the rope end to the globe centre
  const cot = {cx: L.cx(isV ? 68 : 72), w: u(400), top: fy - u(105)};
  const pot = {cx: L.cx(isV ? 8 : 10)};
  return {w: L.width, h: L.height, u, isV, seed: String(seed), fy, beamY, win, hook, lan, cot, pot, content: L.content, caption: L.caption};
}

// flame/light flicker, always within 0.5..1; more stutter when the shadows creep
export function flameFlicker(f, seed = 'a', creep = 0) {
  const dip = random(`int-${seed}-fl-${Math.floor(f / 3)}`) < 0.07 + 0.2 * creepAmount(creep) ? -0.28 : 0;
  return Math.max(0.5, Math.min(1, 0.86 + 0.08 * Math.sin(f * 0.33 + 0.7) + 0.05 * Math.sin(f * 0.83 + 2.1) + dip));
}

// hanging lantern: swings about the hook; returns the swing angle (deg) and the globe centre in px
export function lanternPose(f, ctx) {
  const angle = 1.1 * Math.sin(f * 0.025) + 0.4 * Math.sin(f * 0.061 + 1);
  const rad = (angle * Math.PI) / 180, d = ctx.lan.rope + ctx.lan.globe;
  return {angle, x: ctx.hook.x - d * Math.sin(rad), y: ctx.hook.y + d * Math.cos(rad)};
}

export const beamShimmer = (f) => 0.85 + 0.15 * Math.sin(f * 0.02 + 1) + 0.05 * Math.sin(f * 0.073);

// wall: mud patches, cracks, roof straw strokes, two wooden posts
export function wallShapes(ctx) {
  const {w, u, beamY, fy} = ctx, patches = [], cracks = [], straw = [];
  for (let i = 0; i < 16; i++) {
    const dark = R(ctx, 'wp', i, 'd') < 0.5;
    patches.push({cx: w * R(ctx, 'wp', i, 'x'), cy: beamY + u(30) + (fy - beamY - u(60)) * R(ctx, 'wp', i, 'y'),
      rx: u(40 + 80 * R(ctx, 'wp', i, 'rx')), ry: u(18 + 32 * R(ctx, 'wp', i, 'ry')), fill: dark ? '#120b07' : '#3b2a1d', op: dark ? 0.4 : 0.3});
  }
  for (let i = 0; i < 4; i++) {
    let x = w * (0.08 + 0.84 * R(ctx, 'cr', i, 'x')), y = beamY + u(20);
    let d = `M${n1(x)} ${n1(y)}`;
    for (let k = 0; k < 4; k++) { x += u(26) * (R(ctx, 'cr', i, k, 'dx') - 0.5); y += u(40 + 50 * R(ctx, 'cr', i, k, 'dy')); d += ` L${n1(x)} ${n1(Math.min(y, fy - u(4)))}`; }
    cracks.push(d);
  }
  for (let i = 0; i < 24; i++) {
    const x = (w * (i + 0.5)) / 24 + u(14) * (R(ctx, 'sx', i) - 0.5);
    straw.push(`M${n1(x)} 0 L${n1(x + u(30) * (R(ctx, 'sd', i) - 0.5))} ${n1(beamY + u(10) - u(40) * R(ctx, 'sl', i))}`);
  }
  return {patches, cracks, straw, posts: [u(36), w - u(36)]};
}

export function floorShapes(ctx) {
  const {w, h, u, fy} = ctx, out = [];
  for (let i = 0; i < 10; i++) {
    const dark = R(ctx, 'fp', i, 'd') < 0.5;
    out.push({cx: w * R(ctx, 'fp', i, 'x'), cy: fy + u(24) + (h - fy - u(30)) * R(ctx, 'fp', i, 'y'),
      rx: u(60 + 120 * R(ctx, 'fp', i, 'rx')), ry: u(10 + 22 * R(ctx, 'fp', i, 'ry')), fill: dark ? '#060302' : '#3a281a', op: dark ? 0.45 : 0.22});
  }
  return out;
}

// cot (চৌকি): back legs, apron, front legs, top planks, kantha quilt + patches. rects: {x,y,w,h,fill,op,rx}
export function cotShapes(ctx) {
  const {u, fy, cot} = ctx, x0 = cot.cx - cot.w / 2, x1 = cot.cx + cot.w / 2, t = cot.top;
  const rects = [
    {x: x0 + u(34), y: t + u(16), w: u(14), h: u(90), fill: '#1c1008', op: 1, rx: 2},
    {x: x1 - u(48), y: t + u(16), w: u(14), h: u(90), fill: '#1c1008', op: 1, rx: 2},
    {x: x0, y: t + u(14), w: cot.w, h: u(22), fill: C.wood2, op: 1, rx: 2},
    {x: x0 + u(8), y: t + u(36), w: u(18), h: fy + u(20) - (t + u(36)), fill: C.leg, op: 1, rx: 3},
    {x: x1 - u(26), y: t + u(36), w: u(18), h: fy + u(20) - (t + u(36)), fill: C.leg, op: 1, rx: 3},
    {x: x0 - u(6), y: t, w: cot.w + u(12), h: u(16), fill: C.wood, op: 1, rx: 3},
    {x: x0 + u(10), y: t - u(32), w: cot.w - u(20), h: u(34), fill: '#4a2c3a', op: 1, rx: u(10)},
  ];
  const cols = ['#7a3b2e', '#2e4a5a', '#8a6a2e', '#5a2e5a'], pw = (cot.w - u(60)) / 4;
  cols.forEach((fill, k) => rects.push({x: x0 + u(30) + pw * k, y: t - u(26), w: pw - u(6), h: u(22), fill, op: 0.55, rx: 3}));
  return {rects, pillow: {cx: x1 - u(62), cy: t - u(38), rx: u(48), ry: u(22)}, shadow: {cx: cot.cx, cy: fy + u(22), rx: cot.w * 0.6, ry: u(16)}};
}

// clay pot (কলসি) + small bowl, on the floor at the left
export function potShapes(ctx) {
  const {u, fy, pot} = ctx, by = fy + u(18);
  return {
    body: {cx: pot.cx, cy: by - u(52), rx: u(46), ry: u(54)}, rim: {cx: pot.cx, cy: by - u(104), rx: u(24), ry: u(7)},
    neck: {x: pot.cx - u(20), y: by - u(112), w: u(40), h: u(20)},
    bowl: {cx: pot.cx + u(92), cy: by - u(10), rx: u(28), ry: u(12)},
    shadow: {cx: pot.cx + u(30), cy: by + u(2), rx: u(90), ry: u(12)},
  };
}

// moon beam: slanted shaft from the window bottom to the floor line, floor patch + mullion shadows
export function beamGeom(ctx) {
  const {u, fy, win, isV} = ctx, dx = -u(isV ? 190 : 260), fa = fy + u(16), fb = fy + u(120);
  const shaft = [[win.x0, win.y1], [win.x1, win.y1], [win.x1 + dx * 0.9 + u(30), fa], [win.x0 + dx * 0.9, fa]];
  const patch = [[win.x0 + dx * 0.9, fa], [win.x1 + dx * 0.9 + u(30), fa], [win.x1 + dx * 1.15 + u(70), fb], [win.x0 + dx * 1.15 - u(10), fb]];
  const mull = [1, 2].map((k) => {
    const t = k / 3;
    return {a: [win.x0 + win.w * t, win.y1], b: [win.x0 + dx * 0.9 + (win.w + u(30)) * t, fa],
      pa: [patch[0][0] + (patch[1][0] - patch[0][0]) * t, fa], pb: [patch[3][0] + (patch[2][0] - patch[3][0]) * t, fb]};
  });
  return {dx, shaft, patch, mull, fa, fb};
}

// dust motes floating down the beam (14), deterministic, wrap-around hidden by opacity 0 at both ends
export function motes(ctx, f) {
  const g = beamGeom(ctx), {u, win} = ctx, out = [];
  for (let i = 0; i < 14; i++) {
    const t = (R(ctx, 'mt', i, 't') + f * 0.0025 * (0.6 + 0.8 * R(ctx, 'mt', i, 'v'))) % 1, s = R(ctx, 'mt', i, 's');
    const yy = win.y1 + (g.fa - win.y1) * t;
    const xl = win.x0 + g.dx * 0.9 * t, xr = win.x1 + (g.dx * 0.9 + u(30)) * t;
    out.push({x: xl + (xr - xl) * s + Math.sin(f * 0.03 + i) * u(6), y: yy + Math.sin(f * 0.021 + i * 1.7) * u(4),
      r: u(1.2 + 1.6 * R(ctx, 'mt', i, 'r')), op: Math.sin(Math.PI * t) * 0.6 * (0.4 + 0.6 * R(ctx, 'mt', i, 'o'))});
  }
  return out;
}

// creeping shadow tendril i (even = left edge, odd = right edge); null while it has not entered the frame
export function tendrilPath(i, s, ctx, f) {
  const {w, u, beamY, fy, h, isV} = ctx, side = i % 2 === 0 ? -1 : 1, row = Math.floor(i / 2);
  const se = clamp01(creepAmount(s) * 1.25 - 0.25 * (i / (TENDRILS - 1)));
  const Lmax = w * (isV ? 0.55 : 0.38) * (0.7 + 0.3 * R(ctx, 'td', i, 'l'));
  const Ls = se * Lmax;
  if (Ls < u(4)) return null;
  const yc = beamY + (fy + u(120) - beamY) * ([0.3, 0.55, 0.78][row] + 0.1 * (R(ctx, 'td', i, 'y') - 0.5));
  const th = u(60 + 60 * R(ctx, 'td', i, 't')) * (0.5 + 0.5 * se);
  const wob = Math.sin(f * 0.02 + R(ctx, 'td', i, 'p') * 6.28) * u(16) * se;
  const x0 = side < 0 ? -u(40) : w + u(40), xt = side < 0 ? Ls : w - Ls, xm = (x0 + xt) / 2;
  const yt = Math.min(h, yc + (R(ctx, 'td', i, 'e') - 0.5) * u(80) * se + wob);
  return `M${n1(x0)} ${n1(yc - th / 2)} Q${n1(xm)} ${n1(yc - th * 0.42 + wob * 0.6)} ${n1(xt)} ${n1(yt)} Q${n1(xm)} ${n1(yc + th * 0.42 + wob)} ${n1(x0)} ${n1(yc + th / 2)} Z`;
}

// ---------------------------------------------------------------- component
const pts = (a) => a.map((p) => `${n1(p[0])},${n1(p[1])}`).join(' ');
export function BgInterior({lantern = 1, shadowCreep = 0, moon = 1, seed = 'a'}) {
  const f = useCurrentFrame();
  const L = useLayout();
  const ctx = interiorCtx(L, seed);
  const {w, h, u, fy, beamY, win, hook, lan} = ctx;
  const A = lanternAmount(lantern), s = creepAmount(shadowCreep), mo = clamp01(num(moon, 1));
  const sd = ctx.seed.replace(/[^a-zA-Z0-9_-]/g, '') || 'a', id = (k) => `int-${sd}-${k}`;
  const fl = flameFlicker(f, ctx.seed, s), I = A * fl, pose = lanternPose(f, ctx);
  const rr = 1 - 0.22 * s, lx = pose.x, ly = pose.y;
  const wall = wallShapes(ctx), floor = floorShapes(ctx), cot = cotShapes(ctx), pot = potShapes(ctx), bg = beamGeom(ctx);
  const sh = beamShimmer(f), bo = mo * sh;
  const aC = 0.04 + 0.62 * (1 - A), aM = Math.min(0.96, 0.4 + 0.4 * (1 - A) + 0.08 * s), aE = Math.min(0.96, 0.72 + 0.2 * (1 - A) + 0.1 * s);
  const gy = lan.rope, fh = u(26) * (0.75 + 0.25 * fl) * Math.min(1, A * 6), fb = gy + u(92); // flame height / base
  const fw = u(12);
  return (
    <AbsoluteFill style={{zIndex: LAYERS.bg, pointerEvents: 'none', overflow: 'hidden'}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.wall0} /><stop offset="1" stopColor={C.wall1} /></linearGradient>
          <linearGradient id={id('floor')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.floor0} /><stop offset="1" stopColor={C.floor1} /></linearGradient>
          <radialGradient id={id('dark')} gradientUnits="userSpaceOnUse" cx={n1(lx)} cy={n1(ly)} r={n1(u(900))}>
            <stop offset="0" stopColor={C.night} stopOpacity={aC.toFixed(3)} /><stop offset="0.55" stopColor={C.night} stopOpacity={aM.toFixed(3)} />
            <stop offset="1" stopColor={C.night} stopOpacity={aE.toFixed(3)} />
          </radialGradient>
          <linearGradient id={id('shaft')} gradientUnits="userSpaceOnUse" x1="0" y1={n1(win.y1)} x2="0" y2={n1(bg.fa)}>
            <stop offset="0" stopColor={C.moon} stopOpacity={(0.3 * bo).toFixed(3)} /><stop offset="1" stopColor={C.moon} stopOpacity={(0.06 * bo).toFixed(3)} />
          </linearGradient>
          <radialGradient id={id('wglow')}><stop offset="0" stopColor={C.moon} stopOpacity={(0.22 * mo).toFixed(3)} /><stop offset="1" stopColor={C.moon} stopOpacity="0" /></radialGradient>
          <radialGradient id={id('l1')}><stop offset="0" stopColor={C.amber} stopOpacity="0.42" /><stop offset="0.35" stopColor={C.warm} stopOpacity="0.16" /><stop offset="1" stopColor={C.warm} stopOpacity="0" /></radialGradient>
          <radialGradient id={id('l2')}><stop offset="0" stopColor={C.hot} stopOpacity="0.55" /><stop offset="1" stopColor={C.amber} stopOpacity="0" /></radialGradient>
          <radialGradient id={id('pool')}><stop offset="0" stopColor={C.amber} stopOpacity="0.9" /><stop offset="1" stopColor={C.amber} stopOpacity="0" /></radialGradient>
          <radialGradient id={id('pot')} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#8a4a2a" /><stop offset="1" stopColor="#2a140a" /></radialGradient>
          <radialGradient id={id('vig')} cx="0.5" cy="0.5" r="0.75"><stop offset="0.45" stopColor={C.ink} stopOpacity="0" /><stop offset="1" stopColor={C.ink} stopOpacity={(0.7 * s).toFixed(3)} /></radialGradient>
        </defs>
        {/* roof underside + straw */}
        <rect x="0" y="0" width={w} height={n1(beamY + u(15))} fill={C.roof} />
        <path d={wall.straw.join(' ')} stroke={C.straw} strokeWidth={n1(u(3))} opacity="0.35" fill="none" />
        {/* wall */}
        <rect x="0" y={n1(beamY)} width={w} height={n1(fy - beamY)} fill={`url(#${id('wall')})`} />
        {wall.patches.map((p, i) => <ellipse key={`wp${i}`} cx={n1(p.cx)} cy={n1(p.cy)} rx={n1(p.rx)} ry={n1(p.ry)} fill={p.fill} opacity={p.op} />)}
        {wall.cracks.map((d, i) => <path key={`cr${i}`} d={d} stroke={C.crack} strokeWidth={n1(u(2.2))} opacity="0.6" fill="none" />)}
        {wall.posts.map((x, i) => <rect key={`po${i}`} x={n1(x - u(13))} y={n1(beamY)} width={n1(u(26))} height={n1(fy - beamY + u(8))} fill={C.post} />)}
        <rect x="0" y={n1(beamY - u(4))} width={w} height={n1(u(30))} fill={C.beam} />
        <rect x="0" y={n1(beamY - u(4))} width={w} height={n1(u(3))} fill="#4a3320" opacity="0.5" />
        {/* floor */}
        <rect x="0" y={n1(fy)} width={w} height={n1(h - fy)} fill={`url(#${id('floor')})`} />
        {floor.map((p, i) => <ellipse key={`fp${i}`} cx={n1(p.cx)} cy={n1(p.cy)} rx={n1(p.rx)} ry={n1(p.ry)} fill={p.fill} opacity={p.op} />)}
        <rect x="0" y={n1(fy - u(3))} width={w} height={n1(u(8))} fill="#0a0603" opacity="0.8" />
        {/* props: pot, bowl, cot */}
        <ellipse cx={n1(pot.shadow.cx)} cy={n1(pot.shadow.cy)} rx={n1(pot.shadow.rx)} ry={n1(pot.shadow.ry)} fill={C.ink} opacity="0.5" />
        <ellipse cx={n1(pot.body.cx)} cy={n1(pot.body.cy)} rx={n1(pot.body.rx)} ry={n1(pot.body.ry)} fill={`url(#${id('pot')})`} />
        <rect x={n1(pot.neck.x)} y={n1(pot.neck.y)} width={n1(pot.neck.w)} height={n1(pot.neck.h)} fill="#4a2414" />
        <ellipse cx={n1(pot.rim.cx)} cy={n1(pot.rim.cy)} rx={n1(pot.rim.rx)} ry={n1(pot.rim.ry)} fill="#1a0c06" stroke="#6a3a22" strokeWidth={n1(u(2))} />
        <ellipse cx={n1(pot.bowl.cx)} cy={n1(pot.bowl.cy)} rx={n1(pot.bowl.rx)} ry={n1(pot.bowl.ry)} fill="#3a1e12" />
        <ellipse cx={n1(cot.shadow.cx)} cy={n1(cot.shadow.cy)} rx={n1(cot.shadow.rx)} ry={n1(cot.shadow.ry)} fill={C.ink} opacity="0.55" />
        {cot.rects.map((r, i) => <rect key={`ct${i}`} x={n1(r.x)} y={n1(r.y)} width={n1(r.w)} height={n1(r.h)} rx={n1(r.rx)} fill={r.fill} opacity={r.op} />)}
        <ellipse cx={n1(cot.pillow.cx)} cy={n1(cot.pillow.cy)} rx={n1(cot.pillow.rx)} ry={n1(cot.pillow.ry)} fill="#8a7a64" opacity="0.8" />
        {/* room darkness: pooled around the lantern */}
        <rect x="0" y="0" width={w} height={h} fill={`url(#${id('dark')})`} />
        {/* window + moon beam */}
        <circle cx={n1(win.cx)} cy={n1(win.cy)} r={n1(u(260))} fill={`url(#${id('wglow')})`} />
        <polygon points={pts(bg.shaft)} fill={`url(#${id('shaft')})`} />
        {bg.mull.map((m, i) => <line key={`mu${i}`} x1={n1(m.a[0])} y1={n1(m.a[1])} x2={n1(m.b[0])} y2={n1(m.b[1])} stroke={C.ink} strokeWidth={n1(u(5))} opacity={(0.18 * mo).toFixed(3)} />)}
        <polygon points={pts(bg.patch)} fill={C.moon} opacity={(0.2 * bo).toFixed(3)} />
        {bg.mull.map((m, i) => <line key={`mp${i}`} x1={n1(m.pa[0])} y1={n1(m.pa[1])} x2={n1(m.pb[0])} y2={n1(m.pb[1])} stroke={C.ink} strokeWidth={n1(u(7))} opacity={(0.3 * mo).toFixed(3)} />)}
        <rect x={n1(win.x0)} y={n1(win.y0)} width={n1(win.w)} height={n1(win.h)} fill="#16304a" />
        <circle cx={n1(win.cx + u(22))} cy={n1(win.y0 + win.h * 0.3)} r={n1(u(36))} fill="#e8f1fa" opacity={(0.4 + 0.6 * mo).toFixed(3)} />
        <rect x={n1(win.x0)} y={n1(win.y0)} width={n1(win.w)} height={n1(win.h)} fill="none" stroke="#2a170b" strokeWidth={n1(u(14))} />
        {[1, 2].map((k) => <rect key={`wb${k}`} x={n1(win.x0 + (win.w * k) / 3 - u(4.5))} y={n1(win.y0)} width={n1(u(9))} height={n1(win.h)} fill="#24140a" />)}
        <rect x={n1(win.x0)} y={n1(win.y0 + win.h * 0.45)} width={n1(win.w)} height={n1(u(9))} fill="#24140a" />
        <rect x={n1(win.x0 - u(18))} y={n1(win.y1 + u(4))} width={n1(win.w + u(36))} height={n1(u(14))} fill={C.wood2} />
        {motes(ctx, f).map((m, i) => <circle key={`mo${i}`} cx={n1(m.x)} cy={n1(m.y)} r={n1(m.r)} fill="#dfeeff" opacity={(m.op * mo).toFixed(3)} />)}
        {/* lantern light (always drawn over the darkness) */}
        {A > 0.001 && <ellipse cx={n1(lx)} cy={n1(fy + u(60))} rx={n1(u(300) * rr * (0.5 + 0.5 * I))} ry={n1(u(70))} fill={`url(#${id('pool')})`} opacity={(0.3 * I).toFixed(3)} />}
        {A > 0.001 && <circle cx={n1(lx)} cy={n1(ly)} r={n1(u(560) * rr * (0.5 + 0.5 * I))} fill={`url(#${id('l1')})`} opacity={I.toFixed(3)} />}
        {A > 0.001 && <circle cx={n1(lx)} cy={n1(ly)} r={n1(u(230) * rr)} fill={`url(#${id('l2')})`} opacity={(0.9 * I).toFixed(3)} />}
        {/* lantern fixture (rope, cap, guard wires, globe, flame, tank) */}
        <g transform={`translate(${n1(hook.x)} ${n1(hook.y)}) rotate(${pose.angle.toFixed(3)})`}>
          <line x1="0" y1="0" x2="0" y2={n1(gy)} stroke="#2a1d10" strokeWidth={n1(u(3))} />
          <circle cx="0" cy={n1(gy + u(6))} r={n1(u(6))} fill="none" stroke="#8a6a30" strokeWidth={n1(u(2))} />
          <path d={`M${n1(-u(20))} ${n1(gy + u(34))} Q0 ${n1(gy + u(2))} ${n1(u(20))} ${n1(gy + u(34))} Z`} fill="#1b1b1b" stroke="#6a5a30" strokeWidth={n1(u(1.5))} />
          <ellipse cx="0" cy={n1(gy + u(68))} rx={n1(u(25))} ry={n1(u(34))} fill={`rgba(255,190,90,${(0.1 + 0.4 * I).toFixed(3)})`} stroke="#c9a050" strokeOpacity="0.45" strokeWidth={n1(u(1.5))} />
          <path d={`M${n1(-u(22))} ${n1(gy + u(34))} Q${n1(-u(38))} ${n1(gy + u(68))} ${n1(-u(24))} ${n1(gy + u(100))} M${n1(u(22))} ${n1(gy + u(34))} Q${n1(u(38))} ${n1(gy + u(68))} ${n1(u(24))} ${n1(gy + u(100))}`} stroke="#3a2e1a" strokeWidth={n1(u(1.6))} fill="none" />
          {fh > 0.5 && <path d={`M0 ${n1(fb - fh)} Q${n1(fw)} ${n1(fb - fh * 0.4)} 0 ${n1(fb)} Q${n1(-fw)} ${n1(fb - fh * 0.4)} 0 ${n1(fb - fh)} Z`} fill="#ffcf5a" />}
          {fh > 0.5 && <path d={`M0 ${n1(fb - fh * 0.6)} Q${n1(fw * 0.45)} ${n1(fb - fh * 0.25)} 0 ${n1(fb)} Q${n1(-fw * 0.45)} ${n1(fb - fh * 0.25)} 0 ${n1(fb - fh * 0.6)} Z`} fill="#fff3c0" />}
          <rect x={n1(-u(27))} y={n1(gy + u(98))} width={n1(u(54))} height={n1(u(30))} rx={n1(u(4))} fill="#262626" stroke="#6a5a30" strokeOpacity="0.5" strokeWidth={n1(u(1.5))} />
        </g>
        {/* creeping shadows + corner vignette */}
        {s > 0.001 && <rect x="0" y="0" width={w} height={h} fill={`url(#${id('vig')})`} />}
        {s > 0.001 && Array.from({length: TENDRILS}, (_, i) => tendrilPath(i, s, ctx, f)).map((d, i) => (d ? <path key={`td${i}`} d={d} fill={C.ink} opacity="0.92" /> : null))}
      </svg>
    </AbsoluteFill>
  );
}

export default BgInterior;
