// Wife.jsx (Step 22) — প্রহ্লাদের স্ত্রী: mother of the family, ~55, simple muted-green saree with a pallu over the right shoulder,
//           brick-red short-sleeved blouse, sindoor + bindi, grey-streaked hair in a bun, small gold bangles, gentle worried face. SVG in the shared rig.
//           Married-woman marks (user request, Step 22b): red sindoor along the hair parting + a round red bindi on the forehead.
//           (Her name is unknown → TODO(user); the tag shows the generic label "প্রহ্লাদের স্ত্রী".)
// Exports : default + named `Wife` component, `META`, pure helpers (testable in Node):
//           talkingNow(talking, f), poseFor(mood, f, talk), bendFor(mood), shiverAt(f, mood), pulluPts(swing), banglePts(k), LOOK, FACE
// Props   : { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[startFrame,endFrame],
//             appearAt=0, showTag=true, tagColor, look=[lx,ly] }   (same contract as Pralhad; x / y = % of the CONTENT zone, feet baseline)
// Rules   : head top y >= 70 (bun top y = 73 before the 0.95 body scale, the tag strip y 0..60 stays free) · feet baseline y = 690 ·
//           whole body drawn at 0.95 scale about the feet (a little shorter than Pralhad) · deterministic · no filters / Math.random.
// Moods   : calm (hands hanging; talking raises the right hand) · worried (lowered gaze, hands wringing at the belly) ·
//           scared (shivering, hands at the chest, sweat drop, pale) · shock (hands at the jaw, huge eyes, very pale).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from './theme.js';
import {Arm, Brows, CharFrame, Eyes, MOODS, Mouth, SKIN, Shadow, ikElbow, shade, useBreath} from './CharacterRig.jsx';

export const META = {id: 'wife', bn: 'প্রহ্লাদের স্ত্রী', age: 55, role: 'mother', tagColor: COLORS.ghost};

const n1 = (v) => (Math.round(v * 10) / 10).toString();
const C = {
  sindoor: '#d42a1e', bindi: '#b8141c', skin: SKIN.woman, hair: '#2b2622', grey: '#8d8a84', blouse: '#8a4f40', saree: '#587064', sareeDark: '#3d4f45', border: '#d3b665', gold: '#d9b44a',
};
export const FACE = 'M152 152 Q150 106 200 100 Q250 106 248 152 Q248 186 230 210 Q216 226 200 226 Q184 226 170 210 Q152 186 152 152 Z';
export const LOOK = {calm: [0.1, 0.1], worried: [-0.15, 0.7], scared: [0, -0.2], shock: [0, 0]};

export function talkingNow(talking, f) {
  return Array.isArray(talking) ? f >= talking[0] && f < talking[1] : !!talking;
}

// hand targets (viewBox units); shoulders at (152,268) / (248,268); l = viewer's left hand
const POSE = {calm: {l: [136, 440], r: [264, 440]}, worried: {l: [188, 386], r: [212, 386]}, scared: {l: [160, 336], r: [240, 336]}, shock: {l: [168, 222], r: [232, 222]}};
export function poseFor(mood, f, talk) {
  const m = MOODS.includes(mood) ? mood : 'calm', b = POSE[m];
  let l = [b.l[0], b.l[1]], r = [b.r[0], b.r[1]];
  const w = Math.sin(f * 0.2), w2 = Math.cos(f * 0.16);
  if (m === 'worried') { l = [l[0] + w * 5, l[1] + w2 * 3]; r = [r[0] - w * 5, r[1] + w2 * 3]; }
  if (m === 'scared') { l = [l[0] + Math.sin(f * 1.9) * 2.5, l[1] + Math.cos(f * 2.3) * 2.5]; r = [r[0] + Math.sin(f * 2.1) * 2.5, r[1] + Math.cos(f * 1.7) * 2.5]; }
  if (talk) {
    if (m === 'calm') r = [256 + Math.sin(f * 0.3) * 9, 384 + Math.cos(f * 0.23) * 7];
    else r = [r[0] + Math.sin(f * 0.3) * 5, r[1] + Math.cos(f * 0.23) * 4];
  }
  return {l, r};
}

// elbow side: hands raised above the shoulder (shock) need the opposite sign (see Pralhad.jsx)
export const bendFor = (mood) => (mood === 'shock' ? -1 : 1);

export function shiverAt(f, mood) {
  const amp = {calm: 0, worried: 0.4, scared: 1.5, shock: 0}[MOODS.includes(mood) ? mood : 'calm'];
  return Math.sin(f * 1.9) * amp;
}

