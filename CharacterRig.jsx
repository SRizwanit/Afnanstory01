// CharacterRig.jsx (Step 20) — shared SVG building blocks for every character file (Pralhad, Wife, Provas, Pankaj, Prokash).
// Exports : components  CharFrame, Eyes, Brows, Mouth, Arm, Hand, NameTag, Shadow
//           hooks       useBreath(seed, amp), usePop(appearAt)
//           constants   SKIN, VIEW {w:400,h:700,feet:690}, MOODS, CHAR_H_FRAC
//           pure helpers (testable in Node)  shade(hex,k), blinkAmount(f,seed), eyeState(f,mood,look,seed,size), browPath(mood,side,cx,cy,gap,w),
//           mouthOpen(talking,f,seed), mouthShape(mood,open,w), ikElbow(sx,sy,hx,hy,l1,l2,bend), breathAt(f,seed,amp), popAt(f,appearAt,fps), tagWidth(text,fs)
// Contract: every character is drawn in the viewBox 0 0 400 700 (feet baseline y = 690, centre x = 200). The strip y 0..60 is RESERVED for the
//           NameTag, so heads start at y >= 70. Character files draw their body inside <CharFrame …>{…}</CharFrame> and never position themselves.
// CharFrame props : { x=50, y=60, scale=1, flip=false, appearAt=0, tag=null | {text, color}, children }
//           x / y = % of the CONTENT zone (L.cx / L.cy); y = feet baseline. Height = content.height × CHAR_H_FRAC (0.5) × scale, width = 4/7 of it,
//           so a character 50 % tall never reaches the caption band as long as y <= 100. zIndex = LAYERS.scene. `flip` mirrors the body only
//           (the NameTag text is never mirrored). Before `appearAt` nothing is rendered; then a spring pop (scale + rise + fade, 0 -> 1.1 -> 1)
//           from the feet; the tag pops in 8 frames later.
// Moods   : calm | worried | scared | shock (unknown -> calm). Everything is a pure function of the frame (deterministic, no Math.random,
//           no CSS animation). Bengali text is rendered as one <text> per name — never split into letters.
import React from 'react';
import {random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_LABEL, LAYERS, useLayout} from './theme.js';

export const VIEW = {w: 400, h: 700, feet: 690};
export const CHAR_H_FRAC = 0.5;
export const SKIN = {boy: '#c99466', young: '#c28a5c', adult: '#b17a4f', woman: '#c08a5e', elder: '#a8754d', ink: '#1a1008', white: '#f3ecdc'};
export const MOODS = ['calm', 'worried', 'scared', 'shock'];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const n1 = (v) => v.toFixed(1);
const mood_ = (m) => (MOODS.includes(m) ? m : 'calm');

// ---------------------------------------------------------------- pure helpers
export function shade(hex, k = -0.2) { // k<0 darker, k>0 lighter
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) return '#000000';
  const v = parseInt(m[1], 16), ch = [v >> 16, (v >> 8) & 255, v & 255].map((c) => Math.round(Math.max(0, Math.min(255, k < 0 ? c * (1 + k) : c + (255 - c) * k))));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// blink: one blink (5 frames, triangle 0..1..0, peak 1 on the 3rd) at a seeded moment inside every 90-frame slot
export function blinkAmount(f, seed = 'a') {
  const k = Math.floor(f / 90), t = f - (k * 90 + 10 + Math.floor(random(`blink-${seed}-${k}`) * 70));
  return t >= 0 && t < 5 ? 1 - Math.abs(t - 2) / 2 : 0;
}

const EYE = {calm: {open: 1, pupil: 0.5}, worried: {open: 0.92, pupil: 0.5}, scared: {open: 1.25, pupil: 0.38}, shock: {open: 1.45, pupil: 0.26}};
export function eyeState(f, mood, look = [0, 0], seed = 'a', size = 11) {
  const m = EYE[mood_(mood)], b = blinkAmount(f, seed);
  const lx = Math.max(-1, Math.min(1, num(look && look[0], 0))), ly = Math.max(-1, Math.min(1, num(look && look[1], 0)));
  const rx = size, ry = size * 0.8 * m.open * (1 - 0.92 * b), pr = Math.min(size * m.pupil, ry);
  return {rx, ry, pr, px: lx * size * 0.4, py: ly * size * 0.3, blink: b};
}

