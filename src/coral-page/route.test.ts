import { describe, expect, it } from 'vitest';
import { coralHash, parseCoralRoute } from './route';

describe('coral page route', () => {
  it('opens on reefs by default', () => {
    expect(parseCoralRoute('#coral')).toEqual({ tab: 'reefs', id: null, sub: null });
    expect(parseCoralRoute('#coral/')).toEqual({ tab: 'reefs', id: null, sub: null });
    expect(parseCoralRoute('#coral/nonsense')).toEqual({ tab: 'reefs', id: null, sub: null });
  });
  it('reads tabs, reefs and site folders', () => {
    expect(parseCoralRoute('#coral/spawning')).toEqual({ tab: 'spawning', id: null, sub: null });
    expect(parseCoralRoute('#coral/reefs/cahuita')).toEqual({ tab: 'reefs', id: 'cahuita', sub: null });
    expect(parseCoralRoute('#coral/sites/3f2a-bb/visits')).toEqual({ tab: 'sites', id: '3f2a-bb', sub: 'visits' });
    // An id only belongs to reefs and sites.
    expect(parseCoralRoute('#coral/guide/x')).toEqual({ tab: 'guide', id: null, sub: null });
  });
  it('ignores ids that are not slugs', () => {
    expect(parseCoralRoute('#coral/reefs/<img>')).toEqual({ tab: 'reefs', id: null, sub: null });
  });
  it('is not the forecast or the map', () => {
    expect(parseCoralRoute('')).toBeNull();
    expect(parseCoralRoute('#map')).toBeNull();
    expect(parseCoralRoute('#forecast/cahuita/dive')).toBeNull();
    expect(parseCoralRoute('#coralx')).toBeNull();
  });
  it('round-trips', () => {
    for (const h of ['#coral', '#coral/sites', '#coral/reefs/punta-uva', '#coral/sites/ab-12/conditions', '#coral/rules']) expect(coralHash(parseCoralRoute(h)!)).toBe(h);
    expect(coralHash({ tab: 'reefs' })).toBe('#coral');
  });
});
