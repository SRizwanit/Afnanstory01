// Provas.jsx (Step 23) — প্রভাস: eldest son, 35, broad build, strong square jaw, thick black moustache, short thick hair, faded blue-grey
//           collared shirt (sleeves rolled, forearms bare) + dark checked lungi. Confident / serious "eldest brother" posture.
// Exports : default + named `Provas` component, `META`, pure helpers (testable in Node):
//           talkingNow(talking, f), poseFor(mood, f, talk), bendFor(mood), shiverAt(f, mood), LOOK, FACE
// Props   : { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[startFrame,endFrame],
//             appearAt=0, showTag=true, tagColor, look=[lx,ly] }   (same contract as Pralhad / Wife; x / y = % of the CONTENT zone, feet baseline)
// Rules   : head top y = 88 (>= 70, tag strip y 0..60 stays free) · feet baseline y = 690 · deterministic · no filters / Math.random.
// Moods   : calm (upright, hands hanging, firm brows; talking raises the right hand) · worried (arms folded across the chest, gaze down) ·
//           scared (shivering, fists at the chest, sweat drop, pale) · shock (hands clutching the sides of the head, huge eyes, very pale).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from './theme.js';
import {Arm, Brows, CharFrame, Eyes, MOODS, Mouth, SKIN, Shadow, shade, useBreath} from './CharacterRig.jsx';

export const META = {id: 'provas', bn: 'প্রভাস', age: 35, role: 'eldest son', tagColor: COLORS.toxic};

const n1 = (v) => (Math.round(v * 10) / 10).toString();
const C = {skin: SKIN.adult, hair: '#1c1612', shirt: '#8e9da0', shirtDark: '#6c7a7e', lungi: '#4d3a30', lungiLine: '#7a5f4c', lungiDark: '#2e221b'};
export const FACE = 'M146 136 Q146 92 200 88 Q254 92 254 136 L252 178 Q248 206 228 218 Q214 226 200 226 Q186 226 172 218 Q152 206 148 178 Z';
export const LOOK = {calm: [0.1, 0], worried: [-0.2, 0.6], scared: [0, -0.2], shock: [0, 0]};

export function talkingNow(talking, f) {
  return Array.isArray(talking) ? f >= talking[0] && f < talking[1] : !!talking;
}

// hand targets (viewBox units); shoulders at (138,258) / (262,258); l = viewer's left hand
const POSE = {calm: {l: [122, 432], r: [278, 432]}, worried: {l: [214, 352], r: [186, 352]}, scared: {l: [152, 322], r: [248, 322]}, shock: {l: [160, 172], r: [240, 172]}};
export function poseFor(mood, f, talk) {
  const m = MOODS.includes(mood) ? mood : 'calm', b = POSE[m];
  let l = [b.l[0], b.l[1]], r = [b.r[0], b.r[1]];
  if (m === 'worried') { const w = Math.sin(f * 0.1) * 2; l = [l[0] + w, l[1]]; r = [r[0] - w, r[1]]; }
  if (m === 'scared') { l = [l[0] + Math.sin(f * 1.9) * 2.5, l[1] + Math.cos(f * 2.3) * 2.5]; r = [r[0] + Math.sin(f * 2.1) * 2.5, r[1] + Math.cos(f * 1.7) * 2.5]; }
  if (talk) {
    if (m === 'calm') r = [268 + Math.sin(f * 0.3) * 10, 376 + Math.cos(f * 0.23) * 8];
    else if (m !== 'worried') r = [r[0] + Math.sin(f * 0.3) * 5, r[1] + Math.cos(f * 0.23) * 4];
  }
  return {l, r};
}

// elbow side: hands raised above the shoulder (shock) need the opposite sign (see Pralhad.jsx)
export const bendFor = (mood) => (mood === 'shock' ? -1 : 1);

export function shiverAt(f, mood) {
  const amp = {calm: 0, worried: 0.3, scared: 1.6, shock: 0}[MOODS.includes(mood) ? mood : 'calm'];
  return Math.sin(f * 1.9) * amp;
}

