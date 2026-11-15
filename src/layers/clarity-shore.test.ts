/**
 * Visibility at the beach (PLAN 7.88). On 2026-11-13 at about 15:00 Joseph could not see his hand at 60 cm off
 * Punta Uva while the app said 13 m: the depth grid put 13 m of water off the sand, so the 0.65 m swell never
 * stirred the bottom. These check the depth the clarity model now sees near the shore and where a spot reads it.
 * The sea state below is the wave forecast's at Punta Uva that afternoon; nothing is fitted to the sighting.
 */
import { describe, expect, it } from 'vitest';
import { land, region } from '../physics/fixtures/seafloor';
import { COAST_RAIN, CREEK_PLUMES, SPOTS } from '../region';
import { haversineM } from '../geo';
import { clarityAt, coastDistanceAt, riverRain, seaDepthAt, swimPoint, SWIM_READ_M, type ClarityContext } from './clarity';

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

describe('beach creeks (PLAN 7.89)', () => {
  const H = 3.6e6, t0 = Date.UTC(2026, 10, 13, 21);
  const cocles = CREEK_PLUMES.find((r) => r.name === 'RÍO COCLES')!;
  // Calm sea, so only the creek can cloud the water; rain on the coast hills only.
  const wet = (mmH: number, hours: number): ClarityContext => ({
    ...ctx(0.1, 7), ms: t0,
    rain: { times: Array.from({ length: hours }, (_, k) => t0 - (hours - k) * H), byRiver: { [COAST_RAIN.name]: Array(hours).fill(mmH) }, fetchedAt: t0, fromCache: false },
  });
  const nearMouth = [cocles.mouth[0] + 0.0006, cocles.mouth[1] + 0.0008] as const; // ~110 m off the mouth
  it('leave the water clear when the coast hills are dry', () => {
    expect(clarityAt(wet(0, 6), ...nearMouth)!.visM).toBeGreaterThanOrEqual(8);
  });
  it('muddy the water off the mouth after a downpour on the hills', () => {
    const x = clarityAt(wet(15, 4), ...nearMouth)!;
    expect(x.visM).toBeLessThan(3);
    expect(x.cause).toBe('river');
  });
  it('stay local: a small creek’s plume is gone a few km along the coast', () => {
    const far = [cocles.mouth[0] + 0.03, cocles.mouth[1] - 0.008] as const;
    expect(clarityAt(wet(15, 4), ...far)!.visM).toBeGreaterThanOrEqual(8);
  });
  it('are read from the coast-creek rain, every one of them', () => {
    const rs = riverRain(wet(15, 4).rain, t0);
    for (const c of CREEK_PLUMES) expect(rs.find((r) => r.name === c.name)!.plumeMm, c.name).toBeGreaterThan(0);
  });
});
