// theme.js — shared design tokens, fonts and the NO-OVERLAP layout engine (Step 4)
// Exports : FPS, COLORS, CAPTION_COLORS, FONT_CAPTION, FONT_TITLE, FONT_LABEL, BRAND,
//           LAYERS, getLayout(w,h), useLayout(), rel(scene, absFrame), clamp01, toBn
// Used by : every visual file. Never hardcode pixels — use useLayout().
//
// OVERLAP GUARANTEE (by construction, see getLayout):
//   caption band  = reserved strip where ONLY Captions.jsx draws text.
//   content zone  = everything else inside the safe area; scenes/characters/labels/tags
//                   must be placed inside it (use L.cx(pct) / L.cy(pct)).
//   content.bottom is always  caption.top - gap, so the two can never touch.
//   Full-bleed backgrounds / fog / grain may still fill the whole frame (no text, no key art).
import {useVideoConfig} from 'remotion';
import {loadFont as loadBaloo} from '@remotion/google-fonts/BalooDa2';
import {loadFont as loadHind} from '@remotion/google-fonts/HindSiliguri';
import {loadFont as loadGalada} from '@remotion/google-fonts/Galada';

export const FPS = 30;

export const COLORS = {
  bg: '#070a14', bg2: '#0d1426', ink: '#05060b', bone: '#f3ecdc',
  blood: '#ff2d3d', amber: '#ffb020', toxic: '#7cff4f', ghost: '#4fe3ff',
  violet: '#b46bff', teal: '#0f3b46',
};

export const CAPTION_COLORS = [
  COLORS.amber, COLORS.ghost, COLORS.toxic, COLORS.violet, COLORS.blood, COLORS.bone,
];

// ---- Fonts (all verified to exist in @remotion/google-fonts 4.0.541 with a `bengali` subset) ----
// Baloo Da 2: weights 400-800 · Hind Siliguri: 300-700 · Galada: 400 only.
const baloo = loadBaloo('normal', {weights: ['700', '800'], subsets: ['bengali', 'latin']});
const hind = loadHind('normal', {weights: ['500', '700'], subsets: ['bengali', 'latin']});
const galada = loadGalada('normal', {weights: ['400'], subsets: ['bengali', 'latin']});

export const FONT_CAPTION = `'${baloo.fontFamily}', '${hind.fontFamily}', sans-serif`;
export const FONT_TITLE = `'${galada.fontFamily}', '${baloo.fontFamily}', sans-serif`;
export const FONT_LABEL = `'${hind.fontFamily}', '${baloo.fontFamily}', sans-serif`; // name tags, small labels

export const BRAND = {pageName: 'আপনার পেইজের নাম', handle: '@yourpage'}; // TODO(user): real name

// Stacking order (z-index). Keep every layer in its own band so nothing fights for the top.
export const LAYERS = {
  bg: 0, scene: 10, fx: 20, captions: 30, film: 40, transition: 50, hud: 90,
};

export const clamp01 = (x) => Math.max(0, Math.min(1, x));

// '1976' -> '১৯৭৬' (display only; never split Bengali words into letters)
export const toBn = (v) => String(v).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

// Local frame inside a scene (only needed outside a <Sequence>).
export function rel(scene, absFrame) {
  return absFrame - scene.startFrame;
}

// Pure layout function (testable without React). All numbers are px of the composition size.
export function getLayout(width, height) {
  const isVertical = height > width;
  const unit = Math.min(width, height) / 1000;
  const u = (n) => n * unit;

  // Platform-UI safe margins (fractions). Vertical: top 10 %, bottom 22 % (Reels/Shorts overlays).
  const sf = isVertical
    ? {top: 0.10, bottom: 0.22, side: 0.05}
    : {top: 0.06, bottom: 0.07, side: 0.06};
  const safe = {
    top: height * sf.top,
    bottom: height * (1 - sf.bottom), // y of the lowest allowed pixel
    left: width * sf.side,
    right: width * (1 - sf.side),
  };

  // Caption band (Captions.jsx must read these numbers, not invent its own).
  const fontSize = isVertical ? u(88) : u(72);
  const lineHeight = 1.45; // Bengali matras need room
  const maxLines = 2;
  const padY = fontSize * 0.22; // room for outline + 1.18x pop of the active word
  const bandH = fontSize * lineHeight * maxLines + padY * 2;
  const capBottom = height * (isVertical ? 0.76 : 0.93);
  const capTop = capBottom - bandH;
  const caption = {
    fontSize, lineHeight, maxLines, padY,
    wordsPerPage: isVertical ? 4 : 6,
    top: capTop, bottom: capBottom, height: bandH,
    left: safe.left, right: safe.right, width: safe.right - safe.left,
    centerY: (capTop + capBottom) / 2,
  };

  // Content zone = safe area minus caption band minus a gap.
  const gap = u(26);
  const cTop = safe.top;
  const cBottom = capTop - gap;
  const content = {
    top: cTop, bottom: cBottom, left: safe.left, right: safe.right,
    width: safe.right - safe.left, height: cBottom - cTop,
  };

  return {
    width, height, isVertical, u, safe, caption, content,
    captionY: caption.centerY,
    // % of the CONTENT zone -> absolute px (0,0 = top-left of zone, 100,100 = bottom-right)
    cx: (pct) => content.left + (content.width * pct) / 100,
    cy: (pct) => content.top + (content.height * pct) / 100,
  };
}

export function useLayout() {
  const {width, height} = useVideoConfig();
  return getLayout(width, height);
}
