/** Prints the rain-cell box as "west,south,east,north" for the workflow (single source: src/region.ts). */
import { RAIN_BOX } from '../src/region.ts';
const [[w, s], [e, n]] = RAIN_BOX;
console.log([w, s, e, n].join(','));
