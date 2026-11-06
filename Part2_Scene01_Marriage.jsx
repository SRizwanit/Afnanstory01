// Part2_Scene01_Marriage.jsx (Step P2.5) — Part 2, scene 1 "marriage" (words 0–7: "বড় এবং মেজো ছেলেকে প্রহ্লাদ বিশ্বাস বিয়ে দিয়েছেন।").
//   Dark wedding mandap at night: bamboo pillars + marigold garland swag, two oil lamps (diya), warm red glow; the eldest son (প্রভাস) pops in on "বড়",
//   the middle son (পঙ্কজ) on "মেজো", প্রহ্লাদ on his name, the two brides (generic `bou`, veil + sindoor) on "বিয়ে" together with the title; on "দিয়েছেন"
//   the lamps flare, a warm flash + red vignette pulse hit and the brides / পঙ্কজ turn worried (first sign that something is wrong).
// Exports : named + default `Part2_Scene01_Marriage` ({scene, data}); pure helpers (testable in Node):
//           wfOf(data, scene, i), cleanWord(text), findWord(data, scene, test), cueOf(data, scene, test, fb),
//           marriageCues(data, scene) -> {provas, pankaj, pralhad, bou1, bou2, title, flare, len}   (all LOCAL frames)
//           marriageSlots(L) -> {pralhad, provas, bou1, bou2, pankaj}  each {x, y, scale, flip} (% of the CONTENT zone)
//           charRect(L, slot), garlandBox(L), titleBox(L), diyaSlots(L), pillarRects(L), moodFor(id, f, flare)
//           titleState(f, at), spikeAt(f, at, len), flickerAt(f, phase, flare), garlandBlobs(L, f), garlandDrops(L, f), swagY(L, t), CAMERA_ZOOM
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={scene.endFrame-scene.startFrame}>; every frame here
//           is LOCAL (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : horror2 → provas wf(0)=5 · pankaj wf(2)=21 · pralhad wf(4)=47 (byWord) · title + bou1 wf(6)=71 · bou2 wf(6)+3=74 · flare wf(7)=78; scene length 111.
//           Cues come from story_data.json (fallbacks = range offsets 0 / 2 / 4 / 6 / 7); the sons are NOT named in the audio, so they pop on "বড়" / "মেজো".
// Layout  : only useLayout(). VERTICAL = two rows: প্রহ্লাদ top (x50, feet y 62 %, scale 0.6) with the lamps beside him (x33 / x67); the couples bottom
//           (provas x13 · bou1 x35 · bou2 x65 · pankaj x87, feet y 100 %, scale 0.7). HORIZONTAL = one row of five (provas 14 · bou1 32 · pralhad 50 ·
//           bou2 68 · pankaj 86, feet y 92 %, scale 1.0) with the lamps in the gaps (x41 / x59). Couples face each other (`flip`). The garland hangs in the top
//           12 % of the content zone, the title (one word) sits under it, above every character frame (also after the 1.05 camera zoom). Nothing enters the caption band.
// Camera  : slow push-in 1 → 1.05, origin = the feet line of the lowest row, so the feet never move and nobody grows into the caption band.
// Rules   : deterministic (useCurrentFrame / interpolate / random('seed') only); no Math.random, no CSS animation, no SVG filters.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {Camera} from './Camera.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {FxFog} from './Fx_Fog.jsx';
import {FlashCut} from './Transitions.jsx';
import {Character, byWord} from './Characters.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const f2 = (v) => (Math.round(v * 100) / 100).toString();
export const CAMERA_ZOOM = [1, 1.05];

