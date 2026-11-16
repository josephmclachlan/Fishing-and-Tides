import { describe, expect, it } from 'vitest';
import { DP_SECTIONS, dispatchHash, parseDispatchRoute } from './route';

describe('dispatch route', () => {
  it('reads the page and its sections', () => {
    expect(parseDispatchRoute('#dispatch')).toEqual({ section: null });
    expect(parseDispatchRoute('#dispatch/')).toEqual({ section: null });
    for (const s of DP_SECTIONS) expect(parseDispatchRoute(`#dispatch/${s}`)).toEqual({ section: s });
  });
  it('ignores junk sections and other pages', () => {
    expect(parseDispatchRoute('#dispatch/nope')).toEqual({ section: null });
    expect(parseDispatchRoute('#guide')).toBeNull();
    expect(parseDispatchRoute('#dispatcher')).toBeNull();
    expect(parseDispatchRoute('')).toBeNull();
  });
  it('round-trips', () => {
    expect(dispatchHash()).toBe('#dispatch');
    for (const s of DP_SECTIONS) expect(parseDispatchRoute(dispatchHash(s))).toEqual({ section: s });
  });
});
