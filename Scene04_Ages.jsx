// Scene04_Ages.jsx (Step 30) — S4 "ages": the family stands lined up in the lantern-lit hut; Provas gets an age counter ৩৫ (count-up synced to "পঁয়ত্রিশ,"),
//   Pankaj a counter that climbs to ৩০ and then will not stay still ("~৩০ ?") on "তিরিশের কাছাকাছি।" — glitch hit, lantern stutter, dread push-in, blood vignette.
// Exports : named + default `Scene04_Ages` ({scene, data}); pure helpers (testable in Node):
//           wfOf(data, scene, i), ageCues(data, scene), ageSlots(L), charRect(L, slot), cardBoxes(L, slots), zoomedTop(rect), leaderLine(L, box, rect),
//           cameraOrigin(L, slots), countValue(f, at, len, target), wobbleValue(f, from, base, seed), popState(f, at), punchScale(f, at), lanternAt(f, dread),
//           creepAt(f, dread, len), dreadAmount(f, dread, len), spikeAt(f, at), glowAlpha(f, at, pulseAt), mixHex(a, b, t),
//           consts ZOOM_BASE, ZOOM_DREAD, ZMAX, MOODS_BEFORE, MOODS_DREAD
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={endFrame-startFrame}>; every frame here is LOCAL
//           (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : cues come from story_data.json (never hard-coded): the first word naming each son (byWord) → card pops; the first `entity:'age'` word after it → count-up starts;
//           the LAST word of the scene (কাছাকাছি।) → dread hit. horror1 → provas name wf(27)=0, age wf(29)=29 (৩৫ lands 14 frames later) · pankaj name wf(30)=60, age wf(32)=83
//           (৩০ lands exactly at the dread cue) · dread wf(33)=94; scene length 130.
// Layout  : only useLayout(). ONE row of five characters (same order as Scene03: pralhad · wife · provas · pankaj · prokash; feet on the content-zone floor), the two age cards sit
//           ABOVE their heads (pushed apart when the heads are closer than a card width) with a dashed leader line down to each head. Cards, lines and everything with text are
//           OUTSIDE the <Camera>, so they never zoom; the line ends are computed for the maximum zoom (ZMAX) so a line never reaches a name tag. Caption band untouched.
// Camera  : outer push-in 1.05 → 1.07 over the scene (S3 ended at 1.05), inner dread push-in 1 → 1.06 from dreadAt−2 to the end; origin = the feet line (floor never moves, so the
//           characters never grow into the caption band). Dread = GlitchBurst + blood FlashCut at the cue, lantern stutter, shadowCreep 0.18 → 0.60, red vignette, moods → scared.
// Rules   : deterministic (useCurrentFrame, random(seed); no Math.random / CSS animation / SVG filters); characters only via Characters.js; Bengali numerals/names are single text nodes
//           (digits are single code points, each in its own fixed-width slot so the counter never jitters).
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, FONT_LABEL, FONT_TITLE, LAYERS, toBn, useLayout} from './theme.js';
import {BgInterior} from './Bg_Interior.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {Camera} from './Camera.jsx';
import {FlashCut, GlitchBurst} from './Transitions.jsx';
import {Character, byWord, getMeta} from './Characters.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const backOut = (t) => { const c = 1.70158, x = clamp01(t) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const ORDER = ['pralhad', 'wife', 'provas', 'pankaj', 'prokash'];
export const MOODS_BEFORE = {pralhad: 'calm', wife: 'worried', provas: 'calm', pankaj: 'worried', prokash: 'calm'}; // = end state of Scene03
export const MOODS_DREAD = {pralhad: 'worried', wife: 'scared', provas: 'worried', pankaj: 'scared', prokash: 'worried'};
export const ZOOM_BASE = [1.05, 1.07], ZOOM_DREAD = 1.06, ZMAX = ZOOM_BASE[1] * ZOOM_DREAD;

export const wfOf = (data, scene, i) => data.words[i].startFrame - scene.startFrame;

