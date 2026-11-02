import { describe, expect, it } from 'vitest';
import { localDayStart } from './physics/astro';
import { REGION } from './region';
import { binReadings, localClock, nextTides, offsetForTap, signedM, tideChartSvg, tideDay } from './tide-chart';

const H = 3.6e6;
// Local midnight, Costa Rica, 2 Nov 2026.
const t0 = localDayStart(Date.UTC(2026, 10, 2, 18), REGION.tzOffsetH);

describe('tideDay', () => {
  const day = tideDay(t0);
  it('covers one local day from local midnight', () => {
    expect(new Date(t0 + REGION.tzOffsetH * H).getUTCHours()).toBe(0);
    expect(day.t1 - day.t0).toBe(24 * H);
    expect(day.series.t[0]).toBe(t0);
    expect(day.series.t.at(-1)).toBe(day.t1);
  });
  it('finds the mixed tide turns of the day, alternating high and low, within the astronomical range', () => {
    expect(day.extrema.length).toBeGreaterThanOrEqual(2);
    expect(day.extrema.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < day.extrema.length; i++) expect(day.extrema[i].type).not.toBe(day.extrema[i - 1].type);
    for (const e of day.extrema) expect(Math.abs(e.h)).toBeLessThan(0.35);
  });
  it('shades night at both ends of the day, about 12 h in all at 10° N', () => {
    expect(day.night).toHaveLength(2);
    expect(day.night[0][0]).toBe(t0);
    expect(day.night[1][1]).toBe(day.t1);
    const dark = day.night.reduce((s, [a, b]) => s + b - a, 0) / H;
    expect(dark).toBeGreaterThan(11);
    expect(dark).toBeLessThan(13);
  });
});

describe('nextTides', () => {
  it('gives the next turns after a time, in order', () => {
    const from = t0 + 5 * H;
    const next = nextTides(from, 4);
    expect(next).toHaveLength(4);
    expect(next[0].t).toBeGreaterThan(from);
    for (let i = 1; i < 4; i++) expect(next[i].t).toBeGreaterThan(next[i - 1].t);
  });
});

describe('tideChartSvg', () => {
  const day = tideDay(t0);
  it('draws the curve, one label per turn, night, and the cursor only inside the day', () => {
    const svg = tideChartSvg(day, { cursor: t0 + 6 * H });
    expect(svg).toContain('class="tc-curve"');
    expect(svg.match(/class="tc-lbl"/g)).toHaveLength(day.extrema.length);
    expect(svg.match(/class="tc-night"/g)).toHaveLength(2);
    expect(svg).toContain('class="tc-cursor"');
    expect(tideChartSvg(day, { cursor: t0 + 30 * H })).not.toContain('tc-cursor');
  });
  it('draws the gauge only where it has readings in the day', () => {
    const obs = [1, 2, 3].map((h) => ({ t: t0 + h * H, levelM: 0.1 }));
    expect(tideChartSvg(day, { observed: obs })).toContain('class="tc-obs"');
    expect(tideChartSvg(day, { observed: obs.map((r) => ({ ...r, t: r.t - 48 * H })) })).not.toContain('tc-obs');
  });
  it('keeps every point inside the viewBox, even with a surge on the gauge', () => {
    const svg = tideChartSvg(day, { width: 240, height: 84, observed: [{ t: t0 + H, levelM: 0.9 }, { t: t0 + 2 * H, levelM: -0.6 }] });
    for (const m of svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(0);
      expect(Number(m[1])).toBeLessThanOrEqual(240);
      expect(Number(m[2])).toBeGreaterThanOrEqual(0);
      expect(Number(m[2])).toBeLessThanOrEqual(84);
    }
  });
  it('labels for screen readers when asked, and escapes the label', () => {
    expect(tideChartSvg(day, { label: 'A <b> & "c"' })).toContain('aria-label="A &lt;b> &amp; &quot;c&quot;"');
    expect(tideChartSvg(day)).toContain('aria-hidden="true"');
  });
});

describe('helpers', () => {
  it('formats local time and signed heights', () => {
    expect(localClock(Date.UTC(2026, 10, 2, 18, 5))).toBe('12:05');
    expect(signedM(0.214)).toBe('+0.21');
    expect(signedM(-0.08)).toBe('−0.08');
  });
  it('turns a tap into hours ahead of the slider base, rounded', () => {
    const base = t0 + 9 * H;
    expect(offsetForTap(0.5, t0, base)).toBe(3);
    expect(offsetForTap(0, t0, base)).toBe(-9); // the slider clamps the past to NOW
    expect(offsetForTap(2, t0, base)).toBe(15);
  });
});

describe('binReadings', () => {
  it('averages readings into 10-minute bins in time order', () => {
    const t = Date.UTC(2026, 10, 2, 12);
    const out = binReadings([{ t: t + 12 * 60e3, levelM: 0.3 }, { t, levelM: 0.1 }, { t: t + 60e3, levelM: 0.2 }, { t: t + 2 * 60e3, levelM: NaN }]);
    expect(out).toHaveLength(2);
    expect(out[0].t).toBe(t + 5 * 60e3);
    expect(out[0].levelM).toBeCloseTo(0.15, 9);
    expect(out[1].levelM).toBe(0.3);
  });
});
