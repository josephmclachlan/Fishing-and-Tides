/**
 * How fast a fish loses its freshness after it is caught, by how it was killed and kept (DISPATCH page).
 * Pure, SI-free (hours, per cent), no DOM. The measure is the K-value (Saito 1959): the share of the muscle's ATP
 * breakdown products that has reached inosine and hypoxanthine, K = (HxR + Hx) / (ATP + ADP + AMP + IMP + HxR + Hx).
 * Low K is fresh; raw-eating grade is under about 20 %, good for cooking under about 40 %, and over about 60 % the
 * fish is going off (bands from Japanese freshness work; secondary sources, see content.ts SOURCES).
 *
 * The curves are ESTIMATES, built from a few measured anchors:
 *  - On ice (0 °C) K climbs about 0.2 % an hour, about 5 % a day. Tomioka and Endo 1984 measured 0.2 to 8.4 % a day at
 *    0 °C across 14 species (1.4 to 5.0 in red-meat fish). The Kyoto flathead flounder test (K 7 % at 30 h and 30 % at
 *    54 h with the spinal cord destroyed, 17 % and 37 % with the brainstem cut) was kept at 4 to 5 °C, so its 0.8 to
 *    1 % an hour is a fridge rate, not an ice rate. It also fits the page's fridge line: about twice the ice rate.
 *  - Spoilage runs about e^(0.12 T) times as fast at T °C as at 0 °C (Dalgaard and Huss 1994), about 25 to 30 times at
 *    28 to 30 °C, so a fish left in the tropical shade lasts hours, not days. The warm rate here (5 %/h, 25 times the ice rate) is chosen so
 *    a bled fish in the shade reaches K 60 in 9 to 12 h, the 8 to 12 h edibility range estimated for 30 °C.
 *  - Starting K is higher the harder the fish fought and the longer it took to die (stress uses up ATP and glycogen
 *    before death: Huss 1995; Ando et al. 1996 for the delay in rigor from destroying the spinal cord).
 * Nothing here is a measurement of a Costa Rican fish: the page says so.
 */
export type Method =
  | 'ikejime'
  | 'stun-ice'
  | 'gill-shade'
  | 'hit-leave'
  | 'gut-nobleed'
  | 'suffocate'
  | 'suffocate-ice';

/** A stretch of time at one rate: until `h` hours after death, K rises `rate` per cent an hour. */
interface Phase { until: number; rate: number }
export interface Curve {
  /** K at death, per cent. */
  k0: number;
  phases: readonly Phase[];
}

export const ICE_RATE = 0.2;
export const WARM_RATE = 5;

export const CURVES: Record<Method, Curve> = {
  // Spike and wire, bled in seawater, ice slurry within the hour: the slowest start and the cold rate throughout.
  ikejime: { k0: 5, phases: [{ until: Infinity, rate: ICE_RATE }] },
  // A good blow or a spike, gills cut, bled, then ice: a little more stress than ikejime.
  'stun-ice': { k0: 9, phases: [{ until: Infinity, rate: ICE_RATE }] },
  // Bled well but kept in the shade or a wet sack: the fish itself is good, the heat is what ruins it.
  'gill-shade': { k0: 10, phases: [{ until: Infinity, rate: WARM_RATE }] },
  // Hit once and left in the boat, no ice: stress, blood left in the flesh and warm all day.
  'hit-leave': { k0: 22, phases: [{ until: Infinity, rate: WARM_RATE }] },
  // Gutted, never bled, no ice: the blood stays in the meat; gutting takes out the gut bacteria, so slightly slower.
  'gut-nobleed': { k0: 20, phases: [{ until: Infinity, rate: WARM_RATE * 0.9 }] },
  // Left to die on the boards: minutes of struggle spend the ATP and glycogen, then the whole day in the warm.
  suffocate: { k0: 35, phases: [{ until: Infinity, rate: WARM_RATE * 1.1 }] },
  // The same fish, only iced two hours later: the ice saves the day but not the start.
  'suffocate-ice': { k0: 35, phases: [{ until: 2, rate: WARM_RATE * 1.1 }, { until: Infinity, rate: ICE_RATE }] },
};

export const METHODS = Object.keys(CURVES) as Method[];

/** K-value bands: under RAW is sashimi grade, under GOOD good to cook, under OK still fit to eat cooked, then off. */
export const K_BANDS = { raw: 20, good: 40, ok: 60 } as const;
export type Grade = 'raw' | 'good' | 'ok' | 'off';

export const gradeOf = (k: number): Grade => (k < K_BANDS.raw ? 'raw' : k < K_BANDS.good ? 'good' : k < K_BANDS.ok ? 'ok' : 'off');

/** K-value in per cent, `h` hours after death. */
export function kAt(m: Method, h: number): number {
  const c = CURVES[m];
  let k = c.k0;
  let from = 0;
  for (const p of c.phases) {
    const to = Math.min(h, p.until);
    if (to > from) k += (to - from) * p.rate;
    from = p.until;
    if (h <= p.until) break;
  }
  return Math.min(100, k);
}

/** Freshness on the chart's scale: 100 is just caught, 0 is spoiled through. */
export const freshness = (m: Method, h: number) => 100 - kAt(m, h);

/** Hours until K first reaches `k` per cent (Infinity if never within 1000 h). */
export function hoursTo(m: Method, k: number): number {
  const c = CURVES[m];
  if (c.k0 >= k) return 0;
  let at = c.k0;
  let from = 0;
  for (const p of c.phases) {
    const span = Math.min(p.until, 1000) - from;
    const gain = span * p.rate;
    if (at + gain >= k) return from + (k - at) / p.rate;
    at += gain;
    from = p.until;
    if (from >= 1000) break;
  }
  return Infinity;
}

/** The best of a list of hours, as days when long: 9.4 -> "9 h", 62 -> "2.6 d". */
export function span(h: number): { n: number; unit: 'h' | 'd' } {
  return h < 48 ? { n: Math.round(h * 10) / 10, unit: 'h' } : { n: Math.round((h / 24) * 10) / 10, unit: 'd' };
}

/** The longest time the chart shows, hours. */
export const CHART_H = 72;
/** Chart position (0 to 1) of an hour: a square-root scale, so the first hours, where the warm methods are lost, get room. */
export const posOf = (h: number) => Math.sqrt(Math.min(Math.max(h, 0), CHART_H) / CHART_H);
export const hourAt = (p: number) => Math.min(Math.max(p, 0), 1) ** 2 * CHART_H;

export interface Seg { grade: Grade; from: number; to: number }
/** The grades a method passes through within the chart, as hour ranges that cover 0 to CHART_H with no gap. */
export function segments(m: Method): Seg[] {
  const edges = [K_BANDS.raw, K_BANDS.good, K_BANDS.ok].map((k) => Math.min(hoursTo(m, k), CHART_H));
  const grades: Grade[] = ['raw', 'good', 'ok', 'off'];
  const out: Seg[] = [];
  let from = 0;
  [...edges, CHART_H].forEach((to, i) => {
    if (to > from) out.push({ grade: grades[i], from, to });
    from = Math.max(from, to);
  });
  return out;
}
