/**
 * Satellite clarity near the shore (PLAN 7.45): two corrections to the Kd490 maps before
 * physics/clarity.ts turns them into visibility. Pure, no DOM.
 *
 * 1. Clear baseline. Every Kd490 map runs late (NOAA's gap-filled 2 km about 10 days, GlobColour's
 *    about 1 since PLAN 7.47), so for today the model has to
 *    guess where the satellite term has gone since the newest map. It used to fall back to the median
 *    of the last week of maps. When that week was muddy (late October 2026: three days at 1 to 2.3/m
 *    off Puerto Viejo), the muddy week was carried forward for days after the water had cleared.
 *    Rain plumes and swell are already separate terms in the model, so the satellite term should
 *    fall back to the water's clear state for the time of year. That clear state is each pixel's
 *    CLEAR_QUANTILE (20th percentile) of daily Kd490 in that calendar month over the whole record
 *    (GlobColour, 1997 on), the same statistic MUD WEEKS uses for a reef's clear baseline.
 *
 * 2. Shoreline pixels. A pixel that touches land also holds the beach, the surf and the reef
 *    flat. Bright sand and coral, and light scattered off the land, raise the green reflectance that
 *    the Kd490 algorithm reads as murk. Along this coast NOAA's 2 km land-touching pixels read 2 to 4 times
 *    the pixel one step offshore, even on calm dry days (GlobColour's 4 km about 1.1 times). A pixel with land among its 8 neighbours
 *    therefore takes the value of the nearest pixel that has none, in the same frame.
 */

/** Share of a month's daily values that sit below the clear baseline. */
export const CLEAR_QUANTILE = 0.2;
/** How far, in pixels, offshoreFill looks for a pixel with no land around it. */
export const OFFSHORE_SEARCH_PX = 4;

/** Linear-interpolated quantile of the finite values, NaN with none. Sorts a copy. */
export function quantile(xs: ArrayLike<number>, q: number): number {
  const v = Array.from(xs).filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const p = Math.min(1, Math.max(0, q)) * (v.length - 1);
  const i = Math.floor(p);
  return i + 1 < v.length ? v[i] + (v[i + 1] - v[i]) * (p - i) : v[i];
}

/**
 * Per-pixel quantile of daily maps by calendar month (UTC): 12 frames, January first.
 * `times` are epoch ms, one per frame; a pixel with no values in a month stays NaN.
 */
export function monthlyQuantile(times: readonly number[], frames: readonly ArrayLike<number>[], q = CLEAR_QUANTILE): Float32Array[] {
  const n = frames[0]?.length ?? 0;
  const byMonth: number[][] = [...Array(12)].map(() => []);
  times.forEach((t, k) => byMonth[new Date(t).getUTCMonth()].push(k));
  return byMonth.map((ks) => {
    const out = new Float32Array(n).fill(NaN);
    const col = new Float64Array(ks.length);
    for (let i = 0; i < n; i++) {
      ks.forEach((k, j) => (col[j] = frames[k][i]));
      out[i] = quantile(col, q);
    }
    return out;
  });
}

/** Land in a sea product: pixels with no value in any frame (1 = land). */
export function landOf(frames: readonly ArrayLike<number>[], n = frames[0]?.length ?? 0): Uint8Array {
  const land = new Uint8Array(n).fill(1);
  for (const f of frames) for (let i = 0; i < n; i++) if (Number.isFinite(f[i])) land[i] = 0;
  return land;
}

/** Sea pixels with land among their 8 neighbours (1 = touches land). Pixels on the grid edge only count neighbours inside it. */
export function touchesLand(land: Uint8Array, cols: number, rows: number): Uint8Array {
  const out = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (land[r * cols + c]) continue;
      search: for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
          if (land[rr * cols + cc]) {
            out[r * cols + c] = 1;
            break search;
          }
        }
    }
  return out;
}

/**
 * A frame with every land-touching sea pixel replaced by the nearest (Euclidean, in pixels) finite
 * pixel that does not touch land, within OFFSHORE_SEARCH_PX; ties take the mean. A pixel with none
 * in reach keeps its own value. Land stays as it is.
 */
export function offshoreFill(frame: ArrayLike<number>, coast: Uint8Array, cols: number, rows: number, maxPx = OFFSHORE_SEARCH_PX): Float32Array {
  const out = Float32Array.from(frame);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (!coast[i]) continue;
      let best = Infinity, sum = 0, cnt = 0;
      for (let dr = -maxPx; dr <= maxPx; dr++)
        for (let dc = -maxPx; dc <= maxPx; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
          const j = rr * cols + cc;
          const v = frame[j];
          if (coast[j] || !Number.isFinite(v)) continue;
          const d = dr * dr + dc * dc;
          if (d > maxPx * maxPx) continue;
          if (d < best) (best = d), (sum = v), (cnt = 1);
          else if (d === best) (sum += v), cnt++;
        }
      if (cnt) out[i] = sum / cnt;
    }
  return out;
}
