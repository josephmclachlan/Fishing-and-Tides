import { describe, expect, it } from 'vitest';
import { NO_LIFT, lifted } from './paint';

describe('painted wash lift', () => {
  const light = { gain: 1.5, floor: 0.08, cap: 0.62 };
  it('leaves the old washes alone without a theme lift', () => {
    for (const a of [0, 0.07, 0.26, 0.42, 1]) expect(lifted(a, NO_LIFT)).toBe(a);
  });
  it('makes faint washes show on a light sea, keeps order, and caps the strongest', () => {
    const [good, fair, poor] = [0.07, 0.26, 0.42].map((a) => lifted(a, light));
    expect(good).toBeGreaterThan(0.15);
    expect(good).toBeLessThan(fair);
    expect(fair).toBeLessThan(poor);
    expect(poor).toBeLessThanOrEqual(0.62);
  });
  it('never paints what was clear, and never weakens a wash already over the cap', () => {
    expect(lifted(0, light)).toBe(0);
    expect(lifted(0.85, light)).toBe(0.85);
  });
});
