/**
 * Per-town rain summary (PLAN 7.24 item 1). Pure.
 *
 * For a window [from, from + hours):
 *   total_m   = Σ rain of model m over the window, mm (NaN hours count as 0; a model needs a value for
 *               at least half the window to vote, so a model whose run ends early does not read as dry)
 *   amountMm  = mean of total_m over the voting models
 *   chance    = share of voting models with total_m ≥ WET_MM
 * With four models the chance moves in 25 % steps; it is model agreement, not a calibrated probability
 * (that needs town gauges, PLAN 7.24 item 5).
 */
import type { TownRain, TownRainModel } from '../adapters/town-rain';

/** Rain over a window that counts as "wet" for the chance, mm. 0.5 mm is about the smallest a person notices on a walk. */
export const WET_MM = 0.5;

export interface TownRainWindow {
  amountMm: number;
  /** 0..1, share of models that rain at least WET_MM. */
  chance: number;
  /** Models that voted. */
  models: number;
  /** Wettest minus driest model total, mm: a wide spread means the models place the showers differently. */
  spreadMm: number;
}

export function townWindow(d: TownRain, townId: string, fromMs: number, hours: number): TownRainWindow | null {
  const models = d.byTown[townId];
  if (!models) return null;
  const toMs = fromMs + hours * 3.6e6;
  const totals: number[] = [];
  for (const m of Object.keys(models) as TownRainModel[]) {
    const s = models[m]!;
    let sum = 0;
    let have = 0;
    let span = 0;
    d.times.forEach((t, i) => {
      if (t + 3.6e6 <= fromMs || t >= toMs) return;
      span++;
      if (Number.isFinite(s[i])) (sum += s[i]), have++;
    });
    if (span && have * 2 >= Math.max(span, hours)) totals.push(sum);
  }
  if (!totals.length) return null;
  return {
    amountMm: totals.reduce((a, b) => a + b, 0) / totals.length,
    chance: totals.filter((x) => x >= WET_MM).length / totals.length,
    models: totals.length,
    spreadMm: Math.max(...totals) - Math.min(...totals),
  };
}

/** Start of the hour containing `ms`. */
export const hourStart = (ms: number) => Math.floor(ms / 3.6e6) * 3.6e6;
