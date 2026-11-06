// Part2_Scene02_Joint.jsx (Step P2.6) — Part 2, scene 2 "joint" (words 8–11: "একান্নবর্তী পরিবারে তাদের বসবাস।").
//   One big mud-and-thatch house at night under the moon: many small windows light up one by one, the whole family (7 silhouettes: elder man, elder woman,
//   two sons, two brides, youngest son) stands together on the veranda under ONE roof, the label "একান্নবর্তী পরিবার" appears word by word, and on "বসবাস"
//   the whole house breathes in one warm pulse (silhouettes lean together, roof glow). Last frames: fog thickens + one window flickers red (hint of the next scene).
// Exports : named + default `Part2_Scene02_Joint` ({scene, data}); pure helpers (testable in Node):
//           wfOf(data, scene, i), cleanWord(text), findWord(data, scene, test), cueOf(data, scene, test, fb),
//           jointCues(data, scene) -> {w1, w2, theyLive, live, len}   (all LOCAL frames)
//           graphemeCount(text), labelBox(L, words), houseGeom(L) -> {left,right,cx,width,apexY,eaveY,groundY,openL,openR,openTop,roofOverhang},
//           figureSlots(L) -> [{kind, cx, base, h, w, appear}],  figureShape(slot) -> {head, body, extra},  windowSlots(L) -> [{i, x, y, w, h, kind}],
//           windowOnFrames(cues, n) -> frames[],  windowState(f, at, i), popState(f, at), unity(f, at), swayDeg(f, i, unityAmt), moonPos(L), CAMERA_ZOOM
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={scene.endFrame-scene.startFrame}>; every frame here
//           is LOCAL (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : horror2 → "একান্নবর্তী" wf(8)=0 · "পরিবারে" wf(9)=17 · "তাদের" wf(10)=34 · "বসবাস" wf(11)=49; scene length 80. Cues come from story_data.json
//           (fallback = range offsets 0 / 1 / 2 / 3). Windows light up between 4 and wf(10)+14, figures pop between wf(9) and wf(10)+10, unity pulse at wf(11).
// Layout  : only useLayout(). The label sits at the top of the content zone (one line, font fitted to 92 % of the content width); the house fills the zone below
//           it (roof apex 25 %, eaves 41 %, ground 86 % of the content height; VERTICAL: house 90 % of the content width, 2×3 windows on each side of the veranda;
//           HORIZONTAL: house ≤ 1100·u wide, 3×2 windows per side). 3 tiny loft windows sit in the roof. The veranda opening (≈ 60 % of the house width) holds the 7 silhouettes,
//           each in its OWN slot (slot width = opening / 7, figure width ≤ 0.26·height) → no two figures touch. The moon is placed away from the label (vertical x 92 / y 10, horizontal x 82 / y 22).
//           Nothing enters the caption band (ground gradient runs on under it but is nearly black).
// Camera  : slow push-in 1 → 1.05 about the ground line (the house never grows into the caption band, the roof never reaches the label — proven by the tests).
// Rules   : deterministic (useCurrentFrame / interpolate-free maths / random('seed') only); no Math.random, no CSS animation, no SVG filters. Bengali text = one span per word.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {Camera} from './Camera.jsx';
import {BgSky} from './Bg_Sky.jsx';
import {FxFog} from './Fx_Fog.jsx';
import {FxParticles} from './Fx_Particles.jsx';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const f2 = (v) => (Math.round(v * 100) / 100).toString();
export const CAMERA_ZOOM = [1, 1.05];
const N_FIG = 7;

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
export function jointCues(data, scene) {
  const a = scene.wordRange[0], b = scene.wordRange[1], len = scene.endFrame - scene.startFrame;
  const at = (off) => wfOf(data, scene, Math.min(b, a + off));
  return {
    w1: cueOf(data, scene, (w) => cleanWord(w.text) === 'একান্নবর্তী', 0),
    w2: cueOf(data, scene, (w) => cleanWord(w.text).startsWith('পরিবার'), 1),
    theyLive: at(2), live: cueOf(data, scene, (w) => cleanWord(w.text).startsWith('বসবাস'), 3), len,
  };
}

