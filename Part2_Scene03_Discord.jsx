// Part2_Scene03_Discord.jsx (Step P2.7) — Part 2, scene 3 "discord" (words 12–26: "কিন্তু ছেলের বউ এবং ছেলের পরিবারের সাথে প্রহ্লাদ বিশ্বাস ও তার স্ত্রীর বনিবনা না হওয়ায়").
//   Night courtyard in front of the big house. On "কিন্তু" a red crack tears down the middle of the frame. The sons' side (two brides + the two sons) pops in on
//   "ছেলের বউ … ছেলের পরিবারের", প্রহ্লাদ on his name, his wife on "স্ত্রীর"; from প্রহ্লাদ's cue the two groups DRIFT APART and the crack widens. On "বনিবনা"
//   a glitch burst + red flash hit, the title appears word by word ("বনিবনা" / "হয়নি" on "না"), everybody turns scared, fog thickens, handheld shake grows.
// Exports : named + default `Part2_Scene03_Discord` ({scene, data}); pure helpers (testable in Node):
//           wfOf, cleanWord, findWord, cueOf, discordCues(data, scene) -> {kintu, bou1, bou2, provas, pankaj, pralhad, wife, hit, no, len}  (LOCAL frames)
//           discordSlots(L) -> {key: {id, x0, x1, y, scale, flip}}  (x0 → x1 = % of the CONTENT zone, start → end of the drift),  slotX(s, g),  charRect(L, s, g),
//           driftAmount(f, cues), moodFor(key, f, cues), crackPoints(L, f), crackPolygon(pts, w), crackWidth(L, g), labelBox(L, words), houseGeom(L), spikeAt(f, at, len), CAMERA_ZOOM, ZMAX
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={scene.endFrame-scene.startFrame}>; every frame here is LOCAL
//           (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : horror2 → kintu wf(12)=0 · bou1 wf(14)=21 · bou2 =24 · provas wf(16)=38 · pankaj wf(17)=50 · pralhad wf(19)=76 · wife wf(23)=119 · hit wf(24)=129 · "না" wf(25)=144; length 178.
//           Cues come from story_data.json (byWord for names; fallbacks = range offsets 0 / 2 / 4 / 5 / 7 / 11 / 12 / 13).
// Layout  : only useLayout(). VERTICAL = 3 columns × 2 rows: left cluster = 2 columns (x 26/48 → 14/36), top row bou1/bou2 (feet y 56 %), bottom row provas/pankaj (feet y 100 %);
//           right column = প্রহ্লাদ (top) + স্ত্রী (bottom) at x 74 → 88; scale 0.6. HORIZONTAL = one row (feet y 92 %, scale 1): provas, bou1, pankaj, bou2 at x 24/37/50/63 → −18 ;
//           প্রহ্লাদ 78, স্ত্রী 91 (right group flipped so it faces the left one). The crack runs behind everybody (no text), the title sits at the top of the content zone above every
//           character frame (also after zoom + shake overscan). Nothing enters the caption band.
// Camera  : slow push-in 1 → 1.04 about the feet line + handheld shake ramp 0.04 → 0.30 (edgeSafe). Title / crack flash / glitch / vignette are OUTSIDE the Camera.
// Rules   : deterministic (useCurrentFrame / random('seed') only); no Math.random, no CSS animation, no SVG filters. Bengali text = one span per word.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {Camera} from './Camera.jsx';
import {BgSky} from './Bg_Sky.jsx';
import {FxFog} from './Fx_Fog.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {FlashCut, GlitchBurst} from './Transitions.jsx';
import {Character, byWord} from './Characters.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const smooth = (t) => { const k = clamp01(t); return k * k * (3 - 2 * k); };
const f2 = (v) => (Math.round(v * 100) / 100).toString();
export const CAMERA_ZOOM = [1, 1.04];
export const ZMAX = 1.04 * 1.06; // zoom + worst-case shake overscan, used by the tests

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
export function discordCues(data, scene) {
  const a = scene.wordRange[0], b = scene.wordRange[1], len = scene.endFrame - scene.startFrame, at = (o) => wfOf(data, scene, Math.min(b, a + o));
  const bou1 = cueOf(data, scene, (w) => byWord(w.text) === 'bou', 2), hit = cueOf(data, scene, (w) => cleanWord(w.text).startsWith('বনিবনা'), 12);
  return {
    kintu: at(0), bou1, bou2: bou1 + 3, provas: at(4), pankaj: at(5), len,
    pralhad: cueOf(data, scene, (w) => byWord(w.text) === 'pralhad', 7), wife: cueOf(data, scene, (w) => byWord(w.text) === 'wife', 11),
    hit, no: Math.min(len - 1, hit + (b - a >= 13 ? wfOf(data, scene, a + 13) - wfOf(data, scene, a + 12) : 15)),
  };
}

