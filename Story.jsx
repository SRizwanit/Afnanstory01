// Story.jsx (v3, Step P2.10 — v2 FINAL from Step 34 + the 5 Part 2 scenes) — root component of every video: wires intro → scenes → outro, camera, FX, captions, audio.
// Exports : Story (named + default), totalFramesFor(data, intro, outro), locate(data, narrationFrame)   [same API as v1]
//           + pure helpers (testable): SCENES, sceneComponent(name), boundaryKind(i, n), dipFrames(len, i, n),
//             ambienceVolume(f, o), speechSpan(data, introOffset), DUCK, BASE_VOL
// Props   : { part='horror1', debug=false, intro=true, outro=true }
//             debug -> small HUD in the top safe margin (frame, time, scene, page, word). Final renders: false.
//             intro/outro -> include the 60/90-frame segments (they only shift the timeline; story_data.json is built to match).
// Needs   : story_data.json (build_data.py) · narration.wav (the Action copies <part>.wav to it) · ambience.wav (make_ambience.py)
//           · Intro, Outro, Captions, Camera, Fx_Film, Fx_Particles, Transitions, Scene01..04, Part2_Scene01..05, theme.js
// Used by : Root.jsx.
// Timeline (frames):  [ intro? ][ narration = data.narrationFrames: scenes + captions ][ outro? ]
//   Frames in story_data.json are RELATIVE to narration start → everything narration-related sits inside ONE
//   <Sequence from={introOffset}>, so scenes/captions keep their local/relative frames (contracts 6.3 and 6.6).
// Layers (z-index, root level):  bg 0 · [camera world: scenes + dip/ink transitions] · fx 20 (global dust) · captions 30 · film 40 · hud 90
//   - The transition overlays live INSIDE the camera wrapper (its transform makes its own stacking context) so a dip to black never
//     covers the captions; captions stay readable and un-zoomed. FxFilm (grain) is mounted for the whole video, above captions.
// Audio   : narration vol 1.0 from the first narration frame · ambience from frame 0, base 0.25, ducked to 0.15 while the narrator
//           speaks (15-frame ramps), fade-in 30 frames (1 s), fade-out 45 frames (1.5 s). Riser/thuds at scene starts are baked into
//           ambience.wav by make_ambience.py (Step 16), so no extra stinger track is needed here.
// Rules   : deterministic only (useCurrentFrame/interpolate; no Math.random, no CSS animation); geometry only from useLayout().
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame} from 'remotion';
import data from './story_data.json';
import narration from './narration.wav';
import ambience from './ambience.wav';
import {COLORS, FONT_LABEL, LAYERS, useLayout} from './theme.js';
import {Captions} from './Captions.jsx';
import {Camera} from './Camera.jsx';
import {FxFilm} from './Fx_Film.jsx';
import {FxParticles} from './Fx_Particles.jsx';
import {FadeInOut, GlitchBurst, WipeInk} from './Transitions.jsx';
import {Intro} from './Intro.jsx';
import {Outro} from './Outro.jsx';
import Scene01_Year from './Scene01_Year.jsx';
import Scene02_Village from './Scene02_Village.jsx';
import Scene03_Family from './Scene03_Family.jsx';
import Scene04_Ages from './Scene04_Ages.jsx';
import Part2_Scene01_Marriage from './Part2_Scene01_Marriage.jsx';
import Part2_Scene02_Joint from './Part2_Scene02_Joint.jsx';
import Part2_Scene03_Discord from './Part2_Scene03_Discord.jsx';
import Part2_Scene04_Leave from './Part2_Scene04_Leave.jsx';
import Part2_Scene05_Land from './Part2_Scene05_Land.jsx';

// ---------- scene registry: `scene.component` (story_data.json) → React component ----------
// Future parts: import the new Part2_SceneNN_*.jsx above and add one line here (nothing else changes).
export const SCENES = {
  Scene01_Year, Scene02_Village, Scene03_Family, Scene04_Ages, // horror1
  Part2_Scene01_Marriage, Part2_Scene02_Joint, Part2_Scene03_Discord, Part2_Scene04_Leave, Part2_Scene05_Land, // horror2
};
export const sceneComponent = (name) => (Object.prototype.hasOwnProperty.call(SCENES, name) ? SCENES[name] : null);

// ---------- pure helpers (no React; easy to test) ----------

