import { describe, expect, it } from 'vitest';
import { navWarnFeatures } from './navwarn';
import type { NavWarning } from '../adapters/navwarn-parse';

const w = (id: string, text: string, lngLat: [number, number] | null): NavWarning => ({ id, issuedMs: 0, text, lngLat, match: lngLat ? 'position' : 'place' });

describe('navWarnFeatures', () => {
  it('maps only warnings with a position, red when they close water', () => {
    const fc = navWarnFeatures([
      w('A', 'BUOY OFF STATION', [-83, 10]),
      w('B', 'AREA CLOSED TO NAVIGATION', [-82.9, 9.9]),
      w('C', 'LIMON PORT WORKS', null),
    ]);
    expect(fc.features.map((f) => f.properties)).toEqual([{ id: 'A', closes: false }, { id: 'B', closes: true }]);
  });
});
