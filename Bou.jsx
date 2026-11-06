// Bou.jsx (Step P2.4) — ছেলের বউ: a GENERIC young daughter-in-law (one file reused for every bou in Part 2; no name is invented → TODO(user)).
//           ~26, deep-maroon saree with gold border, teal blouse, pallu over the viewer's-left shoulder, ghomta (saree veil) over the
//           head, long braid with a red ribbon over the right shoulder, sindoor + bindi, red-and-white shakha-pola bangles, nose stud.
// Exports : default + named `Bou` component, `META`, pure helpers (testable in Node):
//           talkingNow(talking, f), poseFor(mood, f, talk), bendsFor(mood) -> {l,r}, shiverAt(f, mood), pulluPts(swing), braidPts(f, k),
//           banglePts(k), LOOK, FACE
// Props   : { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[startFrame,endFrame],
//             appearAt=0, showTag=true, tagColor, look=[lx,ly], seed='bou' }   (same contract as the other characters; x / y = % of the CONTENT zone,
//             y = feet baseline). `seed` = extra: change it when two bou stand in one scene so they blink / breathe at different times.
// Rules   : head top (veil) y >= 70 (81 before the 0.94 body scale, the tag strip y 0..60 stays free) · feet baseline y = 690 ·
//           whole body drawn at 0.94 scale about the feet · deterministic · no filters / Math.random.
// Moods   : calm (hands hanging; talking raises the right hand) · worried (left hand holds the pallu at the chest, right arm across the belly,
//           lowered gaze) · scared (left hand over the mouth, right on the chest, shivering, sweat drop, pale) · shock (hands at the cheeks, huge eyes, very pale).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Arm, Brows, CharFrame, Eyes, MOODS, Mouth, SKIN, Shadow, ikElbow, shade, useBreath} from './CharacterRig.jsx';

export const META = {id: 'bou', bn: 'ছেলের বউ', age: 26, role: 'daughter-in-law', tagColor: '#ff7ac8'}; // age/name: TODO(user)

const n1 = (v) => (Math.round(v * 10) / 10).toString();
const C = {
  sindoor: '#d42a1e', bindi: '#b8141c', skin: '#c68e62', hair: '#15110f', blouse: '#2f5a66', saree: '#7a2433', sareeDark: '#4e1522', border: '#d9b44a',
  gold: '#d9b44a', shakha: '#f3ecdc', pola: '#d42a1e', ribbon: '#d42a1e',
};
export const FACE = 'M156 152 Q154 108 200 100 Q246 108 244 152 Q244 184 228 208 Q214 224 200 224 Q186 224 172 208 Q156 184 156 152 Z';
export const LOOK = {calm: [0.1, 0.15], worried: [-0.1, 0.7], scared: [0, -0.2], shock: [0, 0]};

export function talkingNow(talking, f) {
  return Array.isArray(talking) ? f >= talking[0] && f < talking[1] : !!talking;
}

// hand targets (viewBox units); shoulders at (152,268) / (248,268); l = viewer's left hand
const POSE = {calm: {l: [146, 438], r: [254, 438]}, worried: {l: [176, 346], r: [214, 398]}, scared: {l: [188, 214], r: [226, 340]}, shock: {l: [172, 214], r: [228, 214]}};
export function poseFor(mood, f, talk) {
  const m = MOODS.includes(mood) ? mood : 'calm', b = POSE[m];
  let l = [b.l[0], b.l[1]], r = [b.r[0], b.r[1]];
  const w = Math.sin(f * 0.2), w2 = Math.cos(f * 0.16);
  if (m === 'worried') { l = [l[0] + w * 3, l[1] + w2 * 3]; r = [r[0] - w * 4, r[1] + w2 * 2]; }
  if (m === 'scared') { l = [l[0] + Math.sin(f * 1.9) * 2, l[1] + Math.cos(f * 2.3) * 2]; r = [r[0] + Math.sin(f * 2.1) * 2.5, r[1] + Math.cos(f * 1.7) * 2.5]; }
  if (talk) {
    if (m === 'calm') r = [258 + Math.sin(f * 0.3) * 9, 388 + Math.cos(f * 0.23) * 7];
    else if (m !== 'shock') r = [r[0] + Math.sin(f * 0.3) * 4, r[1] + Math.cos(f * 0.23) * 3];
  }
  return {l, r};
}