// Total composition length for the chosen intro/outro switches (Root.jsx uses this).
export const totalFramesFor = (d, intro = true, outro = true) =>
  (intro ? d.introFrames : 0) + d.narrationFrames + (outro ? d.outroFrames : 0);

// Where are we? `n` = frame relative to narration start (can be < 0 in intro, >= narrationFrames in outro).
export function locate(d, n) {
  if (n < 0) return {segment: 'intro', scene: null, page: null, word: null};
  if (n >= d.narrationFrames) return {segment: 'outro', scene: null, page: null, word: null};
  const scene = d.scenes.find((s) => n >= s.startFrame && n < s.endFrame) || null;
  const page = d.pages.find((p) => n >= p.startFrame && n < p.endFrame) || null;
  let word = null; // last word that has started (held until the next one starts)
  for (const w of d.words) {
    if (w.startFrame <= n) word = w;
    else break;
  }
  return {segment: 'narration', scene, page, word};
}

// Transition at the cut between scene i and i+1: alternate a glitch + dip-to-ink with an ink-blot wipe.
export const boundaryKind = (i) => (i % 2 === 1 ? 'ink' : 'dip');

// Frames spent on the way out of / into a scene (0 for the very first scene's start and the very last scene's end:
// the intro already fades to ink, and the last scene ends on its own dread hit before the outro fades in).
export const dipFrames = (len, i, n) => ({
  inF: i > 0 ? Math.min(8, Math.floor(len / 4)) : 0,
  outF: i < n - 1 ? Math.min(6, Math.floor(len / 4)) : 0,
});

// Frames (absolute, whole video) in which the narrator is speaking: first word start → last word end.
export function speechSpan(d, introOffset) {
  const w = d.words;
  if (!w || !w.length) return [introOffset, introOffset];
  return [introOffset + w[0].startFrame, introOffset + w[w.length - 1].endFrame];
}

export const BASE_VOL = 0.25; // ambience.wav is already −20 dBFS RMS (plan 7.3)
export const DUCK = 0.15; // ambience level while the narrator speaks
// Ambience volume at absolute frame f. o = { total, span:[a,b], fadeIn=30, fadeOut=45, ramp=15, base, duck }
export function ambienceVolume(f, o) {
  const {total, span, fadeIn = 30, fadeOut = 45, ramp = 15, base = BASE_VOL, duck = DUCK} = o;
  const [a, b] = span;
  // 0 = not speaking … 1 = fully speaking (smooth 15-frame ramps at both ends of the narration)
  const speak = Math.max(0, Math.min(1, Math.min((f - (a - ramp)) / ramp, (b + ramp - f) / ramp)));
  const level = base + (duck - base) * speak;
  const fin = fadeIn > 0 ? Math.max(0, Math.min(1, f / fadeIn)) : 1;
  const fout = fadeOut > 0 ? Math.max(0, Math.min(1, (total - 1 - f) / fadeOut)) : 1;
  return Math.max(0, level * Math.min(fin, fout));
}

