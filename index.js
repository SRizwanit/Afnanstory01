// index.js — Remotion entry point (Step 3)
// Purpose : registers the root component so the Remotion CLI/Studio can find all compositions.
// Exports : none (side-effect only: registerRoot).
// Needs   : `Root.jsx` must export a NAMED component `RemotionRoot` (created in Step 8).
// Used by : `npx remotion render index.js <Composition> ...` and `npx remotion studio index.js`.
import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root.jsx';

registerRoot(RemotionRoot);
