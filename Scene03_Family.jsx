// Scene03_Family.jsx (Step 29) — S3 "family": inside the mud hut by lantern light; the five Biswas family members pop in exactly when
// their name is spoken (প্রহ্লাদ → স্ত্রী → প্রভাস → পঙ্কজ → প্রকাশ) with coloured name tags; title "বিশ্বাস পরিবার" stamps in on "বিশ্বাস,".
// Exports : named + default `Scene03_Family` ({scene, data}); pure helpers (testable in Node):
//           wfOf(data, scene, i), cleanName(text), characterCues(data, scene), familySlots(L), charRect(L, slot), titleBox(L), titleState(f, at),
//           creepAt(f, from, len), CAMERA_ORIGIN, MOODS_BY_ID
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={endFrame-startFrame}>; every frame here is
//           LOCAL (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition; no captions / grain / audio.
// Timing  : cues come from story_data.json — each character's appearAt = the first word of the scene that `byWord()` (Characters.js) maps to that id
//           (horror1 → pralhad wf(16)=25 · wife wf(19)=73 · provas wf(23)=121 · pankaj wf(24)=144 · prokash wf(26)=167; scene length 197).
//           title "বিশ্বাস পরিবার" (scene.title) stamps in at the word that starts with বিশ্বাস (wf(17)=38); no talking mouths (the narrator speaks).
//           Camera: slow push-in 1 → 1.05 toward the lantern; shadowCreep 0 → 0.18 from the first son's cue to the end of the scene (first dread).
// Layout  : only useLayout(). VERTICAL = two rows: parents (pralhad x32 · wife x62, feet y 52 %) on top, sons (provas x20 · pankaj x50 · prokash x80,
//           feet y 100 %) below, scale 0.75 (frame ≈ 198×346 px, so the rows never touch: parents' feet ≈ 671 px, sons' frame top ≈ 768 px).
//           HORIZONTAL = one row of five (x 14/32/52/70/88, feet y 92 %, scale 1.0, frame ≈ 186×326 px). The wife (and the youngest son in the
//           vertical layout) face the centre (`flip`). The title sits at the top of the content zone, above every character frame. All inside the
//           content zone and above the caption band; nothing else draws there. z-order: Camera(world: BgInterior → dust → characters) → title.
// Rules   : deterministic (useCurrentFrame, no Math.random / CSS animation / SVG filters); characters are drawn by Characters.js components only.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {BgInterior} from './Bg_Interior.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {Camera} from './Camera.jsx';
import {Character, byWord} from './Characters.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const CAMERA_ORIGIN = [50, 45];
export const MOODS_BY_ID = {pralhad: 'calm', wife: 'worried', provas: 'calm', pankaj: 'worried', prokash: 'calm'};
const ORDER = ['pralhad', 'wife', 'provas', 'pankaj', 'prokash'];

