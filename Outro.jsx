// Outro.jsx (Step 33) — 90-frame end card: page name + handle, three animated buttons (লাইক · সাবস্ক্রাইব · ফলো) with bouncing SVG icons, and a teaser line
//   "পরের পর্বের জন্য অপেক্ষা করুন" (swap the `teaser` prop for a next-part title later).
// Exports : named + default `Outro` ({length=90, pageName=BRAND.pageName, handle=BRAND.handle, teaser=TEASER, seed='outro'}); consts OUTRO_FRAMES (90), TEASER, BUTTONS;
//           pure helpers (testable in Node): graphemes(text), wrapLines(text, fs, maxW), outroLayout(L, {pageName, teaser}), popState(f, at), bounceY(f, at, amp, phase),
//           pressScale(f, at), bellAngle(f, at), teaserState(f, at, u), fadeIn(f), fadeOut(f, length)
// Contract: mount inside <Sequence from={introOffset + data.narrationFrames} durationInFrames={data.outroFrames}> (Story v2, Step 34); every frame is LOCAL; fills 100 %;
//           no captions / grain / audio (Story.jsx adds FxFilm).
// Timeline: f0–5 fade in from ink · f4 page name + handle pop · f10 / f20 / f30 the three buttons pop in (back-ease) and their icons start bouncing (parabolic hop every 28 frames,
//           phase-shifted per button) · f44 "like" is pressed (0.9 → 1.1 → 1, thumb pulses) · f56 "subscribe" is pressed, the bell rings (decaying swing) · f68 "follow" is pressed
//           · f50 teaser line fades up and its glow breathes · last 8 frames fade to ink.
// Layout  : only useLayout(). ONE vertical flow centred in the content zone: [page name][handle][buttons][teaser] with gaps u(24); buttons are STACKED when vertical (3 pills 640×140 u)
//           and in ONE ROW when horizontal (3 pills 430×140 u, gap u(40)); everything is scaled down by one factor `k` if the flow is taller than the content zone. Text is wrapped
//           by words (never split inside a word) with an estimated width of 0.62·fs per grapheme. Icons bounce INSIDE their pill (hop ≤ u(10) < pill padding). Nothing touches the
//           caption band; pills grow ≤ 12 % while pressed, which stays inside the gaps.
// Rules   : deterministic (useCurrentFrame, sin); no Math.random / CSS animation / SVG filters; labels are single text nodes; icons are plain SVG paths.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BRAND, COLORS, FONT_LABEL, FONT_TITLE, LAYERS, useLayout} from './theme.js';
import {FxParticles} from './Fx_Particles.jsx';

