/**
 * Sanity ranges on everything the FORECAST page reads from the model (PLAN 7.69), hour by hour for a week at
 * several spots: no NaN, no negative heights or speeds, UV 0..15, percentages 0..100, visibility above zero,
 * directions 0..360, scores on their scales.
 */
import { describe, expect, it } from 'vitest';
import { daysAt, FC_ACTIVITIES, timeline, type FcRead, type TimelineHour } from './model';
import { DAY0, full, H, spot } from './testkit';

const SPOTS_TRIED = ['SALSA BRAVA', 'PLAYA COCLES', 'PUNTA CAHUITA', 'PUNTA UVA'];
type Check = [string, number | null | undefined, number, number];

function checksOf(h: TimelineHour): Check[] {
  const r: FcRead = h.read;
  const out: Check[] = [
    ['wind kt', h.windKt, 0, 120], ['wind from', h.windFromDeg, 0, 360], ['gust kt', h.gustKt, 0, 150], ['rain mm/h', h.rainMmH, 0, 300],
    ['tide m', h.tideM, -1.5, 1.5], ['air °C', h.airC, 5, 45], ['feels °C', h.feelsC, 5, 60], ['cloud %', h.cloudPct, 0, 100],
    ['rain %', h.rainPct, 0, 100], ['humidity %', h.humidityPct, 0, 100], ['UV', h.uv, 0, 15], ['squall', h.squall, 0, 2],
    ['share', r.share, 0, 1], ['level', r.level, 0, 4],
    ['score', r.score, 0, r.activity === 'surf' ? 10 : 100],
  ];
  if (r.surf) out.push(['hb m', r.surf.hb, 0, 15], ['range lo', r.surf.range[0], 0, 15], ['range hi', r.surf.range[1], r.surf.range[0], 15], ['hs m', r.surf.hs, 0, 15], ['tp s', r.surf.tp, 0, 30], ['swell dir', r.surf.dir, 0, 360], ['surf wind kt', r.surf.windKt, 0, 120], ['surf wind from', r.surf.windFromDeg, 0, 360]);
  if (r.fish) out.push(['moon illum', r.fish.moonIllum, 0, 1]);
  if (r.water) out.push(['vis m', r.water.visM, 0.01, 60], ['surge m/s', r.water.surgeMs, 0, 5], ['breaker m', r.water.breakerM, 0, 15], ['current kt', r.water.currentKt, 0, 10], ['water over reef m', r.water.waterM, 0, 30], ['depth m', r.water.depthM, 0, 60], ['water wind kt', r.water.windKt, 0, 120], ['water UV', r.water.uv, 0, 15]);
  if (r.swim) out.push(['rip score', r.swim.ripScore, 0, 1], ['shore break m', r.swim.breakerM, 0, 15], ['swim UV', r.swim.uv, 0, 15], ['swim feels', r.swim.feelsC, 5, 60], ['swim air', r.swim.airC, 5, 45], ['swim wind', r.swim.windKt, 0, 120], ['sst', r.swim.sstC, 15, 40]);
  if (r.sail) out.push(['sail wind', r.sail.windKt, 0, 120], ['sail gust', r.sail.gustKt, 0, 150], ['sail from', r.sail.fromDeg, 0, 360], ['sail swell', r.sail.swellM, 0, 15], ['sail squall', r.sail.squall, 0, 2]);
  return out;
}

describe('model outputs stay in range (PLAN 7.69)', () => {
  for (const a of FC_ACTIVITIES)
    it(`${a}: a week at four spots, every hour`, () => {
      const deps = full();
      let n = 0;
      for (const name of SPOTS_TRIED) {
        const sp = spot(name);
        const plan = daysAt(deps, a, sp, DAY0 + 10 * H, 7);
        for (const d of plan.days) {
          if (!d) continue;
          expect(d.endMs).toBeGreaterThan(d.startMs);
          expect(d.startMs).toBeGreaterThanOrEqual(d.dayMs);
          expect(d.endMs).toBeLessThanOrEqual(d.dayMs + 24 * H);
        }
        for (const h of timeline(deps, a, sp, plan.startMs))
          for (const [k, v, lo, hi] of checksOf(h)) {
            if (v === null || v === undefined) continue;
            n++;
            expect(Number.isFinite(v), `${a} ${name} ${k} at ${new Date(h.ms).toISOString()}: ${v}`).toBe(true);
            expect(v, `${a} ${name} ${k}`).toBeGreaterThanOrEqual(lo);
            expect(v, `${a} ${name} ${k}`).toBeLessThanOrEqual(hi);
          }
      }
      expect(n).toBeGreaterThan(1000);
    });
});
