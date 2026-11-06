// Intro.jsx (Step 32) — 60-frame channel sting: a blood-red riser bar → the page name (BRAND.pageName) glitches in word by word → blood drips hang from it → handle appears → fade to black.
// Exports : named + default `Intro` ({length=60, name=BRAND.pageName, handle=BRAND.handle, seed='intro'}); const INTRO_FRAMES (60);
//           pure helpers (testable in Node): graphemes(text), titleLayout(L, name), handleBox(L), dripSpecs(L, tl, hb, seed), dripState(f, spec), wordState(f, k, n, u, seed),
//           barState(f, width), riserPulse(f), fadeOut(f, length)
// Contract: mount inside <Sequence from={0} durationInFrames={data.introFrames}> (Story.jsx v2, Step 34); every frame is LOCAL (0 = first intro frame). Fills 100 % of the composition.
//           Visual only — the riser "sound" is the existing ambience bed; no audio, captions or grain here (Story.jsx adds FxFilm on top).
// Timeline: f0–9 riser bar grows from the centre (gone before any text appears) · f10+ one name word per ≤5 frames (jitter, RGB-split, flicker for 14 frames) with GlitchBurst on each reveal
//           · blood FlashCut 4 frames after the last word's reveal · f26+ 4 blood drips grow from under the name (staggered, ease-out, drop at the tip) · f40 handle fades in
//           · last 6 frames fade to ink. The red vignette pulses with a rising "chirp" (riser) the whole time.
// Layout  : only useLayout(). Name block centred at content-zone y 40 % (vertical) / 42 % (horizontal): words are laid out in explicit lines (greedy wrap by estimated width, font shrinks if one
//           word is wider than 92 % of the content width) so text height is known; drips are capped so they end ABOVE the handle slot (content y 80 %); nothing touches the caption band.
//           z-order: bg gradient → embers (fx) → riser bar → name → drips → handle → vignette → Glitch/Flash → fade.
// Rules   : deterministic (useCurrentFrame, random(seed)); no Math.random / CSS animation / SVG filters; Bengali words are single text nodes (never split into code points).
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {BRAND, COLORS, FONT_LABEL, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {FxParticles} from './Fx_Particles.jsx';
import {FlashCut, GlitchBurst} from './Transitions.jsx';

export const INTRO_FRAMES = 60;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);

export function graphemes(text) {
  const s = String(text || '');
  if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter('bn', {granularity: 'grapheme'}).segment(s), (x) => x.segment).length;
  return Array.from(s).length;
}

// words → explicit lines: {words:[{text,w}], lines:[[idx…]], fs, lineH, width, height, top, bottom, cx}
export function titleLayout(L, name) {
  const {u, isVertical: v} = L, words = String(name || '').trim().split(/\s+/).filter(Boolean), maxW = L.content.width * 0.92, k = 0.62, gapK = 0.3;
  const est = (t, fs) => graphemes(t) * k * fs;
  let fs = u(v ? 110 : 100);
  const widest = Math.max(1, ...words.map((t) => graphemes(t) * k));
  fs = Math.min(fs, maxW / widest);
  const lines = []; let cur = [], curW = 0;
  words.forEach((t, i) => {
    const w = est(t, fs), add = cur.length ? fs * gapK : 0;
    if (cur.length && curW + add + w > maxW) { lines.push(cur); cur = []; curW = 0; }
    curW += (cur.length ? fs * gapK : 0) + w; cur.push(i);
  });
  if (cur.length) lines.push(cur);
  const lineH = fs * 1.4, height = lineH * Math.max(1, lines.length), cy = L.cy(v ? 40 : 42), top = cy - height / 2;
  const width = Math.max(1, ...lines.map((ln) => ln.reduce((s, i, j) => s + est(words[i], fs) + (j ? fs * gapK : 0), 0)));
  return {words: words.map((t) => ({text: t, w: est(t, fs)})), lines, fs, lineH, width: Math.min(width, maxW), height, top, bottom: top + height, cx: L.cx(50)};
}

// handle slot (small text under the drips)
export function handleBox(L) {
  const {u, isVertical: v} = L, fs = u(v ? 46 : 42), h = fs * 1.5, cy = L.cy(80);
  return {fs, top: cy - h / 2, bottom: cy + h / 2, height: h, cx: L.cx(50)};
}

// 4 drips hanging from the bottom edge of the name; max length keeps them ≥ u(16) above the handle slot
export function dripSpecs(L, tl, hb, seed = 'intro') {
  const {u} = L, n = 4, cap = Math.max(u(20), Math.min(u(230), hb.top - tl.bottom - u(16))), spread = Math.min(tl.width * 0.8, u(560)), out = [];
  for (let i = 0; i < n; i++) {
    const x = tl.cx + ((i + 0.5) / n - 0.5) * spread + (random(`dr-${seed}-x${i}`) - 0.5) * u(30);
    out.push({x, y: tl.bottom - u(8), w: u(10 + 5 * random(`dr-${seed}-w${i}`)), max: cap * (0.45 + 0.55 * random(`dr-${seed}-l${i}`)), at: 26 + i * 4, dur: 24 + Math.round(8 * random(`dr-${seed}-d${i}`))});
  }
  return out;
}
export function dripState(f, d) {
  const t = f - d.at;
  if (t < 0) return {on: false, len: 0, blob: 0};
  return {on: true, len: d.max * ease(t / d.dur), blob: clamp01(t / 6)};
}

