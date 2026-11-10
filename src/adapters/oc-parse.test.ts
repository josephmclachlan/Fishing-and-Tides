import { describe, expect, it } from 'vitest';
import { ocFrames, type OcJson } from './oc-parse';

const grid = { cols: 2, rows: 2, lon0: -83, lat0: 10, dlon: 1 / 24, dlat: 1 / 24 };
const j = (over: Partial<OcJson> = {}): OcJson => ({
  id: 'cmems_x', name: 'GlobColour', grid, times: [2e12 + 864e5, 2e12, 2e12 + 864e5], kd490: [[0.05, null, 0, 0.2], [0.04, null, 0.06, -1], [9, 9, 9, 9]], ...over,
});

describe('ocFrames', () => {
  it('orders days, keeps the first of a repeat, and turns land and bad values into NaN', () => {
    const f = ocFrames(j());
    expect(f.times).toEqual([2e12, 2e12 + 864e5]);
    expect(Array.from(f.kd490[0])).toEqual([Math.fround(0.04), NaN, Math.fround(0.06), NaN]);
    expect(Array.from(f.kd490[1])).toEqual([Math.fround(0.05), NaN, NaN, Math.fround(0.2)]);
    expect(f.sources).toEqual([{ id: 'cmems_x', name: 'GlobColour', fromMs: 2e12, toMs: 2e12 + 864e5 }]);
  });
  it('rejects a malformed grid or map', () => {
    expect(() => ocFrames(j({ grid: { ...grid, dlon: 0 } }))).toThrow(/grid/);
    expect(() => ocFrames(j({ kd490: [[1, 2, 3]], times: [1] }))).toThrow(/pixels/);
    expect(() => ocFrames(j({ times: [1] }))).toThrow(/maps/);
    expect(() => ocFrames(j({ times: [], kd490: [] }))).toThrow(/no days/);
  });
});
