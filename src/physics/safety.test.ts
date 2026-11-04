import { describe, expect, it } from 'vitest';
import { safetyTerm } from './safety';

describe('safetyTerm', () => {
  it('is 1 with nothing wrong', () => {
    expect(safetyTerm(undefined, undefined)).toBe(1);
    expect(safetyTerm(false, 'none')).toBe(1);
  });
  it('caps by squall level', () => {
    expect(safetyTerm(false, 'watch')).toBe(0.7);
    expect(safetyTerm(false, 'high')).toBe(0.25);
  });
  it('lightning beats a squall', () => {
    expect(safetyTerm(true, 'watch')).toBe(0.1);
  });
});
