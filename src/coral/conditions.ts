/**
 * The conditions snapshot saved with each coral visit (PLAN 7.36): heat at the nearest Coral Reef
 * Watch reef, MUD WEEKS (PLAN 7.39) plus the same inputs as the CORAL drawer's risk rows, frozen at the moment of logging
 * so the site's history keeps them after the live feeds move on. Pure: the caller reads the feeds.
 */
import type { CoralNow } from '../adapters/coral-parse';
import type { RiskInputs } from './risks';
import type { Conditions } from './store';

const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);
const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** A snapshot from whatever is loaded; missing or non-finite readings are left out. */
export function buildConditions(at: number, heat: CoralNow | null, risks: Omit<RiskInputs, 'alert'> | null, mudWeeks: number | null = null): Conditions {
  const c: Conditions = { at };
  if (heat) {
    c.reefId = heat.reef.id;
    if (fin(heat.dhw)) c.dhw = r(heat.dhw, 2);
    if (heat.alert !== null) c.alert = heat.alert;
    if (fin(heat.sst)) c.sstC = r(heat.sst, 2);
    if (fin(heat.sstAnomaly)) c.sstAnomalyC = r(heat.sstAnomaly, 2);
  }
  if (risks) {
    if (fin(risks.flowRatio)) c.flowRatio = r(risks.flowRatio, 2);
    if (fin(risks.rainMm)) c.rainMm = r(risks.rainMm, 1);
    if (fin(risks.hsM)) c.hsM = r(risks.hsM, 2);
    if (fin(risks.lowTideM)) c.lowTideM = r(risks.lowTideM, 2);
    if (risks.sargassum) c.sargassum = risks.sargassum;
  }
  if (fin(mudWeeks)) c.mudWeeks = r(mudWeeks, 2);
  return c;
}
