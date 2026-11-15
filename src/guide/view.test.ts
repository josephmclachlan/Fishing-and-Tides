import { describe, expect, it } from 'vitest';
import { bandText, depthLines, lengthText, pips, sizeMain, sizeMax, timesText, weightText } from './view';

describe('guide numbers', () => {
  it('writes lengths in the unit that reads best', () => {
    expect(lengthText(0.4)).toBe('4 mm');
    expect(lengthText(3.25)).toBe('3.3 cm');
    expect(lengthText(67)).toBe('67 cm');
    expect(lengthText(250)).toBe('2.5 m');
    expect(lengthText(NaN)).toBe('--');
  });
  it('gives the usual size and the maximum with what was measured', () => {
    expect(sizeMain({ common: 30, max: 67 })).toBe('30 cm');
    expect(sizeMain({ max: 2, unit: 'm' })).toBe('2 m');
    expect(sizeMain(undefined)).toBe('--');
    expect(sizeMax({ max: 79, measure: 'FL' }, 'en')).toBe('Up to 79 cm fork length');
    expect(sizeMax({ max: 30, unit: 'mm', measure: 'SH' }, 'es')).toBe('Hasta 3 cm largo de la concha');
    expect(sizeMax({ common: 3 }, 'en')).toBe('');
  });
  it('writes depth bands', () => {
    expect(bandText(0, 0, 'en')).toBe('Shore and surface');
    expect(bandText(0, 20, 'en')).toBe('Surface to 20 m');
    expect(bandText(2, 20, 'es')).toBe('2 a 20 m');
    expect(bandText(5, 5, 'en')).toBe('5 m');
    expect(depthLines({ min: 0, max: 63, usualMin: 2, usualMax: 20 }, 'en')).toEqual({ main: '2 to 20 m', range: 'Range surface to 63 m' });
    expect(depthLines({ min: 1, max: 10 }, 'en')).toEqual({ main: '1 to 10 m', range: '' });
    expect(depthLines(undefined, 'en')).toEqual({ main: '--', range: '' });
  });
  it('writes weights in kg, grams under a kilo', () => {
    expect(weightText({ common: 1.2, max: 10.8, unit: 'kg' }, 'en')).toBe('Usually 1.2 kg, up to 10.8 kg');
    expect(weightText({ max: 450, unit: 'g' }, 'es')).toBe('Hasta 450 g');
    expect(weightText(undefined, 'en')).toBe('');
  });
  it('lists times in the day order', () => {
    expect(timesText(['night', 'day'], 'en')).toBe('Day and night');
    expect(timesText(['night', 'twilight', 'day'], 'es')).toBe('Día, amanecer, atardecer y noche');
    expect(timesText(['twilight'], 'en')).toBe('Dawn and dusk');
    expect(timesText([], 'en')).toBe('');
  });
  it('draws table quality as five pips', () => {
    expect(pips(4)).toBe('●●●●○');
    expect(pips(undefined)).toBe('');
  });
});
