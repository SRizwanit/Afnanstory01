// Part2_Scene05_Land.jsx (Step P2.9) — Part 2, scene 5 "land" (words 36–46: "তাদেরই দীর্ঘদিন ধরে পতিত থাকা একটি জমিতে তিনটি ঘর নির্মাণ করেন।").
//   The empty fallow land at night (dry weeds, cracked earth, a dead tree with a crow, ground mist, the old family house tiny on the horizon).
//   Label «পতিত জমি» on "পতিত" / "জমিতে" (it fades out before the next one). On "তিনটি" / "ঘর" / "নির্মাণ" the three mud huts rise one by one,
//   each with a big counter ১ ২ ৩ above it and a dust puff; label «তিনটি ঘর». When the third hut stands, the windows light up and flicker, a glitch
//   hit lands and the camera pushes in slowly with a rising red vignette (the dread ending, then the Outro).
// Exports : named + default `Part2_Scene05_Land` ({scene, data}); pure helpers (testable in Node):
//           wfOf, cleanWord, findWord, cueOf, landCues(data, scene) -> {pati, jomi, tinti, ghor, nirman, korena, len}  (LOCAL frames),
//           buildStarts(cues) -> [s1, s2, s3], hutsAt(f, cues) (0..3, feed it to <BgLand huts>), litAt(f, cues), counterBox(L, i), counterState(f, at),
//           labelBox(L, words), labelAlpha(f, cues, which), CAMERA_ZOOM, ZMAX, BUILD
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={scene.endFrame-scene.startFrame}>; every frame here
//           is LOCAL (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : horror2 → "পতিত" wf(39)=39 · "জমিতে" wf(42)=67 · "তিনটি" wf(43)=85 · "ঘর" wf(44)=97 · "নির্মাণ" wf(45)=105 · "করেন" wf(46)=116; length 145.
//           Hut k rises for BUILD=12 frames, strictly one after the other: starts 85 / 97 / 109; windows light 121 → 131. Fallback offsets 3/6/7/8/9/10.
// Layout  : only useLayout(). TOP = the label (content-zone top). Huts / tree / crow / counters come from Bg_Land (horizon at 78 % of the content zone);
//           each counter sits directly above its own hut. Moon is moved to the far right (vertical x90/y12, horizontal x94/y20), away from label and counters.
//           Nothing enters the caption band except ground / weeds (very dark).
// Camera  : push-in 1 → 1.10 (easing 'in', from frame 60) about the middle hut + shake 0.03 → 0.22. Label / vignette / flashes are OUTSIDE the Camera.
// Rules   : deterministic (useCurrentFrame / random('seed') only); no Math.random, no CSS animation, no SVG filters. Bengali text = one span per word.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, toBn, useLayout} from './theme.js';
import {Camera} from './Camera.jsx';
import {BgLand, hutShapes, landCtx} from './Bg_Land.jsx';
import {FxFog} from './Fx_Fog.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {FlashCut, GlitchBurst} from './Transitions.jsx';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const f2 = (v) => (Math.round(v * 100) / 100).toString();
export const BUILD = 12;
export const CAMERA_ZOOM = [1, 1.1];
export const ZMAX = 1.1 * 1.06; // zoom + worst-case shake overscan, used by the tests
const SEED = 'land';

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
export function landCues(data, scene) {
  const starts = (p, fb) => cueOf(data, scene, (w) => cleanWord(w.text).startsWith(p), fb);
  return {
    pati: starts('পতিত', 3), jomi: starts('জমি', 6), tinti: starts('তিনটি', 7), ghor: starts('ঘর', 8), nirman: starts('নির্মাণ', 9), korena: starts('করেন', 10),
    len: scene.endFrame - scene.startFrame,
  };
}

// ---- timing ----
export function buildStarts(c) {
  const s1 = c.tinti, s2 = Math.max(c.ghor, s1 + BUILD), s3 = Math.max(c.nirman, s2 + BUILD);
  return [s1, s2, s3];
}
export const hutsAt = (f, c) => buildStarts(c).reduce((sum, s) => sum + clamp01((f - s) / BUILD), 0);
export const litAt = (f, c) => clamp01((f - (buildStarts(c)[2] + BUILD)) / 10);
export const counterState = (f, at) => {
  const t = f - at;
  return t < 0 ? {on: false, op: 0, sc: 0} : {on: true, op: clamp01(t / 4), sc: 1.7 - 0.7 * ease(t / 8)};
};
// label A («পতিত জমি») fades out just before label B («তিনটি ঘর») takes the same slot
export function labelAlpha(f, c, which) {
  if (which === 'A') return f < c.pati ? 0 : 1 - clamp01((f - (c.tinti - 8)) / 6);
  return f < c.tinti ? 0 : 1;
}

