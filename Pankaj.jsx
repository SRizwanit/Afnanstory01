// Pankaj.jsx (Step 24) — পঙ্কজ: middle son, ~30 ("তিরিশের কাছাকাছি"), lean, side-parted hair, tired nervous eyes with dark rings, thin
//           stubble, faded olive-brown shirt (collar open, sleeves rolled) + dark trousers. Looks "on the edge" — important later in the story.
// Exports : default + named `Pankaj` component, `META`, pure helpers (testable in Node):
//           talkingNow(talking, f), poseFor(mood, f, talk), bendsFor(mood), bendFor(mood), shiverAt(f, mood), glanceAt(f, mood), LOOK, FACE
// Props   : { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[startFrame,endFrame],
//             appearAt=0, showTag=true, tagColor, look=[lx,ly] }   (same contract as Pralhad / Wife / Provas; x / y = % of the CONTENT zone, feet baseline)
// Rules   : head top y = 90 (>= 70, tag strip y 0..60 stays free) · feet baseline y = 690 · deterministic · no filters / Math.random.
// Moods   : calm (slightly hunched, restless left hand, eyes dart sideways; talking raises the right hand) · worried (right hand at the mouth,
//           gaze down) · scared (shivering, fists at the chest, sweat drop, pale) · shock (hands clutching the sides of the head, huge eyes, very pale).
// Note    : unless `look` is given, the pupils make small deterministic side-glances (glanceAt) — the "nervous" trait of this character.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from './theme.js';
import {Arm, Brows, CharFrame, Eyes, MOODS, Mouth, SKIN, Shadow, shade, useBreath} from './CharacterRig.jsx';

export const META = {id: 'pankaj', bn: 'পঙ্কজ', age: 30, role: 'middle son', tagColor: COLORS.violet};

const n1 = (v) => (Math.round(v * 10) / 10).toString();
const C = {skin: SKIN.young, hair: '#1a1410', shirt: '#7d7a52', shirtDark: '#5b5937', pants: '#2c2f3a', pantsDark: '#181a22', pantsLine: '#454a5c'};
export const FACE = 'M152 138 Q152 96 200 90 Q248 96 248 138 L245 182 Q240 210 222 221 Q211 229 200 229 Q189 229 178 221 Q160 210 155 182 Z';
export const LOOK = {calm: [0.3, 0.25], worried: [-0.25, 0.65], scared: [0, -0.2], shock: [0, 0]};

export function talkingNow(talking, f) {
  return Array.isArray(talking) ? f >= talking[0] && f < talking[1] : !!talking;
}

// nervous side-glances: smooth, deterministic, bounded to ±0.55 (x) / ±0.15 (y); none while in shock
export function glanceAt(f, mood) {
  if (mood === 'shock') return [0, 0];
  const k = mood === 'scared' ? 1.6 : mood === 'worried' ? 0.7 : 1;
  return [Math.max(-0.55, Math.min(0.55, Math.sin(f * 0.07) * Math.sin(f * 0.023 + 1) * 0.55 * k * 1.6)), Math.sin(f * 0.05) * 0.15];
}

// hand targets (viewBox units); shoulders at (146,260) / (254,260); l = viewer's left hand. Slimmer shoulders than Provas.
const POSE = {calm: {l: [132, 430], r: [268, 430]}, worried: {l: [190, 350], r: [222, 214]}, scared: {l: [156, 324], r: [244, 324]}, shock: {l: [164, 176], r: [236, 176]}};
export function poseFor(mood, f, talk) {
  const m = MOODS.includes(mood) ? mood : 'calm', b = POSE[m];
  let l = [b.l[0], b.l[1]], r = [b.r[0], b.r[1]];
  if (m === 'calm') { l = [l[0] + Math.sin(f * 0.21) * 6, l[1] + Math.cos(f * 0.17) * 5]; } // restless fingers
  if (m === 'worried') { l = [l[0] + Math.sin(f * 0.12) * 3, l[1]]; r = [r[0] + Math.sin(f * 0.45) * 1.5, r[1] + Math.cos(f * 0.4) * 1.5]; } // nail biting
  if (m === 'scared') { l = [l[0] + Math.sin(f * 1.9) * 2.5, l[1] + Math.cos(f * 2.3) * 2.5]; r = [r[0] + Math.sin(f * 2.1) * 2.5, r[1] + Math.cos(f * 1.7) * 2.5]; }
  if (talk) {
    if (m === 'calm') r = [262 + Math.sin(f * 0.3) * 10, 380 + Math.cos(f * 0.23) * 8];
    else if (m === 'scared' || m === 'shock') r = [r[0] + Math.sin(f * 0.3) * 5, r[1] + Math.cos(f * 0.23) * 4];
  }
  return {l, r};
}

