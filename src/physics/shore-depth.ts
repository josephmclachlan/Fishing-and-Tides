/**
 * Water depth near the beach (PLAN 7.88). Pure, SI units, no DOM.
 *
 * The depth grid is GEBCO's 15″ cells (~460 m). A cell beside the beach holds its mean depth, which takes in
 * the deep water at the cell's seaward edge, so along this coast the water a stone's throw from the sand
 * reads 10 to 15 m deep (13 m at Punta Uva, Playa Cocles and Playa Negra on 2026-11-13). At 13 m a 0.65 m
 * swell cannot move the sand, so the clarity model's bed-stirring term stayed at zero in water Joseph could
 * not see his hand in. The surf-zone model met the same averaging (surf-zone.ts MIN_SLOPE_RUN_M).
 *
 * Inside the cell the depth follows the equilibrium beach profile of Dean (1977, 1991): h = A·x^(2/3), x the
 * distance from the shoreline, with the profile scale A from the sand's settling velocity w,
 * A = 0.067·w^0.44 (A in m^(1/3), w in cm/s; Dean 1987, Coastal Sediments '87, 1: 1-21; Dean & Dalrymple 2002,
 * Coastal Processes, §7.3). For the 0.25 mm sand of sediment.ts, w is about 3.8 cm/s (Soulsby eq. 102) and A about 0.12, so the
 * water is about 1.6 m deep 50 m out, 2.6 m at 100 m and 5.4 m at 300 m. The profile only ever makes the grid
 * shallower: where GEBCO already has shallower water (a reef flat), GEBCO stands.
 *
 * The distance comes from the ~33 m coastline mask by a two-pass chamfer distance transform (Borgefors 1986,
 * Computer Vision, Graphics and Image Processing 34: 344-371) with the cells' true east and north sizes; it
 * is within about 9% of the straight-line distance, a few metres at the swimming distances that matter.
 */
import { M_PER_DEG_LAT, M_PER_DEG_LNG, type Grid } from './bathy';
import { settlingVelocity } from './sediment';

const RAD = Math.PI / 180;

/** Dean's profile scale, m^(1/3), for sand settling at `wMs` m/s (Dean 1987). */
export const deanA = (wMs = settlingVelocity()) => 0.067 * Math.pow(wMs * 100, 0.44);

/** Equilibrium beach depth, m, `xM` metres from the shoreline. */
export const deanDepth = (xM: number, a = deanA()) => a * Math.pow(Math.max(0, xM), 2 / 3);

/** Shallowest depth the profile gives, m: the swash at the waterline, ankle deep. */
export const SWASH_DEPTH_M = 0.3;

/** Depth at a sea point, m: the grid's depth, made no deeper than the beach profile `xM` metres from the shoreline. */
export function nearshoreDepth(gridDepthM: number, xM: number, a = deanA()): number {
  const dean = Math.max(SWASH_DEPTH_M, deanDepth(xM, a));
  return Number.isFinite(gridDepthM) ? Math.min(gridDepthM, dean) : dean;
}

/**
 * Distance from each sea cell's centre to the nearest land cell's edge, m, over a land mask (1 = land); land
 * cells are 0. Two-pass 3×3 chamfer with weights from the cell's east, north and diagonal sizes at the grid's
 * middle latitude. Capped at 65 km (Uint16 metres).
 */
export function coastDistance(land: Grid): Grid {
  const { cols, rows } = land;
  const midLat = land.lat0 - (rows / 2) * land.dlat;
  const ex = land.dlon * M_PER_DEG_LNG * Math.cos(midLat * RAD), ny = land.dlat * M_PER_DEG_LAT, dg = Math.hypot(ex, ny);
  const MAX = 65535;
  const d = new Float32Array(cols * rows);
  for (let i = 0; i < d.length; i++) d[i] = land.z[i] === 1 ? 0 : MAX;
  // Forward pass: west, north-west, north, north-east.
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (d[i] === 0) continue;
      let v = d[i];
      if (c > 0) v = Math.min(v, d[i - 1] + ex);
      if (r > 0) {
        const j = i - cols;
        v = Math.min(v, d[j] + ny);
        if (c > 0) v = Math.min(v, d[j - 1] + dg);
        if (c < cols - 1) v = Math.min(v, d[j + 1] + dg);
      }
      d[i] = v;
    }
  // Backward pass: east, south-east, south, south-west.
  for (let r = rows - 1; r >= 0; r--)
    for (let c = cols - 1; c >= 0; c--) {
      const i = r * cols + c;
      if (d[i] === 0) continue;
      let v = d[i];
      if (c < cols - 1) v = Math.min(v, d[i + 1] + ex);
      if (r < rows - 1) {
        const j = i + cols;
        v = Math.min(v, d[j] + ny);
        if (c < cols - 1) v = Math.min(v, d[j + 1] + dg);
        if (c > 0) v = Math.min(v, d[j - 1] + dg);
      }
      d[i] = v;
    }
  // From the centre of the nearest land cell to its edge: half a cell less.
  const half = (ex + ny) / 4;
  const z = new Uint16Array(cols * rows);
  for (let i = 0; i < d.length; i++) z[i] = d[i] === 0 ? 0 : Math.min(MAX, Math.round(Math.max(0, d[i] - half)));
  return { ...land, z };
}