// pallu panel hanging from the right shoulder: A,B top, C,D bottom; `swing` moves the bottom
export function pulluPts(swing = 0) {
  const A = [214, 256], B = [260, 268], C = [256 + swing, 436], D = [206 + swing, 446];
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  return {A, B, C, D, at: (t, u) => lerp(lerp(A, D, t), lerp(B, C, t), u)};
}

// 3 thin bangles on the forearm near the wrist: centre points + angle (deg) for the arm drawn with the same IK as <Arm>
export function banglePts(k) {
  const dx = k.hx - k.ex, dy = k.hy - k.ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  return {ang: (Math.atan2(dy, dx) * 180) / Math.PI + 90, pts: [20, 26, 32].map((o) => [k.hx - ux * o, k.hy - uy * o])};
}

function Bangles({sx, sy, hx, hy, bend}) {
  const b = banglePts(ikElbow(sx, sy, hx, hy, 95, 90, bend));
  return <g fill="none" stroke={C.gold} strokeWidth="2.8" strokeLinecap="round">{b.pts.map((p, i) => <line key={i} x1={n1(p[0] - 8)} y1={n1(p[1])} x2={n1(p[0] + 8)} y2={n1(p[1])} transform={`rotate(${n1(b.ang)} ${n1(p[0])} ${n1(p[1])})`} />)}</g>;
}

