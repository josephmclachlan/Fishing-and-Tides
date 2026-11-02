/**
 * Boat track maths and file export (PLAN 4.6). Pure: no DOM, no GPS, no storage.
 * Points are what the phone's GPS reports; everything here works offline.
 */
import { haversineM } from '../geo';

export interface TrackPoint {
  /** Epoch ms. */
  t: number;
  lng: number;
  lat: number;
  /** GPS accuracy radius, m, when known. */
  acc?: number;
}

export type PinKind = 'mark' | 'catch';
export interface Pin {
  id: string;
  t: number;
  lng: number;
  lat: number;
  kind: PinKind;
  /** Species id for a catch (src/boat/species.ts), if one was chosen. */
  species?: string;
  /** Water depth from the GEBCO grid at the pin, m (a guide, not a sounding). */
  depthM?: number;
}

/** Worst GPS accuracy we keep, m. A phone indoors or just woken can be hundreds of metres out. */
export const MAX_ACC_M = 50;
/** A new fix is kept once the boat has moved this far (m) or this long (ms) has passed. */
export const MIN_MOVE_M = 15;
export const MIN_GAP_MS = 20_000;
/** Upper bound on stored points; past it, every second point of the older half is dropped. */
export const MAX_POINTS = 20_000;
export const M_PER_NM = 1852;
export const KT_PER_MS = 3600 / M_PER_NM;

/** Whether `next` should be added to the track after `last`. */
export function shouldKeep(last: TrackPoint | undefined, next: TrackPoint): boolean {
  if (next.acc !== undefined && next.acc > MAX_ACC_M) return false;
  if (!last) return true;
  if (next.t <= last.t) return false;
  return haversineM([last.lng, last.lat], [next.lng, next.lat]) >= MIN_MOVE_M || next.t - last.t >= MIN_GAP_MS;
}

/** Thin an over-long track: keep every point of the newer half, every second point of the older. */
export function thin(points: TrackPoint[], max = MAX_POINTS): TrackPoint[] {
  if (points.length <= max) return points;
  const half = Math.floor(points.length / 2);
  return [...points.slice(0, half).filter((_, i) => i % 2 === 0), ...points.slice(half)];
}

export function trackStats(points: readonly TrackPoint[]) {
  let distanceM = 0;
  for (let i = 1; i < points.length; i++) distanceM += haversineM([points[i - 1].lng, points[i - 1].lat], [points[i].lng, points[i].lat]);
  const durationMs = points.length > 1 ? points[points.length - 1].t - points[0].t : 0;
  return { distanceM, durationMs };
}

/** Speed over the last `windowMs` of the track, knots, or null if too few points or the last one is older than `staleMs` before `now`. */
export function recentSpeedKt(points: readonly TrackPoint[], windowMs = 60_000, now = Date.now(), staleMs = 45_000): number | null {
  const last = points[points.length - 1];
  if (!last || now - last.t > staleMs) return null;
  let i = points.length - 1;
  while (i > 0 && last.t - points[i - 1].t <= windowMs) i--;
  const first = points[i];
  const dt = (last.t - first.t) / 1000;
  if (dt < 5) return null;
  return (haversineM([first.lng, first.lat], [last.lng, last.lat]) / dt) * KT_PER_MS;
}

const xml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const iso = (ms: number) => new Date(ms).toISOString();

/** GPX 1.1, readable by chartplotters and phone apps: one track and a waypoint per pin. */
export function toGPX(points: readonly TrackPoint[], pins: readonly Pin[], name: string): string {
  const wpt = pins
    .map((p) => `<wpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${iso(p.t)}</time><name>${xml(p.kind === 'catch' ? `CATCH ${p.species ?? ''}`.trim() : 'MARK')}</name>${p.depthM !== undefined ? `<desc>depth ${Math.round(p.depthM)} m (GEBCO)</desc>` : ''}</wpt>`)
    .join('');
  const trkpt = points.map((p) => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${iso(p.t)}</time></trkpt>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Fishing and Tides" xmlns="http://www.topografix.com/GPX/1/1">${wpt}<trk><name>${xml(name)}</name><trkseg>${trkpt}</trkseg></trk></gpx>\n`;
}
