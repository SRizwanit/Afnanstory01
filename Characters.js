// Characters.js (Step 26, re-issued in Step P2.4b) — registry of the 5 family characters + the generic daughter-in-law `bou` (Part 2): id -> { META, Component } + small helpers for scenes.
// Exports : CHARACTERS = { pralhad, wife, provas, pankaj, prokash, bou } each { META, Component } (contract 6.5)
//           CHARACTER_IDS (family order: father, mother, sons eldest -> youngest, then `bou` (Part 2, generic — may appear several times in one scene, give each a different `seed`))
//           getCharacter(id)            -> { META, Component } | null
//           getMeta(id)                 -> META | null
//           characterList()             -> [{ id, META, Component }] in CHARACTER_IDS order
//           byWord(text)                -> id | null   (maps a spoken Bengali name word, e.g. "প্রভাসের," -> 'provas'; "বউ"/"বৌ" (+ inflections: বউয়ের, বউদের) -> 'bou')
//           Character                   -> <Character id="pankaj" {...characterProps}/>  (renders the right component; unknown id renders null)
// Props   : every Component takes { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[start,end],
//           appearAt=0, showTag=true, tagColor, look=[lx,ly] } (+ `seed='bou'` for Bou only) — x / y = % of the CONTENT zone (feet baseline), frames are LOCAL to the Sequence.
// Rules   : pure data + React.createElement (no JSX, no state, no randomness). Adding a character = new file + one line in CHARACTERS/CHARACTER_IDS.
import React from 'react';
import Pralhad, {META as PRALHAD} from './Pralhad.jsx';
import Wife, {META as WIFE} from './Wife.jsx';
import Provas, {META as PROVAS} from './Provas.jsx';
import Pankaj, {META as PANKAJ} from './Pankaj.jsx';
import Prokash, {META as PROKASH} from './Prokash.jsx';
import Bou, {META as BOU} from './Bou.jsx';

export const CHARACTERS = {
  pralhad: {META: PRALHAD, Component: Pralhad},
  wife: {META: WIFE, Component: Wife},
  provas: {META: PROVAS, Component: Provas},
  pankaj: {META: PANKAJ, Component: Pankaj},
  prokash: {META: PROKASH, Component: Prokash},
  bou: {META: BOU, Component: Bou},
};

export const CHARACTER_IDS = ['pralhad', 'wife', 'provas', 'pankaj', 'prokash', 'bou'];

const has = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(CHARACTERS, id);

export const getCharacter = (id) => (has(id) ? CHARACTERS[id] : null);
export const getMeta = (id) => (has(id) ? CHARACTERS[id].META : null);
export const characterList = () => CHARACTER_IDS.map((id) => ({id, ...CHARACTERS[id]}));

// spoken word -> character id; punctuation stripped, inflected forms match by prefix (প্রভাসের -> provas). "স্ত্রী" -> wife.
// P2.4b: "বউ" / "বৌ" (both spellings of "daughter-in-law", incl. বউয়ের / বউদের) -> bou. "ছেলের" alone is NOT a name word (null); only the word "বউ" itself maps.
const NAME_WORDS = [['প্রহ্লাদ', 'pralhad'], ['প্রভাস', 'provas'], ['পঙ্কজ', 'pankaj'], ['প্রকাশ', 'prokash'], ['স্ত্রী', 'wife'], ['বউ', 'bou'], ['বৌ', 'bou']];
export function byWord(text) {
  const w = String(text || '').normalize('NFC').replace(/[\s।,?!.;:"'“”‘’()\-–—]/g, '');
  if (!w) return null;
  for (const [name, id] of NAME_WORDS) if (w.startsWith(name.normalize('NFC'))) return id;
  return null;
}

export function Character({id, ...props}) {
  const c = getCharacter(id);
  return c ? React.createElement(c.Component, props) : null;
}

export default CHARACTERS;
