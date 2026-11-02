/**
 * METAR decoding for the Limón airport relay (PLAN 2.11). Pure and import-free, shared by the
 * data build (scripts/forecast/metar.ts) and the app.
 *
 * Source rows are aviationweather.gov's decoded JSON: obsTime (unix s), wdir (degrees, 0 with
 * wspd 0 for calm, or "VRB"), wspd and wgst (kt), temp and dewp (°C), altim (hPa), rawOb. MRLM
 * often sends "/////" (missing) wind and temperature early in the day; those come through null.
 */

export interface MetarObs {
  /** Observation time, epoch ms. */
  t: number;
  /** Direction the wind comes from, degrees true; null when calm, variable or missing. */
  windFromDeg: number | null;
  /** Mean wind, kt; null when missing. */
  windKt: number | null;
  gustKt: number | null;
  tempC: number | null;
  dewC: number | null;
  pressureHpa: number | null;
  raw: string;
}

export interface MetarFile {
  station: string;
  /** When the data build fetched it (ISO). */
  fetchedAt: string;
  /** Newest first, last 36 h. */
  obs: MetarObs[];
}

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

export function parseMetars(rows: unknown): MetarObs[] {
  if (!Array.isArray(rows)) throw new Error('metar: response is not a list');
  const out: MetarObs[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const t = num(r.obsTime);
    if (t === null || typeof r.rawOb !== 'string') continue;
    const windKt = num(r.wspd);
    const dir = num(r.wdir);
    out.push({
      t: t * 1000,
      windFromDeg: windKt && dir !== null ? dir % 360 : null,
      windKt,
      gustKt: num(r.wgst),
      tempC: num(r.temp),
      dewC: num(r.dewp),
      pressureHpa: num(r.altim),
      raw: r.rawOb,
    });
  }
  return out.sort((a, b) => b.t - a.t);
}

/** Newest report that has a wind reading. */
export const latestWind = (obs: readonly MetarObs[]) => obs.find((o) => o.windKt !== null) ?? null;
