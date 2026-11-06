// Scene02_Village.jsx (Step 28) — S2 "village": night sky + moon + village silhouette, fog, fireflies; a map-style location chain
// নড়াইল (জেলা) → লোহাগাড়া (উপজেলা) → লাহুরিয়া (ইউনিয়ন → গ্রাম) pops in word by word; slow camera push-in toward the one lit window.
// Exports : named + default `Scene02_Village` ({scene, data}); pure helpers (testable in Node):
//           wfOf(data, scene, i), cleanName(text), placeCues(data, scene), labelRows(L), cameraOrigin(L), popState(f, at), easeOutBack(x),
//           lineProgress(f, start, end), pingState(f, at, len), litAmount(f, at), tierMix(f, at), punchScale(f, at), dreadAmount(f, start, len, hit),
//           mixHex(a, b, t), const TIERS
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={endFrame-startFrame}>; every frame here is
//           LOCAL (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : (cues come from story_data.json — the 5 words with entity "place" inside the scene's wordRange; never hard-coded seconds)
//           P[0] নড়াইল     pill 1 pops (pin + জেলা) · P[1] লোহাগাড়া  dashed map line draws 16 frames, then pill 2 pops (উপজেলা)
//           P[2] লাহুরিয়া  line 2 draws, pill 3 pops (ইউনিয়ন) · P[3]-1 ছোট্ট  the window lights up (BgVillage lit 0→1 in 8 frames)
//           P[3] গ্রাম      tag of pill 3 cross-fades ইউনিয়ন → গ্রাম · P[4] লাহুরিয়া।  pill 3 turns blood red + punch + 2 rings, red vignette spike
//           whole scene: Camera push-in 1 → 1.08 about the lit window + BgVillage parallax progress 0 → 0.5; dark vignette grows towards the end.
// Layout  : only useLayout(). The three pills are a LEFT-aligned vertical chain at L.cx(5) in the top part of the content zone (rows from
//           labelRows(L)); the moon sits at x ≥ 62 % of the content width, so pills (≈ 45 % wide) never touch it; nothing enters the caption band.
//           The labels are NOT inside <Camera> (they must not zoom/move); the world layers are. z-order: Camera(world) → dread vignette (12)
//           → map lines (14) → pills (15) → rings (16). Each name is one text node (Bengali words are never split).
// Rules   : deterministic (useCurrentFrame, remotion random inside the fx files), no Math.random / CSS animation / SVG filters (glow = box-shadow).
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONT_LABEL, LAYERS, useLayout} from './theme.js';
import {BgSky} from './Bg_Sky.jsx';
import {BgVillage, hutShapes, villageCtx} from './Bg_Village.jsx';
import {FxFog} from './Fx_Fog.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {Camera} from './Camera.jsx';