// brow path for one side (side -1 = left, +1 = right); inner end = the end nearest the face centre
const BROW = {calm: {lift: 0, inner: 0, arch: 2}, worried: {lift: -2, inner: 9, arch: 1}, scared: {lift: 8, inner: 7, arch: 4}, shock: {lift: 14, inner: 2, arch: 7}};
export function browPath(mood, side, cx, cy, gap, w) {
  const b = BROW[mood_(mood)], yy = cy - b.lift, xi = cx + side * (gap / 2 - w * 0.1), xo = cx + side * (gap / 2 + w);
  const yi = yy - b.inner, yo = yy + (mood_(mood) === 'worried' ? 3 : 0);
  return `M${n1(xo)} ${n1(yo)} Q${n1((xi + xo) / 2)} ${n1(Math.min(yi, yo) - b.arch)} ${n1(xi)} ${n1(yi)}`;
}

// talking = true | false | [startFrame, endFrame]; open amount 0..1 (new random target every 3 frames, eased)
export function mouthOpen(talking, f, seed = 'a') {
  const on = Array.isArray(talking) ? f >= talking[0] && f < talking[1] : !!talking;
  if (!on) return 0;
  const k = Math.floor(f / 3), a = random(`talk-${seed}-${k}`), b = random(`talk-${seed}-${k + 1}`), t = (f % 3) / 3;
  return clamp01(0.15 + 0.85 * (a + (b - a) * t));
}

export function mouthShape(mood, open, w = 40) {
  const m = mood_(mood), rx = w / 2, o = clamp01(open);
  const extra = {calm: 0, worried: 0.04, scared: 0.12, shock: 0.22}[m];
  if (o > 0.02 || m === 'scared' || m === 'shock') {
    const ry = w * (0.05 + 0.32 * o + extra + (m === 'shock' ? 0.1 : 0));
    return {filled: true, d: `M${n1(-rx)} 0 Q0 ${n1(-ry * 0.3)} ${n1(rx)} 0 Q0 ${n1(ry * 1.7)} ${n1(-rx)} 0 Z`};
  }
  return {filled: false, d: m === 'worried' ? `M${n1(-rx)} 3 Q0 -4 ${n1(rx)} 3` : `M${n1(-rx)} 0 Q0 3 ${n1(rx)} 0`};
}

// two-bone IK: elbow position for shoulder (sx,sy) -> hand target (hx,hy); bend = +1 / -1 picks the elbow side; the reach is clamped
export function ikElbow(sx, sy, hx, hy, l1 = 95, l2 = 90, bend = 1) {
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy);
  if (d < 1e-6) { dx = 0; dy = 1; d = 1; } // hand on the shoulder: point straight down
  const dd = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, d));
  dx /= d; dy /= d;
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), sg = bend < 0 ? -1 : 1;
  return {ex: sx + dx * a - dy * h * sg, ey: sy + dy * a + dx * h * sg, hx: sx + dx * dd, hy: sy + dy * dd};
}

// idle breathing: body bob (viewBox units), chest scale, slow sway (deg)
export function breathAt(f, seed = 'a', amp = 4) {
  const ph = random(`breath-${seed}`) * 6.28;
  return {dy: Math.sin(f * 0.07 + ph) * amp, chest: 1 + 0.012 * Math.sin(f * 0.07 + ph), sway: Math.sin(f * 0.031 + ph) * 0.6};
}

