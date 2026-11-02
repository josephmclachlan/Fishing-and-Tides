/** Prints the lightning collection box as "west,south,east,north" for the workflow (single source: src/region.ts). */
import { LIGHTNING_BOUNDS } from '../src/region.ts';
const [[w, s], [e, n]] = LIGHTNING_BOUNDS;
console.log([w, s, e, n].join(','));
