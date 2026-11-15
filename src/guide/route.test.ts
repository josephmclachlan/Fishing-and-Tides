import { describe, expect, it } from 'vitest';
import { ALL_VIEWS, guideHash, parseGuideRoute, parseView, viewSeg } from './route';

describe('guide route', () => {
  it('reads the views, a species and its tab', () => {
    expect(parseGuideRoute('#guide')).toEqual({ mode: 'all', group: null, id: null, tab: null });
    expect(parseGuideRoute('#guide/')).toEqual({ mode: 'all', group: null, id: null, tab: null });
    expect(parseGuideRoute('#guide/edible')).toEqual({ mode: 'edible', group: null, id: null, tab: null });
    expect(parseGuideRoute('#guide/sharks-rays')).toEqual({ mode: 'all', group: 'sharks-rays', id: null, tab: null });
    expect(parseGuideRoute('#guide/edible-fish')).toEqual({ mode: 'edible', group: 'fish', id: null, tab: null });
    expect(parseGuideRoute('#guide/danger-jellies-anemones')).toEqual({ mode: 'danger', group: 'jellies-anemones', id: null, tab: null });
    expect(parseGuideRoute('#guide/fish/lutjanus-apodus')).toEqual({ mode: 'all', group: 'fish', id: 'lutjanus-apodus', tab: null });
    expect(parseGuideRoute('#guide/edible/lutjanus-apodus/clean')).toEqual({ mode: 'edible', group: null, id: 'lutjanus-apodus', tab: 'clean' });
  });
  it('is null for other pages and ignores junk', () => {
    expect(parseGuideRoute('#coral')).toBeNull();
    expect(parseGuideRoute('#forecast/cahuita')).toBeNull();
    expect(parseGuideRoute('#guidebook')).toBeNull();
    expect(parseGuideRoute('#guide/nope')).toEqual({ mode: 'all', group: null, id: null, tab: null });
    expect(parseGuideRoute('#guide/edible-nope')).toEqual({ mode: 'all', group: null, id: null, tab: null });
    expect(parseGuideRoute('#guide/fish/<script>')).toEqual({ mode: 'all', group: 'fish', id: null, tab: null });
    expect(parseGuideRoute('#guide/fish/lutjanus-apodus/nope')).toEqual({ mode: 'all', group: 'fish', id: 'lutjanus-apodus', tab: null });
  });
  it('writes every view and link back', () => {
    for (const v of ALL_VIEWS) {
      const { mode, group } = parseView(v);
      expect(viewSeg(mode, group)).toBe(v);
    }
    for (const h of ['#guide', '#guide/edible', '#guide/corals', '#guide/edible-crustaceans', '#guide/all/lutjanus-apodus', '#guide/fish/lutjanus-apodus', '#guide/danger/pterois-volitans/safety']) {
      expect(guideHash(parseGuideRoute(h)!)).toBe(h);
    }
    expect(guideHash({ mode: 'all', group: 'fish', id: 'lutjanus-apodus', tab: 'about' })).toBe('#guide/fish/lutjanus-apodus');
    expect(guideHash()).toBe('#guide');
  });
});
