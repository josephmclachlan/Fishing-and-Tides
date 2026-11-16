/**
 * NGA World Port Index (PLAN 7.94): port facts (harbour size and type, shelter, channel depth, largest
 * vessel, tidal range, pilotage). Public domain. No imports, so the Node data build (scripts/forecast/wpi.ts)
 * and the app share it. The service's JSON field names are matched loosely (case, spaces and units ignored)
 * because the schema could not be fetched when this was written; unknown fields are simply left out.
 */
export interface WpiPort {
  name: string;
  lngLat: [number, number];
  /** Selected facts, label to text, as published. */
  facts: Record<string, string>;
}
export interface WpiData {
  ports: WpiPort[];
  fetchedAt: string;
}

/** Box around the region and the nearest ports, [west, south, east, north]. */
export const WPI_BOX = [-84.2, 9.0, -82.0, 11.4] as const;

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Fact label to the normalized field names it may arrive under. */
const FACTS: Record<string, string[]> = {
  harbourSize: ['harborsize', 'harboursize'],
  harbourType: ['harbortype', 'harbourtype'],
  shelter: ['shelterafforded', 'shelter'],
  channelDepthM: ['channeldepthm', 'channeldepth'],
  maxVesselLengthM: ['maxvessellengthm', 'maxvessellength'],
  maxVesselDraftM: ['maxvesseldraftm', 'maxvesseldraft'],
  tidalRangeM: ['tidalrangem', 'tidalrange', 'tide'],
  pilotage: ['pilotagecompulsory', 'pilotage'],
  entranceRestrictions: ['entranceswell', 'entranceice', 'entranceother'],
};

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : typeof x === 'string' && x.trim() !== '' && Number.isFinite(+x) ? +x : NaN);

/** Parse a World Port Index response: any array of port objects, bare or under one key. */
export function parseWpi(json: unknown, now: number): WpiData {
  const arr = Array.isArray(json) ? json : Object.values((json ?? {}) as object).find(Array.isArray);
  if (!Array.isArray(arr)) throw new Error('wpi: no port list');
  const ports: WpiPort[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue;
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) o[norm(k)] = v;
    const lat = num(o.latitude ?? o.lat ?? o.latitudedec);
    const lng = num(o.longitude ?? o.lon ?? o.lng ?? o.longitudedec);
    const name = String(o.portname ?? o.name ?? '').trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lng < WPI_BOX[0] || lng > WPI_BOX[2] || lat < WPI_BOX[1] || lat > WPI_BOX[3]) continue;
    const facts: Record<string, string> = {};
    for (const [label, keys] of Object.entries(FACTS)) {
      const parts = keys.map((k) => o[k]).filter((v) => v != null && String(v).trim() !== '' && String(v).trim() !== '-').map((v) => String(v).trim());
      // The entrance fields are three separate notes; the others are alternatives for one value.
      const v = label === 'entranceRestrictions' ? parts.join('; ') : parts[0];
      if (v) facts[label] = v;
    }
    ports.push({ name, lngLat: [lng, lat], facts });
  }
  return { ports, fetchedAt: new Date(now).toISOString() };
}
