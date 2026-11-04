/**
 * Sargassum detection from the USF Alternative Floating Algae Index (PLAN 7.1). Used by the data
 * build (scripts/forecast/satellite.ts) on NOAA AOML's daily AFAI maps; kept here, import-free, so it
 * is type-checked and tested with the app.
 *
 * AFAI (Wang and Hu 2016, Hu et al. 2015) is reflectance at 859 nm above a baseline between 667 and
 * 1240 nm: floating algae raise it, water does not. A pixel holds Sargassum when its AFAI stands
 * clearly above the local water background:
 *
 *   ΔAFAI = AFAI − median(AFAI over a ~0.3° block),  flagged when ΔAFAI > max(8e-4, 5 · σ),
 *
 * where σ = 1.4826 · median|ΔAFAI| is the robust noise of that day's map. Wang and Hu's MODIS
 * threshold of 1.79e-4 flags 15–20% of clear sea in this product (its values are quantised to
 * 2.5e-5 and noisier), so the cut here is set from the noise. False alarms come from cloud edges,
 * river-plume fronts and shallow bottoms, so pixels within ~3 km of cloud, ~9 km of land or
 * shallower than 20 m are not judged, nor are blocks whose background is turbid (more than 3e-4 above
 * the day's median sea background: plume water), and a lone flagged pixel with no flagged neighbour
 * is dropped, and an output cell more than half flagged is not judged at all (mats are thin streaks;
 * a solid bright 6 km cell is glint, plume or a processing stripe, as on 2026-10-29 off Punta Gorda). On 2026-10-26..31 the first cut (4.5 km from land, no turbidity test) put the median
 * detection 9–15 km off the coast along the Tortuguero–San Juan plume. With these and the 8e-4 floor
 * (about 30 quantisation steps; 6e-4 still lit plume edges) it flags 0 to 1% of the judged sea, the
 * clearest being a 70 km streak 30–60 km off Limón on 2026-10-29. The result is indicative, not a
 * calibrated mat density.
 */

export const SARG = {
  /** Background block, pixels (20 × 0.015° = 0.3°), and how many clear pixels it needs. */
  blockPx: 20,
  minBlockValid: 40,
  /** ΔAFAI cut: at least this, and at least `noiseK` robust standard deviations. */
  minDelta: 8e-4,
  noiseK: 5,
  /** Pixels this close to cloud or land are not judged. */
  cloudBufferPx: 2,
  landBufferPx: 6,
  /** A block whose background is this far above the day's median sea background is plume water. */
  turbidDelta: 3e-4,
  /** Mats are thin streaks: an output cell with more of its judged pixels flagged than this is an artefact (glint, plume, stripe) and is not judged. */
  maxCellShare: 0.5,
  /** Shallower than this (m) the bottom can raise AFAI. */
  minDepthM: 20,
  /** Output cell = this many pixels square (4 × 0.015° = 0.06°, ~6.6 km); a cell needs `minValid` judged pixels. */
  aggregate: 4,
  minValid: 4,
} as const;

/**
 * AFAI of a pixel fully covered by floating Sargassum, reflectance units. Coverage within a pixel
 * scales about linearly with ΔAFAI (Wang and Hu 2016 use ~0.02 for MODIS; the exact end member
 * varies by sensor), so a flagged pixel's mat fraction is ΔAFAI / AFAI_FULL.
 */
export const AFAI_FULL = 0.02;

/** Per-pixel result. */
export const NOT_JUDGED = 2, SARGASSUM = 1, CLEAR = 0;

/**
 * Flag Sargassum pixels in one AFAI map. `afai` and `depth` (m, positive down; ≤ 0 or NaN is land)
 * are row-major, row 0 north. Returns CLEAR, SARGASSUM or NOT_JUDGED per pixel; with `fracOut`, also
 * writes each flagged pixel's mat fraction (ΔAFAI / AFAI_FULL, 0 elsewhere).
 */
