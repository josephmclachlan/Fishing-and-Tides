import { describe, expect, it } from 'vitest';
import { PLUME_RIVERS } from '../region';
import {
  boxCells, catchmentMeans, IMERG, imergDaily, imergFileStart, imergHourly, listingFiles, mergeHalfHours, parseImergAscii, subsetOf, subsetQuery,
  type RainImerg,
} from './imerg-parse';

const H = 3.6e6;
const centre = (i: number, j: number) => [IMERG.lon0 + i * IMERG.step, IMERG.lat0 + j * IMERG.step];

describe('IMERG cells', () => {
  it('takes the cells whose centres are inside the box', () => {
    const cells = boxCells([[-83.1, 9.8], [-83.0, 9.9]]);
    expect(cells).toHaveLength(1);
    const [lon, lat] = centre(...cells[0]);
    expect(lon).toBeCloseTo(-83.05, 6);
    expect(lat).toBeCloseTo(9.85, 6);
    expect(boxCells([[-83.3, 9.2], [-82.6, 9.6]])).toHaveLength(28);
  });

  it('gives every river cells covering about its catchment area', () => {
    for (const r of PLUME_RIVERS) {
      const cells = boxCells(r.rainBox);
      const km2 = cells.reduce((s, [i, j]) => s + 111.2 * IMERG.step * 111.2 * IMERG.step * Math.cos((centre(i, j)[1] * Math.PI) / 180), 0);
      expect(km2 / r.catchmentKm2, r.name).toBeGreaterThan(0.8);
      expect(km2 / r.catchmentKm2, r.name).toBeLessThan(1.25);
    }
  });

  it('reads one rectangle covering every river (GES DISC accepted it: precipitation[time = 1][lon = 7][lat = 8])', () => {
    const b = subsetOf(PLUME_RIVERS);
    expect(b).toEqual({ i0: 967, i1: 973, j0: 992, j1: 999 });
    expect(subsetQuery(b)).toBe('precipitation%5B0%5D%5B967%3A973%5D%5B992%3A999%5D');
  });
});

describe('parseImergAscii', () => {
  // The shape Hyrax answers in (checked on its test server), with a fill value.
  const text = ['Dataset: 3B-HHR-E.MS.MRG.3IMERG.20261110-S120000-E122959.0720.V07C.HDF5', 'precipitation[0][0], 0, 1.5, -9999.9', 'precipitation[0][1], 2, 0.25, 4', ''].join('\n');

  it('reads lon rows along lat, fill as NaN', () => {
    const v = parseImergAscii(text, 2, 3);
    expect([...v.slice(0, 2)]).toEqual([0, 1.5]);
    expect(v[2]).toBeNaN();
    expect([...v.slice(3)]).toEqual([2, 0.25, 4]);
  });

  it('reads the other line styles servers use', () => {
    const grid = ['Dataset: x', 'precipitation.lon, -83.25, -83.15', 'precipitation.precipitation[precipitation.time=1.7e9][precipitation.lon=-83.25], 0, 1.5, 2',
      'precipitation.precipitation[precipitation.time=1.7e9][precipitation.lon=-83.15], 3, 0, 0'].join('\r\n');
    expect([...parseImergAscii(grid, 2, 3)]).toEqual([0, 1.5, 2, 3, 0, 0]);
    expect([...parseImergAscii('/Grid/precipitation[0][0], 1, 2\n/Grid/precipitation[0][1], 3, 4', 2, 2)]).toEqual([1, 2, 3, 4]);
  });

  it('shows the start of an answer it cannot read', () => {
    expect(() => parseImergAscii('<html><title>Error</title></html>', 2, 3)).toThrow(/0 of 2 rows.*<html><title>Error/);
  });

  it('refuses an answer of the wrong shape', () => {
    expect(() => parseImergAscii(text, 3, 3)).toThrow(/rows/);
    expect(() => parseImergAscii(text, 2, 4)).toThrow(/expected 4/);
    expect(() => parseImergAscii('<html>login</html>', 2, 3)).toThrow();
  });
});

