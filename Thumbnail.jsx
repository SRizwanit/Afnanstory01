// Thumbnail.jsx (Step 36) — YouTube/Facebook thumbnail STILL: looming silhouette + huge colourful Bengali title + red glow.
// Exports : Thumbnail (named + default); const THUMB_TITLE ('লাহুরিয়ার রহস্য', TODO(user): real title);
//           pure helpers (testable): graphemes(text), wrapTitle(words, fs, maxW), fitTitle(title, boxW, boxH, maxFs, minFs),
//           thumbLayout(L, {title, subtitle}) -> {handle, title:{box,fs,lines,lineH}, subtitle, figure}, wordColors(n), starSpecs(seed, n)
// Props   : { title=THUMB_TITLE, subtitle='', seed='thumb', handle=BRAND.handle }   (Root passes {part,title,subtitle}; extra keys ignored)
// Needs   : theme.js (COLORS, FONT_TITLE, FONT_LABEL, LAYERS, BRAND, useLayout) · remotion (AbsoluteFill, random)
// Used by : Root.jsx -> `<Still id="ThumbnailV|ThumbnailH">` (swapped in by Step 36b; until then Root shows its ThumbnailStub).
//           Render:  npx remotion still index.js ThumbnailH thumb.png --props='{"title":"…"}' [--scale=2]
// Layout (no-overlap, everything from useLayout(); slots never intersect):
//   Horizontal 1920x1080: LEFT column = title (top) · subtitle · handle (bottom) inside the safe area; RIGHT = figure (bleeds off the bottom).
//   Vertical   1080x1920: handle pill (top safe margin) · title · subtitle · figure fills the lower part (bleeds off the bottom).
//   Background art (stars, moon, hut, fog, glow) is decoration behind the slots; the figure's glow stays inside its own box.
// Title   : words are single text nodes (never split into letters), each word its own colour (amber, bone, blood, ghost, toxic, violet; ink excluded),
//           ink outline (paint-order stroke) + red glow; font shrinks until every line fits the box.
// Rules   : deterministic (random(seed), no Math.random), no CSS animation, no SVG/CSS filters (glow = layered gradients/strokes),
//           the figure is original artwork (a generic tall shadow figure) — no copyrighted character.
import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {BRAND, COLORS, FONT_LABEL, FONT_TITLE, LAYERS, useLayout} from './theme.js';

export const THUMB_TITLE = 'লাহুরিয়ার রহস্য'; // TODO(user): real title
const K = 0.62; // estimated glyph width / font size per grapheme (Galada / Baloo Da 2), same constant as Intro/Outro
const GAP = 0.3; // word gap / font size

export function graphemes(text) {
  const s = String(text || '');
  if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter('bn', {granularity: 'grapheme'}).segment(s)).length;
  return Array.from(s).length;
}
const estW = (t, fs) => graphemes(t) * K * fs;

// words -> lines of word indexes (greedy). Never splits a word.
export function wrapTitle(words, fs, maxW) {
  const lines = []; let cur = [], w = 0;
  words.forEach((t, i) => {
    const tw = estW(t, fs), add = cur.length ? fs * GAP : 0;
    if (cur.length && w + add + tw > maxW) { lines.push(cur); cur = []; w = 0; }
    w += (cur.length ? fs * GAP : 0) + tw; cur.push(i);
  });
  if (cur.length) lines.push(cur);
  return lines;
}

// Largest font (<= maxFs, >= minFs) whose wrapped lines fit boxW x boxH (line height 1.4 * fs). Falls back to minFs.
export function fitTitle(title, boxW, boxH, maxFs, minFs) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return {words, lines: [], fs: minFs, lineH: minFs * 1.4};
  let fs = maxFs;
  for (let n = 0; n < 200; n++) {
    const lines = wrapTitle(words, fs, boxW);
    const widest = Math.max(...lines.map((ln) => ln.reduce((s, i, j) => s + estW(words[i], fs) + (j ? fs * GAP : 0), 0)));
    if ((widest <= boxW && lines.length * fs * 1.4 <= boxH) || fs <= minFs) return {words, lines, fs: Math.max(fs, minFs), lineH: Math.max(fs, minFs) * 1.4};
    fs *= 0.96;
  }
  return {words, lines: wrapTitle(words, minFs, boxW), fs: minFs, lineH: minFs * 1.4};
}

// per-word colours: amber, bone, blood, ghost, toxic, violet … (ink excluded), cycling
const PALETTE = [COLORS.amber, COLORS.bone, COLORS.blood, COLORS.ghost, COLORS.toxic, COLORS.violet];
export const wordColors = (n) => Array.from({length: n}, (_, i) => PALETTE[i % PALETTE.length]);

