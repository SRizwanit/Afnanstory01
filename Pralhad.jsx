// Pralhad.jsx (Step 21) — প্রহ্লাদ বিশ্বাস: father of the family, ~60, thin, grey stubble + moustache, vest (genji) + checked lungi,
//           gamchha on the left shoulder, tired kind eyes, worn face. Drawn 100 % in SVG inside the shared rig (viewBox 0 0 400 700).
// Exports : default + named `Pralhad` component, `META`, pure helpers (testable in Node):
//           talkingNow(talking, f), poseFor(mood, f, talk), shiverAt(f, mood), bendFor(mood), stubbleDots(), gamchhaPts(swing), LOOK, FACE
// Props   : { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[startFrame,endFrame],
//             appearAt=0, showTag=true, tagColor, look=[lx,ly] }   (look = optional extra: pupil direction -1..1, default per mood)
//           x / y = % of the CONTENT zone (feet baseline) — positioning/size/pop-in/tag are done by <CharFrame> from CharacterRig.jsx.
// Rules   : head top y = 86 (>= 70, tag strip y 0..60 stays free) · feet baseline y = 690 · deterministic (random('seed') + frame only,
//           no Math.random, no CSS animation, no filters) · Bengali tag = one <text> (via NameTag).
// Moods   : calm (hands hanging, slow breathing; talking raises the right hand) · worried (lowered gaze, hands wringing at the belly)
//           scared (shivering, hands at the chest, sweat drop, paler face) · shock (frozen, hands at the cheeks, huge eyes, very pale).
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {COLORS} from './theme.js';
import {Arm, Brows, CharFrame, Eyes, MOODS, Mouth, SKIN, Shadow, shade, useBreath} from './CharacterRig.jsx';

export const META = {id: 'pralhad', bn: 'প্রহ্লাদ বিশ্বাস', age: 60, role: 'father', tagColor: COLORS.amber};

const n1 = (v) => (Math.round(v * 10) / 10).toString();
const C = {
  skin: SKIN.elder, hair: '#a9a79f', brow: '#8f8c86', vest: '#d7cdb6', vestDark: '#b8ad92', lungi: '#46556b', lungiLine: '#6c7d96', lungiDark: '#2c3749',
  red: '#a52a22', redDark: '#6e1914', cloth: '#eee1c4', stache: '#b4b2aa',
};
export const FACE = 'M148 140 Q146 92 200 86 Q254 92 252 140 Q252 178 232 204 Q216 222 200 222 Q184 222 168 204 Q148 178 148 140 Z';
export const LOOK = {calm: [0.15, 0.1], worried: [-0.2, 0.7], scared: [0, -0.2], shock: [0, 0]};

export function talkingNow(talking, f) {
  return Array.isArray(talking) ? f >= talking[0] && f < talking[1] : !!talking;
}

// hand targets (viewBox units, shoulders at (146,252) / (254,252)); l = viewer's left hand, r = right hand
const POSE = {calm: {l: [126, 426], r: [274, 426]}, worried: {l: [184, 366], r: [216, 366]}, scared: {l: [150, 318], r: [250, 318]}, shock: {l: [152, 196], r: [248, 196]}};
export function poseFor(mood, f, talk) {
  const m = MOODS.includes(mood) ? mood : 'calm', b = POSE[m];
  let l = [b.l[0], b.l[1]], r = [b.r[0], b.r[1]];
  const w = Math.sin(f * 0.21), w2 = Math.cos(f * 0.17);
  if (m === 'worried') { l = [l[0] + w * 5, l[1] + w2 * 3]; r = [r[0] - w * 5, r[1] + w2 * 3]; }
  if (m === 'scared') { l = [l[0] + Math.sin(f * 1.9) * 2.5, l[1] + Math.cos(f * 2.3) * 2.5]; r = [r[0] + Math.sin(f * 2.1) * 2.5, r[1] + Math.cos(f * 1.7) * 2.5]; }
  if (talk) {
    if (m === 'calm') r = [262 + Math.sin(f * 0.3) * 10, 372 + Math.cos(f * 0.23) * 8];
    else r = [r[0] + Math.sin(f * 0.3) * 6, r[1] + Math.cos(f * 0.23) * 5];
  }
  return {l, r};
}

// elbow side: hands hanging/low -> elbows out with +1 (left arm); hands raised ABOVE the shoulder (shock) need the opposite sign
export const bendFor = (mood) => (mood === 'shock' ? -1 : 1);

// whole-upper-body shiver (x offset in viewBox units)
export function shiverAt(f, mood) {
  const amp = {calm: 0, worried: 0.4, scared: 1.6, shock: 0}[MOODS.includes(mood) ? mood : 'calm'];
  return Math.sin(f * 1.9) * amp;
}