// ---- layout ----
export function labelBox(L, words) {
  const {u} = L, maxW = L.content.width * 0.92, gap = 0.3;
  const gc = (t) => (typeof Intl !== 'undefined' && Intl.Segmenter ? Array.from(new Intl.Segmenter('bn', {granularity: 'grapheme'}).segment(t)).length : Array.from(t).length);
  const em = words.reduce((s, w) => s + gc(w) * 0.62, 0) + gap * Math.max(0, words.length - 1);
  const fs = Math.min(u(84), maxW / Math.max(1, em)), top = L.content.top + u(6), height = fs * 1.45;
  return {fs, top, height, bottom: top + height, cx: L.cx(50), maxWidth: maxW, width: em * fs};
}
// counter ১/২/৩ directly above hut i (px, un-zoomed)
export function counterBox(L, i) {
  const h = hutShapes(i, landCtx(L, SEED)), fs = L.u(64), width = fs * 0.8, height = fs * 1.3, bottom = h.topY - L.u(14);
  return {i, cx: h.cx, fs, left: h.cx - width / 2, right: h.cx + width / 2, top: bottom - height, bottom, hutTop: h.topY, hutBase: h.baseY};
}

function LabelRow({words, box, at, alpha, color2, glow}) {
  const f = useCurrentFrame(), {u} = useLayout();
  if (alpha <= 0) return null;
  return (
    <div style={{position: 'absolute', left: box.cx - box.maxWidth / 2, width: box.maxWidth, top: box.top, height: box.height, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: box.fs * 0.3, fontFamily: FONT_TITLE, fontSize: box.fs, lineHeight: 1.2, whiteSpace: 'nowrap', opacity: alpha}}>
      {words.map((w, i) => {
        const t = f - at[i];
        if (t < 0) return null;
        return (
          <span key={i} style={{display: 'inline-block', color: i === 0 ? color2[0] : color2[1], opacity: clamp01(t / 4), transform: `scale(${(1.5 - 0.5 * ease(t / 7)).toFixed(3)})`, transformOrigin: '50% 60%', WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(24)}px ${glow}, 0 0 ${u(56)}px rgba(255,45,61,0.3)`}}>{w}</span>
        );
      })}
    </div>
  );
}

export function Part2_Scene05_Land({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const c = landCues(data, scene), len = c.len, starts = buildStarts(c), ctx = landCtx(L, SEED);
  const pick = (i, fb) => { const w = data.words[i] && cleanWord(data.words[i].text); return w || fb; };
  const a0 = scene.wordRange[0], wordsA = ['পতিত', 'জমি'], wordsB = [pick(a0 + 7, 'তিনটি'), pick(a0 + 8, 'ঘর')];
  const boxA = labelBox(L, wordsA), boxB = labelBox(L, wordsB);
  const dread = clamp01((f - c.korena) / Math.max(1, len - c.korena)), vig = 0.05 + 0.4 * dread, fog = 0.3 + 0.35 * clamp01(f / len);
  const lit = litAt(f, c), feetPct = (100 * ctx.hy) / L.height;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={CAMERA_ZOOM} shake={[0.03, 0.22]} seed="land" origin={[60, feetPct]} from={60} to={len} easing="in">
        <BgLand huts={hutsAt(f, c)} lit={lit} house={0.8} mist={0.5 + 0.4 * dread} moonX={L.isVertical ? 90 : 94} moonY={L.isVertical ? 12 : 20} seed={SEED} />
        <FxFog layers={3} density={fog} color="#6a7a8a" speed={0.7} />
        <FxParticles type="dust" count={16} color="#b8b0a0" seed="land" speed={0.7} />
        <AbsoluteFill style={{zIndex: LAYERS.scene + 1, pointerEvents: 'none'}}>
          {starts.map((s, i) => {
            const st = counterState(f, s);
            if (!st.on) return null;
            const b = counterBox(L, i);
            return (
              <div key={i} style={{position: 'absolute', left: b.left, width: b.right - b.left, top: b.top, height: b.bottom - b.top, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TITLE, fontSize: b.fs, lineHeight: 1.2, color: COLORS.amber, opacity: st.op, transform: `scale(${st.sc.toFixed(3)})`, transformOrigin: '50% 80%', WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(20)}px rgba(255,176,32,0.8)`}}>{toBn(i + 1)}</div>
            );
          })}
        </AbsoluteFill>
      </Camera>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, pointerEvents: 'none', background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(120,0,14,${f2(vig)}) 100%)`}} />
      <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
        <LabelRow words={wordsA} box={boxA} at={[c.pati, c.jomi]} alpha={labelAlpha(f, c, 'A')} color2={[COLORS.ghost, COLORS.bone]} glow="rgba(79,227,255,0.6)" />
        <LabelRow words={wordsB} box={boxB} at={[c.tinti, c.ghor]} alpha={labelAlpha(f, c, 'B')} color2={[COLORS.amber, COLORS.bone]} glow="rgba(255,176,32,0.65)" />
      </AbsoluteFill>
      <FlashCut at={starts} color="#ffb020" length={6} peak={0.12} />
      <FlashCut at={starts[2] + BUILD} color="#ff2d3d" length={8} peak={0.3} />
      <GlitchBurst at={[starts[2] + BUILD, len - 14]} length={6} intensity={0.7} seed="land" />
    </AbsoluteFill>
  );
}

export default Part2_Scene05_Land;
