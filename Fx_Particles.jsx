// Fx_Particles.jsx (Step 13) — seeded atmosphere particles: fireflies | dust | embers | bats | rain.
// Exports : FxParticles (named + default), particleAt(type, i, f, ctx), maxCount(type), defaultColor(type)  (pure, testable)
// Props   : { type = 'fireflies', count = 40, color = (per-type default), speed = 1, seed = 'a' }
//             type  -> 'fireflies' | 'dust' | 'embers' | 'bats' | 'rain'
//             count -> number of particles, clamped to 0..60 (bats: max 8 — they are big)    [rule 3.5-8: <= 60 items]
//             color -> fill/stroke colour; defaults: fireflies #7cff4f, dust #f3ecdc, embers #ffb020, bats #05060b, rain #9fb4c8
//             speed -> motion multiplier (0 = frozen)
//             seed  -> any string; change it to get a different arrangement in another scene
// Layer   : full-bleed AbsoluteFill, zIndex = LAYERS.fx (above scenes, below captions + film). No text, no key art.
// Method  : ONE <svg> of plain circles/lines/paths (no filters, no blur); "glow" = 2 extra translucent circles.
//           Every particle is a pure function of (type, index, frame): positions from random('pt-<seed>-<type>-<i>-<what>'),
//           drift/twinkle from sin(); dust/embers/rain wrap around so they never run out (no Math.random, no CSS animation).
// Geometry: sizes/speeds from useLayout().u(); particles may drift over the caption band (they sit below captions in z-order).
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, LAYERS, useLayout} from './theme.js';

const TAU = Math.PI * 2;
const COLOR_BY_TYPE = {
  fireflies: COLORS.toxic,
  dust: COLORS.bone,
  embers: COLORS.amber,
  bats: '#05060b',
  rain: '#9fb4c8',
};
export const defaultColor = (type) => COLOR_BY_TYPE[type] || COLORS.bone;
export const maxCount = (type) => (type === 'bats' ? 8 : 60);

// value wrapped into [lo, hi)
const wrap = (v, lo, hi) => {
  const span = hi - lo;
  return ((((v - lo) % span) + span) % span) + lo;
};

// ---------------------------------------------------------------- pure per-particle state
// ctx = { w, h, u, speed, seed }. Returns a plain object describing what to draw (see the component below).
export function particleAt(type, i, f, ctx) {
  const {w, h, u, speed = 1, seed = 'a'} = ctx;
  const R = (what) => random(`pt-${seed}-${type}-${i}-${what}`);
  const m = u(60); // off-screen margin used when wrapping
  const ft = f * speed; // 'effective time': speed 0 freezes everything that is time-driven

  if (type === 'fireflies') {
    const bx = R('x') * w;
    const by = h * (0.18 + 0.72 * R('y'));
    const ax = u(40 + 80 * R('ax'));
    const ay = u(30 + 60 * R('ay'));
    const fx = 0.010 + 0.016 * R('fx');
    const fy = 0.012 + 0.016 * R('fy');
    const x = bx + Math.sin(ft * fx + R('p1') * TAU) * ax + Math.sin(ft * fx * 2.3 + R('p2') * TAU) * ax * 0.4;
    const y = by + Math.sin(ft * fy + R('p3') * TAU) * ay + Math.cos(ft * fy * 1.7 + R('p4') * TAU) * ay * 0.4;
    // twinkle: slow sine, squared; the negative half = dark pause (firefly "off")
    const s = Math.sin(ft * (0.04 + 0.05 * R('ft')) + R('p5') * TAU);
    const op = s > 0 ? 0.08 + 0.92 * s * s : 0.04;
    return {x, y, r: u(2 + 2 * R('r')), op, glow: true};
  }

  if (type === 'dust') {
    const bx = R('x') * w;
    const by = R('y') * h;
    const vy = u(0.15 + 0.35 * R('v')) * speed; // rises slowly
    const vx = u(-0.2 + 0.4 * R('vx')) * speed;
    const x = wrap(bx + f * vx + Math.sin(ft * 0.02 + R('p1') * TAU) * u(20), -m, w + m);
    const y = wrap(by - f * vy, -m, h + m);
    const op = (0.15 + 0.35 * R('o')) * (0.6 + 0.4 * Math.sin(ft * 0.05 + R('p2') * TAU));
    return {x, y, r: u(0.8 + 1.8 * R('r')), op, glow: false};
  }

  if (type === 'embers') {
    const life = 90 + 120 * R('life'); // frames from spawn to fade-out
    const t = (((ft + R('ph') * life) % life) + life) % life / life; // 0..1 along its life, loops forever
    const bx = R('x') * w;
    const rise = h * (0.55 + 0.4 * R('rise'));
    const x = bx + Math.sin(t * 6 + R('p1') * TAU) * u(30) + t * u(40) * (R('d') * 2 - 1);
    const y = h * 1.02 - t * rise;
    const flicker = 0.7 + 0.3 * Math.sin(ft * 0.6 + R('p2') * TAU);
    const op = Math.pow(Math.sin(Math.PI * t), 0.7) * flicker;
    return {x, y, r: u(2 + 3 * R('r')) * (1 - 0.6 * t), op, glow: true};
  }

  if (type === 'bats') {
    const cross = 140 + 160 * R('cross'); // frames to cross the frame
    const cycle = cross * (1.4 + 1.6 * R('gap')); // crossing + pause
    const local = (((ft + R('ph') * cycle) % cycle) + cycle) % cycle;
    if (local >= cross) return {visible: false};
    const k = local / cross;
    const dir = R('dir') < 0.5 ? 1 : -1;
    const x = dir > 0 ? -m + (w + 2 * m) * k : w + m - (w + 2 * m) * k;
    const y = h * (0.08 + 0.32 * R('y')) + Math.sin(k * TAU * (2 + 3 * R('wav')) + R('p1') * TAU) * u(40);
    const span = u(70 + 50 * R('s')); // wing span in px
    const flap = Math.sin(ft * 0.5 + R('p2') * TAU);
    return {visible: true, x, y, span, flap, dir};
  }

  if (type === 'rain') {
    const tanA = 0.22; // ~12.4 degrees of slant
    const v = u(28 + 22 * R('v')) * speed;
    const len = u(38 + 50 * R('len'));
    const P = h + 2 * len;
    const y = wrap(R('y') * P + f * v, -len, h + len);
    const x = (R('x') * (w + h * tanA) - h * tanA) + y * tanA;
    const a = Math.atan(tanA);
    return {
      x1: x,
      y1: y,
      x2: x - Math.sin(a) * len,
      y2: y - Math.cos(a) * len,
      op: 0.18 + 0.3 * R('o'),
      sw: Math.max(1, u(1 + 1.2 * R('w'))),
    };
  }
  return {visible: false};
}

