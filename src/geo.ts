/**
 * Pure map geometry helpers. No DOM. SI units (metres, degrees in / degrees out).
 */

/** WGS84 equatorial radius, m. Web Mercator uses this sphere. */
export const EARTH_RADIUS_M = 6378137;
/** MapLibre renders 512 px tiles, so the world is 512 * 2^zoom px wide. */
export const TILE_SIZE_PX = 512;

const RAD = Math.PI / 180;

/**
 * Ground resolution at a latitude, m per CSS pixel.
 * mpp = 2πR·cos(φ) / (512·2^z)
 */
export function metersPerPixel(latDeg: number, zoom: number): number {
  return (2 * Math.PI * EARTH_RADIUS_M * Math.cos(latDeg * RAD)) / (TILE_SIZE_PX * 2 ** zoom);
}

/**
 * Height of MapLibre's camera above the map centre, m.
 * The camera sits d = (H/2) / tan(fov/2) px from the centre (H = viewport height),
 * so altitude = d · mpp · cos(pitch).
 */
export function cameraAltitudeM(latDeg: number, zoom: number, viewportHeightPx: number, fovDeg: number, pitchDeg = 0): number {
  const distPx = viewportHeightPx / 2 / Math.tan((fovDeg * RAD) / 2);
  return distPx * metersPerPixel(latDeg, zoom) * Math.cos(pitchDeg * RAD);
}

/** Great-circle distance by the haversine formula, m. Points are [lng, lat]. */
export function haversineM(a: [number, number], b: [number, number]): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLng = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial great-circle bearing from a to b, degrees true, 0..360. Points are [lng, lat]. */
export function bearingDeg(a: [number, number], b: [number, number]): number {
  const φ1 = a[1] * RAD;
  const φ2 = b[1] * RAD;
  const dλ = (b[0] - a[0]) * RAD;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** Nearest named point to `from`, with range (m) and bearing (° true) from `from` to it. */
export function nearest<T extends { lngLat: [number, number] }>(from: [number, number], points: readonly T[]) {
  let best: { point: T; distanceM: number; bearingDeg: number } | null = null;
  for (const p of points) {
    const d = haversineM(from, p.lngLat);
    if (!best || d < best.distanceM) best = { point: p, distanceM: d, bearingDeg: bearingDeg(from, p.lngLat) };
  }
  return best;
}

/** Degrees and decimal minutes as a GPS shows them, e.g. `09°47.400'N`. */
export function toDDM(deg: number, axis: 'lat' | 'lng'): string {
  const hemi = axis === 'lat' ? (deg < 0 ? 'S' : 'N') : deg < 0 ? 'W' : 'E';
  const abs = Math.abs(deg);
  let d = Math.floor(abs);
  let m = Number(((abs - d) * 60).toFixed(3));
  if (m >= 60) {
    d += 1;
    m = 0;
  }
  return `${String(d).padStart(axis === 'lat' ? 2 : 3, '0')}°${m.toFixed(3).padStart(6, '0')}'${hemi}`;
}

/**
 * Lat/lon grid lines over `bounds` ([[w, s], [e, n]]) every `step` degrees, snapped to
 * multiples of `step`, as MultiLineString coordinates. Meridians first, then parallels.
 */
export function graticule(bounds: [[number, number], [number, number]], step: number): [number, number][][] {
  const [[w, s], [e, n]] = bounds;
  const lines: [number, number][][] = [];
  // Integer steps avoid float drift (0.1 * 3 !== 0.3).
  for (let i = Math.ceil(w / step - 1e-9); i * step <= e + 1e-9; i++) {
    const x = Number((i * step).toFixed(6));
    lines.push([[x, s], [x, n]]);
  }
  for (let i = Math.ceil(s / step - 1e-9); i * step <= n + 1e-9; i++) {
    const y = Number((i * step).toFixed(6));
    lines.push([[w, y], [e, y]]);
  }
  return lines;
}
