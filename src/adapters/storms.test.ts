import { describe, expect, it } from 'vitest';
import { parseStorms, stormCategory, stormRangeKm } from './storms';

describe('storms', () => {
  it('an empty season is a valid answer', () => {
    expect(parseStorms({ activeStorms: [] }, 0).storms).toEqual([]);
  });
  it('parses an Atlantic storm and skips the Pacific and position-less ones', () => {
    const d = parseStorms({
      activeStorms: [
        { id: 'al092026', name: 'Iota', classification: 'HU', intensity: '100', pressure: '960', latitudeNumeric: 14.1, longitudeNumeric: -80.2, movementDir: 270, movementSpeed: 9, lastUpdate: '2026-11-02T15:00:00.000Z', publicAdvisory: { url: 'https://www.nhc.noaa.gov/text/x.shtml' } },
        { id: 'ep012026', name: 'Pacific', latitudeNumeric: 12, longitudeNumeric: -100 },
        { id: 'al102026', name: 'Nowhere' },
      ],
    }, Date.UTC(2026, 10, 2));
    expect(d.storms).toHaveLength(1);
    const s = d.storms[0];
    expect([s.name, s.windKt, s.pressureMb, s.lngLat]).toEqual(['Iota', 100, 960, [-80.2, 14.1]]);
    expect(s.advisoryUrl).toBe('https://www.nhc.noaa.gov/text/x.shtml');
    expect(stormCategory(s.windKt)).toBe(3);
    expect(stormRangeKm(s)).toBeGreaterThan(300);
  });
  it('drops non-https advisory links', () => {
    const d = parseStorms({ activeStorms: [{ id: 'al01', latitudeNumeric: 1, longitudeNumeric: 1, publicAdvisory: { url: 'javascript:1' } }] }, 0);
    expect(d.storms[0].advisoryUrl).toBeNull();
  });
  it('rejects a body without the list', () => {
    expect(() => parseStorms({}, 0)).toThrow();
  });
  it('categories follow Saffir-Simpson', () => {
    expect([30, 64, 83, 96, 113, 137].map(stormCategory)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
