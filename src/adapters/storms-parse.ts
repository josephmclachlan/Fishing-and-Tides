/**
 * NHC CurrentStorms.json parsing (PLAN 7.3). No imports, so the Node data build (scripts/forecast/storms.ts)
 * and the app share it. See adapters/storms.ts for the app side.
 */
export interface Storm {
  id: string;
  name: string;
  /** NHC classification code: TD, TS, HU, STD, STS, PTC, ... */
  classification: string;
  /** Maximum sustained wind, knots. */
  windKt: number;
  /** Minimum central pressure, mb (NaN if absent). */
  pressureMb: number;
  lngLat: [number, number];
  /** Heading the storm moves toward, degrees, and speed in knots (NaN if absent). */
  movementDeg: number;
  movementKt: number;
  advisoryUrl: string | null;
  /** When NHC last updated it, epoch ms (NaN if absent). */
  updatedMs: number;
}

export interface StormData {
  storms: Storm[];
  fetchedAt: string;
}

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : typeof x === 'string' && x.trim() !== '' && Number.isFinite(+x) ? +x : NaN);

/** Parse CurrentStorms.json. Keeps Atlantic storms (ids start 'al'); skips entries without a position. */
export function parseStorms(json: unknown, now: number): StormData {
  const list = (json as { activeStorms?: unknown[] } | null)?.activeStorms;
  if (!Array.isArray(list)) throw new Error('storms: no activeStorms list');
  const storms: Storm[] = [];
  for (const raw of list) {
    const s = raw as Record<string, unknown>;
    const id = String(s.id ?? '');
    const lat = num(s.latitudeNumeric ?? s.latitude);
    const lng = num(s.longitudeNumeric ?? s.longitude);
    if (!id.toLowerCase().startsWith('al') || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const adv = s.publicAdvisory as { url?: unknown } | undefined;
    const updated = Date.parse(String(s.lastUpdate ?? ''));
    storms.push({
      id,
      name: String(s.name ?? ''),
      classification: String(s.classification ?? ''),
      windKt: num(s.intensity),
      pressureMb: num(s.pressure),
      lngLat: [lng, lat],
      movementDeg: num(s.movementDir),
      movementKt: num(s.movementSpeed),
      advisoryUrl: typeof adv?.url === 'string' && adv.url.startsWith('https://') ? adv.url : null,
      updatedMs: updated,
    });
  }
  return { storms, fetchedAt: new Date(now).toISOString() };
}
