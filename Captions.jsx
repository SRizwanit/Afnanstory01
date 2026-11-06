// Captions.jsx (Step 10) — colorful, animated karaoke captions for Bengali narration.
// Exports : Captions (named + default), pickPage, layoutLines, estimateWidthEm (pure helpers, testable in Node)
// Props   : { data, style = 'karaoke' | 'pop' | 'typewriter' }
//             data  = story_data.json (words, pages, fps)
//             karaoke    = whole page visible; upcoming words dim (55 %), spoken words keep their color, active word pops
//             pop        = words appear only when spoken (pop-in)
//             typewriter = words are revealed left -> right while spoken (clip, letters are never split)
// Timing  : uses useCurrentFrame() = frame RELATIVE TO NARRATION START. Mount it inside
//           <Sequence from={introOffset}> in Story.jsx (see 2dpython.md 6.6). Frames in `data` are narration-relative.
// Layout  : geometry ONLY from useLayout().caption (band top/height/width, fontSize, maxLines, wordsPerPage); this is the one
//           file allowed to draw text in the caption band. zIndex = LAYERS.captions (above scenes+fx, below film grain).
// Rules   : Bengali shaping -> every word is ONE inline-block unit (never split into letters); lines are explicit rows
//           (max 2) chosen from an estimated width, font is shrunk (min 62 %) if a row would not fit.
//           All motion deterministic: interpolate/spring/random('seed') only.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_CAPTION, LAYERS, clamp01, useLayout} from './theme.js';

// ---------------------------------------------------------------- pure helpers (no React)

// Rough text width in "em" for Bengali/Latin (fonts are not measurable without a DOM).
// letters ~0.55em, vowel signs ~0.15em, virama (joins conjuncts) ~0, space ~0.25em. Slightly conservative on purpose.
export function estimateWidthEm(text) {
  let w = 0;
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    if (c === 0x09cd) w += 0; // virama
    else if (c === 0x09bc || (c >= 0x09be && c <= 0x09cc) || c === 0x09d7 || c === 0x09e2 || c === 0x09e3) w += 0.15;
    else if (c === 0x20) w += 0.25;
    else w += 0.55;
  }
  return w;
}

// Current page for narration frame f (null before the first / after the last page).
export function pickPage(pages, f) {
  for (const p of pages) if (f >= p.startFrame && f < p.endFrame) return p;
  return null;
}

// Split words into <= maxLines rows (balanced by estimated width) and compute a font scale that fits `budgetPx`.
// words: [{text}], returns {rows:[[idx..],..], fit:number(0.62..1)} (idx are positions inside `words`).
export function layoutLines(words, fontPx, gapPx, budgetPx, maxLines = 2) {
  const wEm = words.map((w) => estimateWidthEm(w.text));
  const rowW = (a, b) => {
    let t = 0;
    for (let i = a; i < b; i++) t += wEm[i] * fontPx + (i > a ? gapPx : 0);
    return t;
  };
  const n = words.length;
  let rows = [Array.from({length: n}, (_, i) => i)];
  let worst = rowW(0, n);
  if (n > 1 && maxLines > 1 && worst > budgetPx) {
    let best = null;
    for (let k = 1; k < n; k++) {
      const m = Math.max(rowW(0, k), rowW(k, n));
      if (best === null || m < best.m) best = {k, m};
    }
    rows = [
      Array.from({length: best.k}, (_, i) => i),
      Array.from({length: n - best.k}, (_, i) => best.k + i),
    ];
    worst = best.m;
  }
  const fit = Math.max(0.62, Math.min(1, budgetPx / Math.max(1, worst)));
  return {rows, fit};
}

// ---------------------------------------------------------------- animated pieces