// one name word: reveal frame = 10 + step·k (step ≤ 5); jitter / RGB split / flicker for 14 frames after its reveal
export function wordState(f, k, n, u, seed = 'intro') {
  const step = Math.min(5, Math.floor(20 / Math.max(1, n - 1))), at = 10 + step * k, t = f - at;
  if (t < 0) return {on: false, dx: 0, split: 0, op: 0, at};
  const q = t < 14 ? 1 - t / 14 : 0, r = random(`wd-${seed}-${k}-${f}`);
  return {on: true, dx: (random(`wd-${seed}-${k}-${f}-x`) - 0.5) * 2 * u(28) * q, split: u(9) * q, op: t < 6 ? (r > 0.4 ? 1 : 0.25) : 1, at};
}
export const revealFrames = (n) => { const step = Math.min(5, Math.floor(20 / Math.max(1, n - 1))); return Array.from({length: n}, (_, k) => 10 + step * k); };

// riser bar: grows from the centre over f0–8, thins out f8–10, gone from f10 (before any text appears)
export function barState(f, width) {
  if (f >= 10) return {on: false, w: 0, th: 0};
  return {on: true, w: width * ease(f / 8), th: f < 8 ? 1 : 1 - (f - 8) / 2};
}
export const riserPulse = (f) => 0.12 + 0.1 * Math.sin(f * 0.1 * (1 + f / 20)) + 0.1 * clamp01(f / 60);
export const fadeOut = (f, length) => clamp01((f - (length - 6)) / 5);

export function Intro({length = INTRO_FRAMES, name = BRAND.pageName, handle = BRAND.handle, seed = 'intro'}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const tl = titleLayout(L, name), hb = handleBox(L), drips = dripSpecs(L, tl, hb, seed), n = tl.words.length, rv = revealFrames(n);
  const bar = barState(f, L.content.width), pulse = riserPulse(f), hp = ease((f - 40) / 6), fo = fadeOut(f, length), lock = rv[rv.length - 1] || 10;
  const cyBar = tl.top + tl.height / 2;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: COLORS.ink}}>
      <AbsoluteFill style={{zIndex: LAYERS.bg, background: `radial-gradient(ellipse at 50% ${(100 * cyBar / L.height).toFixed(1)}%, rgba(120,12,24,${(0.45 + pulse).toFixed(3)}) 0%, rgba(5,6,11,0) 62%)`}} />
      <FxParticles type="embers" count={18} seed={seed} />
      {bar.on && <div style={{position: 'absolute', left: L.cx(50) - bar.w / 2, width: bar.w, top: cyBar - (u(5) * bar.th) / 2, height: u(5) * bar.th, background: COLORS.blood, boxShadow: `0 0 ${u(28)}px ${COLORS.blood}`, zIndex: LAYERS.scene}} />}
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, pointerEvents: 'none'}}>
        {tl.lines.map((ln, li) => (
          <div key={li} style={{position: 'absolute', left: tl.cx - L.content.width / 2, width: L.content.width, top: tl.top + li * tl.lineH, height: tl.lineH, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: tl.fs * 0.3}}>
            {ln.map((wi) => {
              const ws = wordState(f, wi, n, u, seed);
              return (
                <span key={wi} style={{display: 'inline-block', visibility: ws.on ? 'visible' : 'hidden', fontFamily: FONT_TITLE, fontSize: tl.fs, lineHeight: 1.2, whiteSpace: 'nowrap', color: COLORS.bone, opacity: ws.op,
                  transform: `translateX(${ws.dx.toFixed(1)}px)`, WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill',
                  textShadow: `${ws.split.toFixed(1)}px 0 ${COLORS.ghost}, ${(-ws.split).toFixed(1)}px 0 ${COLORS.blood}, 0 0 ${u(30)}px rgba(255,45,61,0.7)`}}>{tl.words[wi].text}</span>
              );
            })}
          </div>
        ))}
      </AbsoluteFill>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', inset: 0, zIndex: LAYERS.scene + 4, pointerEvents: 'none'}}>
        {f >= rv[rv.length - 1] && drips.map((d, i) => {
          const s = dripState(f, d);
          return s.on && (
            <g key={i}>
              <ellipse cx={d.x} cy={d.y} rx={d.w * 1.6 * s.blob} ry={d.w * 0.9 * s.blob} fill={COLORS.blood} />
              <rect x={d.x - d.w / 2} y={d.y} width={d.w} height={Math.max(0, s.len)} rx={d.w / 2} fill={COLORS.blood} />
              <circle cx={d.x} cy={d.y + s.len} r={d.w * 0.95} fill={COLORS.blood} />
              <rect x={d.x - d.w * 0.15} y={d.y} width={d.w * 0.2} height={Math.max(0, s.len)} fill="#ff8a93" opacity="0.5" />
            </g>
          );
        })}
      </svg>
      {handle && hp > 0 && (
        <div style={{position: 'absolute', left: L.cx(50) - L.content.width / 2, width: L.content.width, top: hb.top, height: hb.height, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: LAYERS.scene + 5,
          fontFamily: FONT_LABEL, fontWeight: 700, fontSize: hb.fs, color: COLORS.amber, opacity: hp, letterSpacing: u(2), whiteSpace: 'nowrap', textShadow: `0 0 ${u(18)}px rgba(255,176,32,0.6)`}}>{handle}</div>
      )}
      <AbsoluteFill style={{zIndex: LAYERS.scene + 6, pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 50%, rgba(255,45,61,0) 45%, rgba(255,45,61,${(pulse + 0.1).toFixed(3)}) 100%)`}} />
      <GlitchBurst at={rv} length={5} intensity={0.8} seed={seed} />
      <FlashCut at={lock + 4} color={COLORS.blood} length={8} peak={0.3} />
      {fo > 0 && <AbsoluteFill style={{zIndex: LAYERS.transition + 1, background: COLORS.ink, opacity: fo, pointerEvents: 'none'}} />}
    </AbsoluteFill>
  );
}

export default Intro;