export function Wife({x = 50, y = 60, scale = 1, flip = false, mood = 'calm', talking = false, appearAt = 0, showTag = true, tagColor, look}) {
  const f = useCurrentFrame();
  const m = MOODS.includes(mood) ? mood : 'calm';
  const br = useBreath('wife', 3.5);
  const pose = poseFor(m, f, talkingNow(talking, f)), lk = look || LOOK[m], bd = bendFor(m);
  const dk = shade(C.skin, -0.2), dk2 = shade(C.skin, -0.1);
  const g = pulluPts(Math.sin(f * 0.05 + 1) * 3), P = (t, u) => g.at(t, u).map(n1).join(' ');
  const pale = {calm: 0, worried: 0.05, scared: 0.14, shock: 0.24}[m];
  const sweat = m === 'scared' || m === 'shock', st = (f * 0.35) % 28;
  const body = `translate(${n1(shiverAt(f, m))} ${n1(br.dy)}) rotate(${br.sway.toFixed(2)} 200 430)`;
  return (
    <CharFrame x={x} y={y} scale={scale} flip={flip} appearAt={appearAt} tag={showTag ? {text: META.bn, color: tagColor || META.tagColor} : null}>
      <Shadow cx={200} cy={690} rx={104} ry={13} />
      <g transform="translate(200 690) scale(0.95) translate(-200 -690)">
        <defs><clipPath id="wife-saree"><path d="M150 360 L250 360 L272 652 Q200 664 128 652 Z" /></clipPath></defs>
        {/* ankles + bare feet */}
        <rect x="172" y="640" width="18" height="40" rx="8" fill={dk2} /><rect x="210" y="640" width="18" height="40" rx="8" fill={dk2} />
        <ellipse cx="177" cy="684" rx="21" ry="8" fill={C.skin} /><ellipse cx="223" cy="684" rx="21" ry="8" fill={C.skin} />
        {/* saree skirt: pleats, border band, folds */}
        <path d="M150 360 L250 360 L272 652 Q200 664 128 652 Z" fill={C.saree} />
        <g clipPath="url(#wife-saree)" fill="none" stroke={C.sareeDark} strokeWidth="3" opacity="0.6">
          {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${184 + i * 7} 366 Q${176 + i * 9} 520 ${164 + i * 14} 660`} />)}
          <path d="M156 380 Q146 520 134 650 M244 380 Q256 520 268 650" />
        </g>
        <path d="M131 622 Q200 634 269 622 L272 652 Q200 664 128 652 Z" fill={C.sareeDark} />
        <path d="M130 632 Q200 644 270 632 L271 640 Q200 652 129 640 Z" fill={C.border} />
        <path d="M150 358 Q200 368 250 358 L250 372 Q200 382 150 372 Z" fill={C.sareeDark} />

        <g transform={body}>
          <path d="M180 214 L178 262 Q200 276 222 262 L220 214 Z" fill={dk2} />
          <rect x="164" y="336" width="72" height="32" fill={C.skin} />
          {/* blouse */}
          <path d="M150 268 Q172 252 186 256 Q200 282 214 256 Q228 252 250 268 L246 342 Q200 352 154 342 Z" fill={C.blouse} />
          <path d="M186 256 Q200 282 214 256" fill="none" stroke={shade(C.blouse, -0.3)} strokeWidth="3" />
          <path d="M176 262 Q200 286 224 262 L224 256 L176 256 Z" fill={C.skin} />
          {/* pallu: over the right shoulder, hanging in front, gold border */}
          <path d="M214 256 Q238 250 258 270" fill="none" stroke={C.saree} strokeWidth="26" strokeLinecap="round" />
          <path d={`M${P(0, 0)} L${P(0, 1)} L${P(1, 1)} L${P(1, 0)} Z`} fill={C.saree} />
          <path d={`M${P(0, 0)} L${P(1, 0)} M${P(0, 1)} L${P(1, 1)}`} stroke={C.border} strokeWidth="3" fill="none" />
          <path d={`M${P(0.9, 0)} L${P(0.9, 1)} M${P(0.95, 0)} L${P(0.95, 1)}`} stroke={C.border} strokeWidth="3" fill="none" />
          <path d={`M${P(0.3, 0.2)} L${P(0.7, 0.4)} M${P(0.45, 0.7)} L${P(0.8, 0.5)}`} stroke={C.sareeDark} strokeWidth="3" strokeLinecap="round" opacity="0.6" fill="none" />

          {/* head: bun, ears, face, hair, expression */}
          <circle cx="200" cy="92" r="19" fill={C.hair} /><path d="M186 90 Q200 82 214 90" fill="none" stroke={C.grey} strokeWidth="2.5" opacity="0.7" />
          <ellipse cx="152" cy="160" rx="8" ry="14" fill={dk2} /><ellipse cx="248" cy="160" rx="8" ry="14" fill={dk2} />
          <circle cx="152" cy="173" r="3.5" fill={C.gold} /><circle cx="248" cy="173" r="3.5" fill={C.gold} />
          <path d={FACE} fill={C.skin} />
          <path d="M150 146 Q146 100 200 92 Q254 100 250 146 Q244 118 214 110 Q200 120 186 110 Q156 118 150 146 Z" fill={C.hair} />
          <path d="M200 96 Q199 108 200 119 M168 108 Q160 120 156 138 M232 108 Q240 120 244 138" fill="none" stroke={C.grey} strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
          <g fill="none" stroke={dk} strokeWidth="2" strokeLinecap="round" opacity="0.5">
            <path d="M170 122 Q200 116 230 122" />{m !== 'calm' && <path d="M178 116 Q200 111 222 116" />}
            <path d="M156 152 l-7 -2 M156 158 l-7 2 M244 152 l7 -2 M244 158 l7 2" />
            <path d="M182 176 Q175 188 177 202 M218 176 Q225 188 223 202" />
            <path d="M166 160 Q175 166 184 160 M216 160 Q225 166 234 160" />
          </g>
          <ellipse cx="172" cy="184" rx="12" ry="9" fill="#c9625a" opacity="0.18" /><ellipse cx="228" cy="184" rx="12" ry="9" fill="#c9625a" opacity="0.18" />
          <Eyes cx={200} cy={150} gap={52} size={9} mood={m} look={lk} seed="wife" />
          <Brows cx={200} cy={133} gap={52} w={16} mood={m} color="#3a2e28" thick={4} />
          <path d="M197 152 Q193 170 193 178 Q200 184 207 178 Q207 170 203 152" fill={dk} opacity="0.3" stroke={dk} strokeWidth="1.8" strokeLinejoin="round" />
          <Mouth cx={200} cy={205} w={28} mood={m} talking={talking} seed="wife" />
          {/* sindoor along the parting (hair-line to centre of the forehead) + bindi */}
          <path d="M200 97 Q199.5 104 200 112" fill="none" stroke={C.sindoor} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="200" cy="130" r="4.6" fill={C.bindi} /><circle cx="198.7" cy="128.7" r="1.2" fill="#ff8a80" opacity="0.6" />
          {pale > 0 && <path d={FACE} fill="#efe6d0" opacity={pale} />}
          {sweat && <path d="M236 112 q-6 10 0 15 q6 -5 0 -15 z" fill="#9fd8ff" opacity={(0.85 * Math.sin((st / 28) * Math.PI)).toFixed(2)} transform={`translate(0 ${n1(st)})`} />}

          {/* arms: blouse sleeve on the upper arm, bare forearm with bangles; drawn last (raised hands pass in front of the face) */}
          <Arm sx={152} sy={268} hx={pose.l[0]} hy={pose.l[1]} bend={bd} thick={17} skin={C.skin} sleeve={C.blouse} handR={12} />
          <Arm sx={248} sy={268} hx={pose.r[0]} hy={pose.r[1]} bend={-bd} thick={17} skin={C.skin} sleeve={C.blouse} handR={12} />
          <Bangles sx={152} sy={268} hx={pose.l[0]} hy={pose.l[1]} bend={bd} />
          <Bangles sx={248} sy={268} hx={pose.r[0]} hy={pose.r[1]} bend={-bd} />
        </g>
      </g>
    </CharFrame>
  );
}

export default Wife;
