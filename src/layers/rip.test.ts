import { describe, expect, it } from 'vitest';
import { haversineM, bearingDeg } from '../geo';
import { createSpotModel } from '../physics/spot-model';
import { land, realDepth } from '../physics/fixtures/seafloor';
import { cellAt } from '../physics/bathy';
import { SPOTS } from '../region';
import { coastStations, creekLevel, floodLevel, maskNormal, offset, ripFeatures, ripSites, riskAt, surfZoneWidth } from './rip';
import { SURF_BREAKS } from '../data/surf-breaks';

describe('rip overlay geometry', () => {
  it('raises a river mouth ring with the river\'s own flow, whatever the surf (PLAN 7.58c)', () => {
    expect([null, NaN, 1, 2, 3.9, 4, 9].map(floodLevel)).toEqual([null, null, 'LOW', 'MOD', 'MOD', 'HIGH', 'HIGH']);
    const sites = ripSites([{ name: 'Río Estrella', rank: 2, at: [-82.8922, 9.7927] }], [], []);
    const ring = (ratio: number | null) => {
      const level = floodLevel(ratio);
      return ripFeatures([], [], sites, null, () => (level ? { level, by: 'river' } : null)).features.find((f) => f.properties!.kind === 'site')!.properties!;
    };
    expect(ring(null)).toMatchObject({ level: 'LOW', site: 'mouth' });
    expect(ring(1.2)).toMatchObject({ level: 'LOW', site: 'mouth' });
    expect(ring(2.5)).toMatchObject({ level: 'MOD', site: 'flood' });
    expect(ring(5)).toMatchObject({ level: 'HIGH', site: 'flood' });
  });

  it('raises a creek mouth ring with the last 6 hours of rain on it (PLAN 7.63)', () => {
    expect([null, NaN, 0, 24.9, 25, 49, 50, 120].map(creekLevel)).toEqual([null, null, 'LOW', 'LOW', 'MOD', 'MOD', 'HIGH', 'HIGH']);
    const sites = ripSites([], [], [{ name: 'Quebrada Joe Gyal', at: [-82.75604, 9.6555] }]);
    const ring = (mm: number | null) => {
      const level = creekLevel(mm);
      return ripFeatures([], [], sites, null, () => (level ? { level, by: 'rain' } : null)).features.find((f) => f.properties!.kind === 'site')!.properties!;
    };
    expect(ring(10)).toMatchObject({ level: 'LOW', site: 'mouth', name: 'Quebrada Joe Gyal' });
    expect(ring(30)).toMatchObject({ level: 'MOD', site: 'creek' });
    expect(ring(60)).toMatchObject({ level: 'HIGH', site: 'creek' });
  });

  it('rings the named Puerto Viejo creeks that OSM tags as streams', () => {
    const sites = ripSites([{ name: 'Quebrada Joe Gyal Bridge', rank: 0.5, at: [-82.75604, 9.6555] }], SURF_BREAKS);
    const mouths = sites.filter((s) => s.kind === 'mouth').map((s) => s.name);
    expect(mouths).toEqual(['Quebrada Joe Gyal', 'Quebrada Honta']);
    // Joe Gyal is ~500 m from the Salsa Brava break ring, so both stay.
    expect(sites.map((s) => s.name)).toContain('SALSA BRAVA');
  });

  it('offsets by distance and bearing', () => {
    const p: [number, number] = [-82.84, 9.74];
    const q = offset(p, 45, 1000);
    expect(haversineM(p, q)).toBeCloseTo(1000, -1);
    expect(bearingDeg(p, q)).toBeCloseTo(45, 0);
  });

  it('surf zone width from breaking depth and slope, clamped', () => {
    expect(surfZoneWidth(2, 0.02)).toBeCloseTo(100, 9);
    expect(surfZoneWidth(2, null)).toBeCloseTo(2 / 0.03, 9);
    expect(surfZoneWidth(0.1, 0.1)).toBe(20);
    expect(surfZoneWidth(5, 0.001)).toBe(800);
  });

  it('shades only MOD/HIGH stretches of coast, rings the fixed sites, and labels the model reading', () => {
    const m = createSpotModel(realDepth, { fanStepDeg: 1 });
    const spots = SPOTS.slice(2, 4);
    const small = { Hs: 0.3, Tp: 7, fromDeg: 45 };
    const large = { Hs: 2.5, Tp: 13, fromDeg: 45 };
    const calm = spots.map((s) => ({ name: s.name, pin: s.lngLat, sea: small, result: m.spot({ pin: s.lngLat, sea: small, tideLevel: 0.5 }) }));
    const big = spots.map((s) => ({ name: s.name, pin: s.lngLat, sea: large, result: m.spot({ pin: s.lngLat, sea: large, tideLevel: 0 }) }));
    const stations = coastStations(land).filter((st) => haversineM(st.p, spots[0].lngLat) < 8000);
    const sites = ripSites([{ name: 'Kelly Creek', rank: 1, at: [-82.83881, 9.73674] }], SURF_BREAKS);
    const kinds = (fc: ReturnType<typeof ripFeatures>) => new Set(fc.features.map((f) => f.properties!.kind));
    // Calm: no shading and no labels, only the fixed sites, drawn LOW.
    const quiet = ripFeatures(calm, stations, sites);
    expect([...kinds(quiet)]).toEqual(['site']);
    expect(quiet.features.every((f) => f.properties!.level === 'LOW')).toBe(true);
    // Big swell at low tide: the coast lights up HIGH near the spots and the labels name them.
    const fc = ripFeatures(big, stations, sites);
    expect(kinds(fc)).toEqual(new Set(['coast', 'site', 'label']));
    const coast = fc.features.filter((f) => f.properties!.kind === 'coast');
    expect(coast.length).toBeGreaterThan(20);
    expect(coast.some((f) => f.properties!.level === 'HIGH')).toBe(true);
    const label = fc.features.find((f) => f.properties!.kind === 'label')!;
    expect(String(label.properties!.label)).toContain(`${spots[0].name} · RIP HIGH`);
    expect(ripFeatures([{ name: 'X', pin: [0, 0], sea: small, result: null }], stations).features).toHaveLength(0);
    // On the mock swell (waves feed not in yet) nothing lights up: no false alarm on first open.
    const mock = ripFeatures(big.map((b) => ({ ...b, liveSea: false })), stations, sites);
    expect([...kinds(mock)]).toEqual(['site']);
  }, 30_000);

  it('puts coast stations on open water just off the beach, never in rivers or on land', () => {
    const st = coastStations(land);
    // About 70 km of coast at one station per ~120 m, give or take headlands and islands.
    expect(st.length).toBeGreaterThan(300);
    expect(st.length).toBeLessThan(3000);
    for (const s of st) {
      expect(cellAt(land, s.p[0], s.p[1])).not.toBe(1);
      // Open sea straight out from every station.
      expect(cellAt(land, ...offset(s.p, s.normalDeg, 500))).not.toBe(1);
    }
    // A station near every named spot.
    for (const s of SPOTS) expect(Math.min(...st.map((x) => haversineM(x.p, s.lngLat))), s.name).toBeLessThan(400);
  }, 30_000);

  it('blends risk between spots and is less sure far from them', () => {
    const at = (score: number, pin: [number, number]) => ({ name: '', pin, sea: { Hs: 1, Tp: 10, fromDeg: 45 }, result: { rip: { score } } }) as never;
    const a: [number, number] = [-82.84, 9.74];
    const b: [number, number] = [-82.74, 9.74];
    const states = [at(0.2, a), at(0.8, b)];
    expect(riskAt(a, states)!.score).toBeCloseTo(0.2, 2);
    const mid = riskAt([-82.79, 9.74], states)!;
    expect(mid.score).toBeCloseTo(0.5, 2);
    expect(riskAt(a, states)!.conf).toBe(1);
    expect(riskAt([-82.79, 9.74], states)!.conf).toBeLessThan(1);
    expect(riskAt(a, [])).toBeNull();
  });

  it('takes rip sites from rip-prone breaks and real river mouths, once each', () => {
    const sites = ripSites(
      [
        { name: 'Río Estrella', rank: 1, at: [-82.89217, 9.79269] },
        { name: 'Río Estrella', rank: 1, at: [-82.89471, 9.79371] },
        { name: 'Culvert', rank: 0.5, at: [-82.8, 9.7] },
      ],
      SURF_BREAKS,
      [],
    );
    expect(sites.filter((s) => s.kind === 'mouth').map((s) => s.name)).toEqual(['Río Estrella']);
    expect(sites.filter((s) => s.kind === 'break').map((s) => s.name)).toContain('SALSA BRAVA');
  });

  it('reads the shore normal off the coastline mask: Salsa Brava faces roughly north', () => {
    const salsa = SPOTS.find((s) => s.name === 'SALSA BRAVA')!.lngLat;
    const n = maskNormal(land, salsa)!;
    const off = Math.abs(((n - 0 + 540) % 360) - 180);
    expect(off).toBeLessThan(45);
    expect(maskNormal(land, [-82.9, 9.6])).toBeNull(); // deep inland: no sea in reach
  });

  it('every spot pin sits within ~60 m of the sea in the coastline mask (none stranded inland)', () => {
    for (const s of SPOTS) {
      let nearest = Infinity;
      for (let b = 0; b < 360; b += 10)
        for (let m = 0; m <= 200; m += 5)
          if (cellAt(land, ...offset(s.lngLat, b, m)) === 0) {
            nearest = Math.min(nearest, m);
            break;
          }
      expect(nearest, s.name).toBeLessThanOrEqual(60);
    }
  });
});
