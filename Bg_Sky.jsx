// Bg_Sky.jsx (Step 17) — night sky background: gradient, twinkling stars, big moon with halo, drifting cloud strips, lightning.
// Exports : BgSky (named + default); pure helpers skyPalette(mood), starAt(i, f, ctx), cloudSpec(i, n, ctx), cloudX(spec, f, w),
//           moonState(f, ctx), lightningAt(f, frames), boltPoints(seed, t, w, h, u)  (all testable in Node)
// Props   : { mood = 'calm' | 'red' | 'storm', lightning = [frames], moonX = 72, moonY = 24, stars = true, clouds = true, seed = 'a' }
//             mood      -> calm: teal/indigo night, bone moon · red: blood moon + crimson sky (dread) · storm: dark grey sky, 5 thick
//                          cloud strips, few stars, dimmed moon (unknown value -> calm)
//             lightning -> LOCAL frames (of the enclosing <Sequence>) at which a strike happens (number or array): whole-sky flash
//                          that decays over 8 frames + a second weaker flash 4 frames later + a jagged bolt for the first 3 frames
//             moonX/Y   -> moon centre in % of the CONTENT zone (useLayout().cx/cy) so the moon never sits in the caption band
//             stars/clouds -> booleans to switch those layers off; seed -> any string, another arrangement per scene
// Layer   : full-bleed AbsoluteFill, zIndex = LAYERS.bg (BEHIND scenes/characters/fx and under captions, so a lightning flash can
//           never wash out a caption). No text. Bg_Village (Step 18) is drawn over the lower part of this sky.
// Method  : ONE <svg> of plain shapes (linear/radial gradients, circles, ellipses, polylines). NO blur/SVG filters; the halo is
//           stacked radial gradients. Everything is a pure function of (frame, seed): positions from random('sky-<seed>-…'),
//           twinkle/drift from sin(); no Math.random, no CSS animation. Items: <= 60 stars, <= 5 strips x 6 puffs, 5 craters.
// Camera  : mount inside <Camera> if the sky should move with the world (the sky is oversized-safe only when Camera zoom >= 1).
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {LAYERS, useLayout} from './theme.js';

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const wrap = (v, lo, hi) => (((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo) + lo;

const PALETTES = {
  calm: {top: '#03050d', mid: '#0a1630', low: '#16384f', glow: '#1f5a6e', moon: '#f3ecdc', shade: '#c9c1a8', halo: '#9fd8ff',
    cloud: '#0a1224', star: '#f3ecdc', stars: 60, strips: 3, cloudOp: 0.5, moonOp: 1},
  red: {top: '#12030a', mid: '#3a0b16', low: '#7d1a22', glow: '#b3262c', moon: '#ff4a3d', shade: '#a8141f', halo: '#ff2d3d',
    cloud: '#1a0508', star: '#ffd0c0', stars: 36, strips: 3, cloudOp: 0.55, moonOp: 1},
  storm: {top: '#04050a', mid: '#101822', low: '#243240', glow: '#34495a', moon: '#d9e2ea', shade: '#9aa8b4', halo: '#8fb4d0',
    cloud: '#080c12', star: '#dfeaff', stars: 10, strips: 5, cloudOp: 0.78, moonOp: 0.45},
};
export const skyPalette = (mood) => PALETTES[mood] || PALETTES.calm;

// ---------------------------------------------------------------- pure helpers
// moonState: moon centre/radius/opacity/halo-pulse at frame f. Position is given in % of the CONTENT zone (cx/cy from useLayout()).
export function moonState(f, {u, cx, cy, moonX = 72, moonY = 24, mood = 'calm'}) {
  const P = skyPalette(mood);
  const r = u(95);
  return {x: cx(moonX) + f * u(0.02), y: cy(moonY) - f * u(0.01), r, op: P.moonOp, pulse: 0.9 + 0.1 * Math.sin(f * 0.03)};
}

// Star i at frame f -> {x, y, r, op}. Dimmed near the moon (so its glow stays clean) and by cloud cover in 'storm'.
export function starAt(i, f, {w, h, u, seed = 'a', mood = 'calm', moon}) {
  const R = (k) => random(`sky-${seed}-star-${i}-${k}`);
  const x = R('x') * w;
  const y = R('y') * h * 0.72;
  const tw = 0.55 + 0.45 * Math.sin(f * (0.03 + 0.05 * R('f')) + R('p') * TAU);
  const near = clamp01((Math.hypot(x - moon.x, y - moon.y) - moon.r * 1.2) / (moon.r * 2.5));
  const cover = mood === 'storm' ? 0.5 : 1;
  return {x, y, r: u(0.7 + 1.6 * R('r')), op: (0.35 + 0.65 * R('o')) * tw * near * cover};
}

// Cloud strip i of n: {y, speed, len, puffs[{dx, dy, rx, ry}], op, x0}; back strips are higher, slower and fainter.
export function cloudSpec(i, n, {w, h, u, seed = 'a', cloudOp = 0.5}) {
  const R = (k) => random(`sky-${seed}-cloud-${i}-${k}`);
  const depth = n > 1 ? i / (n - 1) : 0.5; // 0 = far, 1 = near
  const len = u(520 + 420 * R('len'));
  const puffs = [];
  for (let j = 0; j < 6; j++) {
    puffs.push({dx: (j / 5) * len, dy: (R(`dy${j}`) - 0.5) * u(36), rx: len * (0.16 + 0.1 * R(`rx${j}`)), ry: u(26 + 38 * R(`ry${j}`)) * (0.7 + 0.5 * depth)});
  }
  return {y: h * (0.10 + 0.38 * depth + 0.06 * R('y')), speed: u(0.25 + 0.55 * depth) * (R('dir') < 0.15 ? -1 : 1), len, puffs,
    op: cloudOp * (0.55 + 0.45 * depth) * (0.8 + 0.2 * R('o')), x0: R('x') * (w + 2 * len)};
}

// Left x of the strip at frame f; wraps endlessly inside [-2*len, w + len) so it never pops.
export const cloudX = (c, f, w) => wrap(c.x0 + f * c.speed, -2 * c.len, w + c.len);

// Lightning at frame f for strike frames `frames` -> {flash 0..1, bolt 0..1, t (strike frame the bolt belongs to, or null)}.
export function lightningAt(f, frames) {
  const list = (Array.isArray(frames) ? frames : [frames]).filter((x) => typeof x === 'number' && Number.isFinite(x));
  const dec = (k) => (k < 0 || k >= 8 ? 0 : Math.pow(1 - k / 8, 1.5));
  let flash = 0, bolt = 0, bt = null;
  for (const t of list) {
    const k = f - t;
    flash = Math.max(flash, dec(k), 0.6 * dec(k - 4));
    const b = k >= 0 && k < 3 ? 1 - k / 3 : k >= 4 && k < 6 ? 0.6 : 0;
    if (b > bolt) { bolt = b; bt = t; }
  }
  return {flash, bolt, t: bt};
}

// Jagged bolt for strike frame t: {main:[[x,y]...], branch:[[x,y]...]} inside the frame (deterministic per seed + t).
export function boltPoints(seed, t, w, h, u) {
  const R = (k) => random(`sky-${seed}-bolt-${t}-${k}`);
  let x = w * (0.15 + 0.7 * R('x'));
  const len = h * (0.42 + 0.2 * R('len'));
  const main = [[x, 0]];
  for (let k = 1; k <= 9; k++) {
    x = Math.max(u(10), Math.min(w - u(10), x + (R(`j${k}`) - 0.5) * u(150)));
    main.push([x, (len * k) / 9]);
  }
  const dir = R('dir') < 0.5 ? -1 : 1;
  const [bx, by] = main[4];
  const branch = [[bx, by]];
  let px = bx;
  for (let k = 1; k <= 4; k++) {
    px = Math.max(u(10), Math.min(w - u(10), px + dir * u(30 + 50 * R(`b${k}`))));
    branch.push([px, by + (len * 0.07) * k]);
  }
  return {main, branch};
}

const pts = (a) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// ---------------------------------------------------------------- component
export function BgSky({mood = 'calm', lightning = [], moonX = 72, moonY = 24, stars = true, clouds = true, seed = 'a'}) {
  const f = useCurrentFrame();
  const L = useLayout();
  const {width: w, height: h, u} = L;
  const P = skyPalette(mood);
  const id = `sky-${PALETTES[mood] ? mood : 'calm'}-${String(seed).replace(/[^A-Za-z0-9]/g, '_')}`;
  const moon = moonState(f, {u, cx: L.cx, cy: L.cy, moonX, moonY, mood});
  const ctx = {w, h, u, seed, mood, moon};
  const lt = lightningAt(f, lightning);
  const nStars = stars ? P.stars : 0;
  const nStrips = clouds ? P.strips : 0;

  const craters = [];
  for (let k = 0; k < 5; k++) {
    const R = (a) => random(`sky-${seed}-crater-${k}-${a}`);
    const ang = R('a') * TAU, dist = Math.sqrt(R('d')) * moon.r * 0.7;
    craters.push({x: moon.x + Math.cos(ang) * dist, y: moon.y + Math.sin(ang) * dist, r: moon.r * (0.08 + 0.12 * R('r'))});
  }
  const bolt = lt.bolt > 0 ? boltPoints(seed, lt.t, w, h, u) : null;

  return (
    <AbsoluteFill style={{zIndex: LAYERS.bg, backgroundColor: P.top}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block'}}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={P.top} />
            <stop offset="0.5" stopColor={P.mid} />
            <stop offset="0.85" stopColor={P.low} />
            <stop offset="1" stopColor={P.glow} />
          </linearGradient>
          <radialGradient id={`${id}-h`}>
            <stop offset="0" stopColor={P.halo} stopOpacity="0.38" />
            <stop offset="0.45" stopColor={P.halo} stopOpacity="0.12" />
            <stop offset="1" stopColor={P.halo} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-m`} cx="0.38" cy="0.35" r="0.8">
            <stop offset="0" stopColor={P.moon} />
            <stop offset="1" stopColor={P.shade} />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill={`url(#${id}-g)`} />

        {Array.from({length: nStars}, (_, i) => {
          const s = starAt(i, f, ctx);
          return s.op > 0.01 ? <circle key={`s${i}`} cx={s.x} cy={s.y} r={s.r} fill={P.star} opacity={s.op * (1 - 0.85 * lt.flash)} /> : null;
        })}

        <g opacity={moon.op}>
          <circle cx={moon.x} cy={moon.y} r={moon.r * 5.2} fill={`url(#${id}-h)`} opacity={moon.pulse} />
          <circle cx={moon.x} cy={moon.y} r={moon.r * 2.2} fill={`url(#${id}-h)`} opacity={moon.pulse} />
          <circle cx={moon.x} cy={moon.y} r={moon.r} fill={`url(#${id}-m)`} />
          {craters.map((c, k) => <circle key={`c${k}`} cx={c.x} cy={c.y} r={c.r} fill={P.shade} opacity={0.4} />)}
        </g>

        {Array.from({length: nStrips}, (_, i) => {
          const c = cloudSpec(i, nStrips, {w, h, u, seed, cloudOp: P.cloudOp});
          const x = cloudX(c, f, w);
          return (
            <g key={`k${i}`} opacity={c.op} fill={P.cloud}>
              {c.puffs.map((p, j) => <ellipse key={j} cx={x + p.dx} cy={c.y + p.dy} rx={p.rx} ry={p.ry} />)}
            </g>
          );
        })}

        {lt.flash > 0 ? <rect width={w} height={h} fill="#cfe6ff" opacity={0.5 * lt.flash} /> : null}
        {bolt ? (
          <g fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={lt.bolt}>
            <polyline points={pts(bolt.main)} stroke="#9fd0ff" strokeWidth={u(16)} opacity={0.3} />
            <polyline points={pts(bolt.main)} stroke="#ffffff" strokeWidth={u(5)} />
            <polyline points={pts(bolt.branch)} stroke="#ffffff" strokeWidth={u(3)} />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
}

export default BgSky;
