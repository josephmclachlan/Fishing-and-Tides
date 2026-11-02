import { describe, expect, it } from 'vitest';
import { latestWind, parseMetars } from './metar-parse';
import { metarChecks, type MetarData } from './metar';
import { runChecks } from '../verify/types';

const rows = [
  { obsTime: 1793577600, wdir: 0, wspd: 0, temp: 26, dewp: 24, altim: 1010.9, rawOb: 'METAR MRLM 020000Z 00000KT CAVOK 26/24 A2985' },
  { obsTime: 1793620800, wdir: 270, wspd: 3, temp: 23, dewp: 22, altim: 1010.9, rawOb: 'METAR MRLM 021200Z 27003KT 9999 SCT015 BKN120 23/22 A2985' },
  { obsTime: 1793530800, wdir: null, wspd: null, temp: null, rawOb: 'METAR MRLM 011100Z /////KT CAVOK ///// A////' },
  { obsTime: 'bad', rawOb: 'x' },
];

describe('parseMetars', () => {
  it('decodes newest first, calm as no direction, missing as null', () => {
    const o = parseMetars(rows);
    expect(o).toHaveLength(3);
    expect(o[0]).toMatchObject({ t: 1793620800000, windFromDeg: 270, windKt: 3, tempC: 23 });
    expect(o[1].windFromDeg).toBeNull();
    expect(o[2].windKt).toBeNull();
    expect(latestWind(o)!.windKt).toBe(3);
    expect(() => parseMetars({})).toThrow();
  });
});

describe('metar checks', () => {
  it('passes a fresh, plausible file and fails an empty one', async () => {
    const now = Date.now();
    const d: MetarData = { station: 'MRLM', fetchedAt: new Date(now).toISOString(), fromCache: false, obs: parseMetars(rows).map((o, i) => ({ ...o, t: now - i * 3.6e6 })) };
    expect((await runChecks(metarChecks(async () => d))).map((r) => r.status)).toEqual(['pass', 'pass']);
    const empty = await runChecks(metarChecks(async () => ({ ...d, obs: [] })));
    expect(empty[0].status).toBe('fail');
  });
});
