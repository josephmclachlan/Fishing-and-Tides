/**
 * ERDDAP griddap .json table to a packed-series grid (PLAN 2.4). Used by the data build
 * (scripts/forecast/satellite.ts); kept here, import-free apart from types, so it is type-checked
 * and tested with the app.
 */
import type { GridGeom } from './pack';

export interface ErddapGrid {
  grid: GridGeom;
  times: number[];
  frames: Float32Array[];
}

/**
 * Turn an ERDDAP griddap .json table (time, [altitude], latitude, longitude, value) into frames
 * on a regular grid, row 0 north. The grid is taken from the coordinates ERDDAP returned, so
 * strides and either latitude order work. Values outside [min, max] (fill values) become NaN.
 */
export function erddapToGrid(table: { columnNames: string[]; rows: unknown[][] }, min: number, max: number): ErddapGrid {
  const names = table.columnNames;
  const it = names.indexOf('time'), ilat = names.indexOf('latitude'), ilon = names.indexOf('longitude');
  const iv = names.length - 1;
  if (it < 0 || ilat < 0 || ilon < 0) throw new Error(`erddap: unexpected columns ${names.join(',')}`);
  const round = (x: number) => Math.round(x * 1e5) / 1e5;
  const lats = [...new Set(table.rows.map((r) => round(r[ilat] as number)))].sort((a, b) => b - a);
  const lons = [...new Set(table.rows.map((r) => round(r[ilon] as number)))].sort((a, b) => a - b);
  const times = [...new Set(table.rows.map((r) => Date.parse(r[it] as string)))].sort((a, b) => a - b);
  if (lats.length < 2 || lons.length < 2) throw new Error('erddap: grid too small');
  const grid: GridGeom = {
    cols: lons.length,
    rows: lats.length,
    lon0: lons[0],
    lat0: lats[0],
    dlon: (lons[lons.length - 1] - lons[0]) / (lons.length - 1),
    dlat: (lats[0] - lats[lats.length - 1]) / (lats.length - 1),
  };
  const n = grid.cols * grid.rows;
  const frames = times.map(() => new Float32Array(n).fill(NaN));
  const ti = new Map(times.map((t, i) => [t, i]));
  for (const r of table.rows) {
    const v = r[iv];
    if (typeof v !== 'number' || !(v >= min && v <= max)) continue;
    const row = Math.round((grid.lat0 - (r[ilat] as number)) / grid.dlat);
    const col = Math.round(((r[ilon] as number) - grid.lon0) / grid.dlon);
    frames[ti.get(Date.parse(r[it] as string))!][row * grid.cols + col] = v;
  }
  return { grid, times, frames };
}
