/**
 * NAVAREA IV navigational warnings (PLAN 7.93), from the US National Geospatial-Intelligence Agency's
 * Maritime Safety Information service (public domain). No imports, so the Node data build
 * (scripts/forecast/navwarn.ts) and the app share it. NAVAREA IV covers the western Atlantic and the
 * Caribbean, far more than this coast, so warnings are kept only when their coordinates fall in a box
 * around the region or their text names a place on it. Advisory: the app is not for navigation.
 */
export interface NavWarning {
  id: string;
  /** Issue time, epoch ms (NaN if the date could not be read). */
  issuedMs: number;
  text: string;
  /** First coordinate found in the text, if any. */
  lngLat: [number, number] | null;
  /** Why it was kept: a position near the coast, or a place name. */
  match: 'position' | 'place';
}

export interface NavWarnData {
  warnings: NavWarning[];
  fetchedAt: string;
}

/** Generous box around Gandoca to Limón and the approaches, [west, south, east, north]. */
export const NAVWARN_BOX = [-84.2, 9.2, -82.0, 11.4] as const;
const PLACES = /COSTA RICA|LIMON|MOIN\b|PUERTO VIEJO|CAHUITA|MANZANILLO|GANDOCA|SIXAOLA|PORTETE|BOCAS DEL TORO|PUNTA UVA|TORTUGUERO/i;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "151432Z NOV 2026" (DDHHMMZ MON YYYY) to epoch ms; NaN when it does not match. */
export function parseIssueDate(s: unknown): number {
  const m = /^(\d{2})(\d{2})(\d{2})Z\s+([A-Z]{3})\s+(\d{4})$/.exec(String(s ?? '').trim().toUpperCase());
  if (!m) return NaN;
  const mon = MONTHS.indexOf(m[4]);
  return mon < 0 ? NaN : Date.UTC(+m[5], mon, +m[1], +m[2], +m[3]);
}

/** Every "DD-MM.mN DDD-MM.mW" pair in a warning's text, as [lng, lat] (degrees, west and south negative). */
export function parseCoords(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /(\d{1,2})-(\d{2}(?:\.\d+)?)\s*([NS])\s+(\d{1,3})-(\d{2}(?:\.\d+)?)\s*([EW])/g;
  for (const m of text.matchAll(re)) {
    const lat = (+m[1] + +m[2] / 60) * (m[3] === 'S' ? -1 : 1);
    const lng = (+m[4] + +m[5] / 60) * (m[6] === 'W' ? -1 : 1);
    out.push([lng, lat]);
  }
  return out;
}

const inBox = ([x, y]: [number, number]) => x >= NAVWARN_BOX[0] && x <= NAVWARN_BOX[2] && y >= NAVWARN_BOX[1] && y <= NAVWARN_BOX[3];

/** Parse the broadcast-warn JSON ({"broadcast-warn": [...]}) and keep the warnings that concern this coast. */
export function parseNavWarnings(json: unknown, now: number): NavWarnData {
  const list = (json as { 'broadcast-warn'?: unknown[] } | null)?.['broadcast-warn'];
  if (!Array.isArray(list)) throw new Error('navwarn: no broadcast-warn list');
  const warnings: NavWarning[] = [];
  for (const raw of list) {
    const w = raw as Record<string, unknown>;
    const text = String(w.text ?? '').replace(/\s+/g, ' ').trim();
    if (!text || (w.status != null && String(w.status).toUpperCase() !== 'A')) continue;
    const coords = parseCoords(text);
    const near = coords.find(inBox);
    if (!near && !PLACES.test(text)) continue;
    warnings.push({
      id: `${w.msgNumber ?? '?'}/${String(w.msgYear ?? '').slice(-2)}`,
      issuedMs: parseIssueDate(w.issueDate),
      text,
      lngLat: near ?? coords[0] ?? null,
      match: near ? 'position' : 'place',
    });
  }
  warnings.sort((a, b) => (b.issuedMs || 0) - (a.issuedMs || 0));
  return { warnings, fetchedAt: new Date(now).toISOString() };
}