// ---- layout ----
export function discordSlots(L) {
  if (L.isVertical) {
    const s = 0.6, d = (id, x0, x1, y, flip = false) => ({id, x0, x1, y, scale: s, flip});
    return {bou1: d('bou', 26, 14, 56), bou2: d('bou', 48, 36, 56), provas: d('provas', 26, 14, 100), pankaj: d('pankaj', 48, 36, 100), pralhad: d('pralhad', 74, 88, 56, true), wife: d('wife', 74, 88, 100, true)};
  }
  const d = (id, x0, x1, flip = false) => ({id, x0, x1, y: 92, scale: 1, flip});
  return {provas: d('provas', 24, 6), bou1: d('bou', 37, 19), pankaj: d('pankaj', 50, 32), bou2: d('bou', 63, 45), pralhad: d('pralhad', 78, 78, true), wife: d('wife', 91, 91, true)};
}
export const slotX = (s, g) => s.x0 + (s.x1 - s.x0) * clamp01(g);
// CharFrame maths: height = content.height × 0.5 × scale, width = 4/7 of it, x centred, y = feet baseline
export function charRect(L, s, g = 0) {
  const h = L.content.height * 0.5 * s.scale, w = (h * 4) / 7, cx = L.cx(slotX(s, g)), feet = L.cy(s.y);
  return {left: cx - w / 2, right: cx + w / 2, top: feet - h, bottom: feet};
}
export function labelBox(L, words) {
  const {u, isVertical: v} = L, maxW = L.content.width * 0.92, gap = 0.3;
  const gc = (t) => (typeof Intl !== 'undefined' && Intl.Segmenter ? Array.from(new Intl.Segmenter('bn', {granularity: 'grapheme'}).segment(t)).length : Array.from(t).length);
  const em = words.reduce((s, w) => s + gc(w) * 0.62, 0) + gap * Math.max(0, words.length - 1);
  const fs = Math.min(u(v ? 84 : 84), maxW / Math.max(1, em)), top = L.content.top + u(6), height = fs * 1.45;
  return {fs, top, height, bottom: top + height, cx: L.cx(50), maxWidth: maxW, width: em * fs};
}
export function houseGeom(L) {
  const v = L.isVertical, width = v ? L.content.width * 0.96 : Math.min(L.content.width * 0.7, L.u(1000)), cx = L.cx(50);
  return {left: cx - width / 2, right: cx + width / 2, cx, width, apexY: L.cy(v ? 26 : 30), eaveY: L.cy(v ? 33 : 40), groundY: L.cy(v ? 44 : 62), overhang: L.u(30)};
}

// ---- timing ----
// groups drift apart from প্রহ্লাদ's cue to 20 frames before the end of the scene (0 → 1)
export const driftAmount = (f, cues) => smooth((f - cues.pralhad) / Math.max(1, cues.len - 20 - cues.pralhad));
export const spikeAt = (f, at, len = 12) => (f < at ? 0 : clamp01(1 - (f - at) / Math.max(1, len)));
export function moodFor(key, f, cues) {
  const after = f >= cues.hit;
  if (key === 'bou1' || key === 'bou2' || key === 'wife' || key === 'pralhad') return after ? 'scared' : 'worried';
  if (key === 'pankaj') return 'worried';
  return after ? 'worried' : 'calm'; // provas: stern, then uneasy
}