// Sparks (person/place/age) or blood drops (year) around an emphasized word, ~18 frames after it starts.
const Burst = ({word, t, u, widthPx}) => {
  if (t < 0 || t > 18) return null;
  const k = clamp01(t / 18);
  const out = Easing.out(Easing.cubic)(k);
  const fade = 1 - k;
  const color = word.color;
  const items = [];
  if (word.entity === 'year') {
    for (let j = 0; j < 4; j++) {
      const x = (random(`drop-x-${word.i}-${j}`) - 0.5) * widthPx * 0.9;
      const delay = j * 2;
      const kk = clamp01((t - delay) / 16);
      const y = u(34) + Easing.in(Easing.quad)(kk) * u(46);
      const r = u(7) + random(`drop-r-${word.i}-${j}`) * u(4);
      items.push(
        <path
          key={j}
          d={`M0 ${-r * 1.6} C ${r} ${-r * 0.2} ${r} ${r} 0 ${r} C ${-r} ${r} ${-r} ${-r * 0.2} 0 ${-r * 1.6} Z`}
          transform={`translate(${x} ${y})`}
          fill={COLORS.blood}
          opacity={clamp01(1 - kk) * 0.95}
        />
      );
    }
  } else {
    for (let j = 0; j < 6; j++) {
      const ang = random(`spark-a-${word.i}-${j}`) * Math.PI * 2;
      const dist = u(26) + random(`spark-d-${word.i}-${j}`) * u(22);
      const x = (random(`spark-x-${word.i}-${j}`) - 0.5) * widthPx * 0.5 + Math.cos(ang) * dist * out;
      const y = Math.sin(ang) * dist * out * 0.6; // flatter: keeps sparks near the caption band
      const r = u(5) * (1 - k * 0.7);
      items.push(
        <path
          key={j}
          d={`M0 ${-r * 2} L ${r * 0.5} ${-r * 0.5} L ${r * 2} 0 L ${r * 0.5} ${r * 0.5} L 0 ${r * 2} L ${-r * 0.5} ${r * 0.5} L ${-r * 2} 0 L ${-r * 0.5} ${-r * 0.5} Z`}
          transform={`translate(${x} ${y})`}
          fill={color}
          opacity={fade}
        />
      );
    }
  }
  return (
    <svg style={{position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, overflow: 'visible', pointerEvents: 'none'}}>
      {items}
    </svg>
  );
};

