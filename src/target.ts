/** Parse what the user types in the target box: a spot name or a coordinate. Pure; no DOM. */
import { REGION, SPOTS } from './region';

export interface Target {
  name: string;
  lngLat: [number, number];
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** Spots whose name contains the query (accents and case ignored), name-prefix matches first. */
export function matchSpots(query: string, spots: readonly Target[] = SPOTS): Target[] {
  const q = fold(query);
  if (!q) return [];
  const hits = spots.filter((s) => fold(s.name).includes(q));
  return hits.sort((a, b) => Number(!fold(a.name).startsWith(q)) - Number(!fold(b.name).startsWith(q)));
}

/**
 * One coordinate in decimal degrees from text such as `9.65`, `-82.75`, `9.65N`, `82.75 W`,
 * `09°39.000'N` (degrees + decimal minutes; O, Spanish for west, works like W) or `9 39 0 N` (degrees, minutes, seconds).
 */
function parseAxis(text: string): { value: number; hemi: string | null } | null {
  const m = text.trim().match(/^([NSEWO])?\s*(-?\d+(?:\.\d+)?)(?:[°\s]+(\d+(?:\.\d+)?)['′]?)?(?:\s*(\d+(?:\.\d+)?)["″]?)?\s*([NSEWO])?$/i);
  if (!m) return null;
  const hemi = (m[1] ?? m[5] ?? '').toUpperCase() || null;
  const deg = Number(m[2]);
  const min = m[3] ? Number(m[3]) : 0;
  const sec = m[4] ? Number(m[4]) : 0;
  if (min >= 60 || sec >= 60) return null;
  let value = Math.abs(deg) + min / 60 + sec / 3600;
  if (deg < 0 || hemi === 'S' || hemi === 'W' || hemi === 'O') value = -value;
  return { value, hemi };
}

/** "a, b", "9.65N 82.75W" (split after the first hemisphere letter) or "9.65 -82.75". */
function splitPair(text: string): string[] {
  if (text.includes(',')) return text.split(',');
  const t = text.trim();
  const hemi = t.match(/^(\d.*?[NSEWO])\s*(\S.*)$/i);
  if (hemi) return [hemi[1], hemi[2]];
  return t.split(/\s+/);
}

/**
 * `lat, lon` (or `lat lon` with hemisphere letters) -> [lng, lat]. Hemisphere letters may put
 * longitude first. Returns null if it doesn't parse or falls outside the map's bounds.
 */
export function parseCoordinate(text: string): [number, number] | null {
  const parts = splitPair(text);
  if (parts.length !== 2) return null;
  const a = parseAxis(parts[0]);
  const b = parseAxis(parts[1]);
  if (!a || !b) return null;
  const aIsLng = a.hemi === 'E' || a.hemi === 'W' || a.hemi === 'O' || b.hemi === 'N' || b.hemi === 'S';
  const [lat, lng] = aIsLng ? [b.value, a.value] : [a.value, b.value];
  const [[w, s], [e, n]] = REGION.maxBounds;
  if (lng < w || lng > e || lat < s || lat > n) return null;
  return [lng, lat];
}

/** Best target for the query: a coordinate if it parses, else the first matching spot. */
export function resolveTarget(query: string): Target | null {
  const ll = parseCoordinate(query);
  if (ll) return { name: `${ll[1].toFixed(4)}, ${ll[0].toFixed(4)}`, lngLat: ll };
  return matchSpots(query)[0] ?? null;
}
