import { describe, expect, it } from 'vitest';
import { apparentTempC, relHumidityPct, satVapourHpa } from './heat';

describe('humidity and real feel', () => {
  it('matches the saturation vapour pressure table', () => {
    // WMO table values: 6.11 hPa at 0 °C, 23.37 at 20 °C, 42.43 at 30 °C.
    expect(satVapourHpa(0)).toBeCloseTo(6.11, 1);
    expect(satVapourHpa(20)).toBeCloseTo(23.37, 0);
    expect(satVapourHpa(30)).toBeCloseTo(42.43, 0);
  });
  it('gives relative humidity from the dew point', () => {
    expect(relHumidityPct(25, 25)).toBeCloseTo(100, 5);
    // 30 °C with a 24 °C dew point is about 70%.
    expect(relHumidityPct(30, 24)).toBeGreaterThan(68);
    expect(relHumidityPct(30, 24)).toBeLessThan(72);
    expect(relHumidityPct(25, 27)).toBe(100);
    expect(relHumidityPct(NaN, 20)).toBeNaN();
  });
  it('feels hotter in humid still air and cooler in wind', () => {
    // BoM worked example scale: 30 °C, e ≈ 29.8 hPa (dew 24 °C), calm: 30 + 9.8 − 4 ≈ 35.9.
    expect(apparentTempC(30, 24, 0)).toBeCloseTo(35.9, 0);
    expect(apparentTempC(30, 24, 5)).toBeCloseTo(apparentTempC(30, 24, 0) - 3.5, 5);
    // Dry air feels cooler than the thermometer.
    expect(apparentTempC(30, 5, 3)).toBeLessThan(30);
    expect(apparentTempC(30, 24, NaN)).toBeCloseTo(apparentTempC(30, 24, 0), 5);
    expect(apparentTempC(NaN, 24, 2)).toBeNaN();
  });
});