// bat silhouette in a 100-unit-wide local box, flap = -1..1 (wings up/down)
const batPath = (fl) => {
  const up = -24 * fl - 6;
  const tip = -16 * fl + 2;
  const wing = (s) =>
    `M ${-4 * s} 0 Q ${-22 * s} ${up} ${-50 * s} ${tip} Q ${-38 * s} -2 ${-30 * s} 6 Q ${-22 * s} 2 ${-14 * s} 8 Q ${-8 * s} 4 ${-4 * s} 10 Z`;
  return `${wing(1)} ${wing(-1)}`;
};

// ---------------------------------------------------------------- component
export const FxParticles = ({type = 'fireflies', count = 40, color, speed = 1, seed = 'a'}) => {
  const f = useCurrentFrame();
  const L = useLayout();
  const n = Math.max(0, Math.min(maxCount(type), Math.round(count)));
  if (n === 0) return null;
  const col = color || defaultColor(type);
  const ctx = {w: L.width, h: L.height, u: L.u, speed, seed};

  const els = [];
  for (let i = 0; i < n; i++) {
    const p = particleAt(type, i, f, ctx);
    if (p.visible === false) continue;
    if (type === 'rain') {
      els.push(
        <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={col} strokeWidth={p.sw} strokeLinecap="round" opacity={p.op} />
      );
    } else if (type === 'bats') {
      const sc = p.span / 100;
      els.push(
        <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${sc.toFixed(3)} ${sc.toFixed(3)})`}>
          <path d={batPath(p.flap)} fill={col} stroke={COLORS.ghost} strokeOpacity="0.35" strokeWidth={Math.max(1, 1.2 / sc)} />
          <ellipse cx="0" cy="2" rx="6" ry="10" fill={col} stroke={COLORS.ghost} strokeOpacity="0.35" strokeWidth={Math.max(1, 1.2 / sc)} />
          <path d="M -4 -7 L -3 -15 L 0 -9 L 3 -15 L 4 -7 Z" fill={col} />
        </g>
      );
    } else if (p.glow) {
      els.push(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.r * 4} fill={col} opacity={p.op * 0.1} />
          <circle cx={p.x} cy={p.y} r={p.r * 2.2} fill={col} opacity={p.op * 0.22} />
          <circle cx={p.x} cy={p.y} r={p.r} fill={col} opacity={p.op} />
        </g>
      );
    } else {
      els.push(<circle key={i} cx={p.x} cy={p.y} r={p.r} fill={col} opacity={p.op} />);
    }
  }

  return (
    <AbsoluteFill style={{zIndex: LAYERS.fx, pointerEvents: 'none', overflow: 'hidden'}}>
      <svg width={L.width} height={L.height} style={{position: 'absolute', left: 0, top: 0}}>
        {els}
      </svg>
    </AbsoluteFill>
  );
};

export default FxParticles;