// elbow sides {l, r}: a hand ABOVE the shoulder needs the opposite sign (see Pralhad.jsx). shock = both hands up.
export const bendsFor = (mood) => (mood === 'shock' ? {l: -1, r: 1} : {l: 1, r: -1});
export const bendFor = (mood) => bendsFor(mood).l;

export function shiverAt(f, mood) {
  const amp = {calm: 0.15, worried: 0.5, scared: 1.7, shock: 0}[MOODS.includes(mood) ? mood : 'calm'];
  return Math.sin(f * 1.9) * amp;
}

export function Pankaj({x = 50, y = 60, scale = 1, flip = false, mood = 'calm', talking = false, appearAt = 0, showTag = true, tagColor, look}) {
  const f = useCurrentFrame();
  const m = MOODS.includes(mood) ? mood : 'calm';
  const br = useBreath('pankaj', m === 'shock' ? 1.5 : 3.5);
  const pose = poseFor(m, f, talkingNow(talking, f)), bd = bendsFor(m);
  const g = glanceAt(f, m), lk = look || [LOOK[m][0] + g[0], LOOK[m][1] + g[1]];
  const dk = shade(C.skin, -0.22), dk2 = shade(C.skin, -0.12);
  const pale = {calm: 0.05, worried: 0.1, scared: 0.18, shock: 0.27}[m];
  const sweat = m === 'scared' || m === 'shock', st = (f * 0.35) % 28;
  const hunch = m === 'calm' || m === 'worried' ? 2.2 : 0;
  const body = `translate(${n1(shiverAt(f, m))} ${n1(br.dy)}) rotate(${(br.sway + hunch).toFixed(2)} 200 420)`;
  return (
    <CharFrame x={x} y={y} scale={scale} flip={flip} appearAt={appearAt} tag={showTag ? {text: META.bn, color: tagColor || META.tagColor} : null}>
      <Shadow cx={200} cy={690} rx={104} ry={13} />
      {/* shoes */}
      <ellipse cx="172" cy="684" rx="25" ry="9" fill="#14110e" /><ellipse cx="228" cy="684" rx="25" ry="9" fill="#14110e" />
      {/* trousers: two legs, slightly baggy, with creases and a dark hem */}
      <path d="M150 404 L250 404 L250 450 L246 676 L208 676 L202 470 L198 470 L192 676 L154 676 L150 450 Z" fill={C.pants} />
      <path d="M150 404 L250 404 L250 450 L246 676 L208 676 L202 470 L198 470 L192 676 L154 676 L150 450 Z" fill="none" stroke={C.pantsDark} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M172 470 Q168 560 174 668 M228 470 Q232 560 226 668 M160 560 Q176 566 190 560 M210 556 Q226 566 240 556" fill="none" stroke={C.pantsLine} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M154 662 L192 662 L192 676 L154 676 Z M208 662 L246 662 L246 676 L208 676 Z" fill={C.pantsDark} opacity="0.85" />
      <rect x="148" y="402" width="104" height="12" rx="4" fill="#15171e" /><rect x="193" y="402" width="14" height="12" rx="2" fill="#a3896a" />

      <g transform={body}>
        {/* neck + shirt (untucked, collar open) */}
        <path d="M174 206 L172 258 Q200 276 228 258 L226 206 Z" fill={dk2} />
        <path d="M144 266 Q164 248 184 250 L200 280 L216 250 Q236 248 256 266 L252 424 Q200 436 148 424 Z" fill={C.shirt} />
        <path d="M148 412 Q200 424 252 412 L252 424 Q200 436 148 424 Z" fill={C.shirtDark} />
        <path d="M200 280 L200 428" stroke={C.shirtDark} strokeWidth="3" />
        {[312, 344, 376, 404].map((yy) => <circle key={yy} cx="205" cy={yy} r="3" fill="#d8d2b4" />)}
        <path d="M166 304 Q176 344 164 388 M236 346 Q230 380 238 406 M184 330 Q190 360 182 392" fill="none" stroke={C.shirtDark} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M180 246 L200 290 L190 254 Z M220 246 L200 290 L210 254 Z" fill="#9a976c" stroke={C.shirtDark} strokeWidth="2" strokeLinejoin="round" />
        <path d="M186 252 L200 280 L214 252 L214 246 L186 246 Z" fill={C.skin} opacity="0.9" />
        <path d="M188 262 Q200 276 212 262" fill="none" stroke={dk} strokeWidth="2" opacity="0.5" />

        {/* head: narrower than Provas, light stubble, tired eyes */}
        <ellipse cx="152" cy="152" rx="8" ry="15" fill={dk2} /><ellipse cx="248" cy="152" rx="8" ry="15" fill={dk2} />
        <path d={FACE} fill={C.skin} />
        {/* side-parted hair: part on the viewer's left, a longer swept fringe over the right brow */}
        <path d="M152 138 Q146 90 196 82 Q256 84 250 140 Q246 112 232 106 Q214 100 186 104 Q176 118 170 132 Q166 118 156 112 Q152 124 152 138 Z" fill={C.hair} />
        <path d="M186 104 Q176 96 172 88 M190 100 Q214 96 238 108" fill="none" stroke="#3b3027" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M186 104 Q192 92 188 84" fill="none" stroke={C.skin} strokeWidth="2" opacity="0.55" />
        <path d="M156 186 Q168 214 200 228 Q232 214 244 186 Q232 208 200 212 Q168 208 156 186 Z" fill="#1a1410" opacity="0.2" />
        <path d="M170 218 Q185 226 200 227 Q215 226 230 218 M156 170 Q158 194 168 210 M244 170 Q242 194 232 210" fill="none" stroke={dk} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        <path d="M183 116 Q200 112 217 116" fill="none" stroke={dk} strokeWidth="2" opacity="0.3" />
        <path d="M180 168 Q174 182 178 198 M220 168 Q226 182 222 198" fill="none" stroke={dk} strokeWidth="2" opacity="0.35" />
        <Eyes cx={200} cy={142} gap={52} size={9.5} mood={m} look={lk} seed="pankaj" />
        {/* dark rings under the eyes (sleepless) */}
        <path d="M168 156 Q175 164 184 157 M216 157 Q225 164 232 156" fill="none" stroke="#4a2c26" strokeWidth="3.4" strokeLinecap="round" opacity="0.5" />
        <Brows cx={200} cy={124} gap={52} w={19} mood={m} color={C.hair} thick={5.5} />
        <path d="M197 140 Q191 160 189 173 Q200 182 211 173 Q209 160 203 140" fill={dk} opacity="0.35" stroke={dk} strokeWidth="2" strokeLinejoin="round" />
        <Mouth cx={200} cy={201} w={30} mood={m} talking={talking} seed="pankaj" />
        {/* thin moustache + light stubble */}
        <path d="M168 189 Q184 178 200 184 Q216 178 232 189 Q218 194 200 190 Q182 194 168 189 Z" fill={C.hair} opacity="0.85" />
        <path d="M160 190 Q162 214 182 224 Q200 232 218 224 Q238 214 240 190 Q232 212 200 218 Q168 212 160 190 Z" fill="#1a1410" opacity="0.16" />
        {pale > 0 && <path d={FACE} fill="#efe6d0" opacity={pale} />}
        {sweat && <path d="M236 104 q-6 10 0 15 q6 -5 0 -15 z" fill="#9fd8ff" opacity={(0.85 * Math.sin((st / 28) * Math.PI)).toFixed(2)} transform={`translate(0 ${n1(st)})`} />}

        {/* arms: lean (thick 20), sleeves rolled to the elbow; drawn last so raised hands pass in front of the face */}
        <Arm sx={146} sy={260} hx={pose.l[0]} hy={pose.l[1]} bend={bd.l} thick={20} skin={C.skin} sleeve={C.shirt} handR={13} />
        <Arm sx={254} sy={260} hx={pose.r[0]} hy={pose.r[1]} bend={bd.r} thick={20} skin={C.skin} sleeve={C.shirt} handR={13} />
      </g>
    </CharFrame>
  );
}

export default Pankaj;
