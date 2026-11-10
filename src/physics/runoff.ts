/**
 * From catchment rain to river mud at the sea (PLAN 7.50): how wet the ground already is, how hard
 * the rain falls, and how long the river runs brown afterwards. Pure, hourly steps, no DOM.
 *
 * 1. Runoff, SCS curve number (USDA NRCS, National Engineering Handbook part 630 ch. 10; TR-55, 1986).
 *    Within a storm (rain with no dry gap of STORM_GAP_H or more), cumulative runoff Q from cumulative
 *    rain P is Q = (P − Ia)² / (P − Ia + S) for P > Ia, with S = 25.4·(1000/CN − 10) mm and Ia = 0.2·S.
 *    Each hour's runoff is the step in Q, so the first rain soaks in and the later rain of a long storm
 *    runs off more.
 * 2. Wet ground. The curve number follows the rain of the 5 days before the storm (antecedent moisture,
 *    NEH-4 growing-season limits: drier than 36 mm is class I, wetter than 53 mm class III), with
 *    CN_I = 4.2·CN / (10 − 0.058·CN) and CN_III = 23·CN / (10 + 0.13·CN) (Chow, Maidment & Mays 1988,
 *    Applied Hydrology, eqs. 5.5.4 and 5.5.5). Between the limits it is interpolated, so a few mm more
 *    rain never makes a jump. On CN 78 ground S is 72 mm normally, 155 mm dry and 30 mm soaked.
 * 3. The river. Hourly runoff drains through a linear reservoir whose time constant is the SCS
 *    watershed lag, L = ℓ^0.8·(S + 1)^0.7 / (1900·√Y) hours (ℓ hydraulic length in ft, S in inches,
 *    Y mean land slope in %; NEH-4 ch. 15). The length comes from the catchment area through Hack's
 *    law, ℓ = 1.4·A^0.6 (miles, square miles; Hack 1957, USGS Prof. Paper 294-B), which gives 150 km
 *    for the Sixaola (its main stem is about 146 km). The lag is about 10 h for the Sixaola and 2 h for
 *    the Bananito, so a big river smooths a downpour and a small one passes it straight to the sea.
 * 4. Intensity. Suspended mud rises faster than the flow: concentration goes as Q^(b − 1), so the
 *    load as Q^b, with b = SEDIMENT_RATING_B (rating-curve exponents are mostly 1 to 2; Asselman 2000,
 *    J. Hydrology 234: 228-248). A burst gives a sharper flood peak than the same rain spread over a
 *    day and so more mud, most of all from the small, fast rivers.
 * 5. At sea. The mud the river delivers clears with e-folding time PLUME_SEA_S (dilution and settling,
 *    about a day, the rule of thumb the plume used before) and is tracked with its mean age, which the
 *    drift uses.
 *
 * Strength is the load in the sea against the peak a reference storm gives the same river:
 * REF_STORM_MM spread evenly over a day on normally wet ground makes a full plume, the same scale the
 * plume used before (PLAN 6.1). Not calibrated against river or turbidity data: the curve number, slope
 * and b are textbook values for this kind of catchment.
 */

const H = 3600;
/** Curve number for normal (class II) moisture: forest, banana and pasture on clay loams, hydrologic group C to D. */
export const CN_II = 78;
/** A dry gap this long ends a storm, hours (a common event split for hourly rain). */
export const STORM_GAP_H = 6;
/** Antecedent 5-day rain limits for moisture classes I and III, growing season, mm (NEH-4). */
export const AMC_DRY_MM = 36;
export const AMC_WET_MM = 53;
/** Mean land slope of the catchments, % (Talamanca foothills and the coastal plain together; an assumption). */
export const CATCHMENT_SLOPE_PCT = 25;
/** Sediment rating exponent: load ∝ discharge^b. */
export const SEDIMENT_RATING_B = 1.5;
/** How fast river mud clears at sea, e-folding, s. */
export const PLUME_SEA_S = 24 * H;
/** The storm that makes a full plume: this much rain, evenly over 24 h, on class II ground, mm. */
export const REF_STORM_MM = 60;

/** Potential retention S, mm, for a curve number. */
export const retentionMm = (cn: number) => 25.4 * (1000 / cn - 10);

/** Cumulative SCS runoff, mm, from cumulative storm rain `p` mm on ground with retention `s` mm. */
export function scsRunoff(p: number, s: number): number {
  const ia = 0.2 * s;
  return p > ia ? (p - ia) ** 2 / (p - ia + s) : 0;
}

