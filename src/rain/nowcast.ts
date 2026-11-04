/**
 * Rain-cell nowcast (PLAN 7.24 item 3). Pure, no DOM.
 *
 * Input: the last hour of satellite rain-rate frames on a regular lat/lon grid (scripts/rain-cells.py),
 * row 0 at the north edge. Output: how the rain is moving, the rain field extrapolated 0 to 2 hours
 * ahead, and per town: raining now, arriving in N minutes, or dry.
 *
 * Method (Lagrangian persistence, the standard radar/satellite extrapolation nowcast):
 *  1. Motion. For each pair of consecutive frames, find the whole-grid shift (dx, dy) in cells that
 *     best maps the earlier frame onto the later one: minimise the mean squared difference of
 *     ln(1 + R) over cells where either frame rains (R ≥ WET_MM_H). ln(1 + R) keeps one intense core
 *     from outweighing the shape of the field. Shifts are searched to ±MAX_SHIFT cells per pair
 *     (6 cells × 2.2 km per 10 min ≈ 80 km/h, faster than any shower here). Pairs with fewer than
 *     MIN_WET wet cells, or whose best match overlaps less than MIN_OVERLAP, are skipped. The pair vectors are combined as a wet-weighted mean after
 *     dropping any more than 2 cells from the component-wise median, which gives sub-cell speed.
 *  2. Extrapolation. R(x, t0 + τ) = R(x − u τ, t0): the newest frame moved along the motion, no growth
 *     or decay. Tropical showers grow and die within the hour, so skill falls fast: under 1 h the
 *     cells are usually where it says, 1 to 2 h is a rough guide only.
 *  3. Towns. Rain at a town is the largest rate within NEAR_CELLS cells (about 2 km), because
 *     position errors of a cell or two are normal. A town is RAINING if that is ≥ WET_MM_H in the
 *     extrapolation to the present, COMING with an ETA if it reaches that within 2 h, else DRY.
 *
 * SI note: rates in mm/h (the unit everyone reads), speeds in km/h and m/s, distances km, times ms.
 */

export interface RainGrid {
  west: number;
  north: number;
  /** Cell size, degrees. */
  step: number;
  nx: number;
  ny: number;
}

export interface RainFrame {
  /** Scan start, epoch ms. */
  t: number;
  /** Rain mm/h, row-major from the north-west corner; NaN where the satellite has no value. */
  rate: Float32Array;
}

/** Rain rate that counts as raining, mm/h: light rain you would notice and put a hood up for. */
export const WET_MM_H = 1;
/** Largest shift searched between two frames, cells. */
export const MAX_SHIFT = 6;
/** Fewest wet cells in a frame pair for its motion to count. */
export const MIN_WET = 12;
/** Share of the compared cells that must be wet in both frames at the best shift, or the pair has no match. */
export const MIN_OVERLAP = 0.3;
/** Town neighbourhood half-width, cells. */
export const NEAR_CELLS = 1;
/** How far ahead the nowcast goes, minutes, and its step. */
export const HORIZON_MIN = 120;
export const STEP_MIN = 10;
/** Newest frame older than this and the nowcast says nothing, minutes. */
export const STALE_MIN = 45;

const KM_PER_DEG = 111.32;

export interface Motion {
  /** Cells per minute, +x east, +y south (image rows). */
  cx: number;
  cy: number;
  /** km/h towards east and north. */
  eastKmh: number;
  northKmh: number;
  speedKmh: number;
  /** Direction the rain is moving TOWARDS, degrees clockwise from north. */
  towardsDeg: number;
  /** Frame pairs that agreed. */
  pairs: number;
}

const idx = (g: RainGrid, i: number, j: number) => i * g.nx + j;
const wet = (r: number) => r >= WET_MM_H;