// cue frames (LOCAL): {provas:{nameAt, ageAt}, pankaj:{nameAt, ageAt}, dreadAt}; falls back to range offsets when the data has no matching words
export function ageCues(data, scene) {
  const [a, b] = scene.wordRange, W = data.words, cur = {provas: {name: Math.min(b, a), age: Math.min(b, a + 2)}, pankaj: {name: Math.min(b, a + 3), age: Math.min(b, a + 5)}}, seen = {};
  let who = null;
  for (let i = a; i <= b; i++) {
    const id = byWord(W[i].text);
    if ((id === 'provas' || id === 'pankaj') && !seen[id]) { seen[id] = {name: i}; who = id; }
    else if (W[i].entity === 'age' && who && seen[who] && seen[who].age === undefined) seen[who].age = i;
  }
  const pick = (id) => ({name: seen[id] ? seen[id].name : cur[id].name, age: seen[id] && seen[id].age !== undefined ? seen[id].age : cur[id].age});
  const p = pick('provas'), k = pick('pankaj');
  return {provas: {nameAt: wfOf(data, scene, p.name), ageAt: wfOf(data, scene, p.age)}, pankaj: {nameAt: wfOf(data, scene, k.name), ageAt: wfOf(data, scene, k.age)}, dreadAt: wfOf(data, scene, b)};
}

// one row of five: x / feet-y in % of the CONTENT zone, scale, flip (wife + the youngest son in 9:16 face the centre, like Scene03)
export function ageSlots(L) {
  const v = L.isVertical, xs = v ? [12, 31, 50, 69, 88] : [14, 32, 52, 70, 88], o = {};
  ORDER.forEach((id, i) => { o[id] = {x: xs[i], y: v ? 100 : 92, scale: v ? 0.58 : 0.85, flip: id === 'wife' || (v && id === 'prokash')}; });
  return o;
}

// outer frame of a character (CharFrame maths: height = content.height × 0.5 × scale, width = 4/7 of it, x centred, y = feet; the name tag sits at the frame top)
export function charRect(L, s) {
  const h = L.content.height * 0.5 * s.scale, w = (h * 4) / 7, cx = L.cx(s.x), feet = L.cy(s.y);
  return {left: cx - w / 2, right: cx + w / 2, top: feet - h, bottom: feet};
}

// frame top after the maximum camera zoom about the feet line (origin y = feet, so the feet never move)
export const zoomedTop = (r) => r.bottom - (r.bottom - r.top) * ZMAX;

// the two age cards: centred over the heads, pushed apart if they would touch; top of the content zone
export function cardBoxes(L, slots) {
  const {u, isVertical: v} = L, w = u(v ? 360 : 280), h = u(v ? 340 : 206), gap = u(30);
  const rp = charRect(L, slots.provas), rk = charRect(L, slots.pankaj);
  let a = (rp.left + rp.right) / 2, b = (rk.left + rk.right) / 2;
  if (b - a < w + gap) { const m = (a + b) / 2; a = m - (w + gap) / 2; b = m + (w + gap) / 2; }
  const cl = (c) => Math.max(L.content.left + w / 2, Math.min(L.content.right - w / 2, c)), top = L.content.top + u(v ? 34 : 12);
  return {provas: {left: cl(a) - w / 2, top, width: w, height: h, cx: cl(a)}, pankaj: {left: cl(b) - w / 2, top, width: w, height: h, cx: cl(b)}};
}

// dashed leader: card bottom-centre → just above the (zoomed) name tag of the character
export const leaderLine = (L, box, rect) => ({x1: box.cx, y1: box.top + box.height, x2: (rect.left + rect.right) / 2, y2: zoomedTop(rect) - L.u(8)});
export const cameraOrigin = (L, slots) => [50, (100 * charRect(L, slots.provas).bottom) / L.height];

// counters
export const countValue = (f, at, len, target) => (f < at ? 0 : Math.round(target * ease((f - at) / Math.max(1, len))));
export function wobbleValue(f, from, base, seed) { // after the dread cue the number will not settle: 28…32 re-rolled every 3 frames
  if (f < from) return base;
  const k = Math.floor((f - from) / 3), opts = [base, base - 1, base + 1, base, base + 2, base - 2, base];
  return k === 0 ? base : opts[Math.floor(random(`ages-${seed}-${k}`) * opts.length) % opts.length];
}
export function popState(f, at) { const t = f - at; return t < 0 ? {on: false, scale: 0.7, op: 0} : {on: true, scale: 0.7 + 0.3 * backOut(t / 8), op: clamp01(t / 3)}; }
export const punchScale = (f, at) => (f < at ? 1 : 1 + 0.14 * Math.sin(Math.PI * clamp01((f - at) / 10)));

