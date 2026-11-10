import { describe, expect, it } from 'vitest';
import { matchSpots, parseCoordinate, resolveTarget } from './target';

describe('matchSpots', () => {
  it('ignores case and accents and ranks prefix matches first', () => {
    expect(matchSpots('límon', [{ name: 'LIMÓN', lngLat: [0, 0] }])[0].name).toBe('LIMÓN');
    expect(matchSpots('punta cáhuita')[0].name).toBe('PUNTA CAHUITA');
    expect(matchSpots('playa').map((s) => s.name)).toEqual(['PLAYA NEGRA CAHUITA', 'PLAYA NEGRA', 'PLAYA COCLES', 'PLAYA CHIQUITA', 'PLAYA GRANDE']);
    expect(matchSpots('negra').map((s) => s.name)).toEqual(['PLAYA NEGRA CAHUITA', 'PLAYA NEGRA']);
    expect(matchSpots('cahuita').map((s) => s.name)).toEqual(['PLAYA NEGRA CAHUITA', 'PUNTA CAHUITA']);
  });
  it('returns nothing for blank or unknown', () => {
    expect(matchSpots('  ')).toEqual([]);
    expect(matchSpots('waikiki')).toEqual([]);
  });
});

describe('parseCoordinate', () => {
  it('reads decimal lat, lon', () => {
    expect(parseCoordinate('9.65, -82.75')).toEqual([-82.75, 9.65]);
    expect(parseCoordinate('9.65 -82.75')).toEqual([-82.75, 9.65]);
  });
  it('reads hemisphere letters, either order', () => {
    expect(parseCoordinate('9.65N 82.75W')).toEqual([-82.75, 9.65]);
    expect(parseCoordinate('9.65N 82.75O')).toEqual([-82.75, 9.65]);
    expect(parseCoordinate('82.75 O, 9.65 N')).toEqual([-82.75, 9.65]);
    expect(parseCoordinate('82.75W, 9.65N')).toEqual([-82.75, 9.65]);
  });
  it('reads degrees + decimal minutes as the HUD shows them', () => {
    const ll = parseCoordinate("09°39.000'N 082°45.000'W")!;
    expect(ll[0]).toBeCloseTo(-82.75, 9);
    expect(ll[1]).toBeCloseTo(9.65, 9);
  });
  it('reads degrees minutes seconds', () => {
    const ll = parseCoordinate('9 39 0 N, 82 45 0 W')!;
    expect(ll[0]).toBeCloseTo(-82.75, 9);
    expect(ll[1]).toBeCloseTo(9.65, 9);
  });
  it('rejects junk, bad minutes and points off the map', () => {
    expect(parseCoordinate('cahuita')).toBeNull();
    expect(parseCoordinate('9 75 N, 82 W')).toBeNull();
    expect(parseCoordinate('40.7, -74.0')).toBeNull();
  });
});

describe('resolveTarget', () => {
  it('prefers a coordinate, else a spot', () => {
    expect(resolveTarget('9.7, -82.8')!.lngLat).toEqual([-82.8, 9.7]);
    expect(resolveTarget('salsa')!.name).toBe('SALSA BRAVA');
    expect(resolveTarget('nowhere')).toBeNull();
  });
});
