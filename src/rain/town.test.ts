import { describe, expect, it } from 'vitest';
import { parseTownRain, townRainUrl, TOWN_RAIN_MODELS, type TownRain } from '../adapters/town-rain';
import { RAIN_TOWNS } from '../region';
import { townWindow, WET_MM } from './town';
import { townsSplit } from '../town-rain-hud';

const H = 3.6e6;
const t0 = 1_800_000_000_000 - (1_800_000_000_000 % H);

function data(byTown: TownRain['byTown'], n = 6): TownRain {
  return { times: Array.from({ length: n }, (_, i) => t0 + i * H), byTown, fetchedAt: 0, fromCache: false };
}

describe('town rain adapter', () => {
  it('asks for every town and the four models', () => {
    const u = townRainUrl();
    expect(u).toContain(`latitude=${RAIN_TOWNS.map((t) => t.lngLat[1]).join(',')}`);
    expect(u).toContain(`models=${TOWN_RAIN_MODELS.join(',')}`);
  });
  it('parses one block per town, drops empty models and keeps gaps as NaN', () => {
    const block = (x: number) => ({ hourly: { time: [t0 / 1000, t0 / 1000 + 3600], precipitation_ecmwf_ifs: [x, null], precipitation_gfs_seamless: [null, null] } });
    const d = parseTownRain(RAIN_TOWNS.map((_, k) => block(k)), 5);
    expect(d.times).toEqual([t0, t0 + H]);
    expect(Object.keys(d.byTown)).toEqual(RAIN_TOWNS.map((t) => t.id));
    expect(d.byTown.playanegra.ecmwf_ifs![0]).toBe(1);
    expect(Number.isNaN(d.byTown.playanegra.ecmwf_ifs![1])).toBe(true);
    expect(d.byTown.playanegra.gfs_seamless).toBeUndefined();
    expect(d.fetchedAt).toBe(5);
  });
  it('rejects a reply with the wrong number of towns', () => {
    expect(() => parseTownRain([{ hourly: { time: [] } }], 0)).toThrow();
  });
});

describe('townWindow', () => {
  it('averages model totals and counts wet models', () => {
    const d = data({ x: { ecmwf_ifs: [1, 1, 1, 9, 9, 9], gfs_seamless: [0, 0, 0, 0, 0, 0], icon_seamless: [0.2, 0.2, 0.2, 0, 0, 0], ukmo_global_deterministic_10km: [2, 0, 0, 0, 0, 0] } });
    const w = townWindow(d, 'x', t0, 3)!;
    expect(w.models).toBe(4);
    expect(w.amountMm).toBeCloseTo((3 + 0 + 0.6 + 2) / 4);
    expect(w.chance).toBe(0.75); // 3, 0.6 and 2 mm are wet; 0 is dry
    expect(w.spreadMm).toBeCloseTo(3);
  });
  it('starts from the hour containing the time', () => {
    const d = data({ x: { ecmwf_ifs: [5, 0, 0, 0, 0, 0] } });
    expect(townWindow(d, 'x', t0 + 0.5 * H, 3)!.amountMm).toBe(5);
    expect(townWindow(d, 'x', t0 + H, 3)!.amountMm).toBe(0);
  });
  it('drops a model with less than half the window, so a short run does not read dry', () => {
    const d = data({ x: { ecmwf_ifs: [NaN, NaN, NaN, 0, 0, 0], gfs_seamless: [4, 4, 4, 0, 0, 0] } });
    const w = townWindow(d, 'x', t0, 3)!;
    expect(w.models).toBe(1);
    expect(w.chance).toBe(1);
  });
  it('is null past the end of the forecast or for an unknown town', () => {
    const d = data({ x: { ecmwf_ifs: [1, 1, 1, 1, 1, 1] } });
    expect(townWindow(d, 'x', t0 + 5 * H, 3)).toBeNull();
    expect(townWindow(d, 'nope', t0, 3)).toBeNull();
  });
  it('uses the wet threshold inclusively', () => {
    const d = data({ x: { ecmwf_ifs: [WET_MM, 0, 0, 0, 0, 0] } });
    expect(townWindow(d, 'x', t0, 3)!.chance).toBe(1);
  });
});

describe('townsSplit', () => {
  const w = (chance: number) => ({ amountMm: 0, chance, models: 4, spreadMm: 0 });
  it('flags one town dry while another is wet', () => {
    expect(townsSplit([w(0), w(0.5), w(1)])).toBe(true);
    expect(townsSplit([w(0.5), w(0.75), w(1)])).toBe(false);
    expect(townsSplit([w(0), null])).toBe(false);
  });
});
