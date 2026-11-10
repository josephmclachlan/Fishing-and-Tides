/**
 * Humidity and real feel (PLAN 7.57). Pure, no DOM. Temperatures in °C, vapour pressure in hPa, wind in m/s.
 *
 * Saturation vapour pressure over water, the Magnus form with the Alduchov & Eskridge (1996) constants
 * (within 0.4% of the Goff-Gratch table from −40 to 50 °C):
 *
 *   es(T) = 6.1094 · exp(17.625 T / (T + 243.04))
 *
 * The air's vapour pressure is es at the dew point, and relative humidity is e / es(T).
 *
 * Real feel is Steadman's (1994) apparent temperature in the shade, the form the Australian Bureau of
 * Meteorology publishes (wind at 10 m):
 *
 *   AT = T + 0.33 e − 0.70 ws − 4.00
 *
 * It counts humid air (sweat cannot evaporate) and wind (it carries heat away). It leaves out sunshine,
 * which adds several degrees on open sand at midday; the UV row covers the sun.
 */

export const satVapourHpa = (tC: number): number => 6.1094 * Math.exp((17.625 * tC) / (tC + 243.04));

/** Relative humidity, %, from air temperature and dew point (°C), capped at 100. NaN if either is missing. */
export function relHumidityPct(tC: number, dewC: number): number {
  if (!Number.isFinite(tC) || !Number.isFinite(dewC)) return NaN;
  return Math.min(100, (100 * satVapourHpa(dewC)) / satVapourHpa(tC));
}

/** Steadman apparent temperature in the shade, °C, from air temperature (°C), dew point (°C) and 10 m wind (m/s). */
export function apparentTempC(tC: number, dewC: number, windMs: number): number {
  if (!Number.isFinite(tC) || !Number.isFinite(dewC)) return NaN;
  const ws = Number.isFinite(windMs) ? Math.max(0, windMs) : 0;
  // Dew point above the air temperature is a model glitch; the air is at most saturated.
  return tC + 0.33 * satVapourHpa(Math.min(dewC, tC)) - 0.7 * ws - 4;
}
