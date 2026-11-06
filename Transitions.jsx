// Transitions.jsx (Step 15) — scene transitions: FadeInOut, GlitchBurst, FlashCut, WipeInk.
// Exports : FadeInOut, GlitchBurst, FlashCut, WipeInk (named; default = object with all four)
//           pure helpers: fadeAlpha, flashAlpha, glitchState, inkProgress, inkBlobs, blobPath  (testable in Node)
// Frames  : every frame number (`at`, `from`) is LOCAL to the enclosing <Sequence> (useCurrentFrame()), like Camera.
//           Mount transitions inside the <Sequence> of the scene they belong to, or at the top level of Story.jsx with absolute frames.
// Layer   : overlays are full-bleed AbsoluteFill, zIndex = LAYERS.transition (above captions + film), pointerEvents none, no text,
//           no key art. Outside their short animation window they render nothing (null) — except WipeInk with
//           hold=true, which keeps the frame covered after a 'cover' wipe (see below).
// Props   :
//   <FadeInOut inFrames=8 outFrames=8 color={COLORS.ink}>children?</FadeInOut>
//        with children  -> fades the children in at frame 0 (opacity 0 -> 1 over inFrames) and out at the end of the Sequence
//                          (1 -> 0, reaching exactly 0 on the LAST frame); wrap ONE scene (scene fade).
//        without children -> "dip to colour" overlay: same timing, but the `color` veil is opaque at the first/last frame.
//   <GlitchBurst at={frame | [frames]} length=6 intensity=1 seed="a"/>
//        RGB-split look as an OVERLAY (no children, nothing is duplicated): red/cyan screen-blended bands pushed sideways in opposite
//        directions + a few dark tear slices, re-rolled every frame (deterministic per frame), strongest on the first frame.
//   <FlashCut at={frame | [frames]} color="#ffffff" length=8 peak=0.95/>
//        full-frame colour flash: hits `peak` on frame `at`, decays to 0 over `length` frames. Use '#ff2d3d' for a blood flash.
//   <WipeInk from={frame} length=14 mode="cover|reveal" hold=true color={COLORS.ink} rim={COLORS.blood} seed="a"/>
//        ink-blot wipe: 5 organic blobs spread from seeded points and merge until the frame is fully covered ('cover') or recede
//        until it is clear ('reveal'). Blobs are SVG paths (no filters, no blur). `rim` = thin coloured edge under the ink (null = none).
//        hold=true: 'cover' stays covered after `from+length`, 'reveal' is covered before `from` — so a cover at the end of scene A
//        and a reveal at the start of scene B join with no gap. Place it only in the scene's own Sequence so the hold cannot leak.
// Rules   : deterministic — only useCurrentFrame() + random('seed-string'); no Math.random, no CSS animation/transition, no filters.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, LAYERS, useLayout} from './theme.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const smooth = (t) => t * t * (3 - 2 * t); // smoothstep
const list = (v) => (Array.isArray(v) ? v : [v]).filter((x) => typeof x === 'number' && Number.isFinite(x));
const overlay = {zIndex: LAYERS.transition, pointerEvents: 'none'};

// ---------------------------------------------------------------- FadeInOut
// Visible amount 0..1 at frame f of a Sequence lasting `dur` frames. 0 on frame 0 (if inF>0) and on the last frame (if outF>0).
export function fadeAlpha(f, dur, inF = 8, outF = 8) {
  const a = inF > 0 ? clamp01(f / inF) : 1;
  const b = outF > 0 ? clamp01((dur - 1 - f) / outF) : 1;
  return smooth(Math.min(a, b));
}

export function FadeInOut({inFrames = 8, outFrames = 8, color = COLORS.ink, children}) {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const vis = fadeAlpha(f, durationInFrames, num(inFrames, 8), num(outFrames, 8));
  if (children !== undefined && children !== null) {
    return <AbsoluteFill style={{opacity: vis}}>{children}</AbsoluteFill>;
  }
  if (vis >= 1) return null;
  return <AbsoluteFill style={{...overlay, backgroundColor: color, opacity: 1 - vis}} />;
}

// ---------------------------------------------------------------- FlashCut
// Flash opacity at frame f for a flash at frame `at`: 0 before, `peak` on `at`, linear decay to 0 after `length` frames.
export function flashAlpha(f, at, length = 8, peak = 0.95) {
  const k = f - at;
  if (k < 0 || k >= length || !(length > 0)) return 0;
  return clamp01(peak) * (1 - k / length);
}

export function FlashCut({at = 0, color = '#ffffff', length = 8, peak = 0.95}) {
  const f = useCurrentFrame();
  const a = Math.max(0, ...list(at).map((t) => flashAlpha(f, t, num(length, 8), num(peak, 0.95))));
  if (a <= 0) return null;
  return <AbsoluteFill style={{...overlay, backgroundColor: color, opacity: a}} />;
}

