/** Coral log export: GeoJSON (sites with their visits, photos and missions) and CSV (one row per visit, or per site with none). Pure. */
import { MEASURES, type CoralSite } from './store';

const iso = (ms: number | undefined) => (ms === undefined ? null : new Date(ms).toISOString());

export function toGeoJSON(sites: readonly CoralSite[]) {
  return {
    type: 'FeatureCollection' as const,
    features: sites.map((s) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id, kind: s.kind, name: s.name, depthM: s.depthM ?? null, gpsAccuracyM: s.gpsAccuracyM ?? null, locSource: s.locSource ?? null,
        species: s.species, notes: s.notes, photoCount: s.photos.length, createdAt: iso(s.createdAt),
        visits: s.visits.map((v) => ({ ...v, t: iso(v.t), conditions: v.conditions ? { ...v.conditions, at: iso(v.conditions.at) } : null })),
        photos: s.photos.map((p) => ({ ...p, addedAt: iso(p.addedAt), takenAt: iso(p.takenAt) })),
        missions: s.missions.map((m) => ({ ...m, t: iso(m.t), createdAt: iso(m.createdAt), updatedAt: iso(m.updatedAt) })),
      },
    })),
  };
}

const cell = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  const s = v === undefined || v === null ? '' : String(v);
  // Quote anything with a delimiter, and neutralise spreadsheet formulas in text (numbers may be negative).
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const SNAKE: Record<(typeof MEASURES)[number], string> = { bleachPct: 'bleach_pct', sedimentPct: 'sediment_pct', secchiM: 'secchi_m', trapMgCm2Day: 'trap_mg_cm2_day', waterTempC: 'water_temp_c', outplanted: 'outplanted' };
const COND = ['dhw', 'alert', 'sstC', 'flowRatio', 'rainMm', 'hsM', 'lowTideM', 'sargassum'] as const;
const COND_SNAKE = ['dhw', 'crw_alert', 'sst_c', 'river_flow_x_median', 'catchment_rain_mm', 'wave_hs_m', 'low_tide_m', 'sargassum'];

export const CSV_HEADER = [
  'site_id', 'kind', 'name', 'lat', 'lng', 'depth_m', 'species', 'site_notes',
  'visit_time', 'status', ...MEASURES.map((k) => SNAKE[k]), 'actions', 'team', 'photos', 'mission_goal', 'visit_notes', ...COND_SNAKE,
];

export function toCSV(sites: readonly CoralSite[]): string {
  const rows: unknown[][] = [];
  const blank = CSV_HEADER.length - 8;
  for (const s of sites) {
    const base = [s.id, s.kind, s.name, s.lat, s.lng, s.depthM, s.species, s.notes];
    if (!s.visits.length) rows.push([...base, ...Array(blank).fill('')]);
    for (const v of s.visits) {
      rows.push([
        ...base, new Date(v.t).toISOString(), v.status, ...MEASURES.map((k) => v[k]), v.actions.join(';'), v.team,
        s.photos.filter((p) => p.visitId === v.id).length, s.missions.find((m) => m.id === v.missionId)?.goal, v.notes,
        ...COND.map((k) => v.conditions?.[k]),
      ]);
    }
  }
  return [CSV_HEADER, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
