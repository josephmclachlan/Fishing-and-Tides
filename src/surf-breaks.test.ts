import { describe, expect, it } from 'vitest';
import { en } from './i18n/en';
import { REGION, SPOTS } from './region';
import { SURF_BREAKS } from './data/surf-breaks';
import { breaksNear, compass8 } from './surf-breaks';

describe('surf break catalog', () => {
  it('has unique ids, sources, and all its text in English', () => {
    expect(new Set(SURF_BREAKS.map((b) => b.id)).size).toBe(SURF_BREAKS.length);
    for (const b of SURF_BREAKS) {
      expect(b.sources.length).toBeGreaterThan(0);
      expect(b.sources.every((s) => s.url.startsWith('https://'))).toBe(true);
      expect(`surf.type.${b.type}` in en && `surf.shape.${b.shape}` in en).toBe(true);
      for (const h of b.hazards) expect(`surf.hazard.${h}` in en).toBe(true);
      expect(b.facing).toBeGreaterThanOrEqual(0);
      expect(b.facing).toBeLessThan(360);
    }
  });
  it('sits inside the region and agrees with the spot list', () => {
    const [[w, s], [e, n]] = REGION.bounds;
    for (const b of SURF_BREAKS) {
      expect(b.lngLat[0]).toBeGreaterThan(w);
      expect(b.lngLat[0]).toBeLessThan(e);
      expect(b.lngLat[1]).toBeGreaterThan(s);
      expect(b.lngLat[1]).toBeLessThan(n);
      const spot = SPOTS.find((p) => p.name === b.name);
      if (spot) expect(spot.lngLat).toEqual(b.lngLat);
    }
  });
  it('only claims what two guides support as OK', () => {
    for (const b of SURF_BREAKS) if (b.confidence === 'ok') expect(b.sources.length).toBeGreaterThanOrEqual(2);
  });
});

describe('helpers', () => {
  it('names bearings', () => {
    expect(compass8(0)).toBe('N');
    expect(compass8(350)).toBe('N');
    expect(compass8(40)).toBe('NE');
    expect(compass8(-45)).toBe('NW');
  });
  it('finds breaks near a point, nearest first', () => {
    const near = breaksNear(-82.7524, 9.6582, 5000);
    expect(near[0].brk.id).toBe('salsa-brava');
    expect(near[0].distanceM).toBeLessThan(1);
    expect(breaksNear(-82.5, 9.5, 1000)).toEqual([]);
  });
});
