import { describe, expect, it } from 'vitest';
import { byDay, forecastTimes, gaugeRows, HEADER, mergeDay, metarRows, modelRows, parseCsv, parseIocRows, sampleRows, sargassumRows, stormRows, type Row } from './archive';

const H = 3.6e6;
const T0 = Date.UTC(2026, 10, 4, 12);
const row = (o: Partial<Row> = {}): Row => ({ t: T0, site: 'CAHUITA', source: 'wind', model: '', v: 'u', value: 1.23456789, issued: T0, ...o });

describe('day files', () => {
  it('writes a header, appends rows and rounds to five significant figures', () => {
    const { text, added } = mergeDay(undefined, [row()]);
    expect(added).toBe(1);
    expect(text).toBe(`${HEADER}\n2026-11-04T12:00Z,CAHUITA,wind,,u,1.2346,2026-11-04T12:00Z\n`);
  });

  it('skips rows already in the file, whatever their value, and non-finite values', () => {
    const first = mergeDay(undefined, [row(), row({ v: 'v' })]).text;
    const again = mergeDay(first, [row({ value: 9 }), row({ v: 'v' }), row({ v: 'hs', value: NaN }), row({ issued: T0 + 6 * H })]);
    expect(again.added).toBe(1);
    expect(parseCsv(again.text)).toHaveLength(3);
  });

  it('round-trips through parseCsv, with and without an issue time', () => {
    const rows = [row(), row({ source: 'metar', site: 'MRLM', v: 'tempC', value: 29, issued: undefined })];
    const back = parseCsv(mergeDay(undefined, rows).text);
    expect(back[0]).toEqual({ ...rows[0], value: 1.2346 });
    expect(back[1]).toEqual({ t: T0, site: 'MRLM', source: 'metar', model: '', v: 'tempC', value: 29 });
  });

  it('keeps commas out of sites', () => {
    const text = mergeDay(undefined, [row({ site: 'A,B' })]).text;
    expect(parseCsv(text)[0].site).toBe('A;B');
  });

  it('groups rows by the UTC day of their valid time', () => {
    const m = byDay([row(), row({ t: T0 + 13 * H })]);
    expect([...m.keys()]).toEqual(['2026-11-04', '2026-11-05']);
  });
});

describe('forecastTimes', () => {
  it('keeps the first 24 h of the run, 3-hourly from the issue hour', () => {
    const times = Array.from({ length: 48 }, (_, i) => T0 - 2 * H + i * H);
    const kept = forecastTimes(times, T0 + 20 * 60e3);
    expect(kept[0]).toBe(T0);
    expect(kept).toHaveLength(9);
    expect(kept.at(-1)).toBe(T0 + 24 * H);
  });
});

describe('sampleRows', () => {
  it('samples every site, time and variable, dropping NaN', () => {
    const r = sampleRows((v, x) => (v === 'u' ? x : NaN), { sites: [{ name: 'A', lngLat: [-82, 9] }, { name: 'B', lngLat: [-83, 9] }], times: [T0, T0 + H], vars: ['u', 'v'], source: 'wind', issued: T0 });
    expect(r).toHaveLength(4);
    expect(r[0]).toEqual({ t: T0, site: 'A', source: 'wind', model: '', v: 'u', value: -82, issued: T0 });
  });
});

describe('sargassumRows', () => {
  it('keeps cells with weed and counts the cells seen', () => {
    const g = { cols: 2, rows: 2, lon0: -83, lat0: 10, dlon: 0.06, dlat: 0.06 };
    const r = sargassumRows(T0, [0, 0.02, NaN, 0], g);
    expect(r).toEqual([
      { t: T0, site: '-82.940;10.000', source: 'sargassum', model: '', v: 'cover', value: 0.02 },
      { t: T0, site: 'SARG_BOX', source: 'sargassum', model: '', v: 'cellsSeen', value: 3 },
    ]);
  });
});

describe('stations', () => {
  it('keeps every number in a METAR report and skips missing ones', () => {
    const r = metarRows('MRLM', [{ t: T0, windFromDeg: null, windKt: 3, gustKt: null, tempC: 29, dewC: 25, pressureHpa: 1011.3 }]);
    expect(r.map((x) => x.v)).toEqual(['windKt', 'tempC', 'dewC', 'pressureHpa']);
  });

  it('averages the gauge into 10-minute bins with the predicted tide at the centre', () => {
    const readings = Array.from({ length: 15 }, (_, i) => ({ t: T0 + i * 60e3, levelM: 0.1 + (i < 10 ? 0 : 1) }));
    const r = gaugeRows('limon', readings, (t) => (t - T0) / 60e3);
    // 0–9 min is a full bin; 10–14 is exactly half, which is kept.
    expect(r).toHaveLength(4);
    expect(r[0]).toMatchObject({ t: T0 + 5 * 60e3, v: 'levelM' });
    expect(r[0].value).toBeCloseTo(0.1);
    expect(r[1]).toMatchObject({ v: 'tideM', value: 5 });
  });

  it('parses IOC rows for one sensor onto MSL', () => {
    const r = parseIocRows([{ slevel: 6.7, stime: '2026-11-04 12:00:00', sensor: 'rad' }, { slevel: 1, stime: '2026-11-04 12:00:00', sensor: 'prs' }], 'rad', 6.6);
    expect(r).toHaveLength(1);
    expect(r[0].t).toBe(T0);
    expect(r[0].levelM).toBeCloseTo(0.1);
  });

  it('splits an Open-Meteo multi-model response per model, within 24 h of issue', () => {
    const json = { hourly: { time: [T0 / 1000, (T0 + 25 * H) / 1000], temperature_2m_gfs_seamless: [28, 27], temperature_2m_icon_seamless: [null, 26] } };
    const r = modelRows(json, 'MRLM', ['gfs_seamless', 'icon_seamless'], ['temperature_2m'], T0 + 60e3);
    expect(r).toEqual([{ t: T0, site: 'MRLM', source: 'openmeteo', model: 'gfs_seamless', v: 'temperature_2m', value: 28, issued: T0 + 60e3 }]);
    expect(() => modelRows({}, 'MRLM', [], [], T0)).toThrow();
  });

  it('keeps storm position and strength at the advisory time', () => {
    const r = stormRows([{ id: 'al142026', windKt: 65, pressureMb: 990, lngLat: [-80, 14], movementDeg: 270, movementKt: 10, updatedMs: T0 }]);
    expect(r).toHaveLength(6);
    expect(r.every((x) => x.site === 'al142026' && x.t === T0)).toBe(true);
  });
});
