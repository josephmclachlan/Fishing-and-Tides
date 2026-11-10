import { describe, expect, it } from 'vitest';
import reefsRaw from '../../public/data/seafloor/reefs.geojson?raw';
import { SPOTS } from '../region';
import { land, macro, region } from './fixtures/seafloor';
import { GAMMA_FLAT, IG_RATIO, REEF_FLAT_DEPTH_M, SETUP_RATIO, flatHeight, flatIndex, flatPolygons, onFlat, reefShelter, shoreHeight, type Rings } from './reef-flat';
import type { DepthFn } from './refraction';
import { spotModelFromGrids } from './spot-model';

// A straight coast along the equator: land to the south, 5 m of water to the north. 0.001° of latitude ≈ 111 m.
const coast: DepthFn = (_lng, lat) => (lat > 0 ? 5 : 0);
const pin: [number, number] = [0, -0.0001];
const box = (w: number, s: number, e: number, n: number): Rings => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];

describe('reef flat lookup', () => {
  it('finds points inside an outline and outside its holes', () => {
    const idx = flatIndex([[...box(0, 0, 1, 1), ...box(0.4, 0.4, 0.6, 0.6)]]);
    expect(onFlat(idx, 0.2, 0.2)).toBe(true);
    expect(onFlat(idx, 0.5, 0.5)).toBe(false);
    expect(onFlat(idx, 1.5, 0.5)).toBe(false);
  });

  it('keeps only reef crest and flat zones from the Atlas layer', () => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: [
        { type: 'Feature' as const, properties: { layer: 'zone', cls: 'OUTER REEF FLAT' }, geometry: { type: 'Polygon' as const, coordinates: box(0, 0, 1, 1) } },
        { type: 'Feature' as const, properties: { layer: 'zone', cls: 'REEF SLOPE' }, geometry: { type: 'Polygon' as const, coordinates: box(0, 0, 1, 1) } },
        { type: 'Feature' as const, properties: { layer: 'bottom', cls: 'ROCK' }, geometry: { type: 'Polygon' as const, coordinates: box(0, 0, 1, 1) } },
        { type: 'Feature' as const, properties: { layer: 'zone', cls: 'REEF CREST' }, geometry: { type: 'MultiPolygon' as const, coordinates: [box(0, 0, 1, 1), box(2, 2, 3, 3)] } },
      ],
    };
    expect(flatPolygons(fc)).toHaveLength(3);
  });
});

describe('reef shelter', () => {
  it('is zero with no flat in front', () => {
    expect(reefShelter(flatIndex([]), coast, pin, 0).share).toBe(0);
    expect(reefShelter(flatIndex([box(-1, 0.005, 1, 0.008)]), coast, pin, 180).share).toBe(0);
  });

  it('covers the whole approach behind a wide flat', () => {
    // A flat from ~55 m to ~280 m out, the whole way along the coast.
    const s = reefShelter(flatIndex([box(-1, 0.0005, 1, 0.0025)]), coast, pin, 0);
    expect(s.open).toBeGreaterThan(30);
    expect(s.share).toBe(1);
  });

  it('ignores a flat narrower than MIN_FLAT_M (a strip along a sand beach)', () => {
    expect(reefShelter(flatIndex([box(-1, 0.0005, 1, 0.0013)]), coast, pin, 0).share).toBe(0);
  });

  it('bridges a narrow channel but not a wide gap', () => {
    // 90 m of flat, 11 m of water, 90 m of flat: one flat. With 55 m of water between, two narrow ones.
    expect(reefShelter(flatIndex([box(-1, 0.0005, 1, 0.0013), box(-1, 0.0014, 1, 0.0022)]), coast, pin, 0).share).toBe(1);
    expect(reefShelter(flatIndex([box(-1, 0.0005, 1, 0.0013), box(-1, 0.0018, 1, 0.0026)]), coast, pin, 0).share).toBe(0);
  });

  it('covers part of the approach when the flat stops partway along the beach', () => {
    const s = reefShelter(flatIndex([box(0, 0.0005, 1, 0.0025)]), coast, pin, 0);
    expect(s.share).toBeGreaterThan(0.4);
    expect(s.share).toBeLessThan(0.6);
  });

  it('leaves out lines that run into a headland', () => {
    // Land east of 0.0005° (~55 m) blocks the eastern half of the fan: those lines carry no waves.
    const headland: DepthFn = (lng, lat) => (lat > 0 && lng < 0.0005 ? 5 : 0);
    const all = reefShelter(flatIndex([box(5, 5, 6, 6)]), coast, pin, 0).open;
    const s = reefShelter(flatIndex([box(-1, 0.0005, 0.0004, 0.0025)]), headland, pin, 0);
    expect(s.open).toBeLessThan(all);
    expect(s.share).toBeGreaterThan(0.9);
  });
});