// ---- word-sync helpers (LOCAL frames) ----
export const wfOf = (data, scene, i) => data.words[i].startFrame - scene.startFrame;
export const cleanWord = (t) => String(t || '').normalize('NFC').replace(/[\s।,.!?;:'"“”‘’\-–—]/g, '');
export function findWord(data, scene, test) {
  const [a, b] = scene.wordRange;
  for (let i = a; i <= b; i++) if (test(data.words[i], i)) return i;
  return -1;
}
export function cueOf(data, scene, test, fb = 0) {
  const i = findWord(data, scene, test);
  return wfOf(data, scene, i >= 0 ? i : Math.min(scene.wordRange[1], scene.wordRange[0] + fb));
}
export function marriageCues(data, scene) {
  const a = scene.wordRange[0], len = scene.endFrame - scene.startFrame;
  const at = (off) => wfOf(data, scene, Math.min(scene.wordRange[1], a + off));
  const title = cueOf(data, scene, (w) => cleanWord(w.text) === 'বিয়ে', 6);
  return {
    provas: at(0), pankaj: at(2), pralhad: cueOf(data, scene, (w) => byWord(w.text) === 'pralhad', 4),
    bou1: title, bou2: title + 3, title, flare: at(7), len,
  };
}

// ---- layout ----
export function marriageSlots(L) {
  if (L.isVertical) {
    return {
      pralhad: {x: 50, y: 62, scale: 0.6, flip: false},
      provas: {x: 13, y: 100, scale: 0.7, flip: false}, bou1: {x: 35, y: 100, scale: 0.7, flip: true},
      bou2: {x: 65, y: 100, scale: 0.7, flip: false}, pankaj: {x: 87, y: 100, scale: 0.7, flip: true},
    };
  }
  return {
    provas: {x: 14, y: 92, scale: 1, flip: false}, bou1: {x: 32, y: 92, scale: 1, flip: true}, pralhad: {x: 50, y: 92, scale: 1, flip: false},
    bou2: {x: 68, y: 92, scale: 1, flip: false}, pankaj: {x: 86, y: 92, scale: 1, flip: true},
  };
}
// CharFrame maths: height = content.height × 0.5 × scale, width = 4/7 of it, x centred, y = feet baseline
export function charRect(L, s) {
  const h = L.content.height * 0.5 * s.scale, w = (h * 4) / 7, cx = L.cx(s.x), feet = L.cy(s.y);
  return {left: cx - w / 2, right: cx + w / 2, top: feet - h, bottom: feet};
}
export function garlandBox(L) {
  const h = L.content.height * (L.isVertical ? 0.12 : 0.12);
  return {left: L.content.left, right: L.content.right, top: L.content.top, height: h, bottom: L.content.top + h};
}
export function titleBox(L) {
  const {u, isVertical: v} = L, g = garlandBox(L), fs = u(v ? 78 : 80), top = g.bottom + u(8);
  return {fs, top, height: fs * 1.45, bottom: top + fs * 1.45, cx: L.cx(50), maxWidth: L.content.width * 0.92};
}
// the two oil lamps (centre x, base y, half-width) — beside প্রহ্লাদ (vertical) / in the gaps of the row (horizontal)
export function diyaSlots(L) {
  const u = L.u, half = u(18);
  const xs = L.isVertical ? [33, 67] : [41, 59], y = L.isVertical ? 62 : 92;
  return xs.map((x, i) => ({i, cx: L.cx(x), base: L.cy(y) - u(4), half, top: L.cy(y) - u(4) - u(64)}));
}
export function pillarRects(L) {
  const u = L.u, w = u(18), top = L.content.top - u(26), bottom = L.cy(100) + u(10);
  return [L.cx(1.5), L.cx(98.5)].map((cx) => ({left: cx - w / 2, right: cx + w / 2, top, bottom}));
}

// ---- timing / animation ----
export function titleState(f, at) {
  const t = f - at;
  if (t < 0) return {on: false, scale: 1, op: 0, glow: 0, line: 0};
  return {on: true, scale: 1.7 - 0.7 * ease(t / 7), op: clamp01(t / 3), glow: 0.5 + 0.5 * (1 - clamp01(t / 18)), line: ease(t / 12)};
}
// 0 before `at`, 1 on the frame `at`, linear decay to 0 over `len` frames
export const spikeAt = (f, at, len = 12) => (f < at ? 0 : clamp01(1 - (f - at) / Math.max(1, len)));
// lamp brightness 0.55–1.25: base + two sines + rare dips (re-rolled every 3 frames); flare adds up to +0.4
export function flickerAt(f, phase, flare = 0) {
  const dip = random(`mar-dip-${phase}-${Math.floor(f / 3)}`) < 0.08 ? 0.2 : 0;
  const v = 0.86 + 0.07 * Math.sin(f * 0.31 + phase) + 0.05 * Math.sin(f * 0.77 + phase * 2) - dip + 0.4 * clamp01(flare);
  return Math.max(0.55, Math.min(1.25, v));
}
// moods: everybody calm until "দিয়েছেন"; then both brides and পঙ্কজ look worried
export function moodFor(id, f, flare) {
  if (f < flare) return 'calm';
  return id === 'bou1' || id === 'bou2' || id === 'pankaj' ? 'worried' : 'calm';
}

// ---- garland (marigold swag across the top + hanging strands) ----
export function swagY(L, t) {
  const g = garlandBox(L), s = 2 * t - 1;
  return g.top + L.u(8) + g.height * 0.36 * (1 - s * s);
}
const MARI = ['#ff9a1f', '#ffc93c', '#e8590c', '#ffb020'];
export function garlandBlobs(L, f, n = 34) {
  const out = [], g = garlandBox(L), u = L.u;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), sway = Math.sin(f * 0.04 + i * 0.7) * u(1.6);
    out.push({x: g.left + (g.right - g.left) * t + sway * 0.4, y: swagY(L, t) + sway, r: u(9 + (i % 3)), c: MARI[i % 4]});
  }
  return out;
}
export function garlandDrops(L, f, n = 9) {
  const out = [], g = garlandBox(L), u = L.u;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, len = g.height * (0.34 + 0.14 * random(`mar-drop-${k}`)), y0 = swagY(L, t);
    const cnt = 3 + (k % 3), room = g.bottom - u(4) - y0, step = Math.min(u(17), room / cnt), sway = Math.sin(f * 0.05 + k) * u(2);
    for (let j = 1; j <= cnt && j * step <= Math.min(len, room); j++) out.push({x: g.left + (g.right - g.left) * t + sway * (j / cnt), y: y0 + j * step, r: u(8 - j * 0.6), c: MARI[(k + j) % 4]});
  }
  return out;
}

