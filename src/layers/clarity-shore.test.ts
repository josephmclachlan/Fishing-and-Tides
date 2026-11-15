/**
 * Visibility at the beach (PLAN 7.88). On 2026-11-13 at about 15:00 Joseph could not see his hand at 60 cm off
 * Punta Uva while the app said 13 m: the depth grid put 13 m of water off the sand, so the 0.65 m swell never
 * stirred the bottom. These check the depth the clarity model now sees near the shore and where a spot reads it.
 * The sea state below is the wave forecast's at Punta Uva that afternoon; nothing is fitted to the sighting.
 */
import { describe, expect, it } from 'vitest';
import { land, region } from '../physics/fixtures/seafloor';
import { SPOTS } from '../region';
import { haversineM } from '../geo';
import { clarityAt, coastDistanceAt, seaDepthAt, swimPoint, SWIM_READ_M, type ClarityContext } from './clarity';

const ctx = (hs: number, tp: number): ClarityContext => ({
  satellite: null, rain: null, elevation: region, land, ms: 0,
  seaAt: () => ({ hs, tp }),
});
const punta = SPOTS.find((s) => s.name === 'PUNTA UVA')!;

describe('depth near the beach', () => {
  it('is no longer the grid cell’s 13 m right off Punta Uva', () => {
    const p = swimPoint(ctx(0, 0), punta.lngLat, punta.facing)!;
    const d = seaDepthAt(ctx(0, 0), ...p)!;
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(2.5);
  });

  it('deepens offshore and keeps the spots’ sea points in real water', () => {
    for (const s of SPOTS) expect(seaDepthAt(ctx(0, 0), ...s.sea)!, s.name).toBeGreaterThanOrEqual(3);
  });
});

describe('swimPoint', () => {
  it('finds the swimmers’ water for every spot, close in front of its sand', () => {
    for (const s of SPOTS) {
      const p = swimPoint(ctx(0, 0), s.lngLat, s.facing);
      expect(p, s.name).not.toBeNull();
      expect(coastDistanceAt(land, ...p!), s.name).toBeGreaterThanOrEqual(SWIM_READ_M);
      expect(haversineM(s.lngLat, p!), s.name).toBeLessThan(300);
    }
  });
});

describe('visibility at the swimmers’ water', () => {
  const at = (hs: number, tp: number) => {
    const c = ctx(hs, tp);
    return clarityAt(c, ...swimPoint(c, punta.lngLat, punta.facing)!)!;
  };
  it('goes murky in a 0.65 m, 6.7 s swell, from the bed stirred in shallow water', () => {
    const x = at(0.65, 6.7);
    expect(x.visM).toBeLessThan(3);
    expect(x.cause).toBe('swell');
  });
  it('stays clear on a calm day', () => {
    expect(at(0.15, 7).visM).toBeGreaterThanOrEqual(8);
  });
});