// ---- label (one line, one span per word) ----
export function graphemeCount(text) {
  const s = String(text || '');
  if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter('bn', {granularity: 'grapheme'}).segment(s)).length;
  return Array.from(s).length;
}
export function labelBox(L, words) {
  const {u, isVertical: v} = L, maxW = L.content.width * 0.92, gap = 0.3;
  const em = words.reduce((s, w) => s + graphemeCount(w) * 0.62, 0) + gap * Math.max(0, words.length - 1);
  const fs = Math.min(u(v ? 78 : 76), maxW / Math.max(1, em)), top = L.content.top + u(6), height = fs * 1.45;
  return {fs, top, height, bottom: top + height, cx: L.cx(50), maxWidth: maxW, width: em * fs};
}

// ---- house geometry (all absolute px) ----
export function houseGeom(L) {
  const {u, isVertical: v} = L, groundY = L.cy(86), apexY = L.cy(25), eaveY = L.cy(41);
  const width = v ? L.content.width * 0.9 : Math.min(L.content.width * 0.8, u(1100)), cx = L.cx(50);
  const openW = width * 0.6, openTop = L.cy(v ? 52 : 54);
  return {left: cx - width / 2, right: cx + width / 2, cx, width, apexY, eaveY, groundY, openL: cx - openW / 2, openR: cx + openW / 2, openTop, roofOverhang: u(34)};
}
// moon: away from the label, behind the roof
export const moonPos = (L) => (L.isVertical ? {x: 92, y: 10} : {x: 82, y: 22});

// ---- 7 family silhouettes, one slot each inside the veranda opening ----
const KINDS = ['young', 'bou', 'son', 'woman', 'man', 'son', 'bou']; // left → right (elder man + woman in the middle)
const HEIGHT_K = [0.84, 0.8, 0.88, 0.82, 0.86, 0.88, 0.8];
export function figureSlots(L, cues = null) {
  const H = houseGeom(L), slotW = (H.openR - H.openL) / N_FIG, room = H.groundY - H.openTop;
  const base = H.groundY - L.u(6);
  return KINDS.map((kind, i) => {
    const h = Math.min(room * HEIGHT_K[i], (slotW * 0.9) / 0.26), cx = H.openL + slotW * (i + 0.5);
    const order = [3, 4, 2, 5, 1, 6, 0][i]; // pop order: centre (elder pair) outwards
    const t0 = cues ? cues.w2 : 17, t1 = cues ? cues.theyLive + 10 : 44;
    return {i, kind, cx, base, h, w: h * 0.26, slotW, appear: Math.round(t0 + ((t1 - t0) * order) / (N_FIG - 1))};
  });
}
// simple silhouette: head circle, torso/lower-body path, optional veil / bun (all relative to slot)
export function figureShape(s) {
  const {cx, base, h, kind} = s, y = (k) => base - h * k, x = (k) => cx + h * k;
  const headR = h * (kind === 'young' ? 0.075 : 0.082), headC = {x: cx, y: y(0.89), r: headR};
  const shoulder = kind === 'man' ? 0.15 : 0.13;
  const lowerW = kind === 'woman' || kind === 'bou' ? 0.13 : 0.11;
  const body = `M${f2(x(-shoulder))} ${f2(y(0.78))} Q${f2(cx)} ${f2(y(0.82))} ${f2(x(shoulder))} ${f2(y(0.78))} L${f2(x(shoulder * 0.8))} ${f2(y(0.46))} L${f2(x(lowerW))} ${f2(y(0))} L${f2(x(-lowerW))} ${f2(y(0))} L${f2(x(-shoulder * 0.8))} ${f2(y(0.46))} Z`;
  let extra = null;
  if (kind === 'bou') extra = {type: 'veil', d: `M${f2(x(-0.1))} ${f2(y(0.76))} Q${f2(x(-0.12))} ${f2(y(0.97))} ${f2(cx)} ${f2(y(0.985))} Q${f2(x(0.12))} ${f2(y(0.97))} ${f2(x(0.1))} ${f2(y(0.76))} Q${f2(cx)} ${f2(y(0.8))} ${f2(x(-0.1))} ${f2(y(0.76))} Z`};
  if (kind === 'woman') extra = {type: 'bun', cx: cx, cy: y(0.965), r: h * 0.04};
  if (kind === 'man') extra = {type: 'gamchha', d: `M${f2(x(-0.1))} ${f2(y(0.78))} L${f2(x(0.02))} ${f2(y(0.6))} L${f2(x(0.06))} ${f2(y(0.62))} L${f2(x(-0.05))} ${f2(y(0.8))} Z`};
  return {head: headC, body, extra};
}

