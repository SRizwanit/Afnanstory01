// Part2_Scene04_Leave.jsx (Step P2.8) — Part 2, scene 4 "leave" (words 27–35: "ছোট ছেলে প্রকাশকে নিয়ে তাদের বাড়ি থেকে কিছুটা দূরে").
//   Night, side view. প্রহ্লাদ and his wife are already walking away along the dirt path (walk-bob, scrolling path stones, slow parallax tree line);
//   ছোট ছেলে প্রকাশ joins them on his name. The big family house (red windows left over from the fight) SHRINKS and slides to the left, away from them.
//   On "কিছুটা" a dotted route starts to grow from the house towards the right, the label "কিছুটা দূরে" appears word by word, and on "দূরে" an arrow
//   + a faint lantern glow beside a dead tree show the far-away place (the fallow land of the next scene).
// Exports : named + default `Part2_Scene04_Leave` ({scene, data}); pure helpers (testable in Node):
//           wfOf, cleanWord, findWord, cueOf, leaveCues(data, scene) -> {pralhad, wife, prokash, from, near, far, len}  (LOCAL frames),
//           leaveSlots(L) -> {key: {id, x, y, scale, flip}}, charRect(L, s, bob), walkBob(f, i), labelBox(L, words), leaveGeom(L),
//           houseScale(f, len), houseX(f, len), houseShape(g, f, len), routeProgress(f, cues), routeDots(g, f, len, cues) -> [{x, y}],
//           destState(f, cues), moodFor(key, f, cues), pathScroll(L, f), CAMERA_ZOOM, ZMAX
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={scene.endFrame-scene.startFrame}>; every frame here is
//           LOCAL (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : horror2 → "ছোট" wf(27)=0 · prokash wf(29)=17 · "বাড়ি" wf(32)=53 · "কিছুটা" wf(34)=70 · "দূরে" wf(35)=82; length 106.
//           Cues come from story_data.json (byWord for the name; fallbacks = range offsets 2 / 5 / 7 / 8).
// Layout  : only useLayout(). Three bands that never share space: TOP = the label (content-zone top); MIDDLE = house + dotted route + far tree (horizon at 50 % of the
//           content zone, route 22·u below it); BOTTOM = the three walkers (VERTICAL: x 24/50/76, feet y 100 %, scale 0.8; HORIZONTAL: x 48/61/74, feet y 96 %, scale 0.7).
//           The house is sized so that, after the camera zoom, its roof never reaches the label or the top of the content zone. Nothing enters the caption band
//           except the dark ground / path stones.
// Camera  : slow push-in 1 → 1.03 about the feet line + light handheld shake (0.03 → 0.10). Label / vignette / flash are OUTSIDE the Camera.
// Rules   : deterministic (useCurrentFrame / random('seed') only); no Math.random, no CSS animation, no SVG filters. Bengali text = one span per word.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {Camera} from './Camera.jsx';
import {BgSky} from './Bg_Sky.jsx';
import {FxFog} from './Fx_Fog.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {FlashCut} from './Transitions.jsx';
import {Character, byWord} from './Characters.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const smooth = (t) => { const k = clamp01(t); return k * k * (3 - 2 * k); };
const f2 = (v) => (Math.round(v * 100) / 100).toString();
export const CAMERA_ZOOM = [1, 1.03];
export const ZMAX = 1.03 * 1.06; // zoom + worst-case shake overscan, used by the tests
const N_DOTS = 22;

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
export function leaveCues(data, scene) {
  const a = scene.wordRange[0], b = scene.wordRange[1], len = scene.endFrame - scene.startFrame, at = (o) => wfOf(data, scene, Math.min(b, a + o));
  return {
    pralhad: 0, wife: 0, len, from: at(5),
    prokash: cueOf(data, scene, (w) => byWord(w.text) === 'prokash', 2),
    near: cueOf(data, scene, (w) => cleanWord(w.text).startsWith('কিছুটা'), 7),
    far: cueOf(data, scene, (w) => cleanWord(w.text).startsWith('দূরে'), 8),
  };
}

