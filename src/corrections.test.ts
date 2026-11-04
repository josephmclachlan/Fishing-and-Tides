import { describe, expect, it } from 'vitest';
import { tideFix, tideFixAt, MAX_OFFSET_M, TIDE_FIX_TAU_MS } from './physics/tide-fix';
import { appliedScale, fitWindFix, scaleWind, windFixPoints, WIND_FIX_RANGE } from './adapters/wind-fix';
import { corrections, tideFixNow } from './corrections';
import { nextTides, tideDay } from './tide-chart';
import { fixRows } from './live-obs';
import type { GridSeries } from './adapters/pack';

const H = 3.6e6, D = 864e5;
const now = Date.UTC(2026, 10, 4, 12);

/** One reading a minute for `hours`, gauge = tide + offset + a semidiurnal wiggle (harmonic misfit). */
const readings = (hours: number, offset: number, wiggle = 0.03) =>
  Array.from({ length: hours * 60 }, (_, i) => {
    const t = now - hours * H + i * 60e3;
    const tideM = 0.2 * Math.sin((2 * Math.PI * t) / (12.42 * H));
    return { t, tideM, levelM: tideM + offset + wiggle * Math.sin((2 * Math.PI * t) / (12 * H)) };
  });

describe('tide correction from the gauge', () => {
  it('finds the offset over the last day, with a confidence', () => {
    const f = tideFix(readings(30, 0.08), now)!;
    expect(f.offsetM).toBeCloseTo(0.08, 2);
    expect(f.hours).toBe(24);
    expect(f.confidence).toBe('HIGH');
    expect(f.sigmaM).toBeLessThan(0.03);
  });
  it('needs 12 hours, drops spikes and refuses an implausible offset', () => {
    expect(tideFix(readings(8, 0.08), now)).toBeNull();
    const spiky = readings(24, 0.05).map((r, i) => (i % 97 === 0 ? { ...r, levelM: 9 } : r));
    expect(tideFix(spiky, now)!.offsetM).toBeCloseTo(0.05, 2);
    expect(tideFix(readings(24, MAX_OFFSET_M + 0.1), now)).toBeNull();
    expect(tideFix(readings(24, 0.05, 0.3), now)!.confidence).toBe('LOW');
  });
  it('holds over the past and fades ahead', () => {
    const f = tideFix(readings(24, 0.1), now)!;
    expect(tideFixAt(f, now - 5 * H)).toBeCloseTo(0.1, 2);
    expect(tideFixAt(f, f.atMs + TIDE_FIX_TAU_MS)).toBeCloseTo(0.1 / Math.E, 2);
    expect(tideFixAt(null, now)).toBe(0);
  });
  it('lifts the tide chart and next tides through the shared store', () => {
    const plain = nextTides(now)[0];
    corrections.setTide(tideFix(readings(24, 0.1), now));
    expect(tideFixNow(now)).toBeCloseTo(0.1, 2);
    const fixed = nextTides(now)[0];
    expect(fixed.t).toBe(plain.t);
    expect(fixed.h - plain.h).toBeGreaterThan(0.05);
    const day = tideDay(now - 6 * H);
    expect(day.series.h[0] - tideDay(now - 6 * H, undefined, undefined, () => 0).series.h[0]).toBeCloseTo(0.1, 2);
    corrections.setTide(null);
  });
});

/** Six passes over a 4×3 grid; the satellite sees 1.2 × the model's wind, westward. */
const grid = { cols: 4, rows: 3, lon0: -83, lat0: 10.5, dlon: 0.125, dlat: 0.125 };
const passTimes = [6, 18, 30, 54, 66, 78].map((h) => now - h * H);
const modelU = (i: number) => -(5 + (i % 4));
const scat: GridSeries = {
  meta: { feed: 'scat-pass', kind: 'observed', fetchedAt: new Date(now).toISOString(), grid, times: [now - 6 * D, ...passTimes].sort((a, b) => a - b), vars: [{ name: 'u', unit: 'm/s', scale: 0.01, offset: 0 }, { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 }], sources: [], licence: '', file: 'x' },
  values: {
    u: [now - 6 * D, ...passTimes].sort((a, b) => a - b).map((_t, k) => Float32Array.from({ length: 12 }, (_, i) => (k === 0 || i === 11 ? NaN : 1.2 * modelU(i)))),
    v: [now - 6 * D, ...passTimes].sort((a, b) => a - b).map(() => new Float32Array(12)),
  },
};
/** Open-Meteo multi-point answer: hourly over 5 days, the model's westward wind at each point (speed m/s, from the east). */
const modelJson = (pts: [number, number, number][]) =>
  pts.map(([i]) => {
    const time = Array.from({ length: 6 * 24 }, (_, h) => (now - 5 * D) / 1000 + h * 3600);
    return { hourly: { time, wind_speed_10m: time.map(() => -modelU(i)), wind_direction_10m: time.map(() => 90) } };
  });

describe('wind correction from the satellite', () => {
  const pts = windFixPoints(scat, now);
  it('picks cells seen by two or more passes in the last 4 days', () => {
    expect(pts.length).toBe(11);
    expect(pts[0]).toEqual([0, -83, 10.5]);
  });
  it('fits a speed scale shrunk by the number of passes', () => {
    const f = fitWindFix(scat, pts, modelJson(pts), now)!;
    expect(f.passes).toBe(6);
    expect(f.scale).toBeCloseTo(1 + 0.2 * (6 / 8), 3);
    expect(f.rmsAfter).toBeLessThan(f.rmsBefore);
    expect(f.confidence).toBe('HIGH');
    // One pass is not enough; a wild ratio is clamped.
    expect(fitWindFix(scat, pts, modelJson(pts), passTimes[5] + H)).toBeNull();
    const wild = { ...scat, values: { ...scat.values, u: scat.values.u.map((a) => a.map((x) => x * 3)) } };
    expect(fitWindFix(wild, pts, modelJson(pts), now)!.scale).toBe(WIND_FIX_RANGE[1]);
  });
  it('scales only the forecast frames', () => {
    const fc = { ...scat, values: { u: [Float32Array.of(2, NaN)], v: [Float32Array.of(-1, 0)] } };
    const d = scaleWind({ forecast: fc, climatology: scat, fetchedAt: now }, 1.1);
    expect(d.forecast!.values.u[0][0]).toBeCloseTo(2.2);
    expect(d.forecast!.values.v[0][0]).toBeCloseTo(-1.1);
    expect(Number.isNaN(d.forecast!.values.u[0][1])).toBe(true);
    expect(d.climatology).toBe(scat);
    expect(fc.values.u[0][0]).toBe(2);
  });
  it('shows both corrections in LIVE OBS, or says there is not enough data', () => {
    const f = fitWindFix(scat, pts, modelJson(pts), now)!;
    const rows = fixRows({ wind: f, tide: tideFix(readings(24, 0.08), now) });
    expect(rows[0].value).toBe('×1.15');
    expect(rows[1].value).toBe('+0.08 M');
    expect(rows[1].tone).toBe('green');
    expect(fixRows(undefined).map((r) => r.value)).toEqual(['--', '--']);
    expect(appliedScale(f)).toBe(f.scale);
    expect(appliedScale({ ...f, confidence: 'LOW' })).toBe(1);
    expect(fixRows({ wind: { ...f, confidence: 'LOW' }, tide: null })[0].detail).toContain('NOT APPLIED');
  });
});