// ~36 grey stubble dots on chin + jaw (deterministic, computed once)
let DOTS = null;
export function stubbleDots() {
  if (DOTS) return DOTS;
  DOTS = [];
  for (let i = 0; i < 90 && DOTS.length < 36; i++) {
    const x = 156 + random(`pr-st-x-${i}`) * 88, y = 176 + random(`pr-st-y-${i}`) * 46;
    if (((x - 200) / 48) ** 2 + ((y - 190) / 34) ** 2 < 1 && !(y < 192 && Math.abs(x - 200) < 38)) DOTS.push({x, y, r: 0.9 + random(`pr-st-r-${i}`) * 0.8});
  }
  return DOTS;
}

// gamchha front tail: corners A(top-left) B(top-right) C(bottom-right) D(bottom-left); `swing` moves the bottom (viewBox units)
export function gamchhaPts(swing = 0) {
  const A = [134, 246], B = [166, 238], C = [186 + swing, 394], D = [152 + swing, 402];
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const at = (t, u) => lerp(lerp(A, D, t), lerp(B, C, t), u);
  return {A, B, C, D, at};
}

export function Pralhad({x = 50, y = 60, scale = 1, flip = false, mood = 'calm', talking = false, appearAt = 0, showTag = true, tagColor, look}) {
  const f = useCurrentFrame();
  const m = MOODS.includes(mood) ? mood : 'calm';
  const br = useBreath('pralhad', m === 'shock' ? 1.5 : 4);
  const pose = poseFor(m, f, talkingNow(talking, f)), lk = look || LOOK[m];
  const dk = shade(C.skin, -0.22), dk2 = shade(C.skin, -0.12);
  const g = gamchhaPts(Math.sin(f * 0.06) * 3), P = (t, u) => g.at(t, u).map(n1).join(' ');
  const pale = {calm: 0, worried: 0.05, scared: 0.14, shock: 0.24}[m];
  const sweat = m === 'scared' || m === 'shock', st = (f * 0.35) % 28;
  const body = `translate(${n1(shiverAt(f, m))} ${n1(br.dy)}) rotate(${br.sway.toFixed(2)} 200 420)`;
  return (
    <CharFrame x={x} y={y} scale={scale} flip={flip} appearAt={appearAt} tag={showTag ? {text: META.bn, color: tagColor || META.tagColor} : null}>
      <defs>
        <clipPath id="pralhad-lungi"><path d="M152 404 L248 404 L268 646 Q200 658 132 646 Z" /></clipPath>
      </defs>
      <Shadow cx={200} cy={690} rx={108} ry={13} />
      {/* legs + feet (bare) */}
      <g fill={dk2}>
        <rect x="172" y="636" width="20" height="44" rx="9" /><rect x="208" y="636" width="20" height="44" rx="9" />
        <ellipse cx="176" cy="684" rx="23" ry="8" fill={C.skin} /><ellipse cx="224" cy="684" rx="23" ry="8" fill={C.skin} />
      </g>
      {/* lungi: checks clipped to the cloth, folds, hem, waist knot */}
      <path d="M152 404 L248 404 L268 646 Q200 658 132 646 Z" fill={C.lungi} />
      <g clipPath="url(#pralhad-lungi)" stroke={C.lungiLine} strokeWidth="2.5" opacity="0.7">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={`v${i}`} x1={120 + i * 22} y1="400" x2={112 + i * 26} y2="660" />)}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => <line key={`h${i}`} x1="120" y1={420 + i * 24} x2="290" y2={420 + i * 24} stroke={i % 3 === 0 ? C.lungiDark : C.lungiLine} />)}
      </g>
      <path d="M200 408 Q192 520 178 650 M226 408 Q232 520 244 650 M176 420 Q170 500 160 560" fill="none" stroke={C.lungiDark} strokeWidth="3" opacity="0.55" />
      <path d="M133 628 Q200 640 267 628 L268 646 Q200 658 132 646 Z" fill={C.lungiDark} opacity="0.8" />
      <rect x="150" y="402" width="100" height="12" rx="5" fill={C.lungiDark} />
      <ellipse cx="204" cy="410" rx="17" ry="11" fill={shade(C.lungi, -0.3)} stroke={C.lungiDark} strokeWidth="2" />

      {/* upper body (moves with breathing / shiver) */}
      <g transform={body}>
        <path d="M178 205 L176 254 Q200 270 224 254 L222 205 Z" fill={dk2} />
        <path d="M188 232 L192 256 M212 232 L208 256" stroke={dk} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <path d="M176 236 L200 298 L224 236 Z" fill={C.skin} />
        <path d="M178 248 Q190 254 199 252 M222 248 Q210 254 201 252 M186 272 Q200 278 214 272 M190 286 Q200 291 210 286" fill="none" stroke={dk} strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
        <g transform={`translate(200 420) scale(1 ${br.chest.toFixed(4)}) translate(-200 -420)`}>
          <path d="M148 246 Q168 232 184 236 L200 292 L216 236 Q232 232 252 246 L250 412 Q200 424 150 412 Z" fill={C.vest} />
          <path d="M150 400 Q200 412 250 400 L250 412 Q200 424 150 412 Z" fill={C.vestDark} />
          <path d="M166 300 Q178 322 170 352 M232 310 Q222 336 230 366 M196 330 Q190 360 200 392" fill="none" stroke={C.vestDark} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <ellipse cx="226" cy="352" rx="14" ry="10" fill={C.vestDark} opacity="0.45" />
          <path d="M170 380 l9 -5 l4 8 l-8 4 z" fill={C.lungiDark} opacity="0.35" />
        </g>
        {/* gamchha: over the left shoulder + hanging tail */}
        <path d="M190 232 Q164 224 138 248" fill="none" stroke={C.red} strokeWidth="25" strokeLinecap="round" />
        <path d="M188 226 Q164 218 140 240" fill="none" stroke={C.cloth} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <path d={`M${P(0, 0)} L${P(0, 1)} L${P(1, 1)} L${P(1, 0)} Z`} fill={C.red} />
        <g stroke={C.cloth} strokeWidth="3" fill="none" opacity="0.9">
          <path d={`M${P(0.04, 0.2)} L${P(0.96, 0.2)} M${P(0.04, 0.8)} L${P(0.96, 0.8)}`} />
          <path d={`M${P(0.84, 0)} L${P(0.84, 1)} M${P(0.92, 0)} L${P(0.92, 1)}`} />
        </g>
        <path d={`M${P(1, 0)} L${P(1, 1)}`} stroke={C.redDark} strokeWidth="3" />
        <path d={[0.1, 0.3, 0.5, 0.7, 0.9].map((u) => `M${P(1, u)} l${n1((u - 0.5) * 4)} 9`).join(' ')} stroke={C.red} strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* head */}
        <ellipse cx="146" cy="152" rx="9" ry="16" fill={dk2} /><ellipse cx="254" cy="152" rx="9" ry="16" fill={dk2} />
        <path d={FACE} fill={C.skin} />
        <path d="M149 134 Q146 108 166 98 L160 112 Q156 124 158 144 Z M251 134 Q254 108 234 98 L240 112 Q244 124 242 144 Z" fill={C.hair} />
        <path d="M160 100 Q200 84 240 100" fill="none" stroke={C.hair} strokeWidth="2" opacity="0.5" />
        <ellipse cx="170" cy="172" rx="14" ry="22" fill={dk} opacity="0.25" /><ellipse cx="230" cy="172" rx="14" ry="22" fill={dk} opacity="0.25" />
        <g fill="none" stroke={dk} strokeWidth="2.2" strokeLinecap="round" opacity="0.6">
          <path d="M166 101 Q200 94 234 101 M170 108 Q200 102 230 108" />
          {m !== 'calm' && <path d="M176 95 Q200 90 224 95" />}
          <path d="M148 144 l-9 -3 M148 150 l-9 2 M252 144 l9 -3 M252 150 l9 2" />
          <path d="M181 168 Q172 182 175 198 M219 168 Q228 182 225 198" />
        </g>
        <g fill="none" stroke={dk} strokeWidth="2.4" strokeLinecap="round" opacity="0.55">
          <path d="M163 152 Q172 159 181 152 M219 152 Q228 159 237 152" />
        </g>
        <Eyes cx={200} cy={140} gap={56} size={9} mood={m} look={lk} seed="pralhad" />
        <Brows cx={200} cy={122} gap={56} w={17} mood={m} color={C.brow} thick={5.5} />
        <path d="M196 138 Q191 160 189 172 Q200 181 211 172 Q209 160 204 138" fill={dk} opacity="0.35" stroke={dk} strokeWidth="2" strokeLinejoin="round" />
        <path d="M200 226 Q158 206 152 168 Q164 198 200 204 Q236 198 248 168 Q242 206 200 226 Z" fill="#8d8b86" opacity="0.3" />
        {stubbleDots().map((d, i) => <circle key={i} cx={n1(d.x)} cy={n1(d.y)} r={n1(d.r)} fill="#8d8b86" opacity="0.55" />)}
        <Mouth cx={200} cy={199} w={32} mood={m} talking={talking} seed="pralhad" />
        <path d="M165 185 Q182 171 200 179 Q218 171 235 185 Q222 193 200 187 Q178 193 165 185 Z" fill={C.stache} stroke="#8d8b86" strokeWidth="1.5" strokeLinejoin="round" />
        {pale > 0 && <path d={FACE} fill="#efe6d0" opacity={pale} />}
        {sweat && <path d="M238 100 q-6 10 0 15 q6 -5 0 -15 z" fill="#9fd8ff" opacity={(0.85 * Math.sin((st / 28) * Math.PI)).toFixed(2)} transform={`translate(0 ${n1(st)})`} />}

        {/* arms (bare, thin) drawn last so raised hands pass in front of the face */}
        <Arm sx={146} sy={252} hx={pose.l[0]} hy={pose.l[1]} bend={bendFor(m)} thick={19} skin={C.skin} sleeve={C.skin} handR={13} />
        <Arm sx={254} sy={252} hx={pose.r[0]} hy={pose.r[1]} bend={-bendFor(m)} thick={19} skin={C.skin} sleeve={C.skin} handR={13} />
      </g>
    </CharFrame>
  );
}

export default Pralhad;
