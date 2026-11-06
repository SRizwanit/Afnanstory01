// Scene01_Year.jsx (Step 27) — S1 "year": old film leader → big Bengali year ১৯৭৬ stamped in digit by digit → cold desaturated cut on "সাল।".
// Exports : named + default `Scene01_Year` ({scene, data}); pure helpers (testable in Node):
//           wfOf(data, scene, i), leaderState(f, T, cx, cy), digitState(f, appearAt), coldAmount(f, cutAt), mixHex(a, b, t), pulseAmount(f, hitFrames), YEAR_DIGITS
// Contract: scene component contract 6.3 — mount inside <Sequence from={scene.startFrame} durationInFrames={endFrame-startFrame}>; every frame here is
//           LOCAL (useCurrentFrame()). wf(i) = data.words[i].startFrame - scene.startFrame. Fills 100 % of the composition, no captions / grain / audio.
// Timing  : (word cues come from story_data.json, never hard-coded seconds)
//           0 … wf(2)      film leader: countdown ring ৩ → ২ → ১ with a sweeping clock wedge, crosshair, scratches; fades out before wf(2)
//           wf(2) উনিশশো   digits ১ ৯ stamp in (one digit every 4 frames)
//           wf(3) ছিয়াত্তর  digits ৭ ৬ stamp in
//           wf(4) সাল।      blood-red flash + glitch burst, blood underline sweeps, background goes from sepia to cold dark teal
// Layout  : only useLayout(): year centred at L.cx(50)/L.cy(46) inside the content zone, the countdown uses the SAME centre but is gone before the
//           first digit appears (never two texts at once); caption band stays free. Every digit is its own text span (Bengali digits are single
//           code points — no conjunct is ever split). z-order: bg gradient → sepia/cold wash → leader → year → vignette → scratches.
// Rules   : deterministic (useCurrentFrame, random('seed')), no Math.random / CSS animation / SVG filters (glow = text-shadow on the digits).
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {COLORS, FONT_TITLE, LAYERS, toBn, useLayout} from './theme.js';
import {FlashCut, GlitchBurst} from './Transitions.jsx';

export const YEAR_DIGITS = toBn(1976).split(''); // ['১','৯','৭','৬']
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);

export const wfOf = (data, scene, i) => data.words[i].startFrame - scene.startFrame;