/** Curve number for the 5-day rain before a storm, mm: class I at none, II at AMC_DRY_MM, III from AMC_WET_MM, interpolated between; NaN (unknown) is class II. */
export function curveNumber(antecedentMm: number, cn = CN_II): number {
  const dry = (4.2 * cn) / (10 - 0.058 * cn), wet = (23 * cn) / (10 + 0.13 * cn);
  if (!Number.isFinite(antecedentMm)) return cn;
  const a = Math.max(0, antecedentMm);
  if (a <= AMC_DRY_MM) return dry + ((cn - dry) * a) / AMC_DRY_MM;
  if (a <= AMC_WET_MM) return cn + ((wet - cn) * (a - AMC_DRY_MM)) / (AMC_WET_MM - AMC_DRY_MM);
  return wet;
}

/** SCS watershed lag, h, for a catchment of `areaKm2` (Hack's-law length), curve number and slope. */
export function lagHours(areaKm2: number, cn = CN_II, slopePct = CATCHMENT_SLOPE_PCT): number {
  const mi2 = areaKm2 / 2.58999;
  const lFt = 1.4 * mi2 ** 0.6 * 5280;
  const sIn = 1000 / cn - 10;
  return (lFt ** 0.8 * (sIn + 1) ** 0.7) / (1900 * Math.sqrt(slopePct));
}

/** Hourly runoff, mm, from hourly rain (NaN counts as dry), each storm on the ground its previous 5 days left (class II in the first 5 days of the record). */
export function hourlyRunoff(rainMmH: readonly number[]): Float64Array {
  const n = rainMmH.length;
  const rain = Float64Array.from(rainMmH, (x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const out = new Float64Array(n);
  let dry = STORM_GAP_H, p = 0, q = 0, s = retentionMm(CN_II);
  for (let i = 0; i < n; i++) {
    if (rain[i] <= 0) {
      dry++;
      continue;
    }
    if (dry >= STORM_GAP_H) {
      // A new storm: the ground is as wet as the last 5 days made it.
      let ante = 0;
      for (let k = Math.max(0, i - 120); k < i; k++) ante += rain[k];
      s = retentionMm(curveNumber(i >= 120 ? ante : NaN));
      p = 0;
      q = 0;
    }
    dry = 0;
    p += rain[i];
    const qNew = scsRunoff(p, s);
    out[i] = qNew - q;
    q = qNew;
  }
  return out;
}

export interface MudSeries {
  /** Load in the sea against the reference storm's peak, ≥ 0 (1 = full plume). Same hours as the rain. */
  strength: Float64Array;
  /** Load-weighted mean age of that mud, s. */
  ageS: Float64Array;
}

/**
 * River mud in the sea, hour by hour, for one catchment. The reference storm starts the record, so it
 * falls on class II ground. Each hour's value is the state at that hour's
 * end, so with hour-start `times` it is valid an hour later.
 */
export function riverMud(rainMmH: readonly number[], areaKm2: number): MudSeries {
  const k = lagHours(areaKm2);
  const run = (q: ArrayLike<number>) => {
    const n = q.length;
    const strength = new Float64Array(n), ageS = new Float64Array(n);
    const ek = Math.exp(-1 / k), es = Math.exp(-H / PLUME_SEA_S);
    let store = 0, mud = 0, mudAge = 0;
    for (let i = 0; i < n; i++) {
      // Linear reservoir over the hour, inflow steady within it (exact solution).
      const outflow = store * (1 - ek) + q[i] * (1 - k * (1 - ek));
      store += q[i] - outflow;
      const load = Math.max(0, outflow) ** SEDIMENT_RATING_B;
      // Mud at sea: an hour older and thinner, plus this hour's (half an hour old on average).
      mudAge = (mudAge + mud * H) * es;
      mud *= es;
      mud += load;
      mudAge += load * H * 0.5;
      strength[i] = mud;
      ageS[i] = mud > 0 ? mudAge / mud : 0;
    }
    return { strength, ageS };
  };
  const peak = Math.max(...run(hourlyRunoff([...Array(24).fill(REF_STORM_MM / 24), ...Array(96).fill(0)])).strength);
  const got = run(hourlyRunoff(rainMmH));
  if (peak > 0) for (let i = 0; i < got.strength.length; i++) got.strength[i] /= peak;
  return got;
}