export const wfOf = (data, scene, i) => data.words[i].startFrame - scene.startFrame;
export const cleanName = (t) => String(t || '').normalize('NFC').replace(/[\s।,.!?;:'"“”‘’\-–—]/g, '');

// first word of the scene that names each character → {id, word, at}; characters that are never named are skipped
export function characterCues(data, scene) {
  const [a, b] = scene.wordRange, seen = {}, out = [];
  for (let i = a; i <= b; i++) {
    const id = byWord(data.words[i].text);
    if (id && !seen[id]) { seen[id] = true; out.push({id, word: i, at: wfOf(data, scene, i)}); }
  }
  return out.sort((p, q) => ORDER.indexOf(p.id) - ORDER.indexOf(q.id));
}

// slot per character: x / feet y in % of the CONTENT zone, scale, flip — two rows when vertical, one row when horizontal
export function familySlots(L) {
  if (L.isVertical) {
    return {pralhad: {x: 32, y: 52, scale: 0.75, flip: false}, wife: {x: 62, y: 52, scale: 0.75, flip: true},
      provas: {x: 20, y: 100, scale: 0.75, flip: false}, pankaj: {x: 50, y: 100, scale: 0.75, flip: false}, prokash: {x: 80, y: 100, scale: 0.75, flip: true}};
  }
  const xs = [14, 32, 52, 70, 88];
  const o = {};
  ORDER.forEach((id, i) => { o[id] = {x: xs[i], y: 92, scale: 1, flip: id === 'wife'}; });
  return o;
}

// outer frame of a character (same maths as CharFrame: height = content.height × 0.5 × scale, width = 4/7 of it, x centred, y = feet)
export function charRect(L, s) {
  const h = L.content.height * 0.5 * s.scale, w = (h * 4) / 7, cx = L.cx(s.x), feet = L.cy(s.y);
  return {left: cx - w / 2, right: cx + w / 2, top: feet - h, bottom: feet};
}

// title box (one line, centred at the top of the content zone)
export function titleBox(L) {
  const {u, isVertical: v} = L, fs = u(v ? 58 : 54), top = L.content.top + u(v ? 22 : 20);
  return {fs, top, height: fs * 1.45, cx: L.cx(50), bottom: top + fs * 1.45, maxWidth: L.content.width * 0.92};
}

// title stamp: scale 1.7 → 1 (ease-out, 7 frames), opacity in 3 frames, glow 1 → 0.5 over 18 frames, underline sweep over 12 frames
export function titleState(f, at) {
  const t = f - at;
  if (t < 0) return {on: false, scale: 1, op: 0, glow: 0, line: 0};
  return {on: true, scale: 1.7 - 0.7 * ease(t / 7), op: clamp01(t / 3), glow: 0.5 + 0.5 * (1 - clamp01(t / 18)), line: ease(t / 12)};
}

// creeping-shadow amount: 0 until `from`, then linear up to `max` at the end of the scene
export const creepAt = (f, from, len, max = 0.18) => max * clamp01((f - from) / Math.max(1, len - from));

export function Scene03_Family({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const len = scene.endFrame - scene.startFrame;
  const cues = characterCues(data, scene), slots = familySlots(L), T = titleBox(L);
  const titleAt = (() => { const [a, b] = scene.wordRange; for (let i = a; i <= b; i++) if (cleanName(data.words[i].text).startsWith('বিশ্বাস')) return wfOf(data, scene, i); return cues.length ? cues[0].at : 0; })();
  const ts = titleState(f, titleAt), son = cues.find((c) => c.id === 'provas');
  const creep = creepAt(f, son ? son.at : Math.round(len * 0.6), len);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={[1, 1.05]} origin={CAMERA_ORIGIN} from={0} to={len} easing="inOut">
        <BgInterior lantern={1} shadowCreep={creep} moon={1} seed="a" />
        <FxParticles type="dust" count={20} seed="family" />
        {cues.map((c) => {
          const s = slots[c.id];
          return <Character key={c.id} id={c.id} x={s.x} y={s.y} scale={s.scale} flip={s.flip} mood={MOODS_BY_ID[c.id]} appearAt={c.at} />;
        })}
      </Camera>
      {ts.on && (
        <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
          <div style={{
            position: 'absolute', left: T.cx - T.maxWidth / 2, width: T.maxWidth, top: T.top, height: T.height, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_TITLE, fontSize: T.fs, lineHeight: 1.2, color: COLORS.bone, whiteSpace: 'nowrap', opacity: ts.op, transform: `scale(${ts.scale.toFixed(3)})`, transformOrigin: '50% 50%',
            WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill',
            textShadow: `0 0 ${u(26)}px rgba(255,176,32,${(0.8 * ts.glow).toFixed(2)}), 0 0 ${u(60)}px rgba(255,45,61,${(0.4 * ts.glow).toFixed(2)})`,
          }}>{scene.title}</div>
          <div style={{position: 'absolute', left: T.cx - (u(300) * ts.line) / 2, top: T.bottom - u(6), width: u(300) * ts.line, height: u(7), borderRadius: u(4), background: COLORS.amber, boxShadow: `0 0 ${u(18)}px ${COLORS.amber}`}} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

export default Scene03_Family;
