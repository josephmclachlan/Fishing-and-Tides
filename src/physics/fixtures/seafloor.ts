/** Test helper: the real packed seafloor grids, inlined by Vite, as a depth function. Not used by the app. */
import macroUrl from '../../../public/data/seafloor/gebco-macro.i16?inline';
import regionUrl from '../../../public/data/seafloor/gebco-region.i16?inline';
import landUrl from '../../../public/data/seafloor/land-mask.rle16?inline';
import manifest from '../../../public/data/seafloor/manifest.json';
import { unRle } from '../../adapters/seafloor';
import type { Grid } from '../bathy';
import { seafloorDepth } from '../refraction';

const bytes = (dataUrl: string) => Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (ch) => ch.charCodeAt(0)).buffer;
const g = manifest.grids;
export const region: Grid = { ...g.region, z: new Int16Array(bytes(regionUrl)) };
export const macro: Grid = { ...g.macro, z: new Int16Array(bytes(macroUrl)) };
export const land: Grid = { ...g.land, z: unRle(new Uint16Array(bytes(landUrl)), g.land.cols, g.land.rows) };
export const realDepth = seafloorDepth(region, macro, land);