export function mixHex(a, b, t) {
  const p = (h) => { const v = parseInt(String(h).replace('#', ''), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const A = p(a), B = p(b), k = clamp01(t);
  return `#${A.map((c, i) => Math.round(c + (B[i] - c) * k).toString(16).padStart(2, '0')).join('')}`;
}

// 0 = warm sepia, 1 = cold desaturated; switches over 6 frames starting at the cut
export const coldAmount = (f, cutAt) => clamp01((f - cutAt) / 6);

// countdown leader: T = frame where the first digit stamps in; 3 slots between frame 2 and T-3; ring fades in the last 4 frames
export function leaderState(f, T) {
  const slot = Math.max(1, (T - 5) / 3), t = f - 2;
  if (t < 0 || f >= T) return {digit: null, sweep: 0, alpha: 0};
  const k = Math.min(2, Math.floor(t / slot));
  return {digit: toBn(3 - k), sweep: clamp01((t - k * slot) / slot), alpha: clamp01((T - f) / 4) * clamp01((f + 1) / 3)};
}

// one digit stamping in: scale 2.4 → 1 (overshoot-free ease), opacity, a short shake, glow strength
export function digitState(f, appearAt) {
  const t = f - appearAt;
  if (t < 0) return {on: false, scale: 1, op: 0, dx: 0, dy: 0, glow: 0};
  const e = ease(t / 6), sh = t < 8 ? (1 - t / 8) : 0;
  return {on: true, scale: 2.4 - 1.4 * e, op: clamp01(t / 2), dx: Math.sin(t * 2.7) * 9 * sh, dy: Math.cos(t * 3.1) * 7 * sh, glow: 0.55 + 0.45 * (1 - clamp01(t / 14))};
}

// blood-red vignette strength: slow pulse that grows with the year, spikes on each hit frame
export function pulseAmount(f, hitFrames) {
  let a = 0.16 + 0.07 * Math.sin(f * 0.16);
  for (const h of hitFrames) if (f >= h) a += 0.3 * Math.exp(-(f - h) / 9);
  return Math.min(0.75, a);
}

export function Scene01_Year({scene, data}) {
  const f = useCurrentFrame(), L = useLayout(), {u} = L;
  const T2 = wfOf(data, scene, 2), T3 = wfOf(data, scene, 3), T4 = wfOf(data, scene, 4);
  const cx = L.cx(50), cy = L.cy(46);
  const cold = coldAmount(f, T4);
  const size = Math.min((L.content.width * 0.92) / (4 * 0.66), L.content.height * 0.52);
  const lead = leaderState(f, T2), R = Math.min(L.content.width, L.content.height) * 0.3;
  const appear = [T2, T2 + 4, T3, T3 + 4];
  const drift = interpolate(f, [0, scene.endFrame - scene.startFrame], [38, 62], {extrapolateRight: 'clamp'});
  const bg0 = mixHex('#5a3d22', COLORS.bg2, cold), bg1 = mixHex('#140c06', COLORS.bg, cold);
  const flick = 0.04 * random(`y-flick-${f}`) + 0.02 * Math.sin(f * 0.9);
  const digits = YEAR_DIGITS.map((d, i) => ({d, s: digitState(f, appear[i])}));
  const underline = clamp01((f - T4) / 10);
  // scratches (re-rolled every 2 frames) + a leader frame line that jumps
  const slot = Math.floor(f / 2), scr = [0, 1, 2].filter((i) => random(`y-scr-${slot}-${i}`) < (f < T2 ? 0.55 : 0.3));
  const sweepDeg = lead.sweep * 360, ang = ((sweepDeg - 90) * Math.PI) / 180;
  const wedge = lead.sweep > 0.002 ? `M${cx} ${cy} L${cx} ${cy - R} A${R} ${R} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${(cx + R * Math.cos(ang)).toFixed(1)} ${(cy + R * Math.sin(ang)).toFixed(1)} Z` : '';
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{zIndex: LAYERS.bg, background: `radial-gradient(ellipse at ${drift.toFixed(1)}% 45%, ${bg0} 0%, ${bg1} 78%)`}} />
      <AbsoluteFill style={{zIndex: LAYERS.bg + 1, background: '#000', opacity: Math.max(0, flick + (f < T2 ? 0.05 : 0))}} />
      {lead.digit && (
        <AbsoluteFill style={{zIndex: LAYERS.scene, opacity: lead.alpha}}>
          <svg width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} style={{position: 'absolute', inset: 0}}>
            <g fill="none" stroke={COLORS.bone} strokeWidth={u(4)} opacity="0.75">
              <circle cx={cx} cy={cy} r={R} /><circle cx={cx} cy={cy} r={R * 0.72} strokeWidth={u(2)} />
              <line x1={cx - R * 1.25} y1={cy} x2={cx + R * 1.25} y2={cy} strokeWidth={u(2)} /><line x1={cx} y1={cy - R * 1.25} x2={cx} y2={cy + R * 1.25} strokeWidth={u(2)} />
            </g>
            {wedge && <path d={wedge} fill={COLORS.bone} opacity="0.2" />}
            <text x={cx} y={cy + R * 0.38} textAnchor="middle" fontSize={R * 1.15} fill={COLORS.bone} opacity="0.9" style={{fontFamily: FONT_TITLE}}>{lead.digit}</text>
          </svg>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{zIndex: LAYERS.scene}}>
        {digits.map(({d, s}, i) => s.on && (
          <span key={i} style={{
            position: 'absolute', left: cx + (i - 2) * size * 0.66 + s.dx, top: cy + s.dy, width: size * 0.66, textAlign: 'center', fontFamily: FONT_TITLE, fontSize: size, lineHeight: 1.35,
            color: COLORS.bone, opacity: s.op, transform: `translate(0, -50%) scale(${s.scale.toFixed(3)})`, transformOrigin: '50% 60%', whiteSpace: 'nowrap',
            WebkitTextStroke: `${u(4)}px ${COLORS.ink}`, paintOrder: 'stroke fill',
            textShadow: `0 0 ${u(34)}px rgba(255,45,61,${(0.9 * s.glow).toFixed(2)}), 0 0 ${u(80)}px rgba(255,45,61,${(0.5 * s.glow).toFixed(2)})`,
          }}>{d}</span>
        ))}
        {underline > 0 && <div style={{position: 'absolute', left: cx - size * 1.28, top: cy + size * 0.5, width: size * 2.56 * ease(underline), height: u(9), background: COLORS.blood, borderRadius: u(5), boxShadow: `0 0 ${u(24)}px ${COLORS.blood}`}} />}
      </AbsoluteFill>
      <AbsoluteFill style={{zIndex: LAYERS.fx, background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(150,8,20,${pulseAmount(f, [T2, T3, T4]).toFixed(3)}) 100%)`}} />
      <AbsoluteFill style={{zIndex: LAYERS.fx + 1}}>
        {scr.map((i) => <div key={i} style={{position: 'absolute', left: `${(random(`y-sx-${slot}-${i}`) * 100).toFixed(1)}%`, top: `${(random(`y-sy-${slot}-${i}`) * 30).toFixed(1)}%`, width: u(2), height: `${(30 + random(`y-sl-${slot}-${i}`) * 60).toFixed(1)}%`, background: COLORS.bone, opacity: 0.2 + 0.3 * random(`y-so-${slot}-${i}`)}} />)}
      </AbsoluteFill>
      <FlashCut at={T4} color={COLORS.blood} length={9} peak={0.55} />
      <GlitchBurst at={T4} length={6} intensity={0.9} seed="year" />
    </AbsoluteFill>
  );
}

export default Scene01_Year;
