import { describe, expect, it } from 'vitest';
import { CG_TABS, ciguateraHash, parseCiguateraRoute } from './route';

describe('ciguatera route', () => {
  it('parses the page and its tabs', () => {
    expect(parseCiguateraRoute('#ciguatera')).toEqual({ tab: 'risk' });
    expect(parseCiguateraRoute('#ciguatera/treatment')).toEqual({ tab: 'treatment' });
    expect(parseCiguateraRoute('#ciguatera/nope')).toEqual({ tab: 'risk' });
  });
  it('ignores other hashes', () => {
    expect(parseCiguateraRoute('#guide')).toBeNull();
    expect(parseCiguateraRoute('#ciguaterax')).toBeNull();
    expect(parseCiguateraRoute('')).toBeNull();
  });
  it('round-trips every tab', () => {
    for (const t of CG_TABS) expect(parseCiguateraRoute(ciguateraHash(t))).toEqual({ tab: t });
  });
});