// ---- layout ----
export function leaveSlots(L) {
  if (L.isVertical) {
    const d = (id, x) => ({id, x, y: 100, scale: 0.8, flip: false});
    return {pralhad: d('pralhad', 24), wife: d('wife', 50), prokash: d('prokash', 76)};
  }
  const d = (id, x) => ({id, x, y: 96, scale: 0.7, flip: false});
  return {pralhad: d('pralhad', 48), wife: d('wife', 61), prokash: d('prokash', 74)};
}
// CharFrame maths: height = content.height × 0.5 × scale, width = 4/7 of it, x centred, y = feet baseline; `bob` = % lifted by the walk
export function charRect(L, s, bob = 0) {
  const h = L.content.height * 0.5 * s.scale, w = (h * 4) / 7, cx = L.cx(s.x), feet = L.cy(s.y - bob);
  return {left: cx - w / 2, right: cx + w / 2, top: feet - h, bottom: feet};
}
export const walkBob = (f, i) => Math.abs(Math.sin(f * 0.34 + i * 1.3)) * 1.1 * clamp01(f / 6 + 0.4); // % of the content height, 0 … 1.1
export function labelBox(L, words) {
  const {u} = L, maxW = L.content.width * 0.92, gap = 0.3;
  const gc = (t) => (typeof Intl !== 'undefined' && Intl.Segmenter ? Array.from(new Intl.Segmenter('bn', {granularity: 'grapheme'}).segment(t)).length : Array.from(t).length);
  const em = words.reduce((s, w) => s + gc(w) * 0.62, 0) + gap * Math.max(0, words.length - 1);
  const fs = Math.min(u(84), maxW / Math.max(1, em)), top = L.content.top + u(6), height = fs * 1.45;
  return {fs, top, height, bottom: top + height, cx: L.cx(50), maxWidth: maxW, width: em * fs};
}
// horizon, route and far-place geometry; the house height at scale 1 is limited so that (after zoom) the roof stays inside the content zone
export function leaveGeom(L) {
  const v = L.isVertical, hy = L.cy(50), feet = L.cy(v ? 100 : 96), cw = L.content.width;
  const hMax = Math.max(L.u(60), (feet - L.content.top) / ZMAX - (feet - hy));
  const w0 = Math.min(cw * (v ? 0.62 : 0.34), hMax / 0.62);
  return {hy, feet, w0, h0: w0 * 0.62, routeY: hy + L.u(22), destX: L.cx(90), endX: L.cx(90) - L.u(34), x0: L.cx(34), x1: L.cx(v ? 10 : 12)};
}

// ---- house (shrinks + slides away) ----
export const houseScale = (f, len) => 1 - 0.8 * smooth(f / Math.max(1, len - 6));
// slides left with the shrink; clamped so the whole house (roof overhang included) stays inside the frame while it is still big
export const houseX = (g, f, len) => Math.max(g.x0 + (g.x1 - g.x0) * ease(f / Math.max(1, len - 6)), g.w0 * houseScale(f, len) * 0.57 + 6);
export function houseShape(g, f, len) {
  const s = houseScale(f, len), w = g.w0 * s, cx = houseX(g, f, len), base = g.hy;
  const wallH = w * 0.36, roofH = w * 0.26;
  return {s, w, cx, base, left: cx - w / 2, right: cx + w / 2, wallTop: base - wallH, apexY: base - wallH - roofH, wallH, roofH};
}

// ---- dotted route + far place ----
export const routeProgress = (f, cues) => clamp01((f - cues.near) / Math.max(1, cues.far + 14 - cues.near));
export function routeDots(g, f, len, cues) {
  const h = houseShape(g, f, len), x0 = h.right + 6, shown = Math.ceil(routeProgress(f, cues) * N_DOTS), out = [];
  for (let k = 0; k < Math.min(N_DOTS, shown); k++) out.push({x: x0 + ((g.endX - x0) * k) / (N_DOTS - 1), y: g.routeY});
  return out;
}
export const destState = (f, cues) => {
  const t = f - cues.far;
  return t < 0 ? {on: false, k: 0, glow: 0} : {on: true, k: ease(t / 10), glow: 0.75 + 0.25 * Math.sin(f * 0.31)};
};
export function moodFor(key, f, cues) {
  if (key === 'prokash') return f >= cues.near ? 'worried' : 'calm';
  return 'worried';
}
export const pathScroll = (L, f) => L.u(6) * f;
const wrap = (x, W) => ((x % W) + W) % W;

