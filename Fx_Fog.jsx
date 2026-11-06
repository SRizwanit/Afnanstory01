// Fx_Fog.jsx (Step 12) — drifting, parallax fog: 1..5 soft layers that scroll sideways at different speeds.
// Exports : FxFog (named + default), fogLayerSpec(...), hexToRgb(hex), wrapOffset(offset, tile)  (pure, testable in Node)
// Props   : { layers = 3 (1..5), density = 0.5 (0..1), color = '#9fb4c8', speed = 1 }
//             layers  -> number of fog bands (back = slow + faint, front = faster + denser)
//             density -> opacity/number of puffs (0 = invisible, 1 = thick fog)
//             color   -> fog tint (any #rgb / #rrggbb)
//             speed   -> drift multiplier (0 = frozen, 2 = twice as fast, negative = other direction)
// Layer   : full-bleed AbsoluteFill, zIndex = LAYERS.fx (above scenes, BELOW captions + film). No text, no key art.
//           Fog may cover the caption band area: it stays low-contrast and captions are drawn above it.
// Method  : NO blur filters. Each layer = ONE div with several CSS radial-gradient puffs painted as a repeating
//           background tile (background-repeat: repeat-x). Every puff fades to 0 before the tile edge, so the tile wraps
//           with no seam and the scroll (-offset mod tile) loops endlessly. Pure gradients = cheap per-frame render.
// Rules   : geometry from useLayout() (u(), width, height); all motion from useCurrentFrame(); positions from
//           random('seed-string'); no Math.random, no CSS animation.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {LAYERS, useLayout} from './theme.js';

// ---------------------------------------------------------------- pure helpers (no React)

// '#9fb4c8' | '#abc' -> [r,g,b]; falls back to the default fog color on bad input.
export function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = '9fb4c8';
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// scroll position inside the repeating tile (always 0 <= x < tile, also for negative offsets)
export const wrapOffset = (offset, tile) => ((offset % tile) + tile) % tile;

// Geometry of fog layer `i` (0 = back, n-1 = front). Everything in px of the composition.
// u = L.u (unit function). Deterministic: positions come from random('fog-<i>-<j>-...').
export function fogLayerSpec({i, n, width, height, u, density = 0.5}) {
  const d = Math.max(0, Math.min(1, density));
  const depth = n > 1 ? i / (n - 1) : 0.5; // 0 back .. 1 front
  const tile = width * 1.2; // tile is wider than the frame so one tile never shows its own repeat twice
  const layerH = height * 0.42;
  const top = height * (0.26 + depth * 0.36); // back layers higher, front layers lower (fog hugs the ground)
  const count = d > 0.66 ? 5 : 4;
  const alpha = Math.min(0.6, 0.46 * d * (0.75 + 0.25 * depth)); // 0 density = invisible; front layers denser
  const blobs = [];
  for (let j = 0; j < count; j++) {
    const rx = tile * (0.16 + 0.1 * random(`fog-${i}-${j}-rx`));
    const ry = layerH * (0.26 + 0.18 * random(`fog-${i}-${j}-ry`));
    let cx = ((j + 0.5) / count) * tile + (random(`fog-${i}-${j}-x`) - 0.5) * (tile / count) * 0.6;
    cx = Math.max(rx, Math.min(tile - rx, cx)); // puff fully inside the tile -> seamless wrap
    const cy = ry + random(`fog-${i}-${j}-y`) * Math.max(0, layerH - 2 * ry);
    blobs.push({cx, cy, rx, ry, a: alpha * (0.7 + 0.3 * random(`fog-${i}-${j}-a`))});
  }
  const speedPx = u(0.35 + 1.5 * depth); // px per frame: back ~10 px/s, front ~55 px/s at 1080 (parallax)
  return {tile, layerH, top, blobs, speedPx, alpha, depth};
}

// ---------------------------------------------------------------- component
export const FxFog = ({layers = 3, density = 0.5, color = '#9fb4c8', speed = 1}) => {
  const f = useCurrentFrame();
  const L = useLayout();
  const n = Math.max(1, Math.min(5, Math.round(layers)));
  if (density <= 0) return null;
  const [r, g, b] = hexToRgb(color);
  const rgba = (a) => `rgba(${r},${g},${b},${a.toFixed(4)})`;

  const els = [];
  for (let i = 0; i < n; i++) {
    const spec = fogLayerSpec({i, n, width: L.width, height: L.height, u: L.u, density});
    const pos = -wrapOffset(f * spec.speedPx * speed, spec.tile);
    const bob = Math.sin(f / (70 + i * 25) + i * 1.7) * L.u(10); // slow vertical float
    const breathe = 0.88 + 0.12 * Math.sin(f / 55 + i * 2.1); // density breathes a little
    const images = spec.blobs
      .map(
        (p) =>
          `radial-gradient(ellipse ${p.rx.toFixed(1)}px ${p.ry.toFixed(1)}px at ${p.cx.toFixed(1)}px ${p.cy.toFixed(1)}px, ` +
          `${rgba(p.a)} 0%, ${rgba(p.a * 0.62)} 35%, ${rgba(p.a * 0.22)} 68%, ${rgba(0)} 100%)`
      )
      .join(', ');
    els.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 0,
          width: '100%',
          top: spec.top + bob,
          height: spec.layerH,
          opacity: breathe,
          backgroundImage: images,
          backgroundRepeat: 'repeat-x',
          backgroundSize: `${spec.tile.toFixed(1)}px 100%`,
          backgroundPosition: `${pos.toFixed(2)}px 0`,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{zIndex: LAYERS.fx, pointerEvents: 'none', overflow: 'hidden'}}>
      {els}
    </AbsoluteFill>
  );
};

export default FxFog;
