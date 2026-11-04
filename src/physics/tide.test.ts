import { describe, expect, it } from 'vitest';
import { LIMON_DATUMS, LIMON_HARMONICS } from '../data/tides-limon';
import fixture from './fixtures/limon-2024-03.json';
import { argument, astro, extrema, fitHarmonics, predict, rmsError, speed, tideHeightM, tideState, type Harmonics } from './tide';

const HOUR = 3_600_000;

describe('astronomical arguments', () => {
  it('constituent speeds match the published values (deg/h)', () => {
    expect(speed('M2')).toBeCloseTo(28.9841042, 5);
    expect(speed('S2')).toBeCloseTo(30, 5);
    expect(speed('K1')).toBeCloseTo(15.0410686, 5);
    expect(speed('O1')).toBeCloseTo(13.9430356, 5);
    expect(speed('N2')).toBeCloseTo(28.4397295, 5);
    expect(speed('Sa')).toBeCloseTo(0.0410686, 6);
  });

  it('V advances at the constituent speed', () => {
    const t = Date.UTC(2026, 0, 1);
    for (const n of ['M2', 'K1', 'O1', 'S2'] as const) {
      const v0 = argument(n, astro(t)).V;
      const v1 = argument(n, astro(t + HOUR)).V;
      expect(v1 - v0).toBeCloseTo(speed(n), 3);
    }
  });

  it('S2 argument is solar time: 0° at 00:00 and 12:00 UTC', () => {
    const v = (h: number) => (((argument('S2', astro(Date.UTC(2026, 5, 1, h))).V % 360) + 360) % 360);
    expect(Math.min(v(0), 360 - v(0))).toBeLessThan(1e-6);
    expect(Math.min(v(12), 360 - v(12))).toBeLessThan(1e-6);
  });

  it('nodal factors swing over the 18.6-year cycle within published bounds', () => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let y = 2020; y < 2039; y += 0.25) {
      const f = argument('K1', astro(Date.UTC(Math.floor(y), Math.round((y % 1) * 12)))).f;
      lo = Math.min(lo, f);
      hi = Math.max(hi, f);
    }
    expect(lo).toBeGreaterThan(0.87);
    expect(lo).toBeLessThan(0.9);
    expect(hi).toBeGreaterThan(1.1);
    expect(hi).toBeLessThan(1.13);
  });
});

describe('harmonic analysis', () => {
  const truth: Harmonics = {
    z0: 0.4,
    constituents: { K1: { H: 0.1, g: 60 }, M2: { H: 0.08, g: 177 }, O1: { H: 0.06, g: 58 }, S2: { H: 0.015, g: 330 }, N2: { H: 0.025, g: 130 } },
  };
  const t0 = Date.UTC(2020, 0, 1);
  const t: number[] = [];
  const h: number[] = [];
  for (let i = 0; i < 24 * 200; i++) {
    t.push(t0 + i * HOUR);
    // Gaps are fine for least squares.
    h.push(i % 97 < 5 ? NaN : predict(truth, t0 + i * HOUR));
  }

  it('recovers known constants from a synthetic record with gaps', () => {
    const fit = fitHarmonics(t, h, ['K1', 'M2', 'O1', 'S2', 'N2']);
    expect(fit.z0).toBeCloseTo(0.4, 6);
    for (const [n, k] of Object.entries(truth.constituents)) {
      const got = fit.constituents[n as keyof typeof fit.constituents]!;
      expect(got.H).toBeCloseTo(k!.H, 6);
      expect(got.g).toBeCloseTo(k!.g, 3);
    }
    expect(fit.rms).toBeLessThan(1e-6);
  });

  it('refuses a degenerate set (same constituent twice)', () => {
    expect(() => fitHarmonics(t, h, ['K1', 'M2', 'M2'])).toThrow(/not positive definite/);
  });
});