export function starSpecs(seed, n = 50) {
  return Array.from({length: n}, (_, i) => ({x: random(`th-${seed}-x${i}`), y: random(`th-${seed}-y${i}`) * 0.7, r: 0.5 + 1.8 * random(`th-${seed}-r${i}`), o: 0.25 + 0.6 * random(`th-${seed}-o${i}`)}));
}

// All slots as absolute rects {left, top, width, height}.
export function thumbLayout(L, {title = THUMB_TITLE, subtitle = ''} = {}) {
  const {u, isVertical: v, width: W, height: H, safe} = L;
  const left = safe.left, hasSub = String(subtitle || '').trim() !== '';
  const handleH = u(v ? 70 : 64);
  let handle, tbox, sbox, figure;
  if (v) {
    const w = W - 2 * left;
    handle = {left, top: safe.top, width: w, height: handleH};
    tbox = {left, top: safe.top + handleH + u(30), width: w, height: u(560)};
    sbox = {left, top: tbox.top + tbox.height + u(10), width: w, height: hasSub ? u(100) : 0};
    const ft = sbox.top + sbox.height + u(30);
    figure = {left: 0, top: ft, width: W, height: H - ft};
  } else {
    const w = Math.round(W * 0.56);
    handle = {left, top: safe.bottom - handleH, width: w, height: handleH};
    const subH = hasSub ? u(100) : 0;
    tbox = {left, top: safe.top + u(30), width: w, height: handle.top - u(30) - subH - u(20) - (safe.top + u(30))};
    sbox = {left, top: tbox.top + tbox.height + u(10), width: w, height: subH};
    const fl = left + w + u(30);
    figure = {left: fl, top: 0, width: W - fl, height: H};
  }
  const t = fitTitle(title, tbox.width, tbox.height, u(v ? 190 : 215), u(60));
  const used = t.lines.length * t.lineH;
  return {handle, title: {box: {...tbox, top: tbox.top + (tbox.height - used) / 2, height: used}, slot: tbox, fs: t.fs, lineH: t.lineH, words: t.words, lines: t.lines}, subtitle: sbox, figure};
}

// ---------- artwork ----------
const Figure = ({box}) => {
  // viewBox 400x800: tall hunched silhouette, long arms, ragged hem, glowing eyes. Drawn with plain shapes + layered strokes (no filters).
  const body = 'M200 70 C168 70 150 98 154 130 C156 150 166 164 160 178 C120 196 96 240 92 330 C88 440 70 560 58 690 L40 800 L360 800 L342 690 C330 560 312 440 308 330 C304 240 280 196 240 178 C234 164 244 150 246 130 C250 98 232 70 200 70 Z';
  const armL = 'M104 250 C70 380 52 520 46 640 L60 650 C80 540 104 420 128 300 Z';
  const armR = 'M296 250 C330 380 348 520 354 640 L340 650 C320 540 296 420 272 300 Z';
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMax meet" style={{position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, overflow: 'visible', zIndex: LAYERS.scene + 2}}>
      <defs>
        <radialGradient id="th-aura" cx="50%" cy="22%" r="60%">
          <stop offset="0%" stopColor={COLORS.blood} stopOpacity="0.55" />
          <stop offset="100%" stopColor={COLORS.blood} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="th-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6c8" stopOpacity="1" />
          <stop offset="45%" stopColor={COLORS.blood} stopOpacity="0.9" />
          <stop offset="100%" stopColor={COLORS.blood} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="170" rx="260" ry="300" fill="url(#th-aura)" />
      {[18, 11, 5].map((w, i) => <path key={i} d={body} fill="none" stroke={COLORS.blood} strokeOpacity={0.12 + i * 0.12} strokeWidth={w} strokeLinejoin="round" />)}
      <path d={body} fill={COLORS.ink} />
      <path d={armL} fill={COLORS.ink} stroke={COLORS.blood} strokeOpacity="0.35" strokeWidth="3" />
      <path d={armR} fill={COLORS.ink} stroke={COLORS.blood} strokeOpacity="0.35" strokeWidth="3" />
      <circle cx="184" cy="122" r="20" fill="url(#th-eye)" />
      <circle cx="218" cy="122" r="20" fill="url(#th-eye)" />
      <ellipse cx="184" cy="122" rx="7" ry="3.2" fill="#fff6c8" />
      <ellipse cx="218" cy="122" rx="7" ry="3.2" fill="#fff6c8" />
    </svg>
  );
};

