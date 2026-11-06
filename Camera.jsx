// Camera.jsx (Step 14) — virtual camera: zoom / pan / roll (rotate) / handheld shake applied to everything inside it.
// Exports : Camera (named + default), cameraState(f, props, w, h, u), shakeOffsets(f, amount, opts), easeFn(name),
//           progressAt(f, from, to, easing), normPair(v, fallback), normPan(pan), overscanFor(...)  (pure, testable in Node)
// Props   : { zoom = [1,1], pan = [[0,0],[0,0]], rotate = [0,0], shake = 0, from = 0, to = (last frame), easing = 'inOut',
//             origin = [50,50], shakeSpeed = 1, seed = 'a', edgeSafe = true, children }
//             zoom   -> [a,b] scale at `from` -> `to` (a number = constant). 1 = normal, 1.15 = push-in. Values < 1 show the frame edge.
//             pan    -> [[x1,y1],[x2,y2]] content translation in % of the composition WIDTH (both axes, contract 6.4);
//                       negative x = content slides left. A single [x,y] = constant pan.
//             rotate -> [a,b] roll in degrees (a number = constant). Small values only (±3°).
//             shake  -> 0..1 handheld/earthquake amount, or [a,b] ramp over from->to. Smooth noise (@remotion/noise), not random jitter.
//             from/to-> frame range of the move, in the LOCAL frame of the enclosing <Sequence>; before `from` the start values are
//                       held, after `to` the end values are held. `to` defaults to the last frame of the Sequence.
//             easing -> 'inOut' (default, smooth start+stop) | 'in' | 'out' | 'linear'
//             origin -> zoom focal point in % of the frame, [50,50] = centre (e.g. [70,45] to push in toward a lit window)
//             edgeSafe -> true: adds a constant extra zoom so roll + shake never reveal the frame edge (computed from the max values)
//             shakeSpeed/seed -> noise speed multiplier / any string to get a different shake pattern per scene
// Use     : wrap the SCENE LAYERS only (background + characters + fx that should move with the world). Do NOT wrap Captions,
//           FxFilm or transitions — captions must stay fixed in their band (no-overlap rule). Children keep their own z-index
//           (the wrapper forms one stacking context, so relative order inside it is unchanged).
// Rules   : deterministic — only useCurrentFrame() and a seeded noise; no Math.random, no CSS animation/transition. No SVG filters.
// Notes   : pan is not auto-compensated; pair a pan with zoom >= 1 + 2*|pan|/100 if the frame edge must stay hidden.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {useLayout} from './theme.js';

const SHAKE_PX = 14; // max shake translation at shake = 1 (in u() units, i.e. resolution independent)
const SHAKE_DEG = 1.2; // max shake roll at shake = 1
const SHAKE_FREQ = 0.06; // noise steps per frame (~16-frame wobble period)

// ---------------------------------------------------------------- pure helpers (no React)
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// number -> [n,n]; [a,b] -> [a,b]; anything else -> fallback. Non-finite entries fall back too.
export function normPair(v, fallback) {
  if (typeof v === 'number') return [num(v, fallback[0]), num(v, fallback[0])];
  if (Array.isArray(v) && v.length >= 2) return [num(v[0], fallback[0]), num(v[1], fallback[1])];
  return [fallback[0], fallback[1]];
}

// [[x1,y1],[x2,y2]] | [x,y] | undefined -> [[x1,y1],[x2,y2]]
export function normPan(pan) {
  if (Array.isArray(pan) && Array.isArray(pan[0]) && Array.isArray(pan[1])) {
    return [normPair(pan[0], [0, 0]), normPair(pan[1], [0, 0])];
  }
  if (Array.isArray(pan) && pan.length >= 2 && typeof pan[0] === 'number') {
    const p = normPair(pan, [0, 0]);
    return [p, p];
  }
  return [[0, 0], [0, 0]];
}

const EASINGS = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
export const easeFn = (name) => EASINGS[name] || EASINGS.inOut;