describe('high and low water', () => {
  const m2: Harmonics = { z0: 0, constituents: { M2: { H: 0.1, g: 0 } } };

  it('finds M2 highs and lows half a lunar day apart at the right heights', () => {
    const ex = extrema(m2, Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 4));
    expect(ex.length).toBeGreaterThanOrEqual(11);
    const highs = ex.filter((e) => e.type === 'high');
    const period = 360 / speed('M2');
    for (let i = 1; i < highs.length; i++) expect((highs[i].t - highs[i - 1].t) / HOUR).toBeCloseTo(period, 1);
    // Amplitude is the nodal-corrected f·H.
    const f = argument('M2', astro(Date.UTC(2026, 0, 2))).f;
    for (const e of ex) expect(Math.abs(e.h)).toBeCloseTo(f * 0.1, 4);
    // Alternating types.
    for (let i = 1; i < ex.length; i++) expect(ex[i].type).not.toBe(ex[i - 1].type);
  });

  it('tide state brackets t and reports the trend', () => {
    const t = Date.UTC(2026, 0, 2, 7);
    const s = tideState(m2, t);
    expect(s.prev.t).toBeLessThanOrEqual(t);
    expect(s.next.t).toBeGreaterThan(t);
    expect(s.rising).toBe(s.next.type === 'high');
    expect(s.level).toBeGreaterThanOrEqual(0);
    expect(s.level).toBeLessThanOrEqual(1);
    // At a low water the level is 0, at a high water 1.
    const lo = extrema(m2, t, t + 13 * HOUR).find((e) => e.type === 'low')!;
    expect(tideState(m2, lo.t + 60_000).level).toBeLessThan(0.01);
    // The range is the height between the bracketing low and high: 2H for a pure M2.
    expect(s.range).toBeCloseTo(2 * m2.constituents.M2!.H, 1); // within the nodal factor
  });
});

describe('Limón harmonics vs the UHSLC gauge (held-out March 2024)', () => {
  const t = fixture.mm.map((_, i) => fixture.start + i * fixture.stepMs);
  const obs = fixture.mm.map((v) => (v == null ? NaN : v / 1000));
  const ok = obs.filter(Number.isFinite);
  const mean = ok.reduce((a, b) => a + b, 0) / ok.length;
  const prdMean = t.reduce((a, x) => a + predict(LIMON_HARMONICS, x), 0) / t.length;
  const hc = { ...LIMON_HARMONICS, z0: mean - prdMean };

  it('explains most of the observed variance', () => {
    const sd = Math.sqrt(ok.reduce((a, b) => a + (b - mean) ** 2, 0) / ok.length);
    const rms = rmsError(hc, t, obs);
    expect(rms).toBeLessThan(0.05);
    expect(1 - (rms / sd) ** 2).toBeGreaterThan(0.8);
  });

  it('is microtidal: datums within ±0.5 m of MSL', () => {
    expect(LIMON_DATUMS.lat).toBeLessThan(-0.15);
    expect(LIMON_DATUMS.lat).toBeGreaterThan(-0.5);
    expect(LIMON_DATUMS.hat).toBeGreaterThan(0.15);
    expect(LIMON_DATUMS.hat).toBeLessThan(0.5);
  });
});

describe('tideHeightM (water over a reef adds metres, not the cycle position)', () => {
  it('is the predicted height plus the correction, within the Limón range', () => {
    
    for (let k = 0; k < 48; k++) {
      const ms = Date.UTC(2026, 10, 4) + k * 3.6e6;
      const h = tideHeightM(LIMON_HARMONICS, ms);
      expect(h).toBeCloseTo(predict(LIMON_HARMONICS, ms), 12);
      expect(h).toBeGreaterThanOrEqual(LIMON_DATUMS.lat - 0.01);
      expect(h).toBeLessThanOrEqual(LIMON_DATUMS.hat + 0.01);
      expect(tideHeightM(LIMON_HARMONICS, ms, 0.1)).toBeCloseTo(h + 0.1, 12);
      expect(tideHeightM(LIMON_HARMONICS, ms, NaN)).toBeCloseTo(h, 12);
    }
  });
  it('differs from the 0..1 level at high water (the old bug added up to 1 m)', () => {

    const ex = extrema(LIMON_HARMONICS, Date.UTC(2026, 10, 4), Date.UTC(2026, 10, 5)).find((e) => e.type === 'high')!;
    expect(tideState(LIMON_HARMONICS, ex.t).level).toBeGreaterThan(0.95);
    expect(tideHeightM(LIMON_HARMONICS, ex.t)).toBeLessThan(0.35);
  });
});
