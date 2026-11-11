import { describe, expect, it } from 'vitest';
import { bandColours, bandCss, bandLines, bandOf, FIELD_STEPS, FIELD_TICKS, fieldIndex, fieldWord, onFieldSteps, rampAt, rampCss, setFieldSteps, smoothField, sstSteps, type Rgb } from './bands';
import { NO_LIFT } from './paint';

describe('field bands', () => {
  it('puts a value in its band, edges going up', () => {
    const s = FIELD_STEPS.sst;
    expect([26, 27, 27.4, 28.9, 29, 31].map((v) => bandOf(s, v))).toEqual([0, 1, 1, 4, 5, 7]);
  });

  it('mixes the ramp between stops and spreads the bands end to end', () => {
    const stops: Rgb[] = [[0, 0, 0], [100, 200, 0], [200, 200, 200]];
    expect(rampAt(stops, 0)).toEqual([0, 0, 0]);
    expect(rampAt(stops, 0.25)).toEqual([50, 100, 0]);
    expect(rampAt(stops, 1)).toEqual([200, 200, 200]);
    const c = bandColours(stops, 5);
    expect(c[0]).toEqual([0, 0, 0]);
    expect(c[2]).toEqual([100, 200, 0]);
    expect(c[4]).toEqual([200, 200, 200]);
  });

  it('gives each band one colour at the field opacity, and nothing for no data', () => {
    const stops: Rgb[] = [[0, 0, 0], [10, 20, 30], [40, 50, 60], [70, 80, 90], [100, 110, 120]];
    const w = fieldWord('chl', NO_LIFT, stops);
    expect(w(NaN)).toBe(0);
    expect(w(0.21)).toBe(w(0.29));
    expect(w(0.21)).not.toBe(w(0.31));
    const rgba = new Uint8Array(new Uint32Array([w(5)]).buffer);
    expect([...rgba]).toEqual([100, 110, 120, Math.round(255 * 0.58)]);
  });

  it('keys each band with the theme tokens around it', () => {
    const css = bandCss('chl');
    expect(css).toHaveLength(FIELD_STEPS.chl.length + 1);
    expect(css[0]).toBe('var(--r-chl0)');
    expect(css[css.length - 1]).toBe('var(--r-chl4)');
    expect(css[1]).toMatch(/^color-mix\(in srgb, var\(--r-chl1\) \d+%, var\(--r-chl0\)\)$/);
  });

  it('places the pointer inside its band', () => {
    expect(fieldIndex('sst', 27.25)).toBeCloseTo(1.5);
    expect(fieldIndex('sst', 30.25)).toBeCloseTo(7.5);
    expect(fieldIndex('sst', 20)).toBe(0);
    expect(fieldIndex('sst', 40)).toBe(8);
  });

  it('draws the band edges as lines, cut at land', () => {
    // A west-to-east rise across one edge (28): one line running north-south.
    const g = { cols: 6, rows: 6, lon0: 0, lat0: 1, dlon: 0.2, dlat: 0.2 };
    const z = Array.from({ length: 36 }, (_, i) => 27 + (i % 6) * 0.4);
    const all = bandLines(g, z, [28]);
    expect(all.length).toBeGreaterThan(0);
    for (const f of all) for (const [x] of f.geometry.coordinates) expect(x).toBeCloseTo(0.5, 1);
    const south = bandLines(g, z, [28], (_, lat) => lat < 0);
    for (const f of south) for (const [, y] of f.geometry.coordinates) expect(y).toBeLessThan(0.01);
  });
});

describe('sea temperature steps', () => {
  it('centres quarter-degree edges on the region median, ignoring water outside it', () => {
    const g = { cols: 4, rows: 2, lon0: 0, lat0: 1, dlon: 1, dlat: 1 };
    const z = [29.6, 29.7, 29.9, 35, NaN, 29.8, 29.4, 35];
    const s = sstSteps(g, z, [[0, 0], [2.5, 1]])!;
    expect(s).toEqual([28.75, 29, 29.25, 29.5, 29.75, 30, 30.25, 30.5]);
    expect(sstSteps(g, z, [[10, 10], [11, 11]])).toBeNull();
  });

  it('moves the key with the edges and tells listeners', () => {
    let n = 0;
    const off = onFieldSteps(() => n++);
    const before = FIELD_STEPS.sst;
    setFieldSteps('sst', [29, 29.25, 29.5, 29.75]);
    expect(FIELD_TICKS.sst.at).toEqual([29.25, 29.75]);
    expect(n).toBe(1);
    off();
    setFieldSteps('sst', before);
    expect(n).toBe(1);
  });
});

describe('smoothing and token ramps', () => {
  it('blurs values but keeps empty cells empty', () => {
    const z = smoothField([0, 0, 0, 0, 9, 0, 0, 0, NaN], 3, 3, 1);
    expect(z[4]).toBeCloseTo(9 / 8);
    expect(z[0]).toBeCloseTo(9 / 4);
    expect(z[8]).toBeNaN();
  });

  it('spreads bands along a ramp of named tokens', () => {
    const c = rampCss(['--lv2', '--lv3', '--ac4'], 5);
    expect(c[0]).toBe('var(--lv2)');
    expect(c[2]).toBe('var(--lv3)');
    expect(c[4]).toBe('var(--ac4)');
    expect(c[1]).toBe('color-mix(in srgb, var(--lv3) 50%, var(--lv2))');
  });
});