// atmosphere
export function lanternAt(f, dread) { // 1 until the dread cue, then a hard dip and a stutter (re-rolled every 3 frames, 0.4…1)
  if (f < dread) return 1;
  const k = Math.floor((f - dread) / 3);
  return k === 0 ? 0.2 : 0.4 + 0.6 * random(`ages-lantern-${k}`);
}
export const creepAt = (f, dread, len) => 0.18 + 0.12 * clamp01(f / Math.max(1, dread)) + 0.3 * ease((f - dread) / Math.max(1, len - dread));
export const dreadAmount = (f, dread, len) => { const x = clamp01((f - (dread - 6)) / Math.max(1, len - (dread - 6))); return x * x * (3 - 2 * x); };
export const spikeAt = (f, at) => (f < at ? 0 : 0.3 * Math.max(0, 1 - (f - at) / 9));
export const glowAlpha = (f, at, pulseAt) => 0.2 * clamp01((f - at) / 8) + (f < pulseAt ? 0 : 0.25 * Math.max(0, 1 - (f - pulseAt) / 12));
export function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b), k = clamp01(t);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

function Digits({text, fs, u, color, op = 1, glow, split = 0, tilde = null}) {
  const slot = fs * 0.3, sh = split ? `${split}px 0 ${COLORS.ghost}, ${-split}px 0 ${COLORS.blood}, ` : '';
  const side = (c) => <span style={{display: 'inline-block', width: slot, textAlign: 'center', fontSize: fs * 0.5, opacity: c ? 1 : 0}}>{c ? '~' : ''}</span>;
  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: FONT_TITLE, fontSize: fs, lineHeight: 1.1, color, opacity: op, whiteSpace: 'nowrap',
      WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `${sh}0 0 ${u(30)}px ${glow}`}}>
      {tilde !== null && side(tilde)}
      {Array.from(text).map((ch, i) => <span key={i} style={{display: 'inline-block', width: fs * 0.62, textAlign: 'center'}}>{ch}</span>)}
      {tilde !== null && side(false)}
    </div>
  );
}

function Card({u, box, st, color, name, text, dim, glow, split, punch, tilde, badge, label}) {
  if (!st.on) return null;
  const bp = badge ? popState(badge.f, badge.at) : {on: false, scale: 0, op: 0}, pad = u(16), fs = box.height * 0.46;
  return (
    <div style={{position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, boxSizing: 'border-box', padding: pad, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', alignItems: 'center', borderRadius: u(26), background: 'rgba(5,6,11,0.86)', border: `${u(5)}px solid ${color}`, boxShadow: `0 0 ${u(34)}px ${color}66`,
      opacity: st.op, transform: `scale(${(st.scale * punch).toFixed(3)})`, transformOrigin: '50% 50%'}}>
      <div style={{display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontFamily: FONT_LABEL, fontWeight: 700, fontSize: u(36), lineHeight: 1.3, color, whiteSpace: 'nowrap'}}>{name}</span>
        <span style={{width: u(52), height: u(52), borderRadius: '50%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TITLE, fontSize: u(36),
          lineHeight: 1, color: COLORS.bone, background: bp.on ? COLORS.blood : 'transparent', opacity: bp.op, transform: `scale(${bp.scale.toFixed(3)})`, boxShadow: bp.on ? `0 0 ${u(24)}px ${COLORS.blood}` : 'none'}}>{bp.on ? '?' : ''}</span>
      </div>
      <Digits text={text} fs={fs} u={u} color={color} op={dim ? 0.35 : 1} glow={glow} split={split} tilde={tilde} />
      {label ? <span style={{fontFamily: FONT_LABEL, fontWeight: 700, fontSize: u(32), lineHeight: 1.2, color: COLORS.bone}}>বছর</span> : <span style={{height: 0}} />}
    </div>
  );
}

