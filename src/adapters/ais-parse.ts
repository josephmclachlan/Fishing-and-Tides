/**
 * AIS ship positions (PLAN 7.97), from AISStream's websocket (aisstream.io, free key, volunteer shore
 * receivers). No imports, so the Node data build (scripts/forecast/ais.ts) and the app share it.
 * AIS is self-reported by transponders: small boats, fishing pangas and anything switched off do not show.
 * Advisory only; not for collision avoidance.
 */
export interface Vessel {
  mmsi: number;
  name: string;
  /** AIS ship type number (0 = unknown), see `shipClass`. */
  type: number;
  lngLat: [number, number];
  sogKt: number;
  /** Course over ground, degrees true (NaN when not reported). */
  cogDeg: number;
  /** Last position fix, epoch ms. */
  seenMs: number;
}

export interface AisData {
  vessels: Vessel[];
  fetchedAt: string;
  /** How long the build listened this run, seconds, and the messages it heard (for coverage checks). */
  listenedS: number;
  heard: number;
}

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : NaN);

/** Broad class from the ITU ship type number. */
export function shipClass(type: number): 'cargo' | 'tanker' | 'passenger' | 'fishing' | 'pleasure' | 'tug' | 'other' {
  if (type === 30) return 'fishing';
  if (type === 36 || type === 37) return 'pleasure';
  if (type === 31 || type === 32 || type === 52) return 'tug';
  if (type >= 60 && type <= 69) return 'passenger';
  if (type >= 70 && type <= 79) return 'cargo';
  if (type >= 80 && type <= 89) return 'tanker';
  return 'other';
}

/** Fold one AISStream message into a vessel table (mutates `table`). Returns true when it carried something. */
export function applyAisMessage(table: Map<number, Vessel>, raw: unknown, now: number): boolean {
  const m = raw as { MessageType?: string; MetaData?: Record<string, unknown>; Message?: Record<string, Record<string, unknown>> } | null;
  const meta = m?.MetaData;
  const mmsi = num(meta?.MMSI);
  if (!m || !meta || !Number.isFinite(mmsi)) return false;
  const v = table.get(mmsi) ?? { mmsi, name: '', type: 0, lngLat: [NaN, NaN] as [number, number], sogKt: NaN, cogDeg: NaN, seenMs: 0 };
  const nm = typeof meta.ShipName === 'string' ? meta.ShipName.trim() : '';
  if (nm) v.name = nm;
  if (m.MessageType === 'ShipStaticData') {
    const s = m.Message?.ShipStaticData;
    const t = num(s?.Type);
    if (Number.isFinite(t)) v.type = t;
    table.set(mmsi, v);
    return true;
  }
  const p = m.Message?.PositionReport ?? m.Message?.StandardClassBPositionReport;
  const lat = num(p?.Latitude ?? meta.latitude);
  const lng = num(p?.Longitude ?? meta.longitude);
  // AIS uses 91 / 181 for "no position".
  if (!p || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  v.lngLat = [lng, lat];
  v.sogKt = num(p.Sog);
  const cog = num(p.Cog);
  v.cogDeg = cog >= 0 && cog < 360 ? cog : NaN;
  v.seenMs = now;
  table.set(mmsi, v);
  return true;
}

/** Keep vessels with a position seen within `maxAgeMs`, newest first. */
export function recentVessels(vessels: Iterable<Vessel>, now: number, maxAgeMs = 24 * 3.6e6): Vessel[] {
  return [...vessels].filter((v) => Number.isFinite(v.lngLat[0]) && now - v.seenMs <= maxAgeMs).sort((a, b) => b.seenMs - a.seenMs);
}

/** Share of a vessel list by 0.1° of latitude, to see where the coast's traffic actually shows up. */
export function latitudeBands(vessels: readonly Vessel[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of vessels) {
    const k = (Math.floor(v.lngLat[1] * 10) / 10).toFixed(1);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
