import { describe, expect, it } from 'vitest';
import { unRle } from './seafloor';

describe('unRle', () => {
  it('decodes alternating water/land runs, each row starting with water', () => {
    // Row 0: 2 water, 3 land. Row 1: 0 water, 4 land, 1 water.
    const z = unRle(new Uint16Array([2, 3, 0, 4, 1]), 5, 2);
    expect(Array.from(z)).toEqual([0, 0, 1, 1, 1, 1, 1, 1, 1, 0]);
  });
});