// ---- windows: many small lit squares on the side walls + 3 loft windows in the roof ----
export function windowSlots(L) {
  const {u, isVertical: v} = L, H = houseGeom(L), cols = v ? 2 : 3, rows = v ? 3 : 2, ww = u(v ? 34 : 32), wh = ww * 1.25, out = [];
  const top = H.eaveY + u(34), bottom = H.groundY - u(46), segW = H.openL - H.left;
  let i = 0;
  for (const side of [0, 1]) {
    const x0 = side === 0 ? H.left : H.openR;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x0 + (segW * (c + 0.5)) / cols, cy = rows === 1 ? (top + bottom) / 2 : top + ((bottom - top - wh) * r) / (rows - 1) + wh / 2;
        out.push({i: i++, x: cx - ww / 2, y: cy - wh / 2, w: ww, h: wh, kind: 'wall'});
      }
    }
  }
  const roofMid = (H.apexY + H.eaveY) / 2 + u(4), lw = ww * 0.8, lh = lw * 1.15;
  for (const k of [0.3, 0.5, 0.7]) out.push({i: i++, x: H.left + H.width * k - lw / 2, y: roofMid - lh / 2, w: lw, h: lh, kind: 'loft'});
  return out;
}
// switch-on frames: a seeded shuffle spread over [4, end]
export function windowOnFrames(cues, n) {
  const end = cues.theyLive + 14, start = 4, order = Array.from({length: n}, (_, i) => i).sort((a, b) => random(`joint-win-${a}`) - random(`joint-win-${b}`));
  const at = new Array(n);
  order.forEach((idx, rank) => { at[idx] = Math.round(start + ((end - start) * rank) / Math.max(1, n - 1)); });
  return at;
}
// 0 before `at`; then a 5-frame stutter-in, then steady 0.75–1 flicker (never 0 once on)
export function windowState(f, at, i) {
  const t = f - at;
  if (t < 0) return 0;
  if (t < 5) return random(`joint-wst-${i}-${t}`) < 0.5 ? 0.35 : 1;
  const dip = random(`joint-wdip-${i}-${Math.floor(f / 4)}`) < 0.06 ? 0.2 : 0;
  return Math.max(0.5, Math.min(1, 0.88 + 0.07 * Math.sin(f * 0.23 + i * 1.7) - dip));
}
// figure pop-in: scale 0.6 → ~1.08 → 1 from the feet, fade over 4 frames (0 before `at`)
export function popState(f, at) {
  const t = f - at;
  if (t < 0) return {on: false, s: 0, op: 0};
  const k = clamp01(t / 9), s = 1 - Math.pow(1 - k, 3) + 0.08 * Math.sin(Math.PI * k) * (1 - k * 0.3);
  return {on: true, s: 0.6 + 0.4 * s, op: clamp01(t / 4)};
}
// unity pulse: 0 before `at`, peak 1 at at+6, decay to 0.35 resting level
export function unity(f, at) {
  const t = f - at;
  if (t < 0) return 0;
  return t < 6 ? t / 6 : 0.35 + 0.65 * (1 - clamp01((t - 6) / 20));
}
// slight lean toward the centre on the unity pulse (degrees, + = clockwise) — outer figures lean in
export function swayDeg(f, i, u) {
  const dir = i < 3 ? 1 : i > 3 ? -1 : 0;
  return dir * 2.2 * u + 0.5 * Math.sin(f * 0.05 + i * 1.3);
}

const C = {wall: '#1e150f', wallHi: '#2c1f15', roof: '#0a0805', straw: '#5a4526', post: '#3a2616', glow: '#ffb020', inkF: '#07050a'};

