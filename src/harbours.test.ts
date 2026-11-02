import { describe, expect, it } from 'vitest';
import { en } from './i18n/en';
import { es } from './i18n/es';
import { REGION } from './region';
import { PLACES } from './data/harbours';
import { nearestPlace } from './harbours';

describe('harbour catalog', () => {
  it('has unique ids, https sources and text in both languages', () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    for (const p of PLACES) {
      expect(p.sources.length).toBeGreaterThan(0);
      expect(p.sources.every((s) => s.url.startsWith('https://'))).toBe(true);
      expect(`place.kind.${p.kind}` in en && `place.kind.${p.kind}` in es).toBe(true);
    }
  });
  it('sits inside the region', () => {
    const [[w, s], [e, n]] = REGION.bounds;
    for (const p of PLACES) expect(p.lngLat[0] > w && p.lngLat[0] < e && p.lngLat[1] > s && p.lngLat[1] < n).toBe(true);
  });
  it('tags the approximate anchorage CHECK', () => {
    expect(PLACES.find((p) => p.kind === 'anchorage')?.confidence).toBe('check');
  });
});

describe('nearestPlace', () => {
  it('finds the closest within range', () => {
    expect(nearestPlace(-83.0252, 9.9909)?.place.id).toBe('puerto-limon');
    expect(nearestPlace(-83.0216, 9.9953)?.place.id).toBe('limon-anchorage');
    expect(nearestPlace(-82.7, 9.65)).toBeNull();
  });
});
