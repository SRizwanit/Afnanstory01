// Scene_Template.jsx (Step 31) — COPY-PASTE TEMPLATE for every future scene (any part). It is also a working scene: mount it and you see a
//   lantern-lit hut, one character that pops in on a chosen word, a title that stamps in on a chosen word, and a dread ramp on the last word.
// HOW TO USE : (1) copy this file → `Scene05_Name.jsx` (or `Part2_Scene01_Name.jsx`), rename the component + the default export; (2) edit ONLY the blocks marked
//   `// ◀ EDIT`; (3) add the scene to the SCENES table in build_data.py (id, component, wordRange, title) and to the component map in Story.jsx (Step 34).
// Exports : named + default `Scene_Template` ({scene, data}); pure helpers (reuse them by copying — files stay independent):
//           wfOf(data, scene, i)            frame (LOCAL to the scene) at which word i starts
//           wefOf(data, scene, i)           frame (LOCAL) at which word i ends
//           findWord(data, scene, test)     index of the first word in scene.wordRange for which test(word, i) is true, or -1
//           cueOf(data, scene, test, fb)    LOCAL start frame of that word; `fb` (a range offset, default 0) is used when no word matches
//           cleanWord(text)                 strips spaces / punctuation (। , . ! ? ; : quotes dashes) and normalises NFC
//           stampState(f, at, len)          {on, scale, op}: 1.7 → 1 ease-out stamp (title / numbers)
//           rampAt(f, from, to, max)        linear 0 → max between two LOCAL frames (shadow creep, vignette, glow)
//           slotsFor(L)                     layout switch example: character slots for vertical vs horizontal (x / feet-y in % of the CONTENT zone, scale, flip)
//           charRect(L, slot)               outer frame (px) of a character → use it to keep text / props from overlapping it
//           titleBox(L)                     geometry of a one-line title at the top of the content zone
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={scene.endFrame-scene.startFrame}>.
//           1) Frames inside a scene are LOCAL (useCurrentFrame() = 0 at the scene start). Never add scene.startFrame again.
//           2) Word sync: `wf(i) = data.words[i].startFrame - scene.startFrame` (= wfOf). Read cues from the data, never hard-code seconds / frames.
//           3) The scene fills 100 % of the composition (<AbsoluteFill>) and draws NO captions, film grain or audio (Story.jsx does).
//           4) Geometry only from `useLayout()` (theme.js): key art / text lives in `L.content`, never in `L.caption`; place with L.cx(pct) / L.cy(pct);
//              `L.isVertical` switches the arrangement (9:16 = stacked rows, 16:9 = side-by-side); sizes via `L.u(n)`; z-index from LAYERS.
//           5) Things that appear at the same time get SEPARATE slots (rows / columns) — verify rectangles do not intersect in BOTH 1080×1920 and 1920×1080
//              (the Scene03 / Scene04 test recipe: esbuild + react-dom/server with stubs; assert no rect intersections for all frames).
//           6) Deterministic: only useCurrentFrame / interpolate / spring / random('seed'); no Math.random, no CSS animation/transition, no setTimeout, no SVG filters.
//           7) Bengali text: one text node per word / label (never split a word into code points); numerals via toBn(n).
// Layers  : world (BgInterior / BgSky+BgVillage, FxParticles, characters) inside <Camera> → text overlays OUTSIDE <Camera> (they must not zoom) → transitions last.
//           Camera origin: use the feet line ([50, feet%]) when characters stand on the content floor, so they never grow into the caption band.
// Props   : { scene: {id, component, title, wordRange:[a,b], startFrame, endFrame}, data: story_data.json (words[], pages[], scenes[], fps …) }
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {BgInterior} from './Bg_Interior.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {Camera} from './Camera.jsx';
import {GlitchBurst} from './Transitions.jsx';
import {Character, byWord} from './Characters.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);

