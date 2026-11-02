import { describe, expect, it } from 'vitest';
import { G, bottomOrbitalVelocity, deepWavelength, kinematics, shoal, shoalingCoefficient, wavenumber } from './waves';

describe('dispersion', () => {
  it('satisfies ω² = g k tanh(kh) to machine precision', () => {
    for (const T of [4, 8, 12, 16, 20])
      for (const h of [0.5, 2, 5, 10, 30, 100, 500]) {
        const k = wavenumber(T, h);
        const w = (2 * Math.PI) / T;
        expect(Math.abs(G * k * Math.tanh(k * h) - w * w) / (w * w)).toBeLessThan(1e-12);
      }
  });

  it('deep water: L0 = gT²/2π, cg = c/2', () => {
    expect(deepWavelength(10)).toBeCloseTo(156.08, 2);
    const d = kinematics(10, 2000);
    expect(d.L).toBeCloseTo(156.08, 2);
    expect(d.cg / d.c).toBeCloseTo(0.5, 9);
    expect(kinematics(10, Infinity).L).toBeCloseTo(156.08, 2);
  });

  it('shallow water: c → √(gh), cg → c', () => {
    const s = kinematics(30, 1);
    expect(s.c).toBeCloseTo(Math.sqrt(G * 1), 2);
    expect(s.n).toBeGreaterThan(0.99);
  });

  it('matches the SPM/CEM table: h/L0 = 0.1 gives h/L = 0.1410', () => {
    const T = 10;
    const h = 0.1 * deepWavelength(T);
    expect(h / kinematics(T, h).L).toBeCloseTo(0.141, 3);
  });

  it('rejects dry cells', () => {
    expect(wavenumber(10, 0)).toBeNaN();
    expect(wavenumber(10, -3)).toBeNaN();
  });
});

describe('shoaling', () => {
  it('is 1 in deep water and dips to the textbook minimum ~0.913', () => {
    expect(shoalingCoefficient(10, 1000)).toBeCloseTo(1, 6);
    let min = Infinity;
    const L0 = deepWavelength(10);
    for (let r = 0.01; r < 0.5; r += 0.001) min = Math.min(min, shoalingCoefficient(10, r * L0));
    expect(min).toBeCloseTo(0.913, 3);
  });

  it('matches the CEM table: Ks = 0.933 at h/L0 = 0.1, 1.023 at 0.05, 1.435 at 0.01', () => {
    const L0 = deepWavelength(12);
    expect(shoalingCoefficient(12, 0.1 * L0)).toBeCloseTo(0.933, 3);
    expect(shoalingCoefficient(12, 0.05 * L0)).toBeCloseTo(1.023, 3);
    expect(shoalingCoefficient(12, 0.01 * L0)).toBeCloseTo(1.435, 2);
  });

  it('grows a long swell more than a short wind sea in the same depth', () => {
    expect(shoal(1, 14, 3)).toBeGreaterThan(shoal(1, 6, 3));
    expect(shoal(1, 14, 3)).toBeGreaterThan(1.2);
  });
});

describe('bottom orbital velocity', () => {
  it('is ~0 in deep water and approaches the shallow limit H/2·√(g/h)', () => {
    expect(bottomOrbitalVelocity(1, 8, 500)).toBeLessThan(1e-6);
    const h = 0.5;
    expect(bottomOrbitalVelocity(0.2, 30, h)).toBeCloseTo((0.2 / 2) * Math.sqrt(G / h), 2);
  });

  it('a 1 m, 10 s swell over 10 m of reef moves the bed at about half a metre per second', () => {
    const u = bottomOrbitalVelocity(1, 10, 10);
    expect(u).toBeGreaterThan(0.4);
    expect(u).toBeLessThan(0.6);
  });
});
