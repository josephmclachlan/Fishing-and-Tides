/**
 * Every number the FORECAST page shows, checked against the model (PLAN 7.69): the headline, the reasons, the
 * tiles, the spot cards, the 7 days, the readout and the best window, each with its unit, rounding and local
 * (Costa Rica, UTC-6) time, from the fixed fixture in testkit.ts. The expected values are worked out here from the
 * model's own readings, independently of view.ts's formatting helpers where that is practical.
 */
import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import { localDayStart, moonPhase } from '../physics/astro';
import { tideState } from '../physics/tide';
import { chartLayout, rowLabels, rowsFor } from './charts';
import {
  dayUvPeaks, dayWeather, daysAt, FC_ACTIVITIES, hourWeather, readAt, timeline, waterAt, type FcActivity, type FcDeps, type TimelineHour,
} from './model';
import {
  bestTimeView, coverPlace, daysView, headline, heroView, reasons, moonAgeDays, readoutView, rowText, signed2, spotView, tilesFor, withUnit, type TileView, type ViewCtx,
} from './view';
import { DAY0, full, H, spot } from './testkit';

const NOW = DAY0 + 10 * H; // Wednesday 4 November 2026, 10:00 in Costa Rica (16:00 UTC)
const SPOT_OF: Record<FcActivity, string> = { surf: 'SALSA BRAVA', fish: 'PUNTA UVA', snorkel: 'PUNTA CAHUITA', dive: 'PUNTA CAHUITA', spear: 'PUNTA UVA', swim: 'PLAYA COCLES', sail: 'PLAYA COCLES' };
/** Local wall clock at UTC-6, worked out by hand: "HH:MM", seconds dropped as a clock does. */
const clock = (ms: number) => {
  const m = Math.floor(((((ms / 6e4 - 6 * 60) % 1440) + 1440) % 1440));
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const r0 = (x: number) => String(Math.round(x));
const r1 = (x: number) => x.toFixed(1);
const BAD = /NaN|undefined|Infinity|null/;

function setup(a: FcActivity, deps: FcDeps = full(), ms = NOW) {
  const sp = spot(SPOT_OF[a]);
  const plan = daysAt(deps, a, sp, NOW, 7);
  const tl = timeline(deps, a, sp, plan.startMs);
  const ctx: ViewCtx = { deps, spot: sp, act: a, ms, nowMs: NOW, plan, tl };
  const r = readAt(deps, a, sp, ms);
  const day = tl.slice(Math.round((localDayStart(ms, -6) - tl[0].ms) / H)).slice(0, 24);
  const hour = tl[Math.round((ms - tl[0].ms) / H)];
  return { deps, sp, plan, tl, ctx, r, day, dw: dayWeather(day), hour };
}
const tile = (list: TileView[], kind: TileView['kind']) => {
  const x = list.find((y) => y.kind === kind);
  expect(x, kind).toBeDefined();
  return x!;
};

describe('local time (Costa Rica, UTC-6)', () => {
  it('shows the fixture\'s hours as Costa Rica wall clock', () => {
    const { tl } = setup('surf');
    expect(new Date(tl[0].ms).toISOString()).toBe('2026-11-04T06:00:00.000Z');
    expect(clock(NOW)).toBe('10:00');
    const rv = readoutView(tl[10], 'surf', rowsFor('surf'));
    expect(rv.time).toBe('10:00');
    expect(rv.day).toBe('Wed 4');
  });
});

describe('the headline and the hero', () => {
  it('surf: the breaker range to 0.1 m and the score to 0.1 of 10', () => {
    const { r, plan } = setup('surf');
    const [lo, hi] = r.surf!.range;
    expect(headline(r)).toEqual({ value: lo === hi ? r1(lo) : `${r1(lo)}–${r1(hi)}`, unit: 'm' });
    const v = heroView(r, { plan, ms: NOW });
    expect(v.score).toBe(`${r1(r.score!)}/10`);
    expect(v.segs).toBeCloseTo(r.score!, 9);
    expect(v.label).toBe(t('fc.metric.surf'));
    expect(v.reasons).toContain(`${r0(r.surf!.tp)} s · NNE`.replace('NNE', v.reasons[1].split(' · ')[1]));
  });
  it('fish and swim: the score out of 100, whole', () => {
    for (const a of ['fish', 'swim'] as const) {
      const { r, plan } = setup(a, full(), a === 'swim' ? DAY0 + 11 * H : NOW);
      expect(r.score).not.toBeNull();
      expect(headline(r)).toEqual({ value: r0(r.score!), unit: '/100' });
      expect(heroView(r, { plan, ms: NOW }).score).toBeNull();
    }
  });
  it('snorkel and dive: visibility whole metres from 10 m, 0.1 m below; the outing score out of 100', () => {
    for (const a of ['snorkel', 'dive'] as const) {
      const { r, plan } = setup(a);
      expect(headline(r)).toEqual({ value: r0(r.water!.visM!), unit: 'm' });
      expect(heroView(r, { plan, ms: NOW }).score).toBe(`${r0(r.score!)}/100`);
    }
    const murky = setup('snorkel', { env: full().env, outing: () => ({ score: 40, reasons: [], surgeMs: 0.1, visM: 6.44, breakerM: 0.2 }) });
    expect(headline(murky.r).value).toBe('6.4');
  });
  it('sail: the mean wind in whole knots, the comfort score out of 100', () => {
    const { r, plan } = setup('sail');
    expect(headline(r)).toEqual({ value: r0(r.sail!.windKt!), unit: 'kt' });
    expect(heroView(r, { plan, ms: NOW }).score).toBe(`${r0(r.score!)}/100`);
  });
  it('shows a dash, never a zero, before the feeds load', () => {
    expect(headline({ activity: 'surf', ms: NOW, score: null, share: null, level: null })).toEqual({ value: '--', unit: '' });
  });
});

describe('the conditions tiles', () => {
  for (const a of FC_ACTIVITIES)
    it(`${a}: eight tiles, the weather first, every value from the model`, () => {
      const ms = a === 'swim' ? DAY0 + 11 * H : NOW;
      const s = setup(a, full(), ms);
      const list = tilesFor(s.r, s.ctx);
      expect(list).toHaveLength(8);
      expect(list[0].kind).toBe('weather');
      for (const x of list) for (const str of [x.k, x.v, x.small ?? '', ...x.sub, x.tip ?? '']) expect(str, `${x.kind}: ${str}`).not.toMatch(BAD);

      // The weather tile: the day's high and low, real feel, rain chance and amount, humidity.
      const w = tile(list, 'weather'), dw = s.dw;
      expect(w.v).toBe(`${r0(dw.hiC!)}°`);
      expect(w.small).toBe(`/${r0(dw.loC!)}°`);
      expect(w.sub.join(' ')).toContain(`${r0(dw.feelsMaxC!)}°`);
      expect(w.sub.join(' ')).toContain(`${r0(dw.rainPct!)}%`);
      expect(w.sub.join(' ')).toContain(`${r1(dw.rainMm!)} mm`);
      expect(w.sub.join(' ')).toContain(`${r0(dw.humidityPct!)}%`);
      // UV on every activity: the hour's index, the day's peak.
      const uv = tile(list, 'uv');
      const uvNow = s.r.water?.uv ?? s.r.swim?.uv ?? s.hour.uv;
      expect(uv.v).toBe(r0(uvNow!));
      expect(uv.sub[0]).toContain(`${t('fc.peak')} ${r0(dw.uvMax!)}`);
      expect(dw.uvMax!).toBeGreaterThanOrEqual(uvNow!);
      // Water temperature at the spot, 0.1 °C.
      const sst = waterAt(s.deps.env, s.sp, localDayStart(ms, -6));
      expect(tile(list, 'water').v).toBe(`${r1(sst!)} °C`);
      // Wind tiles: the day's peak is never below the hour shown.
      for (const x of list.filter((y) => y.kind === 'wind' || y.kind === 'chop')) {
        const v = Number(x.v.split(' ')[0]);
        const pk = /(\d+) kt/.exec(x.sub.join(' ').split(t('fc.peak'))[1] ?? '');
        if (pk) expect(Number(pk[1])).toBeGreaterThanOrEqual(v);
      }
    });

  it('surf: swell height to 0.1 m with its period; wind in knots; tide signed to 0.01 m with the next turn in local time', () => {
    const s = setup('surf');
    const list = tilesFor(s.r, s.ctx);
    expect(tile(list, 'swell').v).toBe(`${r1(s.r.surf!.hs)} m`);
    expect(tile(list, 'swell').sub[0]).toContain(`${r0(s.r.surf!.tp)} s`);
    expect(tile(list, 'wind').v).toBe(`${r0(s.r.surf!.windKt!)} kt`);
    const tide = tideState(s.deps.env.tide, NOW);
    const tt = tile(list, 'tide');
    expect(tt.v).toBe(`${(tide.h >= 0 ? '+' : '−') + Math.abs(tide.h).toFixed(2)} m`);
    expect(tt.sub[0]).toContain(clock(tide.next.t));
    expect(tile(list, 'rain').v).toBe(`${r0(s.dw.rainPct!)}%`);
    expect(tile(list, 'rain').sub[0]).toContain(clock(s.dw.rainPeakMs!));
  });
  it('fish: the moon\'s lit share and age in days', () => {
    const s = setup('fish');
    const list = tilesFor(s.r, s.ctx);
    expect(tile(list, 'moon').v).toBe(`${r0(s.r.fish!.moonIllum * 100)}%`);
    expect(tile(list, 'moon').sub[0]).toContain(`day ${r0(moonAgeDays(moonPhase(NOW).elongation))}`);
  });
  it('snorkel: entry surf and water over the reef to 0.1 m, chop in knots, drift to 0.1 kt', () => {
    const s = setup('snorkel');
    const w = s.r.water!;
    const list = tilesFor(s.r, s.ctx);
    expect(tile(list, 'breaker').v).toBe(`${r1(w.breakerM)} m`);
    expect(tile(list, 'chop').v).toBe(`${r0(w.windKt!)} kt`);
    expect(tile(list, 'current').v).toBe(`${r1(w.currentKt!)} kt`);
    expect(tile(list, 'reef').v).toBe(`${r1(w.waterM!)} m`);
  });
  it('dive: surge at depth to 0.01 m/s', () => {
    const s = setup('dive');
    const list = tilesFor(s.r, s.ctx);
    expect(tile(list, 'surge').v).toBe(`${s.r.water!.surgeMs.toFixed(2)} m/s`);
    expect(tile(list, 'surge').k).toContain(`${s.r.water!.depthM} m`);
  });
  it('swim: rip risk, shore break to 0.1 m, real feel and air in whole °C', () => {
    const s = setup('swim', full(), DAY0 + 11 * H);
    const x = s.r.swim!;
    const list = tilesFor(s.r, s.ctx);
    expect(tile(list, 'rip').v).toBe(t(`fc.ripw.${x.rip}`));
    expect(tile(list, 'breaker').v).toBe(`${r1(x.breakerM)} m`);
    expect(tile(list, 'feels').v).toBe(`${r0(x.feelsC!)} °C`);
    expect(tile(list, 'feels').sub[0].toLowerCase()).toContain(`${r0(x.airC!)} °c`);
  });
  it('sail: gusts and mean wind in knots, comfort out of 100, sea to 0.1 m', () => {
    const s = setup('sail');
    const x = s.r.sail!;
    const list = tilesFor(s.r, s.ctx);
    expect(tile(list, 'gust').v).toBe(`${r0(x.gustKt!)} kt`);
    expect(tile(list, 'gust').sub[0]).toContain(`${r0(x.windKt!)} kt`);
    expect(tile(list, 'boat').v).toBe(`${r0(s.r.score!)}/100`);
    expect(tile(list, 'sea').v).toBe(`${r1(x.swellM!)} m`);
  });
  it('best window tile: the day\'s window in local hours', () => {
    const s = setup('surf');
    const win = s.plan.days[0];
    const v = tile(tilesFor(s.r, s.ctx), 'window').v;
    if (win) expect(v).toBe(`${clock(win.startMs).replace(':00', '')}–${clock(win.endMs).replace(':00', '')}`);
    else expect(v).toBe('--');
  });
});

describe('spot cards, the 7 days and the best time', () => {
  it('spot cards: the headline now and the hour\'s air and rain chance', () => {
    const deps = full();
    const sp = spot('PLAYA COCLES');
    const r = readAt(deps, 'surf', sp, NOW);
    const wx = hourWeather(deps.env, sp, NOW);
    const v = spotView(sp, r, [], wx);
    expect(v.value).toBe(headline(r).value);
    expect(v.airC).toBe(`${r0(wx.airC!)}°`);
    expect(v.rainPct).toBe(`${r0(wx.rainPct!)}%`);
    expect(v.name).toBe('Playa Cocles');
  });
  for (const a of FC_ACTIVITIES)
    it(`${a}: each day reads its best window at its start, with the window and the UV peak`, () => {
      const s = setup(a);
      const uvs = dayUvPeaks(s.deps.env, s.sp, s.plan.startMs, 7);
      const days = daysView(s.plan, (ms) => readAt(s.deps, a, s.sp, ms), uvs, 0, false);
      expect(days).toHaveLength(7);
      days.forEach((d, i) => {
        const p = s.plan.days[i];
        expect(d.dn).toBe(String(4 + i));
        expect(d.best).toBe(s.plan.bestDay === i);
        expect(d.height).toBeGreaterThanOrEqual(0);
        expect(d.height).toBeLessThanOrEqual(1);
        if (!p) return void expect(d.window).toBe('—');
        expect(d.value).toBe(headline(readAt(s.deps, a, s.sp, p.startMs)).value);
        expect(d.window).toBe(`${clock(p.startMs).replace(':00', '')}–${clock(p.endMs).replace(':00', '')}`);
        if (uvs[i] !== null) expect(d.uv).toBe(`UV ${r0(uvs[i]!)}`);
      });
      expect(days[0].dd).toBe(t('fc.today'));
    });
  it('best time: WATCH\'s best day, its window in local time and the headline then', () => {
    for (const a of FC_ACTIVITIES) {
      const s = setup(a);
      const b = bestTimeView(s.plan, (ms) => readAt(s.deps, a, s.sp, ms), NOW, false);
      const d = s.plan.bestDay === null ? null : s.plan.days[s.plan.bestDay];
      if (!d) continue;
      expect(b.kind).toBe('best');
      expect(b.when).toContain(`${clock(d.startMs)}–${clock(d.endMs)}`);
      expect(b.value).toBe(withUnit(headline(readAt(s.deps, a, s.sp, d.startMs))));
      expect(b.startMs).toBe(d.startMs);
    }
  });
});

describe('the hour readout and the chart labels', () => {
  for (const a of FC_ACTIVITIES)
    it(`${a}: every readout cell is its row's value at that hour, with its unit`, () => {
      const s = setup(a);
      const rows = rowsFor(a);
      for (const i of [0, 10, 37, 100, 167]) {
        const h: TimelineHour = s.tl[i];
        const rv = readoutView(h, a, rows);
        expect(rv.time).toBe(clock(h.ms));
        rows.forEach((spec, k) => {
          const v = spec.value(h);
          expect(rv.cells[k].v).toBe(v === null ? '--' : rowText(spec, v));
          expect(rv.cells[k].unit).toBe(spec.id === 'uv' ? '' : t(`fc.unit.${spec.id}` as never));
        });
        const wind = rows.findIndex((x) => x.id === 'wind');
        if (wind >= 0 && h.gustKt !== null) expect(rv.cells[wind].extra).toBe(`G${r0(h.gustKt)}`);
      }
    });
  it('labels each row at its own values: the day\'s peaks and the tide\'s turns', () => {
    for (const a of FC_ACTIVITIES) {
      const s = setup(a);
      const L = chartLayout(a, s.tl, 7, false, -6);
      for (const o of L.rows) {
        if (o.t !== 'data') continue;
        for (const l of rowLabels(o.spec, s.tl)) expect(l.v).toBe(o.spec.value(s.tl[l.i]));
        for (const v of o.vals) if (v !== null) (expect(v).toBeGreaterThanOrEqual(o.lo - 1e-9), expect(v).toBeLessThanOrEqual(o.hi + 1e-9));
      }
    }
  });
  it('writes the tide signed to 0.01 m with a real minus sign', () => {
    expect(signed2(0.183)).toBe('+0.18');
    expect(signed2(-0.091)).toBe('−0.09');
    expect(rowText({ id: 'tide', decimals: 2 }, -0.2)).toBe('−0.20');
    expect(rowText({ id: 'surge', decimals: 2 }, 0.126)).toBe('0.13');
    expect(rowText({ id: 'wind', decimals: 0 }, 12.5)).toBe('13');
  });
});

describe('small pure helpers', () => {
  it('moon age: 0 at new moon, half a synodic month at full', () => {
    expect(moonAgeDays(0)).toBe(0);
    expect(moonAgeDays(180)).toBeCloseTo(14.765, 3);
    expect(moonAgeDays(-90)).toBeCloseTo(22.148, 3);
  });
  it('a headline with its unit: a space before m and kt, none before /100', () => {
    expect(withUnit({ value: '72', unit: '/100' })).toBe('72/100');
    expect(withUnit({ value: '1.2', unit: 'm' })).toBe('1.2 m');
    expect(withUnit({ value: '--', unit: '' })).toBe('--');
  });
  it('places the map picture with background-size cover: the spot on the card and kilometres in card pixels', () => {
    // A 720 × 360 picture at 26.6 m per pixel on a 390 × 460 card: scaled by 460/360, cropped left and right.
    const p = coverPlace({ w: 720, h: 360, mPerPx: 26.6 }, { w: 390, h: 460 }, { x: 0.5, y: 0.5 });
    expect(p.x).toBeCloseTo(195, 9);
    expect(p.y).toBeCloseTo(230, 9);
    expect(p.kmPx!).toBeCloseTo((1000 / 26.6) * (460 / 360), 9);
    expect(coverPlace({ w: 720, h: 360, mPerPx: null }, { w: 390, h: 460 }, { x: 0.5, y: 0.5 }).kmPx).toBeNull();
    // A wide card: scaled by width, cropped top and bottom; a point off centre moves with the scale.
    const q = coverPlace({ w: 720, h: 360, mPerPx: 20 }, { w: 1440, h: 460 }, { x: 0.25, y: 0.5 });
    expect(q.x).toBeCloseTo(360, 9);
    expect(q.y).toBeCloseTo(230, 9);
  });
});

describe('swim after dark', () => {
  it('is scored on the conditions, with the dark as a reason, not a red 0/100', () => {
    const { r } = setup('swim', full(), DAY0 + 2 * H);
    expect(r.score).toBeGreaterThan(50);
    expect(reasons(r)).toContain('After dark');
  });
});