describe('catchmentMeans', () => {
  const b = subsetOf(PLUME_RIVERS);
  const nLon = b.i1 - b.i0 + 1, nLat = b.j1 - b.j0 + 1;

  it('averages each river over its own cells', () => {
    const v = new Float64Array(nLon * nLat).fill(1);
    // Rain only in the Bananito's one cell.
    const [[i, j]] = boxCells(PLUME_RIVERS.find((r) => r.name === 'RÍO BANANITO')!.rainBox);
    v[(i - b.i0) * nLat + (j - b.j0)] = 9;
    const m = catchmentMeans(v, b, PLUME_RIVERS);
    expect(m['RÍO BANANITO']).toBe(9);
    expect(m['RÍO SIXAOLA']).toBe(1);
  });

  it('is null when most cells are missing', () => {
    const m = catchmentMeans(new Float64Array(nLon * nLat).fill(NaN), b, PLUME_RIVERS);
    expect(Object.values(m).every((x) => x === null)).toBe(true);
  });
});

describe('file names and listings', () => {
  it('reads the start from the name', () => {
    expect(imergFileStart('3B-HHR-E.MS.MRG.3IMERG.20261110-S123000-E125959.0750.V07C.HDF5')).toBe(Date.UTC(2026, 10, 10, 12, 30));
    expect(imergFileStart('3B-HHR-E.MS.MRG.3IMERG.20261110-S123000-E125959.0750.V07C.HDF5.xml')).toBeNaN();
  });

  it('lists each half hour once, not its .xml or .dmrpp sidecars', () => {
    const html = ['<a href="3B-HHR-E.MS.MRG.3IMERG.20261110-S003000-E005959.0030.V07C.HDF5">3B-HHR-E.MS.MRG.3IMERG.20261110-S003000-E005959.0030.V07C.HDF5</a>',
      '<a href="3B-HHR-E.MS.MRG.3IMERG.20261110-S000000-E002959.0000.V07C.HDF5.xml">x</a>',
      '<a href="3B-HHR-E.MS.MRG.3IMERG.20261110-S000000-E002959.0000.V07C.HDF5">y</a>'].join('\n');
    const f = listingFiles(html);
    expect(f.map((x) => x.start)).toEqual([Date.UTC(2026, 10, 10, 0, 0), Date.UTC(2026, 10, 10, 0, 30)]);
  });
});

describe('half hours to hours and days', () => {
  const rivers = [{ name: 'A', rainBox: [[-83.1, 9.8], [-83.0, 9.9]] as const }];
  const t0 = Date.UTC(2026, 10, 1);

  it('merges a new half hour into the previous feed and drops the old', () => {
    const prev = { times: [t0 - 1800e3, t0], byRiver: { A: [5, 1] } } as unknown as RainImerg;
    const m = mergeHalfHours(prev, [{ start: t0 + 1800e3, means: { A: 3 } }, { start: t0, means: { A: 2 } }], rivers, t0);
    expect(m.times).toEqual([t0, t0 + 1800e3]);
    expect(m.byRiver.A).toEqual([2, 3]);
  });

  it('makes an hour from both its half hours (mean rate = mm in the hour)', () => {
    const h = imergHourly({ times: [t0, t0 + 1800e3, t0 + H], byRiver: { A: [2, 4, 1] } });
    expect(h.times).toEqual([t0, t0 + H]);
    expect(h.byRiver.A[0]).toBe(3);
    expect(h.byRiver.A[1]).toBeNaN();
  });

  it('totals a finished day once it has enough half hours', () => {
    const times = [...Array(48)].map((_, k) => t0 + k * 1800e3);
    const f = { times, byRiver: { A: times.map(() => 0.5) } };
    expect(imergDaily(f, t0 + 30 * H)).toEqual([]);
    expect(imergDaily(f, t0 + 37 * H)).toEqual([{ day: t0, river: 'A', mm: 12, halfHours: 48 }]);
    expect(imergDaily({ times: times.slice(0, 40), byRiver: { A: f.byRiver.A.slice(0, 40) } }, t0 + 48 * H)).toEqual([]);
  });
});