export function Provas({x = 50, y = 60, scale = 1, flip = false, mood = 'calm', talking = false, appearAt = 0, showTag = true, tagColor, look}) {
  const f = useCurrentFrame();
  const m = MOODS.includes(mood) ? mood : 'calm';
  const br = useBreath('provas', m === 'shock' ? 1.5 : 3.5);
  const pose = poseFor(m, f, talkingNow(talking, f)), lk = look || LOOK[m], bd = bendFor(m);
  const dk = shade(C.skin, -0.22), dk2 = shade(C.skin, -0.12);
  const pale = {calm: 0, worried: 0.04, scared: 0.14, shock: 0.24}[m];
  const sweat = m === 'scared' || m === 'shock', st = (f * 0.35) % 28;
  const body = `translate(${n1(shiverAt(f, m))} ${n1(br.dy)}) rotate(${br.sway.toFixed(2)} 200 420)`;
  return (
    <CharFrame x={x} y={y} scale={scale} flip={flip} appearAt={appearAt} tag={showTag ? {text: META.bn, color: tagColor || META.tagColor} : null}>
      <defs><clipPath id="provas-lungi"><path d="M148 404 L252 404 L274 646 Q200 658 126 646 Z" /></clipPath></defs>
      <Shadow cx={200} cy={690} rx={116} ry={14} />
      <g fill={dk2}>
        <rect x="168" y="634" width="25" height="46" rx="11" /><rect x="207" y="634" width="25" height="46" rx="11" />
        <ellipse cx="174" cy="684" rx="25" ry="8" fill={C.skin} /><ellipse cx="226" cy="684" rx="25" ry="8" fill={C.skin} />
      </g>
      {/* lungi */}
      <path d="M148 404 L252 404 L274 646 Q200 658 126 646 Z" fill={C.lungi} />
      <g clipPath="url(#provas-lungi)" stroke={C.lungiLine} strokeWidth="2.5" opacity="0.65">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={`v${i}`} x1={116 + i * 23} y1="400" x2={106 + i * 27} y2="660" />)}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => <line key={`h${i}`} x1="110" y1={420 + i * 24} x2="295" y2={420 + i * 24} stroke={i % 3 === 0 ? C.lungiDark : C.lungiLine} />)}
      </g>
      <path d="M200 408 Q192 520 176 650 M228 408 Q234 520 248 650" fill="none" stroke={C.lungiDark} strokeWidth="3" opacity="0.55" />
      <path d="M128 628 Q200 640 272 628 L274 646 Q200 658 126 646 Z" fill={C.lungiDark} opacity="0.85" />
      <rect x="146" y="402" width="108" height="12" rx="5" fill={C.lungiDark} />

      <g transform={body}>
        {/* neck + shirt */}
        <path d="M172 204 L170 256 Q200 274 230 256 L228 204 Z" fill={dk2} />
        <path d="M136 262 Q160 244 182 248 L200 276 L218 248 Q240 244 264 262 L258 420 Q200 432 142 420 Z" fill={C.shirt} />
        <path d="M142 408 Q200 420 258 408 L258 420 Q200 432 142 420 Z" fill={C.shirtDark} />
        <path d="M200 276 L200 424" stroke={C.shirtDark} strokeWidth="3" />
        {[304, 336, 368, 398].map((yy) => <circle key={yy} cx="205" cy={yy} r="3.2" fill="#e6e0cc" />)}
        <path d="M222 306 h26 v30 h-26 z" fill="none" stroke={C.shirtDark} strokeWidth="3" strokeLinejoin="round" />
        <path d="M164 300 Q172 340 160 380 M244 350 Q238 380 246 404" fill="none" stroke={C.shirtDark} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M178 244 L200 284 L190 252 Z M222 244 L200 284 L210 252 Z" fill="#aab6b8" stroke={C.shirtDark} strokeWidth="2" strokeLinejoin="round" />
        <path d="M184 250 L200 276 L216 250 L216 244 L184 244 Z" fill={C.skin} opacity="0.9" />

        {/* head */}
        <ellipse cx="146" cy="150" rx="9" ry="16" fill={dk2} /><ellipse cx="254" cy="150" rx="9" ry="16" fill={dk2} />
        <path d={FACE} fill={C.skin} />
        <path d="M146 134 Q142 86 200 80 Q258 86 254 134 Q248 106 226 100 Q196 106 168 100 Q150 108 146 134 Z" fill={C.hair} />
        <path d="M170 98 Q196 90 226 98" fill="none" stroke="#3a2e26" strokeWidth="3" opacity="0.7" />
        <path d="M150 182 Q160 214 200 226 Q240 214 250 182 Q238 206 200 210 Q162 206 150 182 Z" fill="#1c1612" opacity="0.28" />
        <path d="M168 214 Q184 224 200 224 Q216 224 232 214 M150 168 Q152 192 164 208 M250 168 Q248 192 236 208" fill="none" stroke={dk} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
        <path d="M184 112 Q200 108 216 112" fill="none" stroke={dk} strokeWidth="2" opacity="0.35" />
        <path d="M177 166 Q170 180 174 196 M223 166 Q230 180 226 196" fill="none" stroke={dk} strokeWidth="2" opacity="0.4" />
        <Eyes cx={200} cy={140} gap={58} size={9.5} mood={m} look={lk} seed="provas" />
        <Brows cx={200} cy={121} gap={58} w={20} mood={m} color={C.hair} thick={7.5} />
        <path d="M196 138 Q190 160 188 172 Q200 182 212 172 Q210 160 204 138" fill={dk} opacity="0.35" stroke={dk} strokeWidth="2" strokeLinejoin="round" />
        <Mouth cx={200} cy={200} w={34} mood={m} talking={talking} seed="provas" />
        <path d="M160 188 Q180 170 200 178 Q220 170 240 188 Q224 197 200 189 Q176 197 160 188 Z" fill={C.hair} stroke="#0b0806" strokeWidth="1.5" strokeLinejoin="round" />
        {pale > 0 && <path d={FACE} fill="#efe6d0" opacity={pale} />}
        {sweat && <path d="M240 100 q-6 10 0 15 q6 -5 0 -15 z" fill="#9fd8ff" opacity={(0.85 * Math.sin((st / 28) * Math.PI)).toFixed(2)} transform={`translate(0 ${n1(st)})`} />}

        {/* arms: shirt sleeve on the upper arm, bare strong forearm; drawn last (raised hands pass in front of the face) */}
        <Arm sx={138} sy={258} hx={pose.l[0]} hy={pose.l[1]} bend={bd} thick={26} skin={C.skin} sleeve={C.shirt} handR={15} />
        <Arm sx={262} sy={258} hx={pose.r[0]} hy={pose.r[1]} bend={-bd} thick={26} skin={C.skin} sleeve={C.shirt} handR={15} />
      </g>
    </CharFrame>
  );
}

export default Provas;