// pop-in: spring 0 -> ~1.1 -> 1; tag follows 8 frames later
export function popAt(f, appearAt = 0, fps = 30) {
  const t = f - num(appearAt, 0);
  if (t < 0) return {visible: false, scale: 0, opacity: 0, dy: 0, tag: 0};
  const cfg = {damping: 11, stiffness: 150, mass: 0.7}, s = spring({frame: t, fps, config: cfg});
  return {visible: true, scale: s, opacity: clamp01(t / 4), dy: (1 - Math.min(1, s)) * 40, tag: t < 8 ? 0 : spring({frame: t - 8, fps, config: cfg})};
}

// estimated width of a Bengali label (grapheme-ish: combining signs count little) in viewBox units
export function tagWidth(text, fs = 32) {
  let em = 0;
  for (const ch of Array.from(String(text))) em += /[\u09BE-\u09CD\u09D7\u0981-\u0983]/.test(ch) ? 0.12 : ch === ' ' ? 0.25 : 0.58;
  return Math.max(fs * 2, em * fs + fs * 1.1);
}

// ---------------------------------------------------------------- hooks
export function useBreath(seed = 'a', amp = 4) {
  return breathAt(useCurrentFrame(), seed, amp);
}
export function usePop(appearAt = 0) {
  return popAt(useCurrentFrame(), appearAt, useVideoConfig().fps);
}