export function Scene04_Ages({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L, len = scene.endFrame - scene.startFrame;
  const cues = ageCues(data, scene), slots = ageSlots(L), boxes = cardBoxes(L, slots), org = cameraOrigin(L, slots), d = cues.dreadAt;
  const rect = {provas: charRect(L, slots.provas), pankaj: charRect(L, slots.pankaj)};
  const meta = {provas: getMeta('provas'), pankaj: getMeta('pankaj')};
  const dAmt = clamp01((f - d) / 6), dread = dreadAmount(f, d, len), landP = cues.provas.ageAt + 14;
  const vP = countValue(f, cues.provas.ageAt, 14, 35);
  const vK = f < d ? countValue(f, cues.pankaj.ageAt, Math.max(6, d - cues.pankaj.ageAt), 30) : wobbleValue(f, d, 30, 'pankaj');
  const colP = COLORS.toxic, colK = mixHex(meta.pankaj ? meta.pankaj.tagColor : COLORS.violet, COLORS.blood, dAmt);
  const split = f >= d && f < d + 40 ? Math.round((random(`ages-split-${f}`) - 0.5) * 2 * u(8)) : 0;
  const vig = 0.08 + 0.3 * dread + spikeAt(f, d), dark = 0.35 * dread;
  const lines = ['provas', 'pankaj'].map((id) => ({id, ln: leaderLine(L, boxes[id], rect[id]), p: ease((f - (id === 'provas' ? cues.provas.nameAt : cues.pankaj.nameAt) - 4) / 10), col: id === 'provas' ? colP : colK}));
  const glows = [['provas', colP, cues.provas.nameAt, landP], ['pankaj', colK, cues.pankaj.nameAt, d]];
  const mood = (id) => (f >= d ? MOODS_DREAD[id] : MOODS_BEFORE[id]);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={ZOOM_BASE} origin={org} from={0} to={len} easing="inOut">
        <Camera zoom={[1, ZOOM_DREAD]} origin={org} from={Math.max(0, d - 2)} to={len} easing="in">
          <BgInterior lantern={lanternAt(f, d)} shadowCreep={creepAt(f, d, len)} moon={1 - 0.5 * dread} seed="a" />
          {glows.map(([id, col, at, pulse]) => {
            const r = rect[id], a = glowAlpha(f, at, pulse), w = r.right - r.left, h = r.bottom - r.top;
            return a > 0.001 && <div key={id} style={{position: 'absolute', left: (r.left + r.right) / 2 - w * 1.1, top: (r.top + r.bottom) / 2 - h * 0.75, width: w * 2.2, height: h * 1.5, zIndex: LAYERS.bg + 2,
              background: `radial-gradient(ellipse at 50% 50%, ${col}${Math.round(Math.min(1, a) * 255).toString(16).padStart(2, '0')} 0%, ${col}00 70%)`}} />;
          })}
          <FxParticles type="dust" count={20} seed="family" />
          {ORDER.map((id) => { const s = slots[id]; return <Character key={id} id={id} x={s.x} y={s.y} scale={s.scale} flip={s.flip} mood={mood(id)} appearAt={-60} />; })}
        </Camera>
      </Camera>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 2, pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 55%, rgba(255,45,61,0) 40%, rgba(255,45,61,${vig.toFixed(3)}) 100%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,${dark.toFixed(3)}) 100%)`}} />
      <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', inset: 0, zIndex: LAYERS.scene + 4, pointerEvents: 'none'}}>
        {lines.map(({id, ln, p, col}) => p > 0 && (
          <g key={id}>
            <line x1={ln.x1} y1={ln.y1} x2={ln.x1 + (ln.x2 - ln.x1) * p} y2={ln.y1 + (ln.y2 - ln.y1) * p} stroke={col} strokeWidth={u(4)} strokeLinecap="round" strokeDasharray={`${u(12)} ${u(10)}`} strokeDashoffset={-f * u(1.2)} opacity="0.9" />
            {p >= 1 && <circle cx={ln.x2} cy={ln.y2} r={u(6)} fill={col} />}
          </g>
        ))}
      </svg>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
        <Card u={u} box={boxes.provas} st={popState(f, cues.provas.nameAt)} color={colP} name={meta.provas ? meta.provas.bn : 'প্রভাস'} text={toBn(String(vP).padStart(2, '0'))} dim={f < cues.provas.ageAt}
          glow={`${colP}${Math.round((0.5 + 0.5 * (f >= landP ? Math.max(0, 1 - (f - landP) / 14) : 0)) * 255).toString(16).padStart(2, '0')}`} split={0} punch={punchScale(f, landP)} tilde={null} badge={null} label={L.isVertical} />
        <Card u={u} box={boxes.pankaj} st={popState(f, cues.pankaj.nameAt)} color={colK} name={meta.pankaj ? meta.pankaj.bn : 'পঙ্কজ'} text={toBn(String(vK).padStart(2, '0'))} dim={f < cues.pankaj.ageAt}
          glow={`${colK}aa`} split={split} punch={punchScale(f, d)} tilde={f >= d} badge={{f, at: d}} label={L.isVertical} />
      </AbsoluteFill>
      <GlitchBurst at={[d, d + 14]} length={6} intensity={0.9} seed="ages" />
      <FlashCut at={d} color={COLORS.blood} length={8} peak={0.35} />
    </AbsoluteFill>
  );
}

export default Scene04_Ages;
