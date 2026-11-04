/**
 * CORAL panel risk rows (PLAN 7.32): what is stressing a reef today, from feeds the app already has.
 * Pure: the caller reads the feeds and passes plain numbers (null when a feed is missing).
 *
 * Thresholds and why. Heat follows NOAA Coral Reef Watch exactly; the rest are rules of thumb for
 * this coast, stated so they can be tuned against what Raising Coral and SINAC see on the reef:
 *  - HEAT: CRW alert level. ALERT 1 or 2 (DHW ≥ 4 with HotSpot ≥ 1 °C) is high; WATCH or WARNING is watch.
 *  - SEDIMENT: river discharge against its median for the day (GloFAS). Sediment from the Río La Estrella
 *    is the main chronic stress on Cahuita (Cortés & Risk 1984). ≥ 3× median high, ≥ 1.5× watch.
 *  - RUNOFF: effective catchment rain (exponentially weighted, the clarity model's plume rain).
 *    Fresh water, nutrients and town sewage after heavy rain. ≥ 40 mm high, ≥ 15 mm watch.
 *  - SARGASSUM: the beach outlook nearest the reef within 3 days. Rotting mats shade and starve
 *    nearshore reefs of oxygen. HIGH high, LOW or MODERATE watch.
 *  - STORM SWELL: significant wave height at the reef. Breaks branching Acropora and outplants.
 *    ≥ 2.5 m high, ≥ 1.5 m watch.
 *  - LOW TIDE: lowest predicted tide at Limón in the next 24 h. The Caribbean range is small, so only the
 *    lowest spring lows (towards LAT −0.29 m) leave the reef flats awash in the sun. ≤ −0.20 m watch.
 */
export type RiskLevel = 'ok' | 'watch' | 'high' | 'none';
export type RiskId = 'heat' | 'sediment' | 'runoff' | 'sargassum' | 'swell' | 'lowtide';

export interface RiskInputs {
  /** CRW alert level 0..4 (7-day BAA). */
  alert: number | null;
  /** River discharge / median, for the reef's river. */
  flowRatio: number | null;
  /** Effective catchment rain for the reef's river, mm. */
  rainMm: number | null;
  /** Worst sargassum level at the nearest beach in the next 3 days. */
  sargassum: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | null;
  /** Significant wave height at the reef, m. */
  hsM: number | null;
  /** Lowest predicted tide in the next 24 h, m relative to MSL. */
  lowTideM: number | null;
}

export interface RiskRow {
  id: RiskId;
  level: RiskLevel;
  /** Short reading for the row, or '' when there is no data. */
  value: string;
}

export const RISK = {
  flowHigh: 3, flowWatch: 1.5,
  rainHigh: 40, rainWatch: 15,
  hsHigh: 2.5, hsWatch: 1.5,
  lowTideWatch: -0.2,
} as const;

const band = (x: number | null, watch: number, high: number): RiskLevel => (x === null || !Number.isFinite(x) ? 'none' : x >= high ? 'high' : x >= watch ? 'watch' : 'ok');

export function coralRisks(i: RiskInputs): RiskRow[] {
  const heat: RiskLevel = i.alert === null ? 'none' : i.alert >= 3 ? 'high' : i.alert >= 1 ? 'watch' : 'ok';
  const sarg: RiskLevel = i.sargassum === null ? 'none' : i.sargassum === 'HIGH' ? 'high' : i.sargassum === 'NONE' ? 'ok' : 'watch';
  const low: RiskLevel = i.lowTideM === null || !Number.isFinite(i.lowTideM) ? 'none' : i.lowTideM <= RISK.lowTideWatch ? 'watch' : 'ok';
  const f = (x: number | null, d: number, unit: string) => (x === null || !Number.isFinite(x) ? '' : `${x.toFixed(d)}${unit}`);
  return [
    { id: 'heat', level: heat, value: '' },
    { id: 'sediment', level: band(i.flowRatio, RISK.flowWatch, RISK.flowHigh), value: f(i.flowRatio, 1, '×') },
    { id: 'runoff', level: band(i.rainMm, RISK.rainWatch, RISK.rainHigh), value: f(i.rainMm, 0, ' mm') },
    { id: 'sargassum', level: sarg, value: '' },
    { id: 'swell', level: band(i.hsM, RISK.hsWatch, RISK.hsHigh), value: f(i.hsM, 1, ' m') },
    { id: 'lowtide', level: low, value: f(i.lowTideM, 2, ' m') },
  ];
}

/** Worst sargassum level over several days. */
export function worstSarg(levels: readonly ('NONE' | 'LOW' | 'MODERATE' | 'HIGH' | null)[]): 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | null {
  const order = ['NONE', 'LOW', 'MODERATE', 'HIGH'] as const;
  let best = -1;
  for (const l of levels) if (l !== null) best = Math.max(best, order.indexOf(l));
  return best < 0 ? null : order[best];
}