function Backdrop({flare}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L, g = garlandBox(L), P = pillarRects(L), D = diyaSlots(L);
  const blobs = garlandBlobs(L, f), drops = garlandDrops(L, f);
  const glow = 0.5 + 0.5 * flare, gcx = L.cx(50), gcy = L.cy(L.isVertical ? 62 : 62), gr = L.content.width * 0.62;
  return (
    <AbsoluteFill style={{zIndex: LAYERS.bg}}>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id="mar-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a0509" /><stop offset="0.45" stopColor="#260a15" /><stop offset="1" stopColor="#0b0408" />
          </linearGradient>
          <radialGradient id="mar-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff5a28" stopOpacity={f2(0.3 * glow)} /><stop offset="0.6" stopColor="#8a1020" stopOpacity={f2(0.12 * glow)} /><stop offset="1" stopColor="#8a1020" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mar-pillar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#120805" /><stop offset="0.45" stopColor="#4a2a1a" /><stop offset="1" stopColor="#1a0c07" />
          </linearGradient>
          <radialGradient id="mar-lamp" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffb020" stopOpacity="0.55" /><stop offset="0.5" stopColor="#ff7a18" stopOpacity="0.18" /><stop offset="1" stopColor="#ff7a18" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={L.width} height={L.height} fill="url(#mar-bg)" />
        <ellipse cx={f2(gcx)} cy={f2(gcy)} rx={f2(gr)} ry={f2(gr * 0.8)} fill="url(#mar-glow)" />
        {P.map((p, i) => (
          <g key={i}>
            <rect x={f2(p.left)} y={f2(p.top)} width={f2(p.right - p.left)} height={f2(p.bottom - p.top)} fill="url(#mar-pillar)" />
            {[0.2, 0.4, 0.6, 0.8].map((k) => <rect key={k} x={f2(p.left - u(2))} y={f2(p.top + (p.bottom - p.top) * k)} width={f2(p.right - p.left + u(4))} height={f2(u(6))} fill="#d9b44a" opacity="0.35" />)}
          </g>
        ))}
        <rect x={f2(P[0].left)} y={f2(g.top - u(4))} width={f2(P[1].right - P[0].left)} height={f2(u(10))} fill="#2a150d" />
        <path d={blobs.map((b, i) => `${i ? 'L' : 'M'}${f2(b.x)} ${f2(b.y)}`).join(' ')} stroke="#2f5a2a" strokeWidth={f2(u(4))} fill="none" opacity="0.8" />
        {blobs.map((b, i) => <circle key={`b${i}`} cx={f2(b.x)} cy={f2(b.y)} r={f2(b.r)} fill={b.c} opacity="0.92" />)}
        {drops.map((b, i) => <circle key={`d${i}`} cx={f2(b.x)} cy={f2(b.y)} r={f2(b.r)} fill={b.c} opacity="0.88" />)}
        {D.map((d) => {
          const fl = flickerAt(f, d.i * 1.7, flare), r = u(120) * fl;
          return (
            <g key={d.i}>
              <circle cx={f2(d.cx)} cy={f2(d.base - u(22))} r={f2(r)} fill="url(#mar-lamp)" />
              <path d={`M${f2(d.cx - d.half)} ${f2(d.base - u(10))} Q${f2(d.cx)} ${f2(d.base + u(8))} ${f2(d.cx + d.half)} ${f2(d.base - u(10))} Z`} fill="#8a3a1a" />
              <ellipse cx={f2(d.cx)} cy={f2(d.base - u(10))} rx={f2(d.half)} ry={f2(u(4))} fill="#3a1608" />
              <path d={`M${f2(d.cx)} ${f2(d.base - u(48) * Math.min(1.2, fl))} Q${f2(d.cx + u(9))} ${f2(d.base - u(24))} ${f2(d.cx)} ${f2(d.base - u(12))} Q${f2(d.cx - u(9))} ${f2(d.base - u(24))} ${f2(d.cx)} ${f2(d.base - u(48) * Math.min(1.2, fl))} Z`} fill="#ffd25a" opacity={f2(Math.min(1, fl))} />
              <ellipse cx={f2(d.cx)} cy={f2(d.base - u(20))} rx={f2(u(3.5))} ry={f2(u(8))} fill="#fff4c8" opacity={f2(Math.min(1, fl))} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

export function Part2_Scene01_Marriage({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const C = marriageCues(data, scene), len = C.len, S = marriageSlots(L), T = titleBox(L), ts = titleState(f, C.title);
  const spike = spikeAt(f, C.flare, 12), vig = 0.1 + 0.05 * Math.sin(f * 0.09) + 0.35 * spike + 0.12 * clamp01((f - C.flare) / Math.max(1, len - C.flare));
  const low = Object.values(S).reduce((m, s) => Math.max(m, charRect(L, s).bottom), 0), feetPct = (100 * low) / L.height;
  const cast = [['provas', C.provas, 'provas'], ['pankaj', C.pankaj, 'pankaj'], ['pralhad', C.pralhad, 'pralhad'], ['bou1', C.bou1, 'bou'], ['bou2', C.bou2, 'bou']];
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={CAMERA_ZOOM} origin={[50, feetPct]} from={0} to={len} easing="inOut">
        <Backdrop flare={spike} />
        <FxFog layers={2} density={0.2} color="#9a5a5a" speed={0.8} />
        <FxParticles type="embers" count={18} color={COLORS.amber} speed={0.7} seed="wedding" />
        {cast.map(([key, at, id]) => {
          const s = S[key];
          return <Character key={key} id={id} x={s.x} y={s.y} scale={s.scale} flip={s.flip} mood={moodFor(key, f, C.flare)} appearAt={at} seed={key} />;
        })}
      </Camera>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, pointerEvents: 'none', background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(110,0,12,${f2(vig)}) 100%)`}} />
      {ts.on && (
        <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
          <div style={{
            position: 'absolute', left: T.cx - T.maxWidth / 2, width: T.maxWidth, top: T.top, height: T.height, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_TITLE, fontSize: T.fs, lineHeight: 1.2, color: COLORS.bone, whiteSpace: 'nowrap', opacity: ts.op, transform: `scale(${ts.scale.toFixed(3)})`, transformOrigin: '50% 50%',
            WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill',
            textShadow: `0 0 ${u(26)}px rgba(255,176,32,${(0.8 * ts.glow).toFixed(2)}), 0 0 ${u(60)}px rgba(255,45,61,${(0.4 * ts.glow).toFixed(2)})`,
          }}>{scene.title}</div>
          <div style={{position: 'absolute', left: T.cx - (u(260) * ts.line) / 2, top: T.bottom - u(6), width: u(260) * ts.line, height: u(7), borderRadius: u(4), background: COLORS.amber, boxShadow: `0 0 ${u(18)}px ${COLORS.amber}`}} />
        </AbsoluteFill>
      )}
      <FlashCut at={C.flare} color="#ffb020" length={9} peak={0.35} />
    </AbsoluteFill>
  );
}

export default Part2_Scene01_Marriage;