// elbow side per arm: hands above the shoulder need the opposite sign (see Pralhad.jsx / Prokash.jsx)
export const bendsFor = (mood) => ({calm: {l: 1, r: -1}, worried: {l: 1, r: -1}, scared: {l: -1, r: -1}, shock: {l: -1, r: 1}}[MOODS.includes(mood) ? mood : 'calm']);

export function shiverAt(f, mood) {
  const amp = {calm: 0, worried: 0.3, scared: 1.5, shock: 0}[MOODS.includes(mood) ? mood : 'calm'];
  return Math.sin(f * 1.9) * amp;
}

// pallu panel hanging from the viewer's-left shoulder: A,B top, C,D bottom; `swing` moves the bottom
export function pulluPts(swing = 0) {
  const A = [186, 256], B = [140, 268], C = [144 + swing, 430], D = [194 + swing, 440];
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  return {A, B, C, D, at: (t, u) => lerp(lerp(A, D, t), lerp(B, C, t), u)};
}

// braid: 7 links hanging over the viewer's-right shoulder; the lower links swing a little (k = link 0..6)
export function braidPts(f, k) {
  const t = k / 6, sw = Math.sin(f * 0.04 + 0.6) * 3.5 * t;
  return {x: 246 + Math.sin(k * 0.9) * 2.5 + sw, y: 248 + k * 22, rx: 11 - 4 * t, ry: 15 - 3 * t};
}

// shakha (white) + pola (red) + thin gold bangle on the forearm near the wrist (same IK as <Arm>)
export function banglePts(k) {
  const dx = k.hx - k.ex, dy = k.hy - k.ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  return {ang: (Math.atan2(dy, dx) * 180) / Math.PI + 90, pts: [19, 26, 33].map((o) => [k.hx - ux * o, k.hy - uy * o])};
}

function Bangles({sx, sy, hx, hy, bend}) {
  const b = banglePts(ikElbow(sx, sy, hx, hy, 95, 90, bend)), cols = [C.shakha, C.pola, C.gold], ws = [4.2, 4.2, 2.6];
  return <g fill="none" strokeLinecap="round">{b.pts.map((p, i) => <line key={i} stroke={cols[i]} strokeWidth={ws[i]} x1={n1(p[0] - 8)} y1={n1(p[1])} x2={n1(p[0] + 8)} y2={n1(p[1])} transform={`rotate(${n1(b.ang)} ${n1(p[0])} ${n1(p[1])})`} />)}</g>;
}

