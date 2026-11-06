// Characters.js (Step 26) — registry of the 5 family characters: id -> { META, Component } + small helpers for scenes.
// Exports : CHARACTERS = { pralhad, wife, provas, pankaj, prokash } each { META, Component } (contract 6.5)
//           CHARACTER_IDS (family order: father, mother, sons eldest -> youngest)
//           getCharacter(id)            -> { META, Component } | null
//           getMeta(id)                 -> META | null
//           characterList()             -> [{ id, META, Component }] in CHARACTER_IDS order
//           byWord(text)                -> id | null   (maps a spoken Bengali name word, e.g. "প্রভাসের," -> 'provas')
//           Character                   -> <Character id="pankaj" {...characterProps}/>  (renders the right component; unknown id renders null)
// Props   : every Component takes { x=50, y=60, scale=1, flip=false, mood='calm'|'worried'|'scared'|'shock', talking=false|true|[start,end],
//           appearAt=0, showTag=true, tagColor, look=[lx,ly] } — x / y = % of the CONTENT zone (feet baseline), frames are LOCAL to the Sequence.
// Rules   : pure data + React.createElement (no JSX, no state, no randomness). Adding a character = new file + one line in CHARACTERS/CHARACTER_IDS.
import React from 'react';
import Pralhad, {META as PRALHAD} from './Pralhad.jsx';
import Wife, {META as WIFE} from './Wife.jsx';
import Provas, {META as PROVAS} from './Provas.jsx';
import Pankaj, {META as PANKAJ} from './Pankaj.jsx';
import Prokash, {META as PROKASH} from './Prokash.jsx';

export const CHARACTERS = {
  pralhad: {META: PRALHAD, Component: Pralhad},
  wife: {META: WIFE, Component: Wife},
  provas: {META: PROVAS, Component: Provas},
  pankaj: {META: PANKAJ, Component: Pankaj},
  prokash: {META: PROKASH, Component: Prokash},
};

export const CHARACTER_IDS = ['pralhad', 'wife', 'provas', 'pankaj', 'prokash'];

const has = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(CHARACTERS, id);

export const getCharacter = (id) => (has(id) ? CHARACTERS[id] : null);
export const getMeta = (id) => (has(id) ? CHARACTERS[id].META : null);
export const characterList = () => CHARACTER_IDS.map((id) => ({id, ...CHARACTERS[id]}));

// spoken word -> character id; punctuation stripped, inflected forms match by prefix (প্রভাসের -> provas). "স্ত্রী" -> wife.
const NAME_WORDS = [['প্রহ্লাদ', 'pralhad'], ['প্রভাস', 'provas'], ['পঙ্কজ', 'pankaj'], ['প্রকাশ', 'prokash'], ['স্ত্রী', 'wife']];
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
