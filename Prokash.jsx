// Prokash.jsx (Step 25) — প্রকাশ: youngest son, age unknown in the narration (TODO(user); drawn ~22–25), slim, boyish round face, big curious eyes,
//           messy hair, faded rust short-sleeved shirt + khaki shorts, bare legs, rubber slippers. Curious, scared easily.
// Exports : default + named `Prokash` component, `META`, pure helpers (testable in Node):
//           talkingNow(talking, f), poseFor(mood, f, talk), bendsFor(mood), bendFor(mood), shiverAt(f, mood), glanceAt(f, mood), LOOK, FACE, BODY_K
// Props   : { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[startFrame,endFrame],
//             appearAt=0, showTag=true, tagColor, look=[lx,ly] }   (same contract as the other characters; x / y = % of the CONTENT zone, feet baseline)
// Rules   : whole body drawn at BODY_K (0.9) about the feet (he is the shortest, like Wife) · head top >= y 70 after scaling · feet baseline y = 690 ·
//           deterministic · no filters / Math.random.
// Moods   : calm (curious: eyes wander widely, restless hands; talking raises the right hand) · worried (hands clasped at the belly, gaze down) ·
//           scared (shivering hard, both hands over the mouth, sweat drop, pale) · shock (hands on the cheeks, huge eyes, very pale).
// Note    : unless `look` is given the pupils wander (glanceAt, |x| <= 0.7) — the "curious" trait; scared = faster darting.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from './theme.js';
import {Arm, Brows, CharFrame, Eyes, MOODS, Mouth, SKIN, Shadow, shade, useBreath} from './CharacterRig.jsx';

export const META = {id: 'prokash', bn: 'প্রকাশ', age: 23, role: 'youngest son', tagColor: COLORS.blood}; // age TODO(user)

const n1 = (v) => (Math.round(v * 10) / 10).toString();
export const BODY_K = 0.9;
const C = {skin: SKIN.boy, hair: '#1d1510', shirt: '#9a5f48', shirtDark: '#764636', shorts: '#8a7a56', shortsDark: '#5f5238', slipper: '#2f4f8a'};
export const FACE = 'M150 142 Q150 100 200 96 Q250 100 250 142 L246 182 Q240 213 218 223 Q208 229 200 229 Q192 229 182 223 Q160 213 154 182 Z';
export const LOOK = {calm: [0.3, 0.1], worried: [-0.2, 0.65], scared: [0, -0.25], shock: [0, 0]};

export function talkingNow(talking, f) {
  return Array.isArray(talking) ? f >= talking[0] && f < talking[1] : !!talking;
}

// curious wandering gaze: smooth, deterministic, |x| <= 0.7, |y| <= 0.2; scared = faster; none in shock
export function glanceAt(f, mood) {
  if (mood === 'shock') return [0, 0];
  const sp = mood === 'scared' ? 2 : mood === 'worried' ? 0.5 : 1;
  const x = Math.sin(f * 0.045 * sp) * 0.5 + Math.sin(f * 0.11 * sp + 2) * 0.2;
  return [Math.max(-0.7, Math.min(0.7, x)), Math.sin(f * 0.06 * sp) * 0.2];
}

// hand targets (viewBox units, BEFORE the 0.9 body scale); shoulders at (152,262) / (248,262); l = viewer's left hand
const POSE = {calm: {l: [138, 424], r: [262, 424]}, worried: {l: [192, 376], r: [208, 376]}, scared: {l: [188, 206], r: [212, 206]}, shock: {l: [166, 188], r: [234, 188]}};
export function poseFor(mood, f, talk) {
  const m = MOODS.includes(mood) ? mood : 'calm', b = POSE[m];
  let l = [b.l[0], b.l[1]], r = [b.r[0], b.r[1]];
  if (m === 'calm') { l = [l[0] + Math.sin(f * 0.19) * 7, l[1] + Math.cos(f * 0.15) * 6]; r = [r[0] + Math.sin(f * 0.13 + 1) * 4, r[1] + Math.cos(f * 0.11) * 4]; }
  if (m === 'worried') { const w = Math.sin(f * 0.14) * 3; l = [l[0] + w, l[1]]; r = [r[0] - w, r[1]]; }
  if (m === 'scared') { l = [l[0] + Math.sin(f * 1.9) * 2, l[1] + Math.cos(f * 2.3) * 2]; r = [r[0] + Math.sin(f * 2.1) * 2, r[1] + Math.cos(f * 1.7) * 2]; }
  if (talk) {
    if (m === 'calm') r = [272 + Math.sin(f * 0.3) * 10, 384 + Math.cos(f * 0.23) * 8];
    else if (m === 'shock') r = [r[0] + Math.sin(f * 0.3) * 4, r[1] + Math.cos(f * 0.23) * 3];
  }
  return {l, r};
}