const Backdrop = ({L, seed}) => {
  const {width: W, height: H, u} = L;
  const stars = starSpecs(seed);
  const moon = {cx: L.isVertical ? W * 0.78 : W * 0.46, cy: L.isVertical ? H * 0.2 : H * 0.2, r: u(L.isVertical ? 90 : 80)};
  const hut = {x: L.isVertical ? W * 0.12 : W * 0.5, y: L.isVertical ? H * 0.9 : H * 0.96, s: u(L.isVertical ? 1.5 : 1.3)};
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, zIndex: LAYERS.bg + 1}}>
      <defs>
        <radialGradient id="th-bg" cx="68%" cy="48%" r="75%">
          <stop offset="0%" stopColor={COLORS.blood} stopOpacity="0.42" />
          <stop offset="35%" stopColor={COLORS.teal} stopOpacity="1" />
          <stop offset="75%" stopColor={COLORS.bg2} stopOpacity="1" />
          <stop offset="100%" stopColor={COLORS.bg} stopOpacity="1" />
        </radialGradient>
        <radialGradient id="th-moon" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={COLORS.bone} stopOpacity="0.35" />
          <stop offset="100%" stopColor={COLORS.bone} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="th-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fb4c8" stopOpacity="0" />
          <stop offset="100%" stopColor="#9fb4c8" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={COLORS.bg} />
      <rect width={W} height={H} fill="url(#th-bg)" />
      {stars.map((s, i) => <circle key={i} cx={s.x * W} cy={s.y * H} r={s.r * u(1.6)} fill={COLORS.bone} opacity={s.o} />)}
      <circle cx={moon.cx} cy={moon.cy} r={moon.r * 2.2} fill="url(#th-moon)" />
      <circle cx={moon.cx} cy={moon.cy} r={moon.r} fill={COLORS.bone} opacity="0.92" />
      <circle cx={moon.cx - moon.r * 0.3} cy={moon.cy - moon.r * 0.1} r={moon.r * 0.18} fill="#c9bfa6" opacity="0.7" />
      <g transform={`translate(${hut.x} ${hut.y}) scale(${hut.s})`}>
        <path d="M-90 0 L-90 -70 L0 -130 L90 -70 L90 0 Z" fill={COLORS.ink} />
        <rect x="-18" y="-60" width="36" height="34" fill={COLORS.amber} opacity="0.9" />
      </g>
      <rect x="0" y={H * 0.62} width={W} height={H * 0.38} fill="url(#th-fog)" />
    </svg>
  );
};

// ---------- main ----------
export const Thumbnail = ({title = THUMB_TITLE, subtitle = '', seed = 'thumb', handle = BRAND.handle}) => {
  const L = useLayout();
  const lay = thumbLayout(L, {title, subtitle});
  const t = lay.title, colors = wordColors(t.words.length);
  const u = L.u;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <Backdrop L={L} seed={seed} />
      <Figure box={lay.figure} />
      <div style={{position: 'absolute', left: t.box.left, top: t.box.top, width: t.box.width, height: t.box.height, zIndex: LAYERS.captions, display: 'flex', flexDirection: 'column', alignItems: L.isVertical ? 'center' : 'flex-start'}}>
        {t.lines.map((ln, li) => (
          <div key={li} style={{height: t.lineH, display: 'flex', gap: t.fs * GAP, whiteSpace: 'nowrap', alignItems: 'center'}}>
            {ln.map((wi) => (
              <span
                key={wi}
                style={{
                  fontFamily: FONT_TITLE,
                  fontSize: t.fs,
                  lineHeight: 1.4,
                  color: colors[wi],
                  WebkitTextStroke: `${u(12)}px ${COLORS.ink}`,
                  paintOrder: 'stroke fill',
                  textShadow: `0 0 ${u(36)}px ${COLORS.blood}, 0 ${u(8)}px 0 ${COLORS.ink}`,
                  fontFeatureSettings: 'normal',
                }}
              >
                {t.words[wi]}
              </span>
            ))}
          </div>
        ))}
      </div>
      {lay.subtitle.height > 0 ? (
        <div style={{position: 'absolute', left: lay.subtitle.left, top: lay.subtitle.top, width: lay.subtitle.width, height: lay.subtitle.height, zIndex: LAYERS.captions, display: 'flex', alignItems: 'center', justifyContent: L.isVertical ? 'center' : 'flex-start', fontFamily: FONT_LABEL, fontWeight: 700, fontSize: u(58), lineHeight: 1.4, color: COLORS.amber, WebkitTextStroke: `${u(6)}px ${COLORS.ink}`, paintOrder: 'stroke fill', whiteSpace: 'nowrap'}}>
          {subtitle}
        </div>
      ) : null}
      <div style={{position: 'absolute', left: lay.handle.left, top: lay.handle.top, width: lay.handle.width, height: lay.handle.height, zIndex: LAYERS.captions, display: 'flex', alignItems: 'center', justifyContent: L.isVertical ? 'center' : 'flex-start'}}>
        <span style={{fontFamily: FONT_LABEL, fontWeight: 700, fontSize: u(L.isVertical ? 40 : 38), lineHeight: 1.3, color: COLORS.bone, background: 'rgba(5,6,11,0.72)', border: `${u(3)}px solid ${COLORS.blood}`, borderRadius: u(40), padding: `${u(6)}px ${u(26)}px`, whiteSpace: 'nowrap'}}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};

export default Thumbnail;