// ---------------------------------------------------------------- parts
export function Eyes({cx = 200, cy = 130, gap = 54, size = 11, mood = 'calm', look = [0, 0], seed = 'a', color = SKIN.ink}) {
  const f = useCurrentFrame(), e = eyeState(f, mood, look, seed, size);
  return (
    <g>
      {[-1, 1].map((sd) => {
        const x = cx + sd * gap / 2;
        return (
          <g key={sd}>
            <ellipse cx={n1(x)} cy={n1(cy)} rx={n1(e.rx)} ry={n1(Math.max(0.8, e.ry))} fill={SKIN.white} stroke={color} strokeWidth="2" />
            {e.blink < 0.85 && <circle cx={n1(x + e.px)} cy={n1(cy + e.py)} r={n1(Math.max(0.6, e.pr))} fill={color} />}
            {e.blink < 0.85 && <circle cx={n1(x + e.px - e.pr * 0.3)} cy={n1(cy + e.py - e.pr * 0.3)} r={n1(Math.max(0.3, e.pr * 0.25))} fill="#fff" opacity="0.8" />}
            <path d={`M${n1(x - e.rx - 1)} ${n1(cy - e.ry * 0.2)} Q${n1(x)} ${n1(cy - e.ry * 1.25)} ${n1(x + e.rx + 1)} ${n1(cy - e.ry * 0.2)}`} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

export function Brows({cx = 200, cy = 108, gap = 54, w = 22, mood = 'calm', color = '#2a1a10', thick = 5}) {
  return (
    <g fill="none" stroke={color} strokeWidth={thick} strokeLinecap="round">
      {[-1, 1].map((sd) => <path key={sd} d={browPath(mood, sd, cx, cy, gap, w)} />)}
    </g>
  );
}

export function Mouth({cx = 200, cy = 190, w = 40, mood = 'calm', talking = false, seed = 'a', color = '#2a0d0a', lip = '#6a2a1e'}) {
  const f = useCurrentFrame(), s = mouthShape(mood, mouthOpen(talking, f, seed), w);
  return (
    <g transform={`translate(${n1(cx)} ${n1(cy)})`}>
      <path d={s.d} fill={s.filled ? color : 'none'} stroke={lip} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export function Hand({x = 0, y = 0, r = 15, color = SKIN.adult, rot = 0}) {
  return (
    <g transform={`translate(${n1(x)} ${n1(y)}) rotate(${n1(rot)})`}>
      <circle r={n1(r)} fill={color} />
      <ellipse cx={n1(r * 0.75)} cy={n1(-r * 0.35)} rx={n1(r * 0.42)} ry={n1(r * 0.26)} fill={color} transform={`rotate(-30 ${n1(r * 0.75)} ${n1(-r * 0.35)})`} />
      <path d={`M${n1(-r * 0.4)} ${n1(r * 0.2)} L${n1(r * 0.5)} ${n1(r * 0.2)}`} stroke={shade(color, -0.25)} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

export function Arm({sx, sy, hx, hy, upper = 95, lower = 90, bend = 1, thick = 26, skin = SKIN.adult, sleeve = '#e8e0d0', sleeveLower = false, handR = 15}) {
  const k = ikElbow(sx, sy, hx, hy, upper, lower, bend), low = sleeveLower ? sleeve : skin;
  return (
    <g strokeLinecap="round" fill="none">
      <line x1={n1(k.ex)} y1={n1(k.ey)} x2={n1(k.hx)} y2={n1(k.hy)} stroke={low} strokeWidth={n1(thick * 0.82)} />
      <line x1={n1(sx)} y1={n1(sy)} x2={n1(k.ex)} y2={n1(k.ey)} stroke={sleeve} strokeWidth={n1(thick)} />
      <circle cx={n1(k.ex)} cy={n1(k.ey)} r={n1(thick * 0.45)} fill={sleeve} stroke="none" />
      <Hand x={k.hx} y={k.hy} r={handR} color={skin} rot={(Math.atan2(k.hy - k.ey, k.hx - k.ex) * 180) / Math.PI} />
    </g>
  );
}

export function Shadow({cx = 200, cy = 690, rx = 110, ry = 14, opacity = 0.45}) {
  return <ellipse cx={n1(cx)} cy={n1(cy)} rx={n1(rx)} ry={n1(ry)} fill="#010104" opacity={opacity} />;
}

export function NameTag({text = '', color = '#ffb020', cx = 200, y = 8, fs = 32, k = 1}) {
  const w = tagWidth(text, fs), h = fs * 1.5, s = clamp01(k) * 1.0;
  if (s <= 0.01) return null;
  return (
    <g transform={`translate(${n1(cx)} ${n1(y + h)}) scale(${s.toFixed(3)}) translate(${n1(-cx)} ${n1(-(y + h))})`} opacity={clamp01(k * 1.5)}>
      <rect x={n1(cx - w / 2)} y={n1(y)} width={n1(w)} height={n1(h)} rx={n1(h / 2)} fill="#05060b" fillOpacity="0.88" stroke={color} strokeWidth="3" />
      <path d={`M${n1(cx - 8)} ${n1(y + h - 1)} L${n1(cx)} ${n1(y + h + 9)} L${n1(cx + 8)} ${n1(y + h - 1)} Z`} fill={color} />
      <text x={n1(cx)} y={n1(y + h * 0.68)} textAnchor="middle" fontSize={fs} fontWeight="700" fill={color} style={{fontFamily: FONT_LABEL}}>{text}</text>
    </g>
  );
}

// positions + sizes a character inside the content zone and handles the pop-in; the tag stays upright even when flipped
export function CharFrame({x = 50, y = 60, scale = 1, flip = false, appearAt = 0, tag = null, children}) {
  const L = useLayout(), p = usePop(appearAt);
  if (!p.visible) return null;
  const H = L.content.height * CHAR_H_FRAC * num(scale, 1), W = (H * VIEW.w) / VIEW.h;
  const left = L.cx(num(x, 50)) - W / 2, top = L.cy(num(y, 60)) - H * (VIEW.feet / VIEW.h);
  const sc = Math.max(0, p.scale);
  return (
    <svg width={n1(W)} height={n1(H)} viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} style={{position: 'absolute', left: Math.round(left * 10) / 10, top: Math.round(top * 10) / 10, overflow: 'visible', zIndex: LAYERS.scene, pointerEvents: 'none'}}>
      <g opacity={p.opacity.toFixed(3)} transform={`translate(200 ${VIEW.feet + p.dy}) scale(${sc.toFixed(4)}) translate(-200 ${-VIEW.feet})`}>
        <g transform={flip ? 'translate(400 0) scale(-1 1)' : undefined}>{children}</g>
        {tag && <NameTag text={tag.text} color={tag.color} k={p.tag} />}
      </g>
    </svg>
  );
}

export default CharFrame;