const Word = ({word, f, enterT, style, fs, fps, u}) => {
  const t = f - word.startFrame; // < 0 = upcoming
  const started = t >= 0;
  const active = f >= word.startFrame && f < word.endFrame;
  const color = word.color;

  // ----- entrance of the page (slide-up + fade, staggered by the caller via enterT)
  const enterK = clamp01(enterT / 6);
  const enterE = Easing.out(Easing.cubic)(enterK);
  let opacity = enterE;
  let ty = (1 - enterE) * u(30);

  // ----- karaoke / pop / typewriter visibility
  let fillColor = COLORS.bone;
  let fillOpacity = 0.55;
  if (started) {
    fillColor = color;
    fillOpacity = 1;
  } else if (style !== 'karaoke') {
    opacity = 0; // pop + typewriter: hidden until spoken
  }

  // ----- active pop: 1 -> 1.18 -> 1.05, released over 5 frames after the word ends; wobble +-2 deg (damped)
  const popUp = interpolate(t, [0, 4, 12], [1, 1.18, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const release = 1 - clamp01((f - word.endFrame) / 5);
  const scale = started ? 1 + (popUp - 1) * release : 1;
  const sgn = random(`wob-${word.i}`) < 0.5 ? -1 : 1;
  const wob = started ? sgn * 2 * Math.sin(t * 0.95) * Math.max(0, 1 - t / 14) : 0;

  // 'pop' style: spring pop-in at the moment it is spoken
  let popIn = 1;
  if (style === 'pop' && started) {
    popIn = spring({frame: t, fps, config: {damping: 11, stiffness: 240, mass: 0.5}});
    opacity *= clamp01(t / 2);
  }

  // ----- emphasized entities: shake on arrival + underline sweep + burst
  let shakeX = 0;
  if (word.emphasis && started) {
    shakeX = Math.sin(t * 2.4) * u(5) * Math.max(0, 1 - t / 9);
  }
  const sweep = word.emphasis && started ? Easing.out(Easing.cubic)(clamp01(t / 8)) : 0;

  const wordW = estimateWidthEm(word.text) * fs;
  const glow = active ? `0 0 ${u(16)}px ${color}, 0 0 ${u(38)}px ${color}99` : 'none';
  const outline = Math.max(2, fs * 0.148); // dark outline thickness follows the (possibly shrunk) font size

  const common = {fontFamily: FONT_CAPTION, fontWeight: 800, fontSize: fs, lineHeight: 1.45, whiteSpace: 'nowrap'};
  const reveal = style === 'typewriter' ? clamp01((f - word.startFrame) / Math.max(1, word.endFrame - word.startFrame)) : 1;

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block', // ONE unit per word: Bengali conjuncts are never split
        margin: `0 ${fs * 0.13}px`,
        opacity,
        transform: `translate(${shakeX}px, ${ty}px) scale(${scale * (style === 'pop' ? 0.85 + 0.15 * popIn : 1)}) rotate(${wob}deg)`,
        transformOrigin: '50% 60%',
        clipPath: style === 'typewriter' && started ? `inset(-30% ${(1 - reveal) * 100}% -30% -10%)` : undefined,
      }}
    >
      {/* back layer: thick dark outline (+ colored glow while active) for legibility */}
      <span
        aria-hidden="true"
        style={{
          ...common,
          position: 'absolute',
          left: 0,
          top: 0,
          color: COLORS.ink,
          WebkitTextStroke: `${outline}px ${COLORS.ink}`,
          paintOrder: 'stroke fill',
          textShadow: glow,
        }}
      >
        {word.text}
      </span>
      {/* front layer: the word itself, colored stroke */}
      <span
        style={{
          ...common,
          position: 'relative',
          color: fillColor,
          opacity: fillOpacity,
          WebkitTextStroke: started ? `${Math.max(1, u(2))}px ${color}` : `${Math.max(1, u(1))}px ${COLORS.bone}`,
          paintOrder: 'stroke fill',
        }}
      >
        {word.text}
      </span>
      {word.emphasis ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '4%',
            bottom: fs * 0.1,
            height: Math.max(3, u(8)),
            width: `${92 * sweep}%`,
            borderRadius: u(6),
            background: color,
            boxShadow: `0 0 ${u(12)}px ${color}`,
          }}
        />
      ) : null}
      {word.emphasis ? <Burst word={word} t={t} u={u} widthPx={wordW} /> : null}
    </span>
  );
};

// ---------------------------------------------------------------- main component
export const Captions = ({data, style = 'karaoke'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = useLayout();
  const page = pickPage(data.pages, f);
  if (!page) return null;

  const words = page.wordIdx.map((i) => data.words[i]);
  const cap = L.caption;
  const gap = cap.fontSize * 0.26;
  const {rows, fit} = layoutLines(words, cap.fontSize, gap, cap.width * 0.9, cap.maxLines);
  const fs = cap.fontSize * fit;

  // fade out only if no page follows immediately (pages are normally back-to-back: the next one slides in instead)
  const next = data.pages.find((p) => p.startFrame >= page.endFrame);
  const hasNext = next && next.startFrame - page.endFrame <= 3;
  const outFade = hasNext ? 1 : interpolate(f, [page.endFrame - 5, page.endFrame], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{zIndex: LAYERS.captions, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: cap.left,
          top: cap.top,
          width: cap.width,
          height: cap.height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: outFade,
        }}
      >
        {rows.map((row, r) => (
          <div key={r} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap'}}>
            {row.map((k) => {
              const w = words[k];
              const order = rows.slice(0, r).reduce((a, x) => a + x.length, 0) + row.indexOf(k);
              return (
                <Word
                  key={w.i}
                  word={w}
                  f={f}
                  enterT={f - page.startFrame - order * 2}
                  style={style}
                  fs={fs}
                  fps={fps}
                  u={L.u}
                />
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default Captions;