// ---- word-sync helpers (LOCAL frames) ----
export const wfOf = (data, scene, i) => data.words[i].startFrame - scene.startFrame;
export const wefOf = (data, scene, i) => data.words[i].endFrame - scene.startFrame;
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

// ---- animation helpers ----
export function stampState(f, at, len = 7) {
  const t = f - at;
  return t < 0 ? {on: false, scale: 1.7, op: 0} : {on: true, scale: 1.7 - 0.7 * ease(t / len), op: clamp01(t / 3)};
}
export const rampAt = (f, from, to, max = 1) => max * clamp01((f - from) / Math.max(1, to - from));

// ---- layout switch example: vertical = stacked, horizontal = side by side ----
export function slotsFor(L) {
  return L.isVertical ? {hero: {x: 50, y: 92, scale: 0.8, flip: false}} : {hero: {x: 50, y: 92, scale: 1, flip: false}};
}
// CharFrame maths: height = content.height × 0.5 × scale, width = 4/7 of it, x centred, y = feet (the name tag sits at the frame top)
export function charRect(L, s) {
  const h = L.content.height * 0.5 * s.scale, w = (h * 4) / 7, cx = L.cx(s.x), feet = L.cy(s.y);
  return {left: cx - w / 2, right: cx + w / 2, top: feet - h, bottom: feet};
}
export function titleBox(L) {
  const {u, isVertical: v} = L, fs = u(v ? 58 : 54), top = L.content.top + u(v ? 22 : 20);
  return {fs, top, height: fs * 1.45, cx: L.cx(50), bottom: top + fs * 1.45, maxWidth: L.content.width * 0.92};
}

export function Scene_Template({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const len = scene.endFrame - scene.startFrame;
  // ◀ EDIT 1 — cues: which word triggers what (all LOCAL frames, read from the data)
  const heroAt = cueOf(data, scene, (w) => byWord(w.text) === 'provas', 0);       // character pops in when his name is spoken
  const titleAt = cueOf(data, scene, (w) => w.emphasis, 0);                         // title stamps in on the first emphasised word
  const dreadAt = wfOf(data, scene, scene.wordRange[1]);                           // last word of the scene
  // ◀ EDIT 2 — layout: slots per character (see slotsFor) and the title geometry
  const slots = slotsFor(L), hero = slots.hero, T = titleBox(L), ts = stampState(f, titleAt);
  const feetPct = (100 * charRect(L, hero).bottom) / L.height;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Camera zoom={[1.02, 1.08]} origin={[50, feetPct]} from={0} to={len} easing="inOut">
        {/* ◀ EDIT 3 — world: background + fx + characters (all inside Camera) */}
        <BgInterior lantern={1} shadowCreep={rampAt(f, dreadAt, len, 0.4)} moon={1} seed="a" />
        <FxParticles type="dust" count={20} seed={scene.id} />
        <Character id="provas" x={hero.x} y={hero.y} scale={hero.scale} flip={hero.flip} mood={f >= dreadAt ? 'scared' : 'calm'} appearAt={heroAt} />
      </Camera>
      {/* ◀ EDIT 4 — text overlays OUTSIDE Camera (title, labels, counters); keep them inside L.content and away from charRect() */}
      {ts.on && (
        <AbsoluteFill style={{zIndex: LAYERS.scene + 5, pointerEvents: 'none'}}>
          <div style={{position: 'absolute', left: T.cx - T.maxWidth / 2, width: T.maxWidth, top: T.top, height: T.height, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_TITLE, fontSize: T.fs, lineHeight: 1.2, color: COLORS.bone, whiteSpace: 'nowrap', opacity: ts.op, transform: `scale(${ts.scale.toFixed(3)})`,
            WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(26)}px rgba(255,176,32,0.8)`}}>{scene.title}</div>
        </AbsoluteFill>
      )}
      {/* ◀ EDIT 5 — transitions / hits (LOCAL frames) */}
      <GlitchBurst at={dreadAt} length={6} intensity={0.8} seed={scene.id} />
    </AbsoluteFill>
  );
}

export default Scene_Template;
