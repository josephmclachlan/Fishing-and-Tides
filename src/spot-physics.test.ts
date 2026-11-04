import { describe, expect, it } from 'vitest';
import { PLUME_RIVERS } from './region';
import { SURF_BREAKS } from './data/surf-breaks';
import { PLACES, knownChannel } from './spot-physics';

describe('known rip channels (audit E)', () => {
  it('flags breaks whose guides list rips, and places at a river mouth', () => {
    for (const b of SURF_BREAKS) expect(knownChannel({ lngLat: b.lngLat, brk: b }, [])).toBe(b.hazards.includes('rip'));
    expect(knownChannel({ lngLat: PLUME_RIVERS[0].mouth })).toBe(true);
  });
  it('leaves an open beach far from a mouth alone', () => {
    expect(knownChannel({ lngLat: [-82.9, 9.85] }, [{ mouth: [-82.6, 9.6] }])).toBe(false);
  });
  it('at least one modelled place has a channel', () => {
    expect(PLACES.some((p) => knownChannel(p))).toBe(true);
  });
});
