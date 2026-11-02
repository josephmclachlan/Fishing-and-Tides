import { describe, expect, it } from 'vitest';
import { comfortClass, seaState, simPartitions } from './sea-state';

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
