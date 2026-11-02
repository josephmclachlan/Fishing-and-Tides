/**
 * Bathymetry grid maths (PLAN 2.6). Pure, no DOM. Elevations in metres, positive up,
 * so ocean depth d is elevation -d. Positions are [lng, lat] degrees.
 */

/**
 * Regular lon/lat grid, cell-centre registered. Row 0 is the northern row.
 * The centre of cell (r, c) is (lon0 + c·dlon, lat0 − r·dlat).
 */
export interface Grid {
  cols: number;
  rows: number;
  lon0: number;
  lat0: number;
  dlon: number;
  dlat: number;
  z: ArrayLike<number>;
}

/** Missing-value marker in packed int16 grids. */
export const NODATA = -32768;

const RAD = Math.PI / 180;
/** Metres per degree of latitude and (at the equator) longitude, WGS84 mean. */
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320;

/** [west, south, east, north] covered by the grid's cells (centres ± half a cell). */
export function gridBounds(g: Grid): [number, number, number, number] {
  return [g.lon0 - g.dlon / 2, g.lat0 - (g.rows - 0.5) * g.dlat, g.lon0 + (g.cols - 0.5) * g.dlon, g.lat0 + g.dlat / 2];
}

const valid = (v: number) => Number.isFinite(v) && v !== NODATA;

/**
 * Bilinear value at a point; NaN outside the grid or next to a missing cell.
 * Points in the outer half-cell rim clamp to the edge cells.
 */