function Backdrop({cues}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L, g = leaveGeom(L), len = cues.len, W = L.width + u(160);
  const h = houseShape(g, f, len), dots = routeDots(g, f, len, cues), dest = destState(f, cues), sc = pathScroll(L, f);
  const roofD = `M${f2(h.left - h.w * 0.06)} ${f2(h.wallTop)} L${f2(h.left + h.w * 0.14)} ${f2(h.apexY)} L${f2(h.right - h.w * 0.14)} ${f2(h.apexY)} L${f2(h.right + h.w * 0.06)} ${f2(h.wallTop)} Z`;
  const fl = 0.8 + 0.12 * Math.sin(f * 0.27) - (random(`lv-fl-${Math.floor(f / 3)}`) < 0.07 ? 0.25 : 0), glowA = 0.35 + 0.65 * h.s;
  const trees = Array.from({length: 22}, (_, i) => ({x: wrap(random(`lv-tx-${i}`) * W - sc * 0.15, W) - u(80), r: u(34 + 40 * random(`lv-tr-${i}`)), a: 0.55 + 0.4 * random(`lv-ta-${i}`)}));
  const stones = Array.from({length: 14}, (_, i) => ({x: wrap(random(`lv-sx-${i}`) * W - sc, W) - u(80), y: g.feet + u(6 + 22 * random(`lv-sy-${i}`)), rx: u(10 + 16 * random(`lv-sr-${i}`))}));
  const weeds = Array.from({length: 10}, (_, i) => ({x: wrap(random(`lv-wx-${i}`) * W - sc * 1.4, W) - u(80), hgt: u(26 + 30 * random(`lv-wh-${i}`))}));
  const dw = u(70), tH = u(64) * dest.k, tx = g.destX, tb = g.hy;
  return (
    <AbsoluteFill style={{zIndex: LAYERS.bg + 1}}>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id="lv-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1410" /><stop offset="0.45" stopColor="#0c0809" /><stop offset="1" stopColor="#030206" /></linearGradient>
          <radialGradient id="lv-lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffb020" stopOpacity="0.55" /><stop offset="1" stopColor="#ffb020" stopOpacity="0" /></radialGradient>
        </defs>
        {trees.map((t, i) => <ellipse key={i} cx={f2(t.x)} cy={f2(g.hy - t.r * 0.3)} rx={f2(t.r * 0.7)} ry={f2(t.r)} fill="#06080d" opacity={f2(t.a)} />)}
        <rect x="0" y={f2(g.hy)} width={L.width} height={f2(L.height - g.hy)} fill="url(#lv-ground)" />
        <ellipse cx={f2(h.cx)} cy={f2(h.base + u(6))} rx={f2(h.w * 0.62)} ry={f2(u(10) + h.w * 0.05)} fill="#000" opacity="0.5" />
        <rect x={f2(h.left)} y={f2(h.wallTop)} width={f2(h.w)} height={f2(h.wallH)} fill="#1b130e" />
        <path d={roofD} fill="#0a0805" />
        <rect x={f2(h.cx - dw * h.s / 2)} y={f2(h.base - h.wallH * 0.62)} width={f2(dw * h.s)} height={f2(h.wallH * 0.62)} fill="#05030a" />
        {[0.2, 0.34, 0.66, 0.8].map((k, i) => (
          <rect key={i} x={f2(h.left + h.w * k - u(15) * h.s)} y={f2(h.wallTop + h.wallH * 0.2)} width={f2(u(30) * h.s)} height={f2(u(38) * h.s)} fill="#ff2d3d" opacity={f2(0.9 * fl * glowA)} />
        ))}
        {dest.on && (
          <g opacity={f2(dest.k)}>
            <ellipse cx={f2(tx)} cy={f2(tb)} rx={f2(u(90))} ry={f2(u(54))} fill="url(#lv-lamp)" opacity={f2(0.5 * dest.glow)} />
            <path d={`M${f2(tx)} ${f2(tb)} L${f2(tx)} ${f2(tb - tH * 0.62)} M${f2(tx)} ${f2(tb - tH * 0.4)} L${f2(tx - u(26) * dest.k)} ${f2(tb - tH * 0.72)} M${f2(tx)} ${f2(tb - tH * 0.52)} L${f2(tx + u(24) * dest.k)} ${f2(tb - tH)} M${f2(tx)} ${f2(tb - tH * 0.62)} L${f2(tx - u(12) * dest.k)} ${f2(tb - tH * 0.95)}`} fill="none" stroke="#050408" strokeWidth={f2(u(5))} strokeLinecap="round" />
            <circle cx={f2(tx + u(40))} cy={f2(tb - u(6))} r={f2(u(5) * dest.glow)} fill="#ffb020" />
          </g>
        )}
        {dots.map((d, i) => <circle key={i} cx={f2(d.x)} cy={f2(d.y)} r={f2(u(4.5))} fill={COLORS.amber} opacity="0.9" />)}
        {dots.length >= N_DOTS && <path d={`M${f2(g.endX + u(4))} ${f2(g.routeY - u(11))} L${f2(g.endX + u(26))} ${f2(g.routeY)} L${f2(g.endX + u(4))} ${f2(g.routeY + u(11))} Z`} fill={COLORS.amber} />}
        <rect x="0" y={f2(g.feet - u(4))} width={L.width} height={f2(u(46))} fill="#2a1d14" opacity="0.5" />
        {stones.map((s, i) => <ellipse key={i} cx={f2(s.x)} cy={f2(s.y)} rx={f2(s.rx)} ry={f2(s.rx * 0.32)} fill="#0b0706" opacity="0.8" />)}
        {weeds.map((w, i) => <path key={i} d={`M${f2(w.x - u(8))} ${f2(g.feet + u(48))} L${f2(w.x)} ${f2(g.feet + u(48) - w.hgt)} L${f2(w.x + u(8))} ${f2(g.feet + u(48))} Z`} fill="#020104" />)}
      </svg>
    </AbsoluteFill>
  );
}