function House({cues}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L, H = houseGeom(L), W = windowSlots(L), F = figureSlots(L, cues);
  const on = windowOnFrames(cues, W.length), un = unity(f, cues.live), fogRed = clamp01((f - (cues.len - 18)) / 18);
  const ov = H.roofOverhang, rIn = H.width * 0.12, th = H.eaveY - H.apexY;
  const roofD = `M${f2(H.left - ov)} ${f2(H.eaveY)} Q${f2(H.left + rIn * 0.4)} ${f2(H.apexY + th * 0.35)} ${f2(H.left + rIn)} ${f2(H.apexY)} L${f2(H.right - rIn)} ${f2(H.apexY)} Q${f2(H.right - rIn * 0.4)} ${f2(H.apexY + th * 0.35)} ${f2(H.right + ov)} ${f2(H.eaveY)} Q${f2(H.cx)} ${f2(H.eaveY + u(16))} ${f2(H.left - ov)} ${f2(H.eaveY)} Z`;
  const straw = [];
  for (let k = 0; k < 24; k++) {
    const t = (k + 0.5) / 24, x = H.left - ov + (H.width + 2 * ov) * t, top = H.apexY + th * (0.08 + 0.3 * Math.abs(2 * t - 1) * Math.abs(2 * t - 1) + 0.12 * random(`joint-straw-${k}`));
    straw.push({x1: x, y1: top, x2: x + u(10) * (t - 0.5), y2: H.eaveY + u(6) * random(`joint-strawb-${k}`) - u(4)});
  }
  const horizon = H.groundY - u(8), tree = [];
  for (let k = 0; k <= 16; k++) tree.push(`${f2(L.width * (k / 16) - u(20))} ${f2(horizon - u(30) - u(56) * random(`joint-tree-${k}`))}`);
  const roofGlow = 0.08 + 0.2 * un;
  const redIdx = W.length - 4; // one wall window (the last wall window on the right side) flickers red at the very end
  return (
    <AbsoluteFill style={{zIndex: LAYERS.bg + 1}}>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id="jt-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#17100b" /><stop offset="0.5" stopColor="#09070a" /><stop offset="1" stopColor="#030206" /></linearGradient>
          <linearGradient id="jt-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.wallHi} /><stop offset="1" stopColor={C.wall} /></linearGradient>
          <linearGradient id="jt-open" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb020" stopOpacity="0.9" /><stop offset="1" stopColor="#c8601a" stopOpacity="0.95" /></linearGradient>
          <radialGradient id="jt-win" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffb020" stopOpacity="0.5" /><stop offset="1" stopColor="#ffb020" stopOpacity="0" /></radialGradient>
          <radialGradient id="jt-red" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff2d3d" stopOpacity="0.55" /><stop offset="1" stopColor="#ff2d3d" stopOpacity="0" /></radialGradient>
          <radialGradient id="jt-yard" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffb020" stopOpacity="0.4" /><stop offset="1" stopColor="#ffb020" stopOpacity="0" /></radialGradient>
          <radialGradient id="jt-roof" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff9a1f" stopOpacity="0.5" /><stop offset="1" stopColor="#ff9a1f" stopOpacity="0" /></radialGradient>
        </defs>
        <path d={`M${f2(-u(20))} ${f2(horizon)} L${tree.join(' L')} L${f2(L.width + u(20))} ${f2(horizon)} Z`} fill="#0b1620" />
        <rect x="0" y={f2(horizon)} width={L.width} height={f2(L.height - horizon)} fill="url(#jt-ground)" />
        <ellipse cx={f2(H.cx)} cy={f2(H.groundY + u(14))} rx={f2((H.openR - H.openL) * (0.62 + 0.15 * un))} ry={f2(u(48))} fill="url(#jt-yard)" opacity={f2(0.5 + 0.5 * un)} />
        <rect x={f2(H.left)} y={f2(H.eaveY - u(6))} width={f2(H.width)} height={f2(H.groundY - H.eaveY + u(6))} fill="url(#jt-wall)" />
        {[0.16, 0.34, 0.66, 0.84].map((k) => <rect key={k} x={f2(H.left + H.width * k - u(2))} y={f2(H.eaveY)} width={f2(u(4))} height={f2(H.groundY - H.eaveY)} fill="#120b07" opacity="0.5" />)}
        <rect x={f2(H.openL)} y={f2(H.openTop)} width={f2(H.openR - H.openL)} height={f2(H.groundY - H.openTop)} fill="url(#jt-open)" opacity={f2(0.78 + 0.18 * un)} />
        <ellipse cx={f2(H.cx)} cy={f2(H.openTop + (H.groundY - H.openTop) * 0.45)} rx={f2((H.openR - H.openL) * 0.7)} ry={f2((H.groundY - H.openTop) * 0.7)} fill="url(#jt-win)" opacity={f2(0.4 + 0.5 * un)} />
        {[H.openL, H.openR].map((px, i) => <rect key={i} x={f2(px - u(7))} y={f2(H.openTop - u(8))} width={f2(u(14))} height={f2(H.groundY - H.openTop + u(8))} fill={C.post} />)}
        <rect x={f2(H.openL - u(10))} y={f2(H.openTop - u(14))} width={f2(H.openR - H.openL + u(20))} height={f2(u(12))} fill={C.post} />
        {W.map((w, i) => {
          const s = windowState(f, on[i], i), red = i === redIdx ? fogRed : 0;
          if (s <= 0) return <rect key={i} x={f2(w.x)} y={f2(w.y)} width={f2(w.w)} height={f2(w.h)} fill="#0a0709" />;
          return (
            <g key={i}>
              <circle cx={f2(w.x + w.w / 2)} cy={f2(w.y + w.h / 2)} r={f2(w.w * 1.9)} fill={red > 0.4 ? 'url(#jt-red)' : 'url(#jt-win)'} opacity={f2(s)} />
              <rect x={f2(w.x)} y={f2(w.y)} width={f2(w.w)} height={f2(w.h)} fill={red > 0.4 ? '#ff4a3d' : C.glow} opacity={f2(0.55 + 0.45 * s)} />
              <rect x={f2(w.x + w.w / 2 - u(1.5))} y={f2(w.y)} width={f2(u(3))} height={f2(w.h)} fill="#2a150a" opacity="0.8" />
              <rect x={f2(w.x)} y={f2(w.y + w.h / 2 - u(1.5))} width={f2(w.w)} height={f2(u(3))} fill="#2a150a" opacity="0.8" />
            </g>
          );
        })}
        {F.map((s) => {
          const p = popState(f, s.appear), sh = figureShape(s);
          if (!p.on) return null;
          const rot = swayDeg(f, s.i, un);
          return (
            <g key={s.i} data-figure={s.i} opacity={f2(p.op)} transform={`translate(${f2(s.cx)} ${f2(s.base)}) rotate(${f2(rot)}) scale(${f2(p.s)}) translate(${f2(-s.cx)} ${f2(-s.base)})`}>
              <path d={sh.body} fill={C.inkF} stroke="#ffb020" strokeOpacity={f2(0.35 + 0.25 * un)} strokeWidth={f2(u(1.6))} />
              <circle cx={f2(sh.head.x)} cy={f2(sh.head.y)} r={f2(sh.head.r)} fill={C.inkF} stroke="#ffb020" strokeOpacity={f2(0.35 + 0.25 * un)} strokeWidth={f2(u(1.6))} />
              {sh.extra && sh.extra.type === 'veil' && <path d={sh.extra.d} fill="#2a0c14" stroke="#ff7ac8" strokeOpacity="0.4" strokeWidth={f2(u(1.4))} />}
              {sh.extra && sh.extra.type === 'bun' && <circle cx={f2(sh.extra.cx)} cy={f2(sh.extra.cy)} r={f2(sh.extra.r)} fill={C.inkF} />}
              {sh.extra && sh.extra.type === 'gamchha' && <path d={sh.extra.d} fill="#5a1620" opacity="0.8" />}
            </g>
          );
        })}
        <ellipse cx={f2(H.cx)} cy={f2(H.apexY + th * 0.55)} rx={f2(H.width * 0.5)} ry={f2(th * 0.9)} fill="url(#jt-roof)" opacity={f2(roofGlow)} />
        <path d={roofD} fill={C.roof} />
        {straw.map((s, i) => <line key={i} x1={f2(s.x1)} y1={f2(s.y1)} x2={f2(s.x2)} y2={f2(s.y2)} stroke={C.straw} strokeWidth={f2(u(2))} opacity="0.35" />)}
        <rect x={f2(H.left + rIn - u(6))} y={f2(H.apexY - u(5))} width={f2(H.width - 2 * rIn + u(12))} height={f2(u(9))} rx={f2(u(4))} fill="#1a120a" />
        {W.filter((w) => w.kind === 'loft').map((w) => {
          const s = windowState(f, on[w.i], w.i);
          return (
            <g key={w.i}>
              <path d={`M${f2(w.x - u(5))} ${f2(w.y)} L${f2(w.x + w.w / 2)} ${f2(w.y - u(14))} L${f2(w.x + w.w + u(5))} ${f2(w.y)} Z`} fill="#050403" />
              <rect x={f2(w.x)} y={f2(w.y)} width={f2(w.w)} height={f2(w.h)} fill={s > 0 ? C.glow : '#0a0709'} opacity={s > 0 ? f2(0.55 + 0.45 * s) : 1} />
              {s > 0 && <circle cx={f2(w.x + w.w / 2)} cy={f2(w.y + w.h / 2)} r={f2(w.w * 1.8)} fill="url(#jt-win)" opacity={f2(s)} />}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

export function Part2_Scene02_Joint({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const cues = jointCues(data, scene), len = cues.len, H = houseGeom(L), un = unity(f, cues.live);
  const words = String(scene.title || 'একান্নবর্তী পরিবার').split(/\s+/).filter(Boolean);
  const box = labelBox(L, words), at = [cues.w1, cues.w2].concat(words.slice(2).map(() => cues.w2));
  const mp = moonPos(L), fogD = 0.3 + 0.25 * clamp01((f - (len - 24)) / 24);
  const vig = 0.12 + 0.04 * Math.sin(f * 0.09) + 0.18 * clamp01((f - (len - 20)) / 20);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={CAMERA_ZOOM} origin={[50, (100 * H.groundY) / L.height]} from={0} to={len} easing="inOut">
        <BgSky mood="calm" moonX={mp.x} moonY={mp.y} seed="joint" />
        <House cues={cues} />
        <FxFog layers={2} density={fogD} color="#9fb4c8" speed={0.7} />
        <FxParticles type="fireflies" count={10} seed="joint" speed={0.8} />
      </Camera>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, pointerEvents: 'none', background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(90,0,10,${f2(vig)}) 100%)`}} />
      <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: box.cx - box.maxWidth / 2, width: box.maxWidth, top: box.top, height: box.height, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: box.fs * 0.3, fontFamily: FONT_TITLE, fontSize: box.fs, lineHeight: 1.2, whiteSpace: 'nowrap'}}>
          {words.map((w, i) => {
            const t = f - at[i];
            if (t < 0) return null;
            const sc = 1.6 - 0.6 * ease(t / 7), glow = 0.5 + 0.5 * (1 - clamp01(t / 18)) + 0.3 * un;
            return (
              <span key={i} style={{display: 'inline-block', color: i === 0 ? COLORS.amber : COLORS.bone, opacity: clamp01(t / 3), transform: `scale(${sc.toFixed(3)})`, transformOrigin: '50% 60%', WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(24)}px rgba(255,176,32,${(0.8 * glow).toFixed(2)}), 0 0 ${u(56)}px rgba(255,45,61,${(0.3 * glow).toFixed(2)})`}}>{w}</span>
            );
          })}
        </div>
        {f >= cues.w2 && <div style={{position: 'absolute', left: box.cx - (u(300) * ease((f - cues.w2) / 12)) / 2, top: box.bottom - u(4), width: u(300) * ease((f - cues.w2) / 12), height: u(7), borderRadius: u(4), background: COLORS.amber, boxShadow: `0 0 ${u(18)}px ${COLORS.amber}`}} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export default Part2_Scene02_Joint;