export function detectSargassum(afai: ArrayLike<number>, depth: ArrayLike<number>, cols: number, rows: number, p: typeof SARG = SARG, fracOut?: Float32Array): Uint8Array {
  const n = cols * rows;
  const out = new Uint8Array(n).fill(NOT_JUDGED);
  const land = new Uint8Array(n), cloud = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const d = depth[i];
    if (!(d > 0)) land[i] = 1;
    else if (!Number.isFinite(afai[i])) cloud[i] = 1;
  }
  const near = (mask: Uint8Array, k: number) => {
    const o = new Uint8Array(n);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (!mask[r * cols + c]) continue;
        for (let rr = Math.max(0, r - k); rr <= Math.min(rows - 1, r + k); rr++)
          for (let cc = Math.max(0, c - k); cc <= Math.min(cols - 1, c + k); cc++) o[rr * cols + cc] = 1;
      }
    return o;
  };
  const nearCloud = near(cloud, p.cloudBufferPx), nearLand = near(land, p.landBufferPx);

  // Background: median of each block's clear sea pixels.
  const delta = new Float32Array(n).fill(NaN);
  const bgOf = new Float32Array(n).fill(NaN);
  const B = p.blockPx;
  for (let r0 = 0; r0 < rows; r0 += B)
    for (let c0 = 0; c0 < cols; c0 += B) {
      const vals: number[] = [];
      for (let r = r0; r < Math.min(rows, r0 + B); r++)
        for (let c = c0; c < Math.min(cols, c0 + B); c++) {
          const i = r * cols + c;
          if (!land[i] && Number.isFinite(afai[i])) vals.push(afai[i]);
        }
      if (vals.length < p.minBlockValid) continue;
      const bg = median(vals);
      for (let r = r0; r < Math.min(rows, r0 + B); r++)
        for (let c = c0; c < Math.min(cols, c0 + B); c++) {
          const i = r * cols + c;
          if (!land[i] && Number.isFinite(afai[i])) (delta[i] = afai[i] - bg), (bgOf[i] = bg);
        }
    }

  const open = (i: number) => Number.isFinite(delta[i]) && !nearCloud[i] && !nearLand[i] && depth[i] >= p.minDepthM;
  const bgs: number[] = [];
  for (let i = 0; i < n; i++) if (open(i)) bgs.push(bgOf[i]);
  if (!bgs.length) return out;
  const turbid = median(bgs) + p.turbidDelta;
  const judged = (i: number) => open(i) && bgOf[i] <= turbid;
  const abs: number[] = [];
  for (let i = 0; i < n; i++) if (judged(i)) abs.push(Math.abs(delta[i]));
  if (!abs.length) return out;
  const cut = Math.max(p.minDelta, p.noiseK * 1.4826 * median(abs));
  for (let i = 0; i < n; i++) if (judged(i)) out[i] = delta[i] > cut ? SARGASSUM : CLEAR;
  // Drop lone pixels: a mat is a streak, a single bright pixel is usually noise.
  const lone: number[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (out[r * cols + c] !== SARGASSUM) continue;
      let nb = 0;
      for (let rr = Math.max(0, r - 1); rr <= Math.min(rows - 1, r + 1); rr++)
        for (let cc = Math.max(0, c - 1); cc <= Math.min(cols - 1, c + 1); cc++) if ((rr !== r || cc !== c) && out[rr * cols + cc] === SARGASSUM) nb++;
      if (!nb) lone.push(r * cols + c);
    }
  for (const i of lone) out[i] = CLEAR;
  const A = p.aggregate;
  for (let r0 = 0; r0 < rows; r0 += A)
    for (let c0 = 0; c0 < cols; c0 += A) {
      let judgedN = 0, hit = 0;
      for (let r = r0; r < Math.min(rows, r0 + A); r++)
        for (let c = c0; c < Math.min(cols, c0 + A); c++) {
          const x = out[r * cols + c];
          if (x !== NOT_JUDGED) (judgedN++, x === SARGASSUM && hit++);
        }
      if (judgedN && hit / judgedN > p.maxCellShare)
        for (let r = r0; r < Math.min(rows, r0 + A); r++) for (let c = c0; c < Math.min(cols, c0 + A); c++) out[r * cols + c] = NOT_JUDGED;
    }
  if (fracOut) for (let i = 0; i < n; i++) fracOut[i] = out[i] === SARGASSUM ? Math.min(1, delta[i] / AFAI_FULL) : 0;
  return out;
}

/**
 * Per `f`×`f` block, the share of judged pixels flagged, or with `frac` the mean mat fraction over
 * the judged pixels (the share of the sea surface covered by weed). NaN where fewer than `minValid`
 * were judged (cloud, land or coast: unknown, not clear). Row 0 north, like the input.
 */
export function aggregateCover(codes: Uint8Array, cols: number, rows: number, f: number = SARG.aggregate, minValid: number = SARG.minValid, frac?: ArrayLike<number>): { cover: Float32Array; cols: number; rows: number } {
  const oc = Math.ceil(cols / f), or = Math.ceil(rows / f);
  const cover = new Float32Array(oc * or).fill(NaN);
  for (let R = 0; R < or; R++)
    for (let C = 0; C < oc; C++) {
      let valid = 0, hit = 0;
      for (let r = R * f; r < Math.min(rows, R * f + f); r++)
        for (let c = C * f; c < Math.min(cols, C * f + f); c++) {
          const x = codes[r * cols + c];
          if (x === NOT_JUDGED) continue;
          valid++;
          if (x === SARGASSUM) hit += frac ? frac[r * cols + c] : 1;
        }
      if (valid >= minValid) cover[R * oc + C] = hit / valid;
    }
  return { cover, cols: oc, rows: or };
}

function median(xs: number[]): number {
  xs.sort((a, b) => a - b);
  const m = xs.length >> 1;
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}