/** Best whole-grid shift (dx, dy) in cells from frame a to frame b, with the wet-cell count; null when too little rain. */
export function pairShift(g: RainGrid, a: Float32Array, b: Float32Array, maxShift = MAX_SHIFT): { dx: number; dy: number; wet: number } | null {
  const la = a.map((r) => (Number.isFinite(r) ? Math.log1p(r) : NaN));
  const lb = b.map((r) => (Number.isFinite(r) ? Math.log1p(r) : NaN));
  let wa = 0;
  let wb = 0;
  for (let k = 0; k < a.length; k++) (wa += +wet(a[k])), (wb += +wet(b[k]));
  if (wa < MIN_WET || wb < MIN_WET) return null;
  const thr = Math.log1p(WET_MM_H);
  let best = { dx: 0, dy: 0, err: Infinity, overlap: 0 };
  for (let dy = -maxShift; dy <= maxShift; dy++) {
    for (let dx = -maxShift; dx <= maxShift; dx++) {
      let sum = 0;
      let n = 0;
      let both = 0;
      for (let i = Math.max(0, dy); i < Math.min(g.ny, g.ny + dy); i++) {
        for (let j = Math.max(0, dx); j < Math.min(g.nx, g.nx + dx); j++) {
          const vb = lb[idx(g, i, j)];
          const va = la[idx(g, i - dy, j - dx)];
          if (!(vb >= thr || va >= thr) || !Number.isFinite(va) || !Number.isFinite(vb)) continue;
          sum += (va - vb) ** 2;
          n++;
          both += +(va >= thr && vb >= thr);
        }
      }
      if (n < MIN_WET) continue;
      const err = sum / n + 1e-6 * (dx * dx + dy * dy); // ties go to the smaller shift
      if (err < best.err) best = { dx, dy, err, overlap: both / n };
    }
  }
  // No real match (the rain moved further than the search, or died and new cells grew): no vector.
  return Number.isFinite(best.err) && best.overlap >= MIN_OVERLAP ? { dx: best.dx, dy: best.dy, wet: Math.min(wa, wb) } : null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((p, q) => p - q);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Motion of the rain field over the frames (oldest first); null when no pair had enough rain. */
export function motion(g: RainGrid, frames: readonly RainFrame[]): Motion | null {
  const v: { cx: number; cy: number; w: number }[] = [];
  for (let k = 1; k < frames.length; k++) {
    const dtMin = (frames[k].t - frames[k - 1].t) / 60000;
    if (!(dtMin > 0 && dtMin <= 30)) continue;
    const s = pairShift(g, frames[k - 1].rate, frames[k].rate);
    if (s) v.push({ cx: s.dx / dtMin, cy: s.dy / dtMin, w: s.wet });
  }
  if (!v.length) return null;
  const mx = median(v.map((p) => p.cx));
  const my = median(v.map((p) => p.cy));
  const tol = 2 / 10; // 2 cells per 10 min
  const keep = v.filter((p) => Math.abs(p.cx - mx) <= tol && Math.abs(p.cy - my) <= tol);
  const W = keep.reduce((s, p) => s + p.w, 0);
  const cx = keep.reduce((s, p) => s + p.cx * p.w, 0) / W;
  const cy = keep.reduce((s, p) => s + p.cy * p.w, 0) / W;
  const lat = g.north - (g.ny / 2) * g.step;
  const eastKmh = cx * 60 * g.step * KM_PER_DEG * Math.cos((lat * Math.PI) / 180);
  const northKmh = -cy * 60 * g.step * KM_PER_DEG;
  return { cx, cy, eastKmh, northKmh, speedKmh: Math.hypot(eastKmh, northKmh), towardsDeg: ((Math.atan2(eastKmh, northKmh) * 180) / Math.PI + 360) % 360, pairs: keep.length };
}

/** Rain field `leadMin` minutes after `frame`, moved along `m` (nearest cell). Cells whose source is off the grid are NaN. */
export function extrapolate(g: RainGrid, frame: RainFrame, m: Motion | null, leadMin: number): Float32Array {
  if (!m || leadMin === 0) return frame.rate.slice();
  const out = new Float32Array(frame.rate.length);
  const sx = m.cx * leadMin;
  const sy = m.cy * leadMin;
  for (let i = 0; i < g.ny; i++) {
    for (let j = 0; j < g.nx; j++) {
      const si = Math.round(i - sy);
      const sj = Math.round(j - sx);
      out[idx(g, i, j)] = si >= 0 && si < g.ny && sj >= 0 && sj < g.nx ? frame.rate[idx(g, si, sj)] : NaN;
    }
  }
  return out;
}

/** Grid cell (row, col) holding a point, or null off the grid. */
export function cellOf(g: RainGrid, lng: number, lat: number): [number, number] | null {
  const i = Math.floor((g.north - lat) / g.step);
  const j = Math.floor((lng - g.west) / g.step);
  return i >= 0 && i < g.ny && j >= 0 && j < g.nx ? [i, j] : null;
}

/** Largest rate within NEAR_CELLS of the point, mm/h; NaN if nothing there has a value. */
export function nearRate(g: RainGrid, field: Float32Array, lng: number, lat: number): number {
  const c = cellOf(g, lng, lat);
  if (!c) return NaN;
  let best = NaN;
  for (let i = c[0] - NEAR_CELLS; i <= c[0] + NEAR_CELLS; i++) {
    for (let j = c[1] - NEAR_CELLS; j <= c[1] + NEAR_CELLS; j++) {
      if (i < 0 || j < 0 || i >= g.ny || j >= g.nx) continue;
      const r = field[idx(g, i, j)];
      if (Number.isFinite(r) && !(r <= best)) best = r;
    }
  }
  return best;
}

export type TownStatus = 'raining' | 'coming' | 'dry' | 'unknown';
export interface TownNowcast {
  status: TownStatus;
  /** Rain at the town now (newest frame moved on to `nowMs`), mm/h. */
  nowMmH: number;
  /** Minutes from `nowMs` until rain ≥ WET_MM_H reaches the town; only for 'coming'. */
  etaMin: number | null;
  /** Heaviest rate at the town over the next HORIZON_MIN, mm/h. */
  peakMmH: number;
}

/** The nowcast at one town for the present `nowMs`. 'unknown' when the frames are stale or missing. */
export function townNowcast(g: RainGrid, frames: readonly RainFrame[], m: Motion | null, lngLat: readonly [number, number], nowMs: number): TownNowcast {
  const last = frames.at(-1);
  const none: TownNowcast = { status: 'unknown', nowMmH: NaN, etaMin: null, peakMmH: NaN };
  if (!last) return none;
  const ageMin = (nowMs - last.t) / 60000;
  if (!(ageMin >= -5 && ageMin <= STALE_MIN)) return none;
  const at = (lead: number) => nearRate(g, extrapolate(g, last, m, Math.max(0, ageMin + lead)), lngLat[0], lngLat[1]);
  const nowMmH = at(0);
  if (!Number.isFinite(nowMmH)) return none;
  let peak = nowMmH;
  let eta: number | null = null;
  for (let lead = STEP_MIN; lead <= HORIZON_MIN; lead += STEP_MIN) {
    const r = at(lead);
    if (!Number.isFinite(r)) continue;
    peak = Math.max(peak, r);
    if (eta === null && wet(r)) eta = lead;
  }
  if (wet(nowMmH)) return { status: 'raining', nowMmH, etaMin: null, peakMmH: peak };
  return { status: eta === null ? 'dry' : 'coming', nowMmH, etaMin: eta, peakMmH: peak };
}

export interface RainCell {
  lngLat: [number, number];
  peakMmH: number;
  areaKm2: number;
}

/** Connected patches (4-neighbour) of rain ≥ thrMmH with at least minCells cells: centroid, peak, area. */
export function findCells(g: RainGrid, field: Float32Array, thrMmH = 2, minCells = 3): RainCell[] {
  const seen = new Uint8Array(field.length);
  const out: RainCell[] = [];
  const cellKm2 = (g.step * KM_PER_DEG) ** 2 * Math.cos(((g.north - (g.ny / 2) * g.step) * Math.PI) / 180);
  for (let k = 0; k < field.length; k++) {
    if (seen[k] || !(field[k] >= thrMmH)) continue;
    const stack = [k];
    seen[k] = 1;
    let n = 0, si = 0, sj = 0, peak = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const i = Math.floor(p / g.nx), j = p % g.nx;
      n++, (si += i), (sj += j), (peak = Math.max(peak, field[p]));
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.ny || nj >= g.nx) continue;
        const q = idx(g, ni, nj);
        if (!seen[q] && field[q] >= thrMmH) (seen[q] = 1), stack.push(q);
      }
    }
    if (n >= minCells) out.push({ lngLat: [g.west + (sj / n + 0.5) * g.step, g.north - (si / n + 0.5) * g.step], peakMmH: peak, areaKm2: n * cellKm2 });
  }
  return out.sort((a, b) => b.peakMmH - a.peakMmH);
}

/** Compass point (8) a heading points to, for "MOVING NW". */
export function compass8(deg: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
