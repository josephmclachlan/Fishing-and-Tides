import { describe, expect, it } from 'vitest';
import { effortGeom, effortGrid, effortRows, unzipFirst } from './effort-parse';
import { effortCells, effortChecks } from './effort';
import { decodeSeries, encodeSeries, type SeriesMeta } from './pack';

const BOX = [[-84, 8.7], [-81.5, 11]] as const;
// The shape the official client expects: {entries: [{datasetId: [rows]}]}.
const report = {
  entries: [{
    'public-global-fishing-effort:v3.0': [
      { lat: 10.9, lon: -84, hours: 5, flag: 'CRI' },
      { lat: 10.95, lon: -83.95, hours: 2.5, flag: 'NIC' }, // same cell, given by its centre
      { lat: 9.1, lon: -82.3, hours: 40, flag: 'CRI' },
      { lat: 12, lon: -83, hours: 99, flag: 'COL' }, // outside the box
      { lat: 9.5, lon: -82.5, hours: 0, flag: 'PAN' },
    ],
  }],
  total: 5,
};

describe('fishing effort (PLAN 7.19)', () => {
  it('finds rows however deep they sit', () => {
    expect(effortRows(report)).toHaveLength(5);
    expect(effortRows({ entries: [{ lat: 1, lon: 2, hours: 3 }] })).toHaveLength(1);
    expect(effortRows({})).toEqual([]);
  });
  it('grids 0.1° cells by centre and sums flags', () => {
    expect(effortGeom(BOX)).toEqual({ cols: 25, rows: 23, lon0: -83.95, lat0: 10.95, dlon: 0.1, dlat: 0.1 });
    const g = effortGrid(report, BOX);
    expect(g.hours[0]).toBeCloseTo(7.5);
    expect(g.hours[18 * 25 + 17]).toBe(40);
    expect(g.rows).toBe(3);
    expect(g.flags).toEqual([{ flag: 'CRI', hours: 45 }, { flag: 'NIC', hours: 2.5 }]);
  });
  it('levels split busy cells into thirds', () => {
    const g = effortGrid({ entries: [[1, 2, 3, 4, 5, 6].map((h, i) => ({ lat: 10.5, lon: -83 + i * 0.1 + 0.05, hours: h * 10 }))] }, BOX);
    const meta: Omit<SeriesMeta, 'file'> = { feed: 'effort', kind: 'observed', fetchedAt: new Date().toISOString(), grid: g.grid, times: [0], vars: [{ name: 'hours', unit: 'h', scale: 0.1, offset: 0 }], sources: [], licence: 'x' };
    const s = decodeSeries({ ...meta, file: 'e' }, encodeSeries(meta, { hours: [g.hours] }));
    const cells = effortCells(s);
    expect(cells.map((c) => c.level)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(cells[0].lng).toBeCloseTo(-82.95);
    expect(effortCells(null)).toEqual([]);
  });
  it('reads a zipped or plain report body', async () => {
    const json = new TextEncoder().encode(JSON.stringify(report));
    expect(await unzipFirst(json)).toBe(json);
    const body = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()), name = new TextEncoder().encode('report.json');
    const local = new Uint8Array(30 + name.length), cd = new Uint8Array(46 + name.length), end = new Uint8Array(22);
    const lv = new DataView(local.buffer), cv = new DataView(cd.buffer), ev = new DataView(end.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(8, 8, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(10, 8, true); cv.setUint32(20, body.length, true); cv.setUint32(24, json.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, 0, true); cd.set(name, 46);
    ev.setUint32(0, 0x06054b50, true); ev.setUint32(16, local.length + body.length, true);
    const zip = new Uint8Array([...local, ...body, ...cd, ...end]);
    expect(JSON.parse(new TextDecoder().decode(await unzipFirst(zip))).total).toBe(5);
  });
  it('checks say when nothing is published', async () => {
    const r = await effortChecks(async () => ({ series: null, fetchedAt: NaN }))[0].run().catch((e: Error) => e.message);
    expect(r).toMatch(/GFW_TOKEN/);
  });
});