export const TIERS = ['জেলা', 'উপজেলা', 'ইউনিয়ন', 'গ্রাম'];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const inOut = (t) => { const x = clamp01(t); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
export const easeOutBack = (x) => { const t = clamp01(x) - 1; return 1 + 2.70158 * t * t * t + 1.70158 * t * t; };

export const wfOf = (data, scene, i) => data.words[i].startFrame - scene.startFrame;
export const cleanName = (t) => String(t || '').normalize('NFC').replace(/[\s।,.!?;:'"“”‘’\-–—]/g, '');

export function mixHex(a, b, t) {
  const p = (h) => { const v = parseInt(String(h).replace('#', ''), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const A = p(a), B = p(b), k = clamp01(t);
  return `#${A.map((c, i) => Math.round(c + (B[i] - c) * k).toString(16).padStart(2, '0')).join('')}`;
}

// the 5 place words of the scene (নড়াইল, লোহাগাড়া, লাহুরিয়া, গ্রাম, লাহুরিয়া) → local cue frames, display names, and the "lit" cue (word before গ্রাম)
export function placeCues(data, scene) {
  const [a, b] = scene.wordRange;
  let idx = [];
  for (let i = a; i <= b; i++) if (data.words[i] && data.words[i].entity === 'place') idx.push(i);
  if (idx.length !== 5) idx = [a, a + 2, a + 4, a + 7, a + 8].filter((i) => i <= b);
  const at = idx.map((i) => wfOf(data, scene, i));
  return {idx, at, names: idx.map((i) => cleanName(data.words[i].text)), lit: wfOf(data, scene, Math.max(a, idx[3] - 1))};
}

// geometry of the 3-row label chain (px): rows are centred at ys, pill height h, pin centre x = pinX (= left + border + padding + radius)
export function labelRows(L) {
  const {u, isVertical: v} = L, h = u(v ? 70 : 60), step = u(v ? 120 : 92), y0 = L.content.top + u(v ? 72 : 56), left = L.cx(5);
  return {left, pinX: left + u(3) + u(18) + u(12), h, step, ys: [0, 1, 2].map((i) => y0 + i * step), nameFs: u(v ? 46 : 42), tierFs: u(v ? 27 : 25)};
}

// zoom focal point (% of the frame) = the lit hut's window, identical maths to Bg_Village (lit hut = the middle one)
export function cameraOrigin(L) {
  const n = L.isVertical ? 3 : 5, hut = hutShapes(Math.round((n - 1) / 2), n, villageCtx(L, 'a'));
  const c = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return [c((hut.winC[0] / L.width) * 100, 20, 80), c((hut.winC[1] / L.height) * 100, 30, 75)];
}

// pill pop-in: scale 0.7 → ~1.03 → 1 (back ease) over `len` frames, slides in from the left, opacity in 3 frames
export function popState(f, at, len = 9) {
  const t = f - at;
  if (t < 0) return {on: false, k: 0, op: 0, slide: 0};
  const p = clamp01(t / len);
  return {on: true, k: 0.7 + 0.3 * easeOutBack(p), op: clamp01(t / 3), slide: Math.pow(1 - p, 2)};
}
export const lineProgress = (f, start, end) => inOut((f - start) / Math.max(1, end - start));
export function pingState(f, at, len = 14) {
  const t = f - at;
  if (t < 0 || t >= len) return {on: false, p: 0, op: 0};
  return {on: true, p: t / len, op: 0.75 * (1 - t / len)};
}
export const litAmount = (f, at) => ease((f - at) / 8);
export const tierMix = (f, at) => clamp01((f - at) / 6);
export const punchScale = (f, at) => { const t = f - at; return t < 0 || t > 10 ? 1 : 1 + 0.12 * Math.sin((Math.PI * t) / 10); };
// dread: black vignette grows from `start` to the end of the scene (0 → 0.5); red spike at `hit` decays in ~10 frames
export function dreadAmount(f, start, len, hit) {
  const s = clamp01((f - start) / Math.max(1, len - start));
  return {dark: 0.5 * s * s * (3 - 2 * s), red: f >= hit ? 0.28 * Math.exp(-(f - hit) / 10) : 0};
}

function Pill({R, u, y, st, color, name, tierA, tierB, mixB, punch, nameColor}) {
  if (!st.on) return null;
  const tag = {gridArea: '1 / 1', fontFamily: FONT_LABEL, fontWeight: 500, fontSize: R.tierFs, color: COLORS.bone, paddingLeft: u(16), borderLeft: `${u(2)}px solid rgba(243,236,220,0.28)`};
  return (
    <div style={{
      position: 'absolute', left: R.left, top: y - R.h / 2, height: R.h, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: u(22), padding: `0 ${u(26)}px 0 ${u(18)}px`,
      borderRadius: R.h / 2, background: 'rgba(5,6,11,0.8)', border: `${u(3)}px solid ${color}`, boxShadow: `0 0 ${u(28)}px ${color}77`, whiteSpace: 'nowrap',
      opacity: st.op, transform: `translateX(${(-st.slide * u(60)).toFixed(1)}px) scale(${(st.k * punch).toFixed(3)})`, transformOrigin: '0% 50%',
    }}>
      <div style={{width: u(24), height: u(24), flex: 'none', borderRadius: '50%', background: color, boxShadow: `0 0 ${u(16)}px ${color}`}} />
      <span style={{fontFamily: FONT_LABEL, fontWeight: 700, fontSize: R.nameFs, lineHeight: 1.25, color: nameColor}}>{name}</span>
      <div style={{display: 'grid', alignItems: 'center'}}>
        <span style={{...tag, opacity: tierB ? 1 - mixB : 1}}>{tierA}</span>
        {tierB && <span style={{...tag, opacity: mixB}}>{tierB}</span>}
      </div>
    </div>
  );
}

export function Scene02_Village({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const len = scene.endFrame - scene.startFrame;
  const C = placeCues(data, scene), R = labelRows(L), [t0, t1, t2, t3, t4] = C.at;
  const progress = interpolate(f, [0, len], [0, 0.5], {extrapolateRight: 'clamp'});
  const dread = dreadAmount(f, C.lit - 6, len, t4);
  const finalK = tierMix(f, t4), c3 = mixHex(COLORS.ghost, COLORS.blood, finalK);
  const items = [
    {name: C.names[0], tier: TIERS[0], at: t0, color: COLORS.ghost},
    {name: C.names[1], tier: TIERS[1], at: t1, color: COLORS.ghost},
    {name: C.names[2], tier: TIERS[2], tierB: TIERS[3], at: t2, color: c3},
  ];
  const segs = [[0, Math.max(0, t1 - 16), t1], [1, Math.max(0, t2 - 16), t2]];
  const rings = [[t0 + 5, COLORS.ghost, 0], [t1 + 5, COLORS.ghost, 1], [t2 + 5, COLORS.ghost, 2], [t4, COLORS.blood, 2], [t4 + 8, COLORS.blood, 2]];
  const dash = `${u(9)} ${u(8)}`;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={[1, 1.08]} origin={cameraOrigin(L)} from={0} to={len} easing="inOut">
        <BgSky mood="calm" moonX={72} moonY={24} seed="a" />
        <BgVillage progress={progress} lit={litAmount(f, C.lit)} moonX={72} seed="a" />
        <FxFog layers={3} density={0.42} color="#9fb4c8" />
        <FxParticles type="fireflies" count={16} seed="village" />
        <FxParticles type="dust" count={16} seed="village" />
        <FxParticles type="bats" count={2} seed="village" />
      </Camera>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,${dread.dark.toFixed(3)}) 100%), radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(150,8,20,${dread.red.toFixed(3)}) 100%)`}} />
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', inset: 0, zIndex: LAYERS.scene + 4}}>
        {segs.map(([j, s, e]) => {
          const p = lineProgress(f, s, e);
          if (p <= 0) return null;
          const y1 = R.ys[j] + R.h / 2, y2 = R.ys[j + 1] - R.h / 2, yy = y1 + (y2 - y1) * p;
          return (
            <g key={j}>
              <line x1={R.pinX} y1={y1} x2={R.pinX} y2={yy} stroke={COLORS.ghost} strokeWidth={u(4)} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={-f * u(1.2)} opacity="0.85" />
              {p < 1 && <g><circle cx={R.pinX} cy={yy} r={u(13)} fill={COLORS.ghost} opacity="0.25" /><circle cx={R.pinX} cy={yy} r={u(6)} fill={COLORS.bone} /></g>}
            </g>
          );
        })}
      </svg>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 5}}>
        {items.map((it, i) => (
          <Pill key={i} R={R} u={u} y={R.ys[i]} st={popState(f, it.at)} color={it.color} name={it.name} tierA={it.tier} tierB={it.tierB} mixB={tierMix(f, t3)}
            punch={i === 2 ? punchScale(f, t4) : 1} nameColor={COLORS.bone} />
        ))}
      </AbsoluteFill>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', inset: 0, zIndex: LAYERS.scene + 6, pointerEvents: 'none'}}>
        {rings.map(([at, col, row], i) => {
          const s = pingState(f, at);
          return s.on ? <circle key={i} cx={R.pinX} cy={R.ys[row]} r={u(13) + u(20) * s.p} fill="none" stroke={col} strokeWidth={u(3)} opacity={s.op} /> : null;
        })}
      </svg>
    </AbsoluteFill>
  );
}

export default Scene02_Village;
