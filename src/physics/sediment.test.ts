import { describe, expect, it } from 'vitest';
import { bedStirring, combinedShear, currentShear, dStar, settlingVelocity, shieldsCritical, stirring, tauCritical, tauSuspension, waveShear } from './sediment';

describe('sand grain (Soulsby 1997)', () => {
  it('gives textbook values for 0.25 mm sand in warm seawater', () => {
    expect(dStar(0.25e-3)).toBeCloseTo(6.9, 1);
    expect(shieldsCritical(dStar(0.25e-3))).toBeCloseTo(0.04, 2);
    expect(tauCritical()).toBeGreaterThan(0.14);
    expect(tauCritical()).toBeLessThan(0.2);
    // Settling velocity of fine-to-medium sand is a few cm/s.
    expect(settlingVelocity()).toBeGreaterThan(0.03);
    expect(settlingVelocity()).toBeLessThan(0.045);
    expect(tauSuspension()).toBeGreaterThan(5 * tauCritical());
  });
  it('coarser sand needs more stress to move', () => {
    expect(tauCritical(0.5e-3)).toBeGreaterThan(tauCritical(0.25e-3));
  });
});

describe('bed shear', () => {
  it('grows with orbital velocity and current speed', () => {
    expect(waveShear(0.4, 8)).toBeGreaterThan(waveShear(0.2, 8));
    expect(currentShear(0.5, 5)).toBeGreaterThan(currentShear(0.25, 5));
    expect(waveShear(0, 8)).toBe(0);
    expect(currentShear(0.3, 0)).toBe(0);
  });
  it('a current adds to the waves, never takes away', () => {
    const w = waveShear(0.3, 8);
    expect(combinedShear(w, 0)).toBeCloseTo(w);
    expect(combinedShear(0, 0.2)).toBeCloseTo(0.2);
    expect(combinedShear(w, 0.2)).toBeGreaterThan(Math.max(w, 0.2));
  });
});

describe('stirring', () => {
  it('is zero below the threshold of motion and full once the sand is suspended', () => {
    expect(stirring(0.9 * tauCritical())).toBe(0);
    expect(stirring(1.5 * tauCritical())).toBeGreaterThan(0);
    expect(stirring(1.5 * tauCritical())).toBeLessThan(0.1);
    expect(stirring(tauSuspension())).toBeCloseTo(1);
    expect(stirring(10 * tauSuspension())).toBe(1);
  });
  it('flat calm and deep water stay clear; big swell over a shallow reef is stirred', () => {
    expect(bedStirring(0.1, 5, 4)).toBe(0);
    expect(bedStirring(1.5, 10, 40)).toBe(0);
    expect(bedStirring(1.5, 10, 4)).toBeGreaterThan(0.5);
    expect(bedStirring(NaN, 10, 4)).toBe(0);
  });
  it('a current stirs more when the waves are already working the bed', () => {
    expect(bedStirring(0.6, 8, 4, 0.4)).toBeGreaterThan(bedStirring(0.6, 8, 4, 0));
  });
});