export function Bou({x = 50, y = 60, scale = 1, flip = false, mood = 'calm', talking = false, appearAt = 0, showTag = true, tagColor, look, seed = 'bou'}) {
  const f = useCurrentFrame();
  const m = MOODS.includes(mood) ? mood : 'calm';
  const br = useBreath(seed, 3.2);
  const pose = poseFor(m, f, talkingNow(talking, f)), lk = look || LOOK[m], bd = bendsFor(m);
  const dk = shade(C.skin, -0.2), dk2 = shade(C.skin, -0.1);
  const g = pulluPts(Math.sin(f * 0.05 + 2) * 3), P = (t, u) => g.at(t, u).map(n1).join(' ');
  const pale = {calm: 0, worried: 0.05, scared: 0.14, shock: 0.24}[m];
  const sweat = m === 'scared' || m === 'shock', st = (f * 0.35) % 28;
  const body = `translate(${n1(shiverAt(f, m))} ${n1(br.dy)}) rotate(${br.sway.toFixed(2)} 200 430)`;
  const links = [0, 1, 2, 3, 4, 5, 6].map((k) => braidPts(f, k)), tail = links[6];
  return (
    <CharFrame x={x} y={y} scale={scale} flip={flip} appearAt={appearAt} tag={showTag ? {text: META.bn, color: tagColor || META.tagColor} : null}>
      <Shadow cx={200} cy={690} rx={100} ry={13} />
      <g transform="translate(200 690) scale(0.94) translate(-200 -690)">
        <defs><clipPath id="bou-saree"><path d="M152 360 L248 360 L270 652 Q200 664 130 652 Z" /></clipPath></defs>
        {/* ankles + bare feet with a thin anklet */}
        <rect x="174" y="640" width="17" height="40" rx="8" fill={dk2} /><rect x="209" y="640" width="17" height="40" rx="8" fill={dk2} />
        <path d="M174 656 L191 656 M209 656 L226 656" stroke={C.gold} strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="178" cy="684" rx="20" ry="8" fill={C.skin} /><ellipse cx="222" cy="684" rx="20" ry="8" fill={C.skin} />
        {/* saree skirt: pleats, border band, folds */}
        <path d="M152 360 L248 360 L270 652 Q200 664 130 652 Z" fill={C.saree} />
        <g clipPath="url(#bou-saree)" fill="none" stroke={C.sareeDark} strokeWidth="3" opacity="0.6">
          {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${184 + i * 7} 366 Q${176 + i * 9} 520 ${164 + i * 14} 660`} />)}
          <path d="M158 380 Q148 520 136 650 M242 380 Q254 520 266 650" />
        </g>
        <path d="M133 622 Q200 634 267 622 L270 652 Q200 664 130 652 Z" fill={C.sareeDark} />
        <path d="M132 632 Q200 644 268 632 L269 641 Q200 653 131 641 Z" fill={C.border} />
        <path d="M152 358 Q200 368 248 358 L248 372 Q200 382 152 372 Z" fill={C.sareeDark} />

        <g transform={body}>
          {/* veil (ghomta) behind the head: drapes down to both shoulders */}
          <path d="M150 140 Q146 96 200 84 Q254 96 250 140 Q262 190 268 262 L232 250 L168 250 L132 262 Q138 190 150 140 Z" fill={C.saree} />
          <path d="M180 214 L178 262 Q200 276 222 262 L220 214 Z" fill={dk2} />
          <rect x="166" y="336" width="68" height="30" fill={C.skin} />
          {/* blouse (teal, short puffed sleeves are drawn by the arms) */}
          <path d="M152 268 Q172 252 186 256 Q200 282 214 256 Q228 252 248 268 L244 342 Q200 352 156 342 Z" fill={C.blouse} />
          <path d="M186 256 Q200 282 214 256" fill="none" stroke={shade(C.blouse, -0.3)} strokeWidth="3" />
          <path d="M176 262 Q200 286 224 262 L224 256 L176 256 Z" fill={C.skin} />
          {/* pallu: over the viewer's-left shoulder, hanging in front, gold border */}
          <path d="M186 256 Q162 250 142 270" fill="none" stroke={C.saree} strokeWidth="26" strokeLinecap="round" />
          <path d={`M${P(0, 0)} L${P(0, 1)} L${P(1, 1)} L${P(1, 0)} Z`} fill={C.saree} />
          <path d={`M${P(0, 0)} L${P(1, 0)} M${P(0, 1)} L${P(1, 1)}`} stroke={C.border} strokeWidth="3" fill="none" />
          <path d={`M${P(0.9, 0)} L${P(0.9, 1)} M${P(0.95, 0)} L${P(0.95, 1)}`} stroke={C.border} strokeWidth="3" fill="none" />
          <path d={`M${P(0.3, 0.2)} L${P(0.7, 0.4)} M${P(0.45, 0.7)} L${P(0.8, 0.5)}`} stroke={C.sareeDark} strokeWidth="3" strokeLinecap="round" opacity="0.6" fill="none" />
          {/* braid over the right shoulder + red ribbon */}
          {links.map((p, k) => <ellipse key={k} cx={n1(p.x)} cy={n1(p.y)} rx={n1(p.rx)} ry={n1(p.ry)} fill={C.hair} stroke="#2a2420" strokeWidth="1.6" />)}
          <path d={`M${n1(tail.x - 9)} ${n1(tail.y + 10)} L${n1(tail.x + 9)} ${n1(tail.y + 10)} L${n1(tail.x + 7)} ${n1(tail.y + 24)} L${n1(tail.x - 7)} ${n1(tail.y + 24)} Z`} fill={C.ribbon} />
          <rect x={n1(tail.x - 9)} y={n1(tail.y + 6)} width="18" height="6" rx="2" fill={C.ribbon} />

          {/* head: ears with gold hoops, face, hair, expression */}
          <ellipse cx="156" cy="160" rx="8" ry="14" fill={dk2} /><ellipse cx="244" cy="160" rx="8" ry="14" fill={dk2} />
          <circle cx="155" cy="177" r="4.4" fill="none" stroke={C.gold} strokeWidth="2" /><circle cx="245" cy="177" r="4.4" fill="none" stroke={C.gold} strokeWidth="2" />
          <path d={FACE} fill={C.skin} />
          <path d="M154 146 Q150 102 200 94 Q250 102 246 146 Q240 118 214 110 Q200 118 186 110 Q160 118 154 146 Z" fill={C.hair} />
          <path d="M200 98 Q199 108 200 118 M172 110 Q164 122 160 140 M228 110 Q236 122 240 140" fill="none" stroke="#3a322d" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <g fill="none" stroke={dk} strokeWidth="2" strokeLinecap="round" opacity="0.4">
            <path d="M182 176 Q176 188 178 200 M218 176 Q224 188 222 200" />
          </g>
          <ellipse cx="174" cy="184" rx="12" ry="9" fill="#d65a68" opacity="0.26" /><ellipse cx="226" cy="184" rx="12" ry="9" fill="#d65a68" opacity="0.26" />
          <Eyes cx={200} cy={150} gap={50} size={10} mood={m} look={lk} seed={seed} />
          <Brows cx={200} cy={132} gap={50} w={16} mood={m} color="#1c1512" thick={4.4} />
          <path d="M197 152 Q193 170 193 178 Q200 184 207 178 Q207 170 203 152" fill={dk} opacity="0.3" stroke={dk} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="193.4" cy="178.6" r="2.2" fill={C.gold} />
          <Mouth cx={200} cy={205} w={26} mood={m} talking={talking} seed={seed} />
          {/* veil front edge over the crown (the parting below stays visible) + sindoor + bindi */}
          <path d="M150 146 Q150 98 200 90 Q250 98 250 146" fill="none" stroke={C.saree} strokeWidth="14" strokeLinecap="round" />
          <path d="M143 146 Q143 92 200 83 Q257 92 257 146" fill="none" stroke={C.border} strokeWidth="2.6" opacity="0.9" />
          <path d="M200 104 Q199.5 110 200 117" fill="none" stroke={C.sindoor} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="200" cy="130" r="4.6" fill={C.bindi} /><circle cx="198.7" cy="128.7" r="1.2" fill="#ff8a80" opacity="0.6" />
          {pale > 0 && <path d={FACE} fill="#efe6d0" opacity={pale} />}
          {sweat && <path d="M236 112 q-6 10 0 15 q6 -5 0 -15 z" fill="#9fd8ff" opacity={(0.85 * Math.sin((st / 28) * Math.PI)).toFixed(2)} transform={`translate(0 ${n1(st)})`} />}

          {/* arms: blouse sleeve on the upper arm, bare forearm with bangles; drawn last (raised hands pass in front of the face) */}
          <Arm sx={152} sy={268} hx={pose.l[0]} hy={pose.l[1]} bend={bd.l} thick={17} skin={C.skin} sleeve={C.blouse} handR={12} />
          <Arm sx={248} sy={268} hx={pose.r[0]} hy={pose.r[1]} bend={bd.r} thick={17} skin={C.skin} sleeve={C.blouse} handR={12} />
          <Bangles sx={152} sy={268} hx={pose.l[0]} hy={pose.l[1]} bend={bd.l} />
          <Bangles sx={248} sy={268} hx={pose.r[0]} hy={pose.r[1]} bend={bd.r} />
        </g>
      </g>
    </CharFrame>
  );
}

export default Bou;
