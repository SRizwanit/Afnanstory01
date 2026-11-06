// Fx_Film.jsx (Step 11) — old-film look: animated grain, vignette, scratches, dust specks, brightness flicker, optional sepia.
// Exports : FxFilm (named + default), filmState(f, intensity) (pure, testable)
// Props   : { intensity = 0.5 (0..1), sepia = 0 (0..1), vignette = 0.6 (0..1) }
//             intensity -> grain strength, number/visibility of scratches + specks, flicker depth (0 = only vignette/sepia)
//             sepia     -> warm brown tint over everything (0 = off)
//             vignette  -> dark corners (0 = off)
// Layer   : full-bleed, zIndex = LAYERS.film (above captions + fx, below transitions). Carries NO text and no key art.
//           Mount ONCE at the top level of Story.jsx (global look), not per scene.
// Needs   : theme.js (COLORS, LAYERS, useLayout), remotion (AbsoluteFill, random, useCurrentFrame)
// Rules   : deterministic — grain seed changes every 2 frames via random('grain-<slot>'); scratches/specks/flicker come
//           from random('<seed>') per frame slot (same frame => same picture on every render worker). No Math.random.
// Cost    : exactly ONE full-screen SVG filter (feTurbulence) + a few plain divs; rule 3.5-8 (<= 3 full-screen filters) holds.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS, LAYERS, useLayout} from './theme.js';

// ---------------------------------------------------------------- pure helper (no React)
// Everything that changes from frame to frame, as plain numbers. Coordinates are percentages (0..100) of the frame.
export function filmState(f, intensity = 0.5) {
  const k = Math.max(0, Math.min(1, intensity));

  // grain: new noise pattern every 2 frames (film runs "on twos")
  const grainSlot = Math.floor(f / 2);
  const seed = Math.floor(random(`grain-${grainSlot}`) * 1000);

  // brightness flicker: smooth darkening wobble + rare faint light flash
  const s3 = Math.floor(f / 3);
  const a = random(`fk-${s3}`);
  const b = random(`fk-${s3 + 1}`);
  const t = (f % 3) / 3;
  const flickerDark = k * (0.02 + 0.07 * (a + (b - a) * t));
  const flickerLight = random(`fl-${grainSlot}`) > 0.97 ? 0.05 * k : 0;

  // vertical scratches: change every 3 frames, appear in ~30 % of slots at full intensity
  const scratches = [];
  const scrSlot = Math.floor(f / 3);
  if (random(`scr-${scrSlot}`) < 0.3 * k) {
    const n = random(`scr-n-${scrSlot}`) < 0.3 * k ? 2 : 1;
    for (let j = 0; j < n; j++) {
      scratches.push({
        x: random(`scr-x-${scrSlot}-${j}`) * 100,
        y: random(`scr-y-${scrSlot}-${j}`) * 40,
        len: 25 + random(`scr-l-${scrSlot}-${j}`) * 60,
        w: 1.2 + random(`scr-w-${scrSlot}-${j}`) * 1.3, // in u() units
        op: 0.25 + random(`scr-o-${scrSlot}-${j}`) * 0.35,
      });
    }
  }

  // dust specks: new positions every 2 frames, up to 8 at full intensity
  const specks = [];
  const count = Math.round(8 * k);
  for (let j = 0; j < count; j++) {
    specks.push({
      x: random(`sp-x-${grainSlot}-${j}`) * 100,
      y: random(`sp-y-${grainSlot}-${j}`) * 100,
      r: 1 + random(`sp-r-${grainSlot}-${j}`) * 3, // in u() units
      op: 0.25 + random(`sp-o-${grainSlot}-${j}`) * 0.35,
      light: random(`sp-c-${grainSlot}-${j}`) < 0.5,
    });
  }
  return {seed, flickerDark, flickerLight, scratches, specks};
}

// ---------------------------------------------------------------- component
export const FxFilm = ({intensity = 0.5, sepia = 0, vignette = 0.6}) => {
  const f = useCurrentFrame();
  const L = useLayout();
  const k = Math.max(0, Math.min(1, intensity));
  const sep = Math.max(0, Math.min(1, sepia));
  const vig = Math.max(0, Math.min(1, vignette));
  const st = filmState(f, k);

  // vignette "breathes" very slightly (+-2 % radius, ~3 s period) so it does not look like a static PNG
  const breathe = Math.sin(f / 14) * 2;
  const vigStart = 72 - 38 * vig + breathe; // % radius where darkening begins
  const vigAlpha = 0.92 * vig;

  return (
    <AbsoluteFill style={{zIndex: LAYERS.film, pointerEvents: 'none', overflow: 'hidden'}}>
      {/* sepia tint (warm brown), blended as colour so brightness is untouched */}
      {sep > 0 ? (
        <AbsoluteFill style={{background: '#8a5a2b', mixBlendMode: 'color', opacity: 0.55 * sep}} />
      ) : null}

      {/* grain: one feTurbulence filter, contrast-stretched to grey noise, overlay-blended */}
      {k > 0 ? (
        <svg
          width={L.width}
          height={L.height}
          style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'overlay', opacity: 0.1 + 0.4 * k}}
        >
          <filter id="fxfilm-grain" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={st.seed} stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="2.2 0 0 0 -0.6  2.2 0 0 0 -0.6  2.2 0 0 0 -0.6  0 0 0 0 1"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#fxfilm-grain)" />
        </svg>
      ) : null}

      {/* scratches: thin vertical bright lines, fading at both ends */}
      {st.scratches.map((s, i) => (
        <div
          key={`s${i}`}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            height: `${s.len}%`,
            width: Math.max(1, L.u(s.w)),
            opacity: s.op * k,
            background: `linear-gradient(to bottom, transparent, ${COLORS.bone} 20%, ${COLORS.bone} 80%, transparent)`,
          }}
        />
      ))}

      {/* dust specks: tiny light/dark dots, new positions every 2 frames */}
      {st.specks.length > 0 ? (
        <svg width={L.width} height={L.height} style={{position: 'absolute', left: 0, top: 0}}>
          {st.specks.map((p, i) => (
            <circle
              key={`p${i}`}
              cx={`${p.x}%`}
              cy={`${p.y}%`}
              r={Math.max(0.8, L.u(p.r))}
              fill={p.light ? COLORS.bone : COLORS.ink}
              opacity={p.op}
            />
          ))}
        </svg>
      ) : null}

      {/* vignette */}
      {vig > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) ${vigStart}%, rgba(0,0,0,${vigAlpha}) 100%)`,
          }}
        />
      ) : null}

      {/* brightness flicker: slight darkening wobble + rare faint light flash */}
      {st.flickerDark > 0 ? <AbsoluteFill style={{background: '#000', opacity: st.flickerDark}} /> : null}
      {st.flickerLight > 0 ? <AbsoluteFill style={{background: COLORS.bone, opacity: st.flickerLight}} /> : null}
    </AbsoluteFill>
  );
};

export default FxFilm;
