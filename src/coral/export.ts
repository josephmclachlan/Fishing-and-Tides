/** Coral log export: GeoJSON (sites with their visits) and CSV (one row per visit, or per site with none). Pure. */
import type { CoralSite } from './store';

export function toGeoJSON(sites: readonly CoralSite[]) {
  return {
    type: 'FeatureCollection' as const,
    features: sites.map((s) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      properties: { id: s.id, kind: s.kind, name: s.name, depthM: s.depthM ?? null, species: s.species, notes: s.notes, createdAt: new Date(s.createdAt).toISOString(), visits: s.visits.map((v) => ({ ...v, t: new Date(v.t).toISOString() })) },
    })),
  };
}

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  // Quote anything with a delimiter, and neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_HEADER = ['site_id', 'kind', 'name', 'lat', 'lng', 'depth_m', 'species', 'site_notes', 'visit_time', 'status', 'bleach_pct', 'visit_notes'];

export function toCSV(sites: readonly CoralSite[]): string {
  const rows: unknown[][] = [];
  for (const s of sites) {
    const base = [s.id, s.kind, s.name, s.lat, s.lng, s.depthM, s.species, s.notes];
    if (!s.visits.length) rows.push([...base, '', '', '', '']);
    for (const v of s.visits) rows.push([...base, new Date(v.t).toISOString(), v.status, v.bleachPct, v.notes]);
  }
  return [CSV_HEADER, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