export function sample(g: Grid, lng: number, lat: number): number {
  let fx = (lng - g.lon0) / g.dlon;
  let fy = (g.lat0 - lat) / g.dlat;
  if (!(fx >= -0.5 && fx <= g.cols - 0.5 && fy >= -0.5 && fy <= g.rows - 0.5)) return NaN;
  fx = Math.min(Math.max(fx, 0), g.cols - 1);
  fy = Math.min(Math.max(fy, 0), g.rows - 1);
  const c = Math.min(Math.floor(fx), g.cols - 2);
  const r = Math.min(Math.floor(fy), g.rows - 2);
  const tx = fx - c;
  const ty = fy - r;
  const i = r * g.cols + c;
  const a = g.z[i];
  const b = g.z[i + 1];
  const d = g.z[i + g.cols];
  const e = g.z[i + g.cols + 1];
  if (!valid(a) || !valid(b) || !valid(d) || !valid(e)) return NaN;
  return (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
}

/** Value of the cell containing the point (no interpolation), or NaN outside. For categorical grids. */
export function cellAt(g: Grid, lng: number, lat: number): number {
  const c = Math.round((lng - g.lon0) / g.dlon);
  const r = Math.round((g.lat0 - lat) / g.dlat);
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return NaN;
  return g.z[r * g.cols + c];
}

/**
 * Sea or land at a point: the fine coastline mask (1 = land) where it covers, else the coarse
 * elevation grid (below 0 m = sea). Unknown (outside both) counts as sea.
 */
export function isWater(land: Grid, elevation: Grid, lng: number, lat: number): boolean {
  const m = cellAt(land, lng, lat);
  if (!Number.isNaN(m)) return m !== 1;
  const z = sample(elevation, lng, lat);
  return !(z >= 0);
}

/**
 * Lines where the grid crosses `level`, by marching squares with linear interpolation
 * along cell edges. Saddle cells are resolved by the cell-centre mean. Segments are
 * stitched into polylines; a closed ring repeats its first point at the end.
 */
export function contour(g: Grid, level: number): [number, number][][] {
  const { cols, rows, z } = g;
  // Edge keys: horizontal edge (r,c)→(r,c+1) = 2(r·cols+c), vertical (r,c)→(r+1,c) = 2(r·cols+c)+1.
  const H = (r: number, c: number) => 2 * (r * cols + c);
  const V = (r: number, c: number) => 2 * (r * cols + c) + 1;
  const segA: number[] = [];
  const segB: number[] = [];
  const byEdge = new Map<number, number[]>();
  const add = (a: number, b: number) => {
    const s = segA.length;
    segA.push(a);
    segB.push(b);
    for (const e of [a, b]) {
      const l = byEdge.get(e);
      if (l) l.push(s);
      else byEdge.set(e, [s]);
    }
  };
  for (let r = 0; r < rows - 1; r++)
    for (let c = 0; c < cols - 1; c++) {
      const tl = z[r * cols + c];
      const tr = z[r * cols + c + 1];
      const bl = z[(r + 1) * cols + c];
      const br = z[(r + 1) * cols + c + 1];
      if (!valid(tl) || !valid(tr) || !valid(bl) || !valid(br)) continue;
      const k = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const top = H(r, c);
      const bottom = H(r + 1, c);
      const left = V(r, c);
      const right = V(r, c + 1);
      const centreUp = (tl + tr + bl + br) / 4 >= level;
      switch (k) {
        case 1: case 14: add(left, bottom); break;
        case 2: case 13: add(bottom, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(top, right); break;
        case 6: case 9: add(top, bottom); break;
        case 7: case 8: add(left, top); break;
        case 5: // tr, bl up
          if (centreUp) add(left, top), add(bottom, right);
          else add(top, right), add(left, bottom);
          break;
        case 10: // tl, br up
          if (centreUp) add(top, right), add(left, bottom);
          else add(left, top), add(bottom, right);
          break;
      }
    }

  const point = (e: number): [number, number] => {
    const cell = e >> 1;
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    const v0 = z[cell];
    const v1 = e & 1 ? z[cell + cols] : z[cell + 1];
    const t = (level - v0) / (v1 - v0);
    return e & 1 ? [g.lon0 + c * g.dlon, g.lat0 - (r + t) * g.dlat] : [g.lon0 + (c + t) * g.dlon, g.lat0 - r * g.dlat];
  };
  const used = new Uint8Array(segA.length);
  const lines: [number, number][][] = [];
  const walk = (start: number, seg: number) => {
    const keys = [start];
    let e = start;
    for (let s = seg; s >= 0; ) {
      used[s] = 1;
      e = segA[s] === e ? segB[s] : segA[s];
      keys.push(e);
      s = byEdge.get(e)!.find((x) => !used[x]) ?? -1;
    }
    lines.push(keys.map(point));
  };
  // Open lines start at an edge only one segment touches (the grid border or a data gap).
  for (const [e, segs] of byEdge) if (segs.length === 1 && !used[segs[0]]) walk(e, segs[0]);
  for (let s = 0; s < segA.length; s++) if (!used[s]) walk(segA[s], s);
  return lines;
}

/** Chaikin corner cutting. Keeps the ends of open lines; closed rings stay closed. */
export function chaikin(line: [number, number][], iterations = 2): [number, number][] {
  let pts = line;
  for (let it = 0; it < iterations && pts.length > 2; it++) {
    const closed = pts[0][0] === pts.at(-1)![0] && pts[0][1] === pts.at(-1)![1];
    const out: [number, number][] = closed ? [] : [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    if (closed) out.push(out[0]);
    else out.push(pts.at(-1)!);
    pts = out;
  }
  return pts;
}

/**
 * Lambertian hillshade per cell, 0..1: n·L, where n is the surface normal from central
 * differences (in metres, vertical scaled by `exaggeration`) and L points at a sun at
 * `azimuthDeg` (clockwise from north) and `altitudeDeg` above the horizon.
 * A flat cell returns sin(altitude).
 */
export function hillshade(g: Grid, azimuthDeg = 315, altitudeDeg = 45, exaggeration = 1): Float32Array {
  const { cols, rows, z } = g;
  const out = new Float32Array(cols * rows);
  const A = azimuthDeg * RAD;
  const h = altitudeDeg * RAD;
  const L = [Math.sin(A) * Math.cos(h), Math.cos(A) * Math.cos(h), Math.sin(h)];
  const dy = g.dlat * M_PER_DEG_LAT;
  const at = (r: number, c: number, fallback: number) => {
    const v = z[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))];
    return valid(v) ? v : fallback;
  };
  for (let r = 0; r < rows; r++) {
    const dx = g.dlon * M_PER_DEG_LNG * Math.cos((g.lat0 - r * g.dlat) * RAD);
    for (let c = 0; c < cols; c++) {
      const v = at(r, c, 0);
      const dzdx = ((at(r, c + 1, v) - at(r, c - 1, v)) / (2 * dx)) * exaggeration;
      const dzdy = ((at(r - 1, c, v) - at(r + 1, c, v)) / (2 * dy)) * exaggeration; // row r-1 is north
      const n = Math.hypot(dzdx, dzdy, 1);
      out[r * cols + c] = Math.max(0, (-dzdx * L[0] - dzdy * L[1] + L[2]) / n);
    }
  }
  return out;
}

/** GEBCO type identifier (TID) → short HUD label for where a depth value came from. */
export function tidLabel(tid: number): string {
  const labels: Record<number, string> = {
    0: 'LAND', 10: 'SINGLEBEAM', 11: 'MULTIBEAM', 12: 'SEISMIC', 13: 'SOUNDING', 14: 'ENC', 15: 'LIDAR',
    16: 'SAT OPTICAL', 17: 'MIXED SURVEY', 40: 'SAT GRAVITY', 41: 'INTERP', 42: 'CHART', 43: 'ENC CONTOUR',
    44: 'MULTI SOURCE', 45: 'AIR GRAVITY', 46: 'ESTIMATED', 70: 'GRID', 71: 'UNKNOWN', 72: 'STEERING',
  };
  return labels[tid] ?? '--';
}

/** True if the TID marks a measured depth (survey or sensor) rather than one predicted or interpolated. */
export const tidMeasured = (tid: number) => tid >= 10 && tid <= 17;

/**
 * Cut polylines where they leave the area `keep` accepts (e.g. water), testing points
 * at most `stepDeg` apart so a narrow headland still breaks the line. Pieces shorter
 * than two points are dropped.
 */
export function clipLines(lines: [number, number][][], keep: (p: [number, number]) => boolean, stepDeg: number): [number, number][][] {
  const out: [number, number][][] = [];
  for (const line of lines) {
    let cur: [number, number][] = [];
    const flush = () => {
      if (cur.length >= 2) out.push(cur);
      cur = [];
    };
    const visit = (p: [number, number]) => (keep(p) ? cur.push(p) : flush());
    if (line.length) visit(line[0]);
    for (let i = 1; i < line.length; i++) {
      const [x0, y0] = line[i - 1];
      const [x1, y1] = line[i];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / stepDeg));
      for (let k = 1; k <= n; k++) visit(k === n ? line[i] : [x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
    flush();
  }
  return out;
}
