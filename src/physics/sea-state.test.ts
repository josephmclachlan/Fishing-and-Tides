import { describe, expect, it } from 'vitest';
import { comfortClass, currentFactor, opposingMs, seaState, simPartitions, withCurrent } from './sea-state';

describe('seaState', () => {
  it('flat water is comfortable', () => {
    const s = seaState({ windWaveHm: 0, windWaveTs: 3, swellHm: 0, swellTs: 10 });
    expect(s.score).toBe(100);
    expect(s.comfort).toBe('comfortable');
  });
  it('long swell is easier than short steep sea of the same height', () => {
    const long = seaState({ windWaveHm: 0, windWaveTs: 3, swellHm: 1.5, swellTs: 12 });
    const short = seaState({ windWaveHm: 1.5, windWaveTs: 4, swellHm: 0, swellTs: 12 });
    expect(long.score).toBeGreaterThan(short.score);
    expect(short.steepness).toBeGreaterThan(long.steepness);
  });
  it('energy-adds the partitions and weights the period', () => {
    const s = seaState({ windWaveHm: 3, windWaveTs: 4, swellHm: 4, swellTs: 12 });
    expect(s.totalHm).toBeCloseTo(5, 6);
    expect(s.meanPeriodS).toBeCloseTo((9 * 4 + 16 * 12) / 25, 6);
    expect(s.dominant).toBe('swell');
  });
  it('a cross sea scores lower than aligned trains', () => {
    const base = { windWaveHm: 1, windWaveTs: 5, swellHm: 1, swellTs: 10 };
    const aligned = seaState({ ...base, windWaveDirDeg: 40, swellDirDeg: 40 });
    const opposed = seaState({ ...base, windWaveDirDeg: 40, swellDirDeg: 220 });
    expect(aligned.confusion).toBeCloseTo(0, 6);
    expect(opposed.confusion).toBeCloseTo(1, 6);
    expect(opposed.score).toBeLessThan(aligned.score);
  });
  it('classes by score', () => {
    expect(comfortClass(80)).toBe('comfortable');
    expect(comfortClass(60)).toBe('lively');
    expect(comfortClass(30)).toBe('rough');
    expect(comfortClass(10)).toBe('uncomfortable');
  });
  it('SIM partitions grow with the wind', () => {
    const c = { windKt: 12, windDirDeg: 70, swellHeightM: 1.4, swellPeriodS: 11, swellDirDeg: 40 };
    expect(simPartitions({ ...c, windKt: 25 }).windWaveHm).toBeGreaterThan(simPartitions(c).windWaveHm);
  });
});

describe('wave-current interaction', () => {
  // Waves from 60° travel toward 240°; a current toward 60° runs against them.
  const against = { u: Math.sin(Math.PI / 3), v: Math.cos(Math.PI / 3) }; // 1 m/s toward 60°
  const along = { u: -against.u, v: -against.v };
  it('steepens against the waves and flattens with them (cg0 = 7.8 m/s at 10 s)', () => {
    expect(currentFactor(10, 60, against)).toBeCloseTo(1 + 2 / 7.85, 2);
    expect(currentFactor(10, 60, along)).toBeCloseTo(1 - 2 / 7.85, 2);
  });
  it('changes nothing for still water, a cross current or missing data', () => {
    expect(currentFactor(10, 60, { u: 0, v: 0 })).toBe(1);
    expect(currentFactor(10, 60, { u: Math.cos(Math.PI / 3), v: -Math.sin(Math.PI / 3) })).toBeCloseTo(1, 6);
    expect(currentFactor(0, 60, against)).toBe(1);
    expect(currentFactor(10, undefined, against)).toBe(1);
  });
  it('is clamped for very strong currents', () => {
    expect(currentFactor(4, 60, { u: 3 * against.u, v: 3 * against.v })).toBe(1.6);
  });
  it('a current against the sea lowers the comfort score', () => {
    const p = { windWaveHm: 0.4, windWaveTs: 4, windWaveDirDeg: 60, swellHm: 1, swellTs: 9, swellDirDeg: 60 };
    expect(seaState(withCurrent(p, against)).score).toBeLessThan(seaState(p).score);
    expect(seaState(withCurrent(p, along)).score).toBeGreaterThan(seaState(p).score);
  });
  it('reports the opposing component of the dominant train', () => {
    const p = { windWaveHm: 0.2, windWaveTs: 3, windWaveDirDeg: 150, swellHm: 1, swellTs: 9, swellDirDeg: 60 };
    expect(opposingMs(p, against)).toBeCloseTo(1, 6);
    expect(opposingMs({ ...p, swellDirDeg: undefined }, against)).toBeNull();
  });
});
