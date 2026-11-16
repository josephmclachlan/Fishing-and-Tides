import { describe, expect, it } from 'vitest';
import { applyAisMessage, latitudeBands, recentVessels, shipClass, type Vessel } from './ais-parse';

const pos = (mmsi: number, lat: number, lng: number, o: Record<string, unknown> = {}) => ({ MessageType: 'PositionReport', MetaData: { MMSI: mmsi, ShipName: 'MV TEST ' }, Message: { PositionReport: { Latitude: lat, Longitude: lng, Sog: 8.2, Cog: 90, ...o } } });

describe('ais', () => {
  it('folds a position and a static message into one vessel', () => {
    const t = new Map<number, Vessel>();
    expect(applyAisMessage(t, pos(1, 10.0, -83.0), 1000)).toBe(true);
    expect(applyAisMessage(t, { MessageType: 'ShipStaticData', MetaData: { MMSI: 1 }, Message: { ShipStaticData: { Type: 72 } } }, 2000)).toBe(true);
    expect(t.get(1)).toMatchObject({ name: 'MV TEST', type: 72, lngLat: [-83, 10], sogKt: 8.2, cogDeg: 90, seenMs: 1000 });
  });
  it('ignores "no position" values and malformed messages', () => {
    const t = new Map<number, Vessel>();
    expect(applyAisMessage(t, pos(2, 91, 181), 0)).toBe(false);
    expect(applyAisMessage(t, { nonsense: true }, 0)).toBe(false);
    expect(t.size).toBe(0);
  });
  it('treats course 360 as unknown', () => {
    const t = new Map<number, Vessel>();
    applyAisMessage(t, pos(3, 10, -83, { Cog: 360 }), 0);
    expect(t.get(3)!.cogDeg).toBeNaN();
  });
  it('keeps only recent vessels with a position, newest first', () => {
    const day = 24 * 3.6e6;
    const mk = (mmsi: number, seenMs: number, x = -83): Vessel => ({ mmsi, name: '', type: 0, lngLat: [x, 10], sogKt: 0, cogDeg: NaN, seenMs });
    expect(recentVessels([mk(1, 0), mk(2, day), mk(3, day + 5, NaN)], day).map((v) => v.mmsi)).toEqual([2, 1]);
  });
  it('classes ship types and bands latitudes', () => {
    expect([30, 37, 52, 65, 71, 82, 99].map(shipClass)).toEqual(['fishing', 'pleasure', 'tug', 'passenger', 'cargo', 'tanker', 'other']);
    const mk = (lat: number): Vessel => ({ mmsi: 0, name: '', type: 0, lngLat: [-83, lat], sogKt: 0, cogDeg: NaN, seenMs: 0 });
    expect(latitudeBands([mk(9.62), mk(9.68), mk(10.01)])).toEqual({ '9.6': 2, '10.0': 1 });
  });
});