// ---- the red crack (behind everybody) ----
const SEG = 14;
export function crackPoints(L, f) {
  const out = [];
  let off = 0;
  for (let i = 0; i <= SEG; i++) {
    off = Math.max(-L.u(34), Math.min(L.u(34), off + (random(`dis-crack-${i}`) - 0.5) * L.u(46)));
    out.push({x: L.cx(50) + off, y: -L.u(10) + ((L.height + L.u(20)) * i) / SEG});
  }
  return out;
}
export const crackWidth = (L, g) => L.u(5) + L.u(26) * clamp01(g);
export function crackPolygon(pts, w) {
  const left = pts.map((p, i) => ({x: p.x - (w * (0.35 + 0.65 * Math.sin((Math.PI * i) / pts.length))) / 2, y: p.y}));
  const right = pts.map((p, i) => ({x: p.x + (w * (0.35 + 0.65 * Math.sin((Math.PI * i) / pts.length))) / 2, y: p.y})).reverse();
  return left.concat(right).map((p, i) => `${i ? 'L' : 'M'}${f2(p.x)} ${f2(p.y)}`).join(' ') + ' Z';
}

function Backdrop({cues}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L, H = houseGeom(L), g = driftAmount(f, cues), tension = clamp01((f - cues.hit) / 20);
  const grow = ease((f - cues.kintu) / 12), pts = crackPoints(L, f), shown = pts.slice(0, Math.max(2, Math.ceil(grow * pts.length)));
  const ov = H.overhang, th = H.eaveY - H.apexY, rIn = H.width * 0.12, w = crackWidth(L, g);
  const roofD = `M${f2(H.left - ov)} ${f2(H.eaveY)} L${f2(H.left + rIn)} ${f2(H.apexY)} L${f2(H.right - rIn)} ${f2(H.apexY)} L${f2(H.right + ov)} ${f2(H.eaveY)} Z`;
  const doorW = u(70), fl = 0.85 + 0.1 * Math.sin(f * 0.27) - (random(`dis-fl-${Math.floor(f / 3)}`) < 0.07 ? 0.25 : 0);
  const win = [0.18, 0.34, 0.66, 0.82].map((k) => ({x: H.left + H.width * k - u(15), y: H.eaveY + u(14), w: u(30), h: u(38)}));
  return (
    <AbsoluteFill style={{zIndex: LAYERS.bg + 1}}>
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id="dis-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a120d" /><stop offset="0.5" stopColor="#0a0709" /><stop offset="1" stopColor="#030206" /></linearGradient>
          <radialGradient id="dis-yard" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffb020" stopOpacity="0.35" /><stop offset="1" stopColor="#ffb020" stopOpacity="0" /></radialGradient>
          <radialGradient id="dis-red" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff2d3d" stopOpacity="0.55" /><stop offset="1" stopColor="#ff2d3d" stopOpacity="0" /></radialGradient>
        </defs>
        <rect x="0" y={f2(H.groundY)} width={L.width} height={f2(L.height - H.groundY)} fill="url(#dis-ground)" />
        <rect x={f2(H.left)} y={f2(H.eaveY - u(4))} width={f2(H.width)} height={f2(H.groundY - H.eaveY + u(4))} fill="#1b130e" />
        <path d={roofD} fill="#0a0805" />
        <rect x={f2(H.cx - doorW / 2)} y={f2(H.eaveY + u(12))} width={f2(doorW)} height={f2(H.groundY - H.eaveY - u(12))} fill="#ffb020" opacity={f2(0.7 * fl * (1 - 0.6 * tension))} />
        {win.map((q, i) => (
          <g key={i}>
            <rect x={f2(q.x)} y={f2(q.y)} width={f2(q.w)} height={f2(q.h)} fill="#ffb020" opacity={f2(0.6 * fl)} />
            <rect x={f2(q.x)} y={f2(q.y)} width={f2(q.w)} height={f2(q.h)} fill="#ff2d3d" opacity={f2(0.85 * tension)} />
          </g>
        ))}
        <ellipse cx={f2(H.cx)} cy={f2(H.groundY + u(30))} rx={f2(H.width * 0.4)} ry={f2(u(60))} fill="url(#dis-yard)" opacity={f2(1 - 0.7 * tension)} />
        {grow > 0 && (
          <g>
            <path d={crackPolygon(shown, w * 3.2)} fill="url(#dis-red)" opacity="0.5" />
            <path d={crackPolygon(shown, w)} fill="#12000a" stroke={COLORS.blood} strokeWidth={f2(u(2.5))} strokeLinejoin="round" />
            {[3, 7, 10].map((k, i) => shown[k] && (
              <line key={i} x1={f2(shown[k].x)} y1={f2(shown[k].y)} x2={f2(shown[k].x + (i % 2 ? 1 : -1) * u(46 + 16 * i))} y2={f2(shown[k].y + u(30))} stroke={COLORS.blood} strokeWidth={f2(u(2))} opacity="0.8" />
            ))}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
}

export function Part2_Scene03_Discord({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const cues = discordCues(data, scene), len = cues.len, S = discordSlots(L), g = driftAmount(f, cues);
  const words = String(scene.title || 'বনিবনা হয়নি').split(/\s+/).filter(Boolean), box = labelBox(L, words), at = [cues.hit, cues.no].concat(words.slice(2).map(() => cues.no));
  const low = Object.values(S).reduce((m, s) => Math.max(m, charRect(L, s, 0).bottom), 0), feetPct = (100 * low) / L.height;
  const cast = [['bou1', cues.bou1], ['bou2', cues.bou2], ['provas', cues.provas], ['pankaj', cues.pankaj], ['pralhad', cues.pralhad], ['wife', cues.wife]];
  const spike = spikeAt(f, cues.hit, 14), kick = spikeAt(f, cues.kintu, 8), vig = 0.08 + 0.25 * clamp01(f / len) + 0.3 * spike;
  const fog = 0.2 + 0.4 * clamp01(f / len);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={CAMERA_ZOOM} shake={[0.04, 0.3]} seed="discord" origin={[50, feetPct]} from={0} to={len} easing="inOut">
        <BgSky mood="calm" moonX={L.isVertical ? 92 : 82} moonY={L.isVertical ? 10 : 22} seed="discord" />
        <Backdrop cues={cues} />
        <FxFog layers={3} density={fog} color="#b04050" speed={0.9} />
        <FxParticles type="dust" count={20} color="#cfa090" seed="discord" speed={0.8} />
        {cast.map(([key, appearAt]) => {
          const s = S[key];
          return <Character key={key} id={s.id} x={slotX(s, g)} y={s.y} scale={s.scale} flip={s.flip} mood={moodFor(key, f, cues)} appearAt={appearAt} seed={key} />;
        })}
      </Camera>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, pointerEvents: 'none', background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(120,0,14,${f2(vig)}) 100%)`}} />
      <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: box.cx - box.maxWidth / 2, width: box.maxWidth, top: box.top, height: box.height, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: box.fs * 0.3, fontFamily: FONT_TITLE, fontSize: box.fs, lineHeight: 1.2, whiteSpace: 'nowrap'}}>
          {words.map((w, i) => {
            const t = f - at[i];
            if (t < 0) return null;
            const jx = t < 10 ? (random(`dis-jit-${i}-${t}`) - 0.5) * u(14) : 0, sc = 1.6 - 0.6 * ease(t / 7);
            return (
              <span key={i} style={{display: 'inline-block', color: i === 0 ? COLORS.blood : COLORS.bone, opacity: clamp01(t / 3), transform: `translateX(${jx.toFixed(2)}px) scale(${sc.toFixed(3)})`, transformOrigin: '50% 60%', WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(24)}px rgba(255,45,61,0.8), 0 0 ${u(56)}px rgba(255,45,61,0.35)`}}>{w}</span>
            );
          })}
        </div>
      </AbsoluteFill>
      <FlashCut at={cues.kintu} color="#ffffff" length={6} peak={0.45} />
      <FlashCut at={cues.hit} color="#ff2d3d" length={8} peak={0.35} />
      <GlitchBurst at={[cues.hit, cues.no]} length={6} intensity={0.9} seed="discord" />
      {kick > 0 && <AbsoluteFill style={{zIndex: LAYERS.scene + 3, pointerEvents: 'none', background: `rgba(255,45,61,${f2(0.12 * kick)})`}} />}
    </AbsoluteFill>
  );
}

export default Part2_Scene03_Discord;