// ---------- debug HUD (top safe margin, never inside content/caption zones) ----------
const pad = (v, len = 3) => String(v).padStart(len, '0');
const DebugHud = ({frame, introOffset, total, fps}) => {
  const L = useLayout();
  const at = locate(data, frame - introOffset);
  const sec = (frame / fps).toFixed(2);
  const sceneTxt = at.scene ? at.scene.id : at.segment;
  const pageTxt = at.page ? `#${at.page.id}` : '-';
  const wordTxt = at.word ? `${at.word.i}` : '-';
  return (
    <div
      style={{
        position: 'absolute',
        left: L.safe.left,
        right: L.safe.left,
        top: L.u(14),
        zIndex: LAYERS.hud,
        fontFamily: FONT_LABEL,
        fontWeight: 700,
        fontSize: L.u(20),
        lineHeight: 1.3,
        color: COLORS.bone,
        background: 'rgba(5,6,11,0.72)',
        border: `${L.u(2)}px solid ${COLORS.ghost}`,
        borderRadius: L.u(10),
        padding: `${L.u(6)}px ${L.u(12)}px`,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {`f ${pad(frame)}/${total} · ${sec}s · scene ${sceneTxt} · page ${pageTxt} · word ${wordTxt}`}
    </div>
  );
};

// ---------- one scene + its cut transitions (all frames LOCAL to this scene's Sequence) ----------
const SceneBlock = ({scene, index, count}) => {
  const Comp = sceneComponent(scene.component);
  const len = scene.endFrame - scene.startFrame;
  const {inF, outF} = dipFrames(len, index, count);
  const hasIn = index > 0;
  const hasOut = index < count - 1;
  const kind = boundaryKind(hasOut ? index : index - 1); // the cut shared with the neighbour
  const inkLen = 12;
  return (
    <Sequence from={scene.startFrame} durationInFrames={len} name={`scene:${scene.id}`}>
      {Comp ? <Comp scene={scene} data={data} /> : null}
      {/* leaving the scene */}
      {hasOut && kind === 'dip' ? (
        <>
          <GlitchBurst at={Math.max(0, len - 1 - outF - 5)} length={6} intensity={0.7} seed={`cut-${scene.id}`} />
          <FadeInOut inFrames={0} outFrames={outF} />
        </>
      ) : null}
      {hasOut && kind === 'ink' ? <WipeInk from={len - 1 - inkLen} length={inkLen} mode="cover" hold seed={`ink-${scene.id}`} /> : null}
      {/* arriving in the scene */}
      {hasIn && boundaryKind(index - 1) === 'dip' ? <FadeInOut inFrames={inF} outFrames={0} /> : null}
      {hasIn && boundaryKind(index - 1) === 'ink' ? <WipeInk from={0} length={inkLen} mode="reveal" hold={false} seed={`ink-${scene.id}`} /> : null}
    </Sequence>
  );
};

// ---------- main component ----------
export const Story = ({part = 'horror1', debug = false, intro = true, outro = true}) => {
  const frame = useCurrentFrame();
  const introOffset = intro ? data.introFrames : 0;
  const total = totalFramesFor(data, intro, outro);
  const span = speechSpan(data, introOffset);
  const scenes = data.scenes;

  // Slow, deterministic glow drift behind the scenes (pure interpolate) — only visible if a scene leaves gaps.
  const drift = interpolate(frame, [0, Math.max(1, total - 1)], [30, 70], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      {/* BACKGROUND (layer bg) */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.bg,
          background: `radial-gradient(ellipse at ${drift}% 38%, ${COLORS.teal} 0%, ${COLORS.bg2} 45%, ${COLORS.bg} 100%)`,
        }}
      />

      {/* AUDIO — ambience for the whole video (file time 0 = video frame 0), narration from its first frame */}
      <Audio src={ambience} volume={(f) => ambienceVolume(f, {total, span})} />
      <Sequence from={introOffset} durationInFrames={data.narrationFrames} layout="none" name="narration-audio">
        <Audio src={narration} volume={1} />
      </Sequence>

      {/* INTRO */}
      {intro ? (
        <Sequence from={0} durationInFrames={data.introFrames} name="intro">
          <Intro length={data.introFrames} />
        </Sequence>
      ) : null}

      {/* NARRATION: global camera (very slow push-in) around all scenes; frames below are narration-relative */}
      <Sequence from={introOffset} durationInFrames={data.narrationFrames} name="narration">
        <Camera zoom={[1, 1.02]} from={0} to={data.narrationFrames - 1} easing="linear" shake={0.05} seed="story" edgeSafe>
          {scenes.map((s, i) => (
            <SceneBlock key={s.id} scene={s} index={i} count={scenes.length} />
          ))}
        </Camera>
        {/* global atmosphere over every scene (under captions) */}
        <FxParticles type="dust" count={14} color={COLORS.bone} seed="story" />
        {/* CAPTIONS: above scenes and fx, below grain; absolute narration frames via this Sequence */}
        <Captions data={data} style="karaoke" />
      </Sequence>

      {/* OUTRO */}
      {outro ? (
        <Sequence from={introOffset + data.narrationFrames} durationInFrames={data.outroFrames} name="outro">
          <Outro length={data.outroFrames} />
        </Sequence>
      ) : null}

      {/* FILM GRAIN / VIGNETTE over everything (frame-seeded, deterministic) */}
      <FxFilm intensity={0.45} sepia={0} vignette={0.55} />

      {debug ? <DebugHud frame={frame} introOffset={introOffset} total={total} fps={data.fps} /> : null}
    </AbsoluteFill>
  );
};

export default Story;