describe('waves over a flat', () => {
  it('holds the short waves to 0.55 of the water on the flat, setup included, and adds the surf beat', () => {
    expect(flatHeight(0, 0)).toBeCloseTo(GAMMA_FLAT * REEF_FLAT_DEPTH_M, 12);
    expect(flatHeight(0.3, 2)).toBeCloseTo(Math.hypot(GAMMA_FLAT * (REEF_FLAT_DEPTH_M + 0.3 + SETUP_RATIO * 2), IG_RATIO * 2), 12);
    expect(flatHeight(-5, 0)).toBe(0);
    // A dry flat still lets the surf beat through.
    expect(flatHeight(-5, 1)).toBeCloseTo(IG_RATIO, 12);
  });

  it('gets rougher on big days much faster than the depth alone allows', () => {
    const calm = flatHeight(0, 0.6), rough = flatHeight(0, 3);
    expect(rough / calm).toBeGreaterThan(2);
    const depthOnly = (h0: number) => GAMMA_FLAT * (REEF_FLAT_DEPTH_M + SETUP_RATIO * h0);
    expect(rough - calm).toBeGreaterThan(depthOnly(3) - depthOnly(0.6));
  });

  it('adds the energies of the open and the covered approach', () => {
    expect(shoreHeight(1.5, 0, 0.3)).toBe(1.5);
    expect(shoreHeight(1.5, 1, 0.3)).toBeCloseTo(0.3, 12);
    expect(shoreHeight(0.2, 1, 0.3)).toBeCloseTo(0.2, 12); // a breaker already smaller than the limit passes as it is
    expect(shoreHeight(1.5, 0.5, 0.3)).toBeCloseTo(Math.sqrt(0.5 * 1.5 ** 2 + 0.5 * 0.3 ** 2), 12);
    expect(shoreHeight(0, 1, 0.3)).toBe(0);
  });
});

describe('reef shelter at the real spots', () => {
  const m = spotModelFromGrids({ region, macro, land, reefFlats: flatPolygons(JSON.parse(reefsRaw)) }, { fanStepDeg: 1 });
  const sea = { Hs: 1.5, Tp: 10, fromDeg: 40 };
  const at = (name: string, tideM = 0) => m.spot({ pin: SPOTS.find((s) => s.name === name)!.lngLat, sea, tideLevel: 0.5, tideM })!;

  it('cuts the waves inside the Cahuita reef and the Chiquita and Punta Uva flats', () => {
    for (const name of ['PUNTA CAHUITA', 'PLAYA CHIQUITA', 'PUNTA UVA']) {
      const r = at(name);
      expect(r.shore.share, name).toBeGreaterThan(0.7);
      expect(r.shore.Hb, name).toBeLessThan(0.6 * r.waves.breaker.Hb);
      expect(r.shore.HbAll, name).toBeLessThanOrEqual(r.HbAll);
    }
  });

  it('leaves open sand beaches and the surf breaks as they were', () => {
    for (const name of ['PLAYA NEGRA CAHUITA', 'PLAYA NEGRA', 'PLAYA COCLES', 'SALSA BRAVA', 'GANDOCA']) {
      const r = at(name);
      expect(r.shore.share, name).toBeLessThan(0.15);
      expect(r.shore.Hb, name).toBeGreaterThan(0.95 * r.waves.breaker.Hb);
    }
  });

  it('lets more through at high tide', () => {
    expect(at('PUNTA CAHUITA', 0.3).shore.Hb).toBeGreaterThan(at('PUNTA CAHUITA', -0.29).shore.Hb);
  });

  it('works without reef data (no shelter)', () => {
    const bare = spotModelFromGrids({ region, macro, land });
    const r = bare.spot({ pin: SPOTS[1].lngLat, sea, tideLevel: 0.5 })!;
    expect(r.shore.share).toBe(0);
    expect(r.shore.Hb).toBe(r.waves.breaker.Hb);
  });
});
