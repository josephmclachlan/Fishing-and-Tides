import { describe, expect, it } from 'vitest';
import {
  GAMMA_DEFAULT, angleAtBreak, breaker, breakerHeight, breakerIndex, breakerType, depthLimited, energyDensity, iribarren, longshoreCurrent, meanSlope, waveFlux,
} from './breaking';
import { G, RHO_SEA } from './waves';

describe('breaker height and depth', () => {
  it('Komar & Gaughan: a 1 m, 10 s swell breaks at about 1.55 m', () => {
    expect(breakerHeight(1, 10)).toBeCloseTo(0.39 * G ** 0.2 * 10 ** 0.4, 9);
    expect(breakerHeight(1, 10)).toBeCloseTo(1.548, 2);
    // Longer period, same height: bigger breaker.
    expect(breakerHeight(1, 16)).toBeGreaterThan(breakerHeight(1, 8));
    expect(breakerHeight(0, 10)).toBe(0);
  });

  it('Weggel index: 0.78 with no slope, ~0.91 on 1:50, higher on steeper beaches', () => {
    expect(breakerIndex(1.5, 10, null)).toBe(GAMMA_DEFAULT);
    expect(breakerIndex(1.548, 10, 0.02)).toBeCloseTo(0.908, 2);
    expect(breakerIndex(1.5, 10, 0.08)).toBeGreaterThan(breakerIndex(1.5, 10, 0.02));
  });

  it('caps shoaled heights at γh', () => {
    expect(depthLimited(3, 2)).toBeCloseTo(1.56, 9);
    expect(depthLimited(1, 5)).toBe(1);
  });
});

describe('breaker type', () => {
  it('Iribarren classes: flat sand spills, moderate slope plunges, reef steps surge', () => {
    expect(iribarren(1, 10, 0.02)).toBeCloseTo(0.02 / Math.sqrt(1 / 156.08), 3);
    expect(breakerType(iribarren(1, 10, 0.02))).toBe('spilling');
    expect(breakerType(iribarren(1, 10, 0.1))).toBe('plunging');
    expect(breakerType(iribarren(1, 10, 0.4))).toBe('surging');
  });
});

describe('energy and force', () => {
  it('energy density ρgH²/8 and flux E·Cg', () => {
    expect(energyDensity(1)).toBeCloseTo((RHO_SEA * G) / 8, 9);
    // Deep water: P = ρ g² Hs² T / (64 π) ≈ 0.49 Hs² T kW/m.
    expect(waveFlux(2, 10, 5000) / 1000).toBeCloseTo((RHO_SEA * G * G * 4 * 10) / (64 * Math.PI) / 1000, 6);
    expect(waveFlux(2, 10, 5000) / 1000).toBeCloseTo(19.6, 0);
  });

  it('longshore current is zero straight in and peaks at 45°', () => {
    expect(longshoreCurrent(1.5, 0)).toBeCloseTo(0, 12);
    expect(longshoreCurrent(1.5, 45)).toBeGreaterThan(longshoreCurrent(1.5, 20));
    expect(longshoreCurrent(1.5, -30)).toBeLessThan(0);
  });

  it('a full breaker readout is self-consistent', () => {
    const b = breaker({ H0: 1.2, T: 11, Kr: 0.9, slope: 0.03, angleDeg: 15 });
    expect(b.Hb).toBeCloseTo(breakerHeight(1.08, 11), 9);
    expect(b.hb * b.gamma).toBeCloseTo(b.Hb, 9);
    expect(b.type).toBe('spilling');
    expect(b.speedMs).toBeCloseTo(Math.sqrt(G * (b.hb + b.Hb)), 9);
    expect(b.impactKPa).toBeGreaterThan(10);
    expect(b.impactKPa).toBeLessThan(30);
    expect(b.longshoreMs).toBeGreaterThan(0.5);
    // Sheltered (Kr → 0): nothing arrives.
    const lee = breaker({ H0: 1.2, T: 11, Kr: 0, slope: null });
    expect([lee.Hb, lee.powerKWm, lee.type]).toEqual([0, 0, null]);
  });

  it('waves turn toward the normal between the read point and the break', () => {
    const a = angleAtBreak(30, 10, 10, 1.5);
    expect(a).toBeLessThan(30);
    expect(a).toBeGreaterThan(10);
    expect(angleAtBreak(-30, 10, 10, 1.5)).toBeCloseTo(-a, 9);
  });

  it('mean slope from a point and its distance', () => {
    expect(meanSlope(10, 500)).toBeCloseTo(0.02, 9);
    expect(meanSlope(0, 500)).toBeNull();
  });
});