// 0..1 eased progress of frame f inside [from, to]; held at 0 before `from` and at 1 from `to` on. to <= from = hard cut at `from`.
export function progressAt(f, from, to, easing = 'inOut') {
  if (!(to > from)) return f >= from ? 1 : 0;
  return easeFn(easing)(clamp((f - from) / (to - from), 0, 1));
}

// Smooth handheld shake: offsets in px (x, y) and degrees (r) for frame f. amount 0 -> exactly zeros.
// Two noise octaves (slow sway + a little fast tremble) per channel; every channel stays within ±1 before scaling.
export function shakeOffsets(f, amount, {u = (n) => n, speed = 1, seed = 'a'} = {}) {
  const a = clamp(num(amount, 0), 0, 1);
  if (a === 0) return {x: 0, y: 0, r: 0};
  const t = f * SHAKE_FREQ * num(speed, 1);
  const ch = (k) => 0.75 * noise2D(`cam-${seed}-${k}`, t, 0) + 0.25 * noise2D(`cam-${seed}-${k}b`, t * 3.1 + 17, 0);
  return {x: ch('x') * u(SHAKE_PX) * a, y: ch('y') * u(SHAKE_PX) * a, r: ch('r') * SHAKE_DEG * a};
}

// Constant extra zoom so that roll (max |deg|) and shake (max amount) never uncover the frame edge.
// Rotated-rect coverage: s >= cos(t) + (long/short) * sin(t); shake adds 2*maxShiftPx/short on top.
export function overscanFor({width, height, u, maxRollDeg, maxShake}) {
  const th = (Math.abs(maxRollDeg) + SHAKE_DEG * maxShake) * (Math.PI / 180);
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const rollScale = Math.cos(th) + (long / short) * Math.sin(th);
  return Math.max(1, rollScale + (2 * u(SHAKE_PX) * maxShake) / short);
}

// Full camera transform for frame f (local to the enclosing Sequence). Returns numbers only.
export function cameraState(f, props = {}, w = 1080, h = 1920, u = (n) => n) {
  const zoom = normPair(props.zoom, [1, 1]);
  const rot = normPair(props.rotate, [0, 0]);
  const pan = normPan(props.pan);
  const shk = normPair(props.shake, [0, 0]).map((v) => clamp(v, 0, 1));
  const from = num(props.from, 0);
  const to = num(props.to, from);
  const p = progressAt(f, from, to, props.easing);
  const lerp = (a, b) => a + (b - a) * p;

  const sh = shakeOffsets(f, lerp(shk[0], shk[1]), {u, speed: props.shakeSpeed, seed: props.seed});
  const edgeSafe = props.edgeSafe !== false;
  const over = edgeSafe
    ? overscanFor({width: w, height: h, u, maxRollDeg: Math.max(Math.abs(rot[0]), Math.abs(rot[1])), maxShake: Math.max(shk[0], shk[1])})
    : 1;

  const scale = Math.max(0.01, lerp(zoom[0], zoom[1])) * over;
  const origin = normPair(props.origin, [50, 50]);
  // zoom about the focal point instead of the centre: scaling about O = scaling about C + (1 - s)(O - C)
  const focalX = ((origin[0] - 50) / 100) * w * (1 - scale);
  const focalY = ((origin[1] - 50) / 100) * h * (1 - scale);
  return {
    scale,
    rot: lerp(rot[0], rot[1]) + sh.r,
    tx: (lerp(pan[0][0], pan[1][0]) / 100) * w + sh.x + focalX,
    ty: (lerp(pan[0][1], pan[1][1]) / 100) * w + sh.y + focalY, // % of WIDTH on both axes (contract 6.4)
    overscan: over,
    progress: p,
  };
}

// ---------------------------------------------------------------- component
export function Camera({children, ...props}) {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const L = useLayout();
  const to = typeof props.to === 'number' ? props.to : Math.max(0, durationInFrames - 1);
  const s = cameraState(f, {...props, to}, L.width, L.height, L.u);
  const transform = `translate(${s.tx.toFixed(2)}px, ${s.ty.toFixed(2)}px) rotate(${s.rot.toFixed(3)}deg) scale(${s.scale.toFixed(4)})`;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform, transformOrigin: '50% 50%', willChange: 'transform'}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

export default Camera;