export const OUTRO_FRAMES = 90;
export const TEASER = 'পরের পর্বের জন্য অপেক্ষা করুন';
export const BUTTONS = [
  {id: 'like', label: 'লাইক', color: COLORS.ghost, popAt: 10, pressAt: 44, phase: 0},
  {id: 'subscribe', label: 'সাবস্ক্রাইব', color: COLORS.blood, popAt: 20, pressAt: 56, phase: 9},
  {id: 'follow', label: 'ফলো', color: COLORS.amber, popAt: 30, pressAt: 68, phase: 18},
];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const backOut = (t) => { const c = 1.70158, x = clamp01(t) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

export function graphemes(text) {
  const s = String(text || '');
  if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter('bn', {granularity: 'grapheme'}).segment(s), (x) => x.segment).length;
  return Array.from(s).length;
}
// greedy wrap by words → array of line strings (a single over-wide word stays on its own line)
export function wrapLines(text, fs, maxW) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean), w = (t) => graphemes(t) * 0.62 * fs, lines = [];
  let cur = '';
  for (const t of words) {
    const next = cur ? `${cur} ${t}` : t;
    if (cur && w(next) > maxW) { lines.push(cur); cur = t; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// whole layout (all px, composition coordinates): {k, name:{lines,fs,top,height}, handle:{fs,top,height}, pills:[{id,left,top,width,height,fs}], teaser:{lines,fs,top,height}, rects:[…]}
export function outroLayout(L, {pageName = BRAND.pageName, teaser = TEASER} = {}) {
  const {u, isVertical: v} = L, maxW = L.content.width * 0.92;
  const build = (k) => {
    const gap = u(24) * k, nameFs = u(64) * k, handleFs = u(40) * k, teaserFs = u(54) * k, ph = u(140) * k, pw = u(v ? 640 : 430) * k, pgap = u(v ? 20 : 40) * k;
    const nameLines = wrapLines(pageName, nameFs, maxW), teaserLines = wrapLines(teaser, teaserFs, maxW);
    const nameH = nameFs * 1.4 * Math.max(1, nameLines.length), handleH = handleFs * 1.5, teaserH = teaserFs * 1.4 * Math.max(1, teaserLines.length);
    const btnH = v ? 3 * ph + 2 * pgap : ph, total = nameH + handleH + btnH + teaserH + 3 * gap;
    return {gap, nameFs, handleFs, teaserFs, ph, pw, pgap, nameLines, teaserLines, nameH, handleH, teaserH, btnH, total};
  };
  let k = 1, b = build(1);
  if (b.total > L.content.height) { k = L.content.height / b.total; b = build(k); }
  let y = L.content.top + (L.content.height - b.total) / 2;
  const cx = L.cx(50), name = {lines: b.nameLines, fs: b.nameFs, top: y, height: b.nameH}; y += b.nameH;
  const handle = {fs: b.handleFs, top: y, height: b.handleH}; y += b.handleH + b.gap;
  const pills = BUTTONS.map((bt, i) => {
    const left = v ? cx - b.pw / 2 : cx - (3 * b.pw + 2 * b.pgap) / 2 + i * (b.pw + b.pgap), top = v ? y + i * (b.ph + b.pgap) : y;
    const fs = Math.min(u(56) * k, (b.pw - b.ph * 0.56 - 3 * u(24) * k) / (graphemes(bt.label) * 0.62));
    return {id: bt.id, left, top, width: b.pw, height: b.ph, fs};
  });
  y += b.btnH + b.gap;
  const tz = {lines: b.teaserLines, fs: b.teaserFs, top: y, height: b.teaserH};
  const full = (t, h) => ({left: cx - L.content.width * 0.46, right: cx + L.content.width * 0.46, top: t, bottom: t + h});
  return {k, cx, name, handle, pills, teaser: tz, rects: [full(name.top, name.height), full(handle.top, handle.height), ...pills.map((p) => ({left: p.left, right: p.left + p.width, top: p.top, bottom: p.top + p.height})), full(tz.top, tz.height)]};
}

// animation helpers
export function popState(f, at) { const t = f - at; return t < 0 ? {on: false, scale: 0.6, op: 0} : {on: true, scale: 0.6 + 0.4 * backOut(t / 9), op: clamp01(t / 3)}; }
export function bounceY(f, at, amp, phase = 0) { // parabolic hop during the first 60 % of every 28-frame cycle; starts 8 frames after the pop
  const t = f - at - 8 - phase;
  if (t < 0) return 0;
  const p = (t % 28) / 28, q = p / 0.6;
  return p < 0.6 ? -amp * 4 * q * (1 - q) : 0;
}
export function pressScale(f, at) { // 1 → 0.9 (4 frames) → 1.1 (5 frames) → 1 (5 frames)
  const t = f - at;
  if (t < 0 || t >= 14) return 1;
  return t < 4 ? 1 - 0.1 * (t / 4) : 0.9 + 0.2 * clamp01((t - 4) / 5) - 0.1 * clamp01((t - 9) / 5);
}
export const bellAngle = (f, at) => (f < at ? 0 : 22 * Math.sin((f - at) * 0.9) * Math.exp(-(f - at) / 16));
export function teaserState(f, at, u) {
  const e = ease((f - at) / 8);
  return {op: e, dy: u(24) * (1 - e), glow: f < at ? 0 : 0.55 + 0.25 * Math.sin((f - at) * 0.25)};
}
export const fadeIn = (f) => 1 - clamp01(f / 5);
export const fadeOut = (f, length) => clamp01((f - (length - 8)) / 7);

function Icon({id, size, color, angle = 0, pulse = 1}) {
  const common = {width: size, height: size, viewBox: '0 0 100 100', style: {display: 'block', overflow: 'visible', transform: `scale(${pulse.toFixed(3)})`}};
  if (id === 'like') return (<svg {...common}><path d="M12 46 H30 V88 H12 Z" fill={color} /><path d="M36 46 L50 14 Q60 10 62 22 L58 40 H84 Q95 43 90 54 L84 80 Q81 88 72 88 H36 Z" fill={color} /></svg>);
  if (id === 'subscribe') return (<svg {...common}><g transform={`rotate(${angle.toFixed(1)} 50 12)`}><path d="M50 12 C34 12 28 28 28 42 V58 L16 74 H84 L72 58 V42 C72 28 66 12 50 12 Z" fill={color} /><circle cx="50" cy="86" r="9" fill={color} /></g></svg>);
  return (<svg {...common}><circle cx="38" cy="30" r="17" fill={color} /><path d="M6 86 Q6 54 38 54 Q70 54 70 86 Z" fill={color} /><path d="M84 32 V64 M68 48 H100" stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" /></svg>);
}

export function Outro({length = OUTRO_FRAMES, pageName = BRAND.pageName, handle = BRAND.handle, teaser = TEASER, seed = 'outro'}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L, lay = outroLayout(L, {pageName, teaser}), k = lay.k;
  const hp = popState(f, 4), ts = teaserState(f, 50, u), fo = fadeOut(f, length), fi = fadeIn(f);
  const textBox = (top, height) => ({position: 'absolute', left: lay.cx - L.content.width / 2, width: L.content.width, top, height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'});
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: COLORS.ink}}>
      <AbsoluteFill style={{zIndex: LAYERS.bg, background: `radial-gradient(ellipse at 50% 45%, rgba(110,14,26,0.55) 0%, rgba(13,20,38,0.9) 55%, rgba(5,6,11,1) 100%)`}} />
      <FxParticles type="embers" count={22} seed={seed} />
      <AbsoluteFill style={{zIndex: LAYERS.scene, pointerEvents: 'none'}}>
        <div style={{...textBox(lay.name.top, lay.name.height), opacity: hp.op, transform: `scale(${hp.scale.toFixed(3)})`}}>
          {lay.name.lines.map((t, i) => <span key={i} style={{fontFamily: FONT_TITLE, fontSize: lay.name.fs, lineHeight: 1.4, whiteSpace: 'nowrap', color: COLORS.bone, WebkitTextStroke: `${u(3)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(30)}px rgba(255,45,61,0.7)`}}>{t}</span>)}
        </div>
        <div style={{...textBox(lay.handle.top, lay.handle.height), opacity: hp.op}}>
          <span style={{fontFamily: FONT_LABEL, fontWeight: 700, fontSize: lay.handle.fs, color: COLORS.amber, letterSpacing: u(2), whiteSpace: 'nowrap', textShadow: `0 0 ${u(18)}px rgba(255,176,32,0.6)`}}>{handle}</span>
        </div>
        {lay.pills.map((p, i) => {
          const bt = BUTTONS[i], pop = popState(f, bt.popAt), pr = pressScale(f, bt.pressAt), icon = p.height * 0.56, glowK = f >= bt.pressAt && f < bt.pressAt + 14 ? 1 : 0.4;
          return (
            <div key={p.id} style={{position: 'absolute', left: p.left, top: p.top, width: p.width, height: p.height, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(24) * k,
              borderRadius: p.height / 2, background: f >= bt.pressAt ? `${bt.color}33` : 'rgba(5,6,11,0.86)', border: `${u(5)}px solid ${bt.color}`, boxShadow: `0 0 ${u(34) * glowK}px ${bt.color}`,
              opacity: pop.op, transform: `scale(${(pop.scale * pr).toFixed(3)})`, transformOrigin: '50% 50%'}}>
              <div style={{transform: `translateY(${bounceY(f, bt.popAt, u(10) * k, bt.phase).toFixed(1)}px)`, width: icon, height: icon}}>
                <Icon id={bt.id} size={icon} color={bt.color} angle={bt.id === 'subscribe' ? bellAngle(f, bt.pressAt) : 0} pulse={bt.id === 'like' ? pr : 1} />
              </div>
              <span style={{fontFamily: FONT_LABEL, fontWeight: 700, fontSize: p.fs, lineHeight: 1.2, color: COLORS.bone, whiteSpace: 'nowrap'}}>{bt.label}</span>
            </div>
          );
        })}
        <div style={{...textBox(lay.teaser.top, lay.teaser.height), opacity: ts.op, transform: `translateY(${ts.dy.toFixed(1)}px)`}}>
          {lay.teaser.lines.map((t, i) => <span key={i} style={{fontFamily: FONT_TITLE, fontSize: lay.teaser.fs, lineHeight: 1.4, whiteSpace: 'nowrap', color: COLORS.amber, WebkitTextStroke: `${u(2)}px ${COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 0 ${u(26)}px rgba(255,176,32,${ts.glow.toFixed(2)})`}}>{t}</span>)}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{zIndex: LAYERS.scene + 6, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, rgba(255,45,61,0) 50%, rgba(255,45,61,0.18) 100%)'}} />
      {(fi > 0 || fo > 0) && <AbsoluteFill style={{zIndex: LAYERS.transition + 1, background: COLORS.ink, opacity: Math.max(fi, fo), pointerEvents: 'none'}} />}
    </AbsoluteFill>
  );
}

export default Outro;