export function Part2_Scene04_Leave({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const cues = leaveCues(data, scene), len = cues.len, S = leaveSlots(L), g = leaveGeom(L);
  const pick = (i, fb) => { const w = data.words[i] && cleanWord(data.words[i].text); return w || fb; };
  const words = [pick(scene.wordRange[0] + 7, 'কিছুটা'), pick(scene.wordRange[0] + 8, 'দূরে')], box = labelBox(L, words), at = [cues.near, cues.far];
  const feetPct = (100 * g.feet) / L.height, vig = 0.05 + 0.1 * clamp01(f / len), fog = 0.22 + 0.25 * clamp01(f / len);
  const cast = [['pralhad', cues.pralhad - 20, 0], ['wife', cues.wife - 20, 1], ['prokash', cues.prokash, 2]];
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={CAMERA_ZOOM} shake={[0.03, 0.1]} seed="leave" origin={[50, feetPct]} from={0} to={len} easing="inOut">
        <BgSky mood="calm" moonX={L.isVertical ? 90 : 84} moonY={L.isVertical ? 12 : 24} seed="leave" />
        <Backdrop cues={cues} />
        <FxFog layers={2} density={fog} color="#7a4a58" speed={0.8} />
        <FxParticles type="dust" count={14} color="#cfa090" seed="leave" speed={0.8} />
        {cast.map(([key, appearAt, i]) => {
          const s = S[key];
          return <Character key={key} id={s.id} x={s.x} y={s.y - walkBob(f, i)} scale={s.scale} flip={s.flip} mood={moodFor(key, f, cues)} appearAt={appearAt} seed={key} />;
        })}
      </Camera>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, pointerEvents: 'none', background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(90,0,12,${f2(vig)}) 100%)`}} />
      <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: box.cx - box.maxWidth / 2, width: box.maxWidth, top: box.top, height: box.height, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: box.fs * 0.3, fontFamily: FONT_TITLE, fontSize: box.fs, lineHeight: 1.2, whiteSpace: 'nowrap'}}>
          {words.map((w, i) => {
            const t = f - at[i];
            if (t < 0) return null;
            return (
              <span key={i} style={{display: 'inline-block', color: i === 0 ? COLORS.amber : COLORS.bone, opacity: clamp01(t / 4), transform: `scale(${(1.5 - 0.5 * ease(t / 7)).toFixed(3)})`, transformOrigin: '50% 60%', WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(24)}px rgba(255,176,32,0.65), 0 0 ${u(56)}px rgba(255,45,61,0.3)`}}>{w}</span>
            );
          })}
        </div>
      </AbsoluteFill>
      <FlashCut at={cues.far} color="#ffb020" length={8} peak={0.18} />
    </AbsoluteFill>
  );
}

export default Part2_Scene04_Leave;