// elbow sides {l, r}: hands ABOVE the shoulder need the opposite sign (see Pralhad.jsx); shock + scared (hands at the face)
export const bendsFor = (mood) => (mood === 'shock' || mood === 'scared' ? {l: -1, r: 1} : {l: 1, r: -1});
export const bendFor = (mood) => bendsFor(mood).l;

export function shiverAt(f, mood) {
  const amp = {calm: 0, worried: 0.4, scared: 2.1, shock: 0}[MOODS.includes(mood) ? mood : 'calm'];
  return Math.sin(f * 1.9) * amp;
}

export function Prokash({x = 50, y = 60, scale = 1, flip = false, mood = 'calm', talking = false, appearAt = 0, showTag = true, tagColor, look}) {
  const f = useCurrentFrame();
  const m = MOODS.includes(mood) ? mood : 'calm';
  const br = useBreath('prokash', m === 'shock' ? 1.5 : 4);
  const pose = poseFor(m, f, talkingNow(talking, f)), bd = bendsFor(m);
  const g = glanceAt(f, m), lk = look || [LOOK[m][0] + g[0], LOOK[m][1] + g[1]];
  const dk = shade(C.skin, -0.22), dk2 = shade(C.skin, -0.12);
  const pale = {calm: 0, worried: 0.05, scared: 0.17, shock: 0.26}[m];
  const sweat = m === 'scared' || m === 'shock', st = (f * 0.35) % 28;
  const body = `translate(${n1(shiverAt(f, m))} ${n1(br.dy)}) rotate(${br.sway.toFixed(2)} 200 420)`;
  const tilt = m === 'calm' ? Math.sin(f * 0.05) * 2.2 : 0; // curious head tilt
  return (
    <CharFrame x={x} y={y} scale={scale} flip={flip} appearAt={appearAt} tag={showTag ? {text: META.bn, color: tagColor || META.tagColor} : null}>
      <Shadow cx={200} cy={690} rx={92} ry={12} />
      <g transform={`translate(200 690) scale(${BODY_K}) translate(-200 -690)`}>
        {/* bare legs + rubber slippers */}
        <g fill={dk2}>
          <rect x="170" y="520" width="22" height="150" rx="10" /><rect x="208" y="520" width="22" height="150" rx="10" />
        </g>
        <path d="M172 560 Q176 600 174 640 M228 560 Q224 600 226 640" fill="none" stroke={dk} strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />
        <ellipse cx="178" cy="682" rx="23" ry="8" fill={C.slipper} /><ellipse cx="222" cy="682" rx="23" ry="8" fill={C.slipper} />
        <path d="M166 676 Q178 668 190 676 M210 676 Q222 668 234 676" fill="none" stroke="#e4ddc8" strokeWidth="3" strokeLinecap="round" />
        {/* khaki shorts */}
        <path d="M152 404 L248 404 L252 440 L256 548 L204 548 L200 470 L196 470 L196 548 L144 548 L148 440 Z" fill={C.shorts} />
        <path d="M152 404 L248 404 L252 440 L256 548 L204 548 L200 470 L196 470 L196 548 L144 548 L148 440 Z" fill="none" stroke={C.shortsDark} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M144 534 L196 534 M204 534 L256 534 M168 470 Q166 500 170 530 M232 470 Q234 500 230 530" fill="none" stroke={C.shortsDark} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <rect x="150" y="402" width="100" height="11" rx="4" fill={C.shortsDark} /><circle cx="200" cy="408" r="4" fill="#cdb98a" />

        <g transform={body}>
          {/* neck + short-sleeved shirt (a size too big, untucked) */}
          <path d="M176 212 L174 262 Q200 278 226 262 L224 212 Z" fill={dk2} />
          <path d="M148 268 Q166 252 184 254 L200 282 L216 254 Q234 252 252 268 L250 424 Q200 434 150 424 Z" fill={C.shirt} />
          <path d="M150 414 Q200 424 250 414 L250 424 Q200 434 150 424 Z" fill={C.shirtDark} />
          <path d="M200 282 L200 428" stroke={C.shirtDark} strokeWidth="3" />
          {[314, 346, 378, 406].map((yy) => <circle key={yy} cx="205" cy={yy} r="3" fill="#e9dcc2" />)}
          <path d="M168 306 Q176 344 166 390 M234 348 Q228 380 236 408" fill="none" stroke={C.shirtDark} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
          <path d="M182 250 L200 292 L190 258 Z M218 250 L200 292 L210 258 Z" fill="#b57a62" stroke={C.shirtDark} strokeWidth="2" strokeLinejoin="round" />
          <path d="M188 256 L200 282 L212 256 L212 250 L188 250 Z" fill={C.skin} opacity="0.9" />

          {/* head (slight curious tilt in calm) */}
          <g transform={`rotate(${tilt.toFixed(2)} 200 226)`}>
            <ellipse cx="148" cy="156" rx="11" ry="17" fill={dk2} /><ellipse cx="252" cy="156" rx="11" ry="17" fill={dk2} />
            <path d="M150 156 q-4 4 0 8 M250 156 q4 4 0 8" fill="none" stroke={dk} strokeWidth="2" opacity="0.5" />
            <path d={FACE} fill={C.skin} />
            {/* messy hair: cap + 6 tufts sticking out */}
            <path d="M150 142 Q142 92 196 84 Q258 86 250 142 Q246 114 230 108 Q210 118 190 108 Q166 112 158 128 Q152 134 150 142 Z" fill={C.hair} />
            <path d="M158 112 L146 96 L170 104 Z M178 98 L170 80 L192 92 Z M204 92 L208 74 L222 92 Z M230 98 L246 82 L246 104 Z M246 118 L262 112 L250 132 Z M152 128 L138 126 L154 138 Z" fill={C.hair} stroke={C.hair} strokeWidth="2" strokeLinejoin="round" />
            <path d="M176 104 Q200 96 228 106" fill="none" stroke="#403227" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
            <path d="M156 176 Q162 206 200 224 Q238 206 244 176" fill="none" stroke={dk} strokeWidth="2" opacity="0.28" />
            <path d="M164 160 q-8 14 0 24 M236 160 q8 14 0 24" fill="#d96b5a" stroke="none" opacity="0.28" />
            <circle cx="170" cy="184" r="10" fill="#d96b5a" opacity="0.2" /><circle cx="230" cy="184" r="10" fill="#d96b5a" opacity="0.2" />
            <Eyes cx={200} cy={148} gap={54} size={12} mood={m} look={lk} seed="prokash" />
            <Brows cx={200} cy={127} gap={54} w={19} mood={m} color={C.hair} thick={5} />
            <path d="M197 148 Q193 164 191 174 Q200 181 209 174 Q207 164 203 148" fill={dk} opacity="0.3" stroke={dk} strokeWidth="2" strokeLinejoin="round" />
            <Mouth cx={200} cy={203} w={30} mood={m} talking={talking} seed="prokash" />
            {pale > 0 && <path d={FACE} fill="#efe6d0" opacity={pale} />}
            {sweat && <path d="M240 108 q-6 10 0 15 q6 -5 0 -15 z" fill="#9fd8ff" opacity={(0.85 * Math.sin((st / 28) * Math.PI)).toFixed(2)} transform={`translate(0 ${n1(st)})`} />}
          </g>

          {/* arms: slim (thick 18), short sleeves; drawn last so raised hands pass in front of the face */}
          <Arm sx={152} sy={262} hx={pose.l[0]} hy={pose.l[1]} bend={bd.l} thick={18} skin={C.skin} sleeve={C.shirt} sleeveLower={false} handR={12} />
          <Arm sx={248} sy={262} hx={pose.r[0]} hy={pose.r[1]} bend={bd.r} thick={18} skin={C.skin} sleeve={C.shirt} handR={12} />
        </g>
      </g>
    </CharFrame>
  );
}

export default Prokash;
