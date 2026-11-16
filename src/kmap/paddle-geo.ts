/**
 * PADDLE on the map (PLAN 7.158): pure geometry for the two marks drawn at each launch.
 *  - RANGE: the seaward half-circle of today's range, how far from the beach to go (physics/paddle.ts rangeKm).
 *  - PUSH: an arrow from the launch the way the wind blows it, as long as the wind is strong, red where it blows
 *    off the land out to sea.
 * No DOM, no MapLibre.
 */
import type { Feature, Polygon, LineString } from 'geojson';

const R_EARTH_KM = 6371.0088;
const RAD = Math.PI / 180;

/** The point `km` from `at` on a compass bearing, [lng, lat]. */
export function destination(at: readonly [number, number], bearingDeg: number, km: number): [number, number] {
  const d = km / R_EARTH_KM, b = bearingDeg * RAD, la = at[1] * RAD, lo = at[0] * RAD;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [lo2 / RAD, la2 / RAD];
}

/** The seaward half-circle (facing ±90°) of radius `km` around the launch, as a closed ring. */
export function rangeArc(at: readonly [number, number], facingDeg: number, km: number, steps = 24): [number, number][] {
  const ring: [number, number][] = [[at[0], at[1]]];
  for (let i = 0; i <= steps; i++) ring.push(destination(at, facingDeg - 90 + (180 * i) / steps, km));
  ring.push([at[0], at[1]]);
  return ring;
}

/** Arrow length on the map for an effective wind, km: 0.6 km at 3 kt up to 3 km at 15 kt and over. */
export const pushKm = (effKt: number) => Math.min(3, Math.max(0.6, 0.2 * effKt));

/** Shaft and head of the push arrow from the launch toward `towardDeg`. */
export function pushArrow(at: readonly [number, number], towardDeg: number, km: number): { shaft: [number, number][]; head: [number, number][] } {
  const tip = destination(at, towardDeg, km);
  const hl = Math.min(0.5, km * 0.3);
  const base = destination(at, towardDeg, km - hl * 0.8);
  const left = destination(base, towardDeg - 90, hl * 0.5), right = destination(base, towardDeg + 90, hl * 0.5);
  return { shaft: [[at[0], at[1]], base], head: [tip, left, right, tip] };
}

export interface PaddleMark {
  id: string;
  lngLat: [number, number];
  /** Seaward normal of the beach, degrees. */
  facing: number;
  rangeKm: number;
  /** Where the wind blows TOWARD, degrees true, and the effective wind, kt; null with no wind data. */
  towardDeg: number | null;
  effKt: number | null;
  offshore: boolean;
  /** Rating colour (hex). */
  col: string;
  /** Colour of the danger mark. */
  danger: string;
  ink: string;
}

type Prop = Record<string, string | number>;
/** Every mark as GeoJSON: kind 'range' polygon, 'push' line, 'head' polygon, 'label' point at the range edge. */
export function paddleFeatures(marks: readonly PaddleMark[]): Feature<Polygon | LineString | import('geojson').Point, Prop>[] {
  const out: Feature<Polygon | LineString | import('geojson').Point, Prop>[] = [];
  for (const m of marks) {
    if (m.rangeKm > 0) {
      out.push({ type: 'Feature', properties: { kind: 'range', col: m.col }, geometry: { type: 'Polygon', coordinates: [rangeArc(m.lngLat, m.facing, m.rangeKm)] } });
      out.push({ type: 'Feature', properties: { kind: 'label', col: m.col, label: `${m.rangeKm % 1 === 0 ? m.rangeKm : m.rangeKm.toFixed(1)} km` }, geometry: { type: 'Point', coordinates: destination(m.lngLat, m.facing, m.rangeKm) } });
    }
    if (m.towardDeg !== null && m.effKt !== null && m.effKt >= 3) {
      const a = pushArrow(m.lngLat, m.towardDeg, pushKm(m.effKt));
      const col = m.offshore ? m.danger : m.ink;
      out.push({ type: 'Feature', properties: { kind: 'push', col }, geometry: { type: 'LineString', coordinates: a.shaft } });
      out.push({ type: 'Feature', properties: { kind: 'head', col }, geometry: { type: 'Polygon', coordinates: [a.head] } });
    }
  }
  return out;
}