// ---------------------------------------------------------------- GlitchBurst
// State for frame f: {active, strength 0..1, bands[]}; each band = {x, y, w, h, dx, color, opacity, dark}. Pure + deterministic.
export function glitchState(f, at, length, {width, height, u, intensity = 1, seed = 'a'}) {
  const len = Math.max(1, Math.round(num(length, 6)));
  let k = -1;
  for (const t of list(at)) if (f >= t && f < t + len) k = f - t;
  if (k < 0) return {active: false, strength: 0, bands: []};
  const strength = (1 - k / len) * clamp01(num(intensity, 1)); // 1 on the first frame, fading
  const R = (i, what) => random(`gl-${seed}-${f}-${i}-${what}`);
  const n = Math.round(4 + 5 * clamp01(num(intensity, 1)));
  const bands = [];
  for (let i = 0; i < n; i++) {
    const dark = i >= n - 2; // the last 2 bands are dark "tear" slices
    const h = u(6 + 56 * R(i, 'h')) * (0.5 + 0.5 * strength);
    const dir = (R(i, 'd') < 0.5 ? -1 : 1) * (i % 2 ? 1 : -1);
    bands.push({
      x: 0, y: R(i, 'y') * (height - h), w: width, h,
      dx: dir * u(14 + 64 * R(i, 'dx')) * strength,
      color: dark ? COLORS.ink : i % 2 ? COLORS.ghost : COLORS.blood,
      opacity: (dark ? 0.55 : 0.28 + 0.34 * R(i, 'o')) * (0.4 + 0.6 * strength),
      dark,
    });
  }
  return {active: true, strength, bands};
}

export function GlitchBurst({at = 0, length = 6, intensity = 1, seed = 'a'}) {
  const f = useCurrentFrame();
  const L = useLayout();
  const g = glitchState(f, at, length, {width: L.width, height: L.height, u: L.u, intensity, seed});
  if (!g.active) return null;
  return (
    <AbsoluteFill style={overlay}>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{display: 'block'}}>
        {g.bands.map((b, i) => (
          <rect
            key={i} x={b.x + b.dx} y={b.y} width={b.w} height={b.h} fill={b.color} opacity={b.opacity}
            style={b.dark ? undefined : {mixBlendMode: 'screen'}}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------- WipeInk
const AMP = 0.16; // blob edge wobble: radius factor stays within [1-AMP, 1+AMP]
const NBLOB = 5;
const NPTS = 36;

// Coverage 0..1 of the ink at frame f. 'cover': 0 before `from`, 1 from `from+length` (hold) ; 'reveal': mirrored (1 -> 0).
export function inkProgress(f, from, length, mode = 'cover', hold = true) {
  const len = Math.max(1, num(length, 14));
  const p = clamp01((f - from) / len);
  if (mode === 'reveal') return !hold && f < from ? 0 : 1 - p;
  return !hold && f >= from + len ? 0 : p;
}

// Seeded blob specs. Every blob can, at p = 1, cover the whole frame by itself (final radius reaches the farthest corner even at
// the thinnest edge wobble), so full coverage is guaranteed and there is no pop when the hold rectangle takes over.
export function inkBlobs({width, height, seed = 'a'}) {
  const out = [];
  for (let i = 0; i < NBLOB; i++) {
    const R = (what) => random(`ink-${seed}-${i}-${what}`);
    const cx = width * (0.12 + 0.76 * R('x'));
    const cy = height * (0.12 + 0.76 * R('y'));
    const far = Math.max(Math.hypot(cx, cy), Math.hypot(width - cx, cy), Math.hypot(cx, height - cy), Math.hypot(width - cx, height - cy));
    out.push({cx, cy, delay: 0.45 * R('d'), full: (far * 1.01) / (1 - AMP), pa: R('pa') * Math.PI * 2, pb: R('pb') * Math.PI * 2});
  }
  return out;
}

// Closed organic polygon (SVG path string) for blob b at overall progress p (0..1); '' when its radius is ~0.
export function blobPath(b, p) {
  const q = clamp01((p - b.delay) / (1 - b.delay));
  const r = b.full * smooth(q);
  if (r < 0.5) return '';
  let d = '';
  for (let k = 0; k < NPTS; k++) {
    const th = (k / NPTS) * Math.PI * 2;
    const j = 1 + AMP * (0.6 * Math.sin(3 * th + b.pa) + 0.4 * Math.sin(5 * th + b.pb));
    d += `${k ? 'L' : 'M'}${(b.cx + Math.cos(th) * r * j).toFixed(1)} ${(b.cy + Math.sin(th) * r * j).toFixed(1)}`;
  }
  return d + 'Z';
}

export function WipeInk({from = 0, length = 14, mode = 'cover', hold = true, color = COLORS.ink, rim = COLORS.blood, seed = 'a'}) {
  const f = useCurrentFrame();
  const L = useLayout();
  const p = inkProgress(f, num(from, 0), length, mode, hold !== false);
  if (p <= 0) return null;
  if (p >= 1) return <AbsoluteFill style={{...overlay, backgroundColor: color}} />;
  const blobs = inkBlobs({width: L.width, height: L.height, seed});
  const rimW = L.u(5);
  const paths = blobs.map((b) => blobPath(b, p)).filter(Boolean);
  return (
    <AbsoluteFill style={overlay}>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{display: 'block'}}>
        {/* pass 1: rim (thick stroke + fill) of every blob; pass 2: ink on top, so the rim only shows on the outer edge of the merged shape */}
        {rim ? paths.map((d, i) => <path key={`r${i}`} d={d} fill={rim} stroke={rim} strokeWidth={rimW * 2} strokeLinejoin="round" />) : null}
        {paths.map((d, i) => <path key={`i${i}`} d={d} fill={color} />)}
      </svg>
    </AbsoluteFill>
  );
}

export default {FadeInOut, GlitchBurst, FlashCut, WipeInk};
