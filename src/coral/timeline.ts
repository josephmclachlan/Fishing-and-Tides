/**
 * A coral site's CONDITIONS tab (PLAN 7.40): what has hit the reef between visits. Pure, returns SVG and
 * plain rows so it is testable without a DOM; colours only through the HUD variables.
 *
 *  - Last 12 weeks: heat build-up (DHW) and MUD WEEKS as two small panels on one time axis, each with its
 *    WATCH and HIGH lines, and every visit as a tick coloured by the status logged.
 *  - Each year: the year's peak DHW and peak MUD WEEKS at the nearest reef, with the visits that year.
 */
import type { CoralSite, CoralStatus } from './store';

export interface Series {
  /** Day stamps, epoch ms, oldest first. */
  days: readonly number[];
  values: readonly (number | null)[];
  watch: number;
  high: number;
  label: string;
}

const tone = (v: number, s: Series) => (v >= s.high ? 'var(--red)' : v >= s.watch ? 'var(--amber)' : 'var(--green)');
const statusTone = (st: CoralStatus) => (st === 'healthy' ? 'var(--green)' : st === 'unknown' ? 'var(--amber)' : 'var(--red)');

/** Two or more series stacked on one time axis from `from` to `to`, with visit ticks across them all. */
export function timelineSvg(series: readonly Series[], visits: readonly { t: number; status: CoralStatus }[], from: number, to: number, w = 300, panelH = 54): string {
  const gap = 14;
  const h = series.length * (panelH + gap) + 12;
  const x = (t: number) => ((Math.min(to, Math.max(from, t)) - from) / Math.max(1, to - from)) * (w - 2) + 1;
  const parts: string[] = [];
  series.forEach((s, k) => {
    const y0 = k * (panelH + gap) + gap;
    const pts = s.days.map((d, i) => [d, s.values[i]] as const).filter((p): p is readonly [number, number] => p[1] !== null && Number.isFinite(p[1]) && p[0] >= from && p[0] <= to);
    const top = Math.max(s.high * 1.25, ...pts.map((p) => p[1]));
    const y = (v: number) => y0 + panelH - 1 - (v / top) * (panelH - 2);
    parts.push(`<text x="1" y="${y0 - 3}" class="cf-tl-lbl">${s.label}</text>`);
    for (const [v, c] of [[s.watch, 'var(--amber)'], [s.high, 'var(--red)']] as const) parts.push(`<line x1="0" x2="${w}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" style="stroke:${c};stroke-width:1;stroke-dasharray:3 3;opacity:.6"/>`);
    if (pts.length > 1) parts.push(`<polyline fill="none" style="stroke:${tone(pts[pts.length - 1][1], s)};stroke-width:2" points="${pts.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`);
    const last = pts[pts.length - 1];
    if (last) parts.push(`<circle cx="${x(last[0]).toFixed(1)}" cy="${y(last[1]).toFixed(1)}" r="3" style="fill:${tone(last[1], s)}"><title>${last[1].toFixed(1)}</title></circle>`);
  });
  for (const v of visits) {
    if (v.t < from || v.t > to) continue;
    parts.push(`<line x1="${x(v.t).toFixed(1)}" x2="${x(v.t).toFixed(1)}" y1="${gap - 2}" y2="${h - 10}" style="stroke:${statusTone(v.status)};stroke-width:2;opacity:.85"><title>${new Date(v.t).toISOString().slice(0, 10)} ${v.status}</title></line>`);
  }
  // Month ticks along the bottom.
  const d = new Date(from);
  for (let m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).getTime(); m <= to; m = new Date(Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)).getTime()) {
    parts.push(`<text x="${x(m).toFixed(1)}" y="${h - 1}" class="cf-tl-lbl">${String(new Date(m).getUTCMonth() + 1).padStart(2, '0')}</text>`);
  }
  return `<svg class="coral-chart cf-tl" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img">${parts.join('')}</svg>`;
}

export interface YearRow {
  year: number;
  heat: number | null;
  mud: number | null;
  visits: number;
  /** Worst status logged that year, or null with no visits. */
  worst: CoralStatus | null;
}

const SEVERITY: Record<CoralStatus, number> = { unknown: 0, healthy: 1, bleaching: 2, disease: 3, dead: 4 };

/** One row per year from `from` to `to` (newest first): the reef's peaks and the site's visits. */
export function yearRows(site: CoralSite, from: number, to: number, heatPeak: (y: number) => number | null, mudPeak: (y: number) => number | null): YearRow[] {
  const rows: YearRow[] = [];
  for (let y = to; y >= from; y--) {
    const vs = site.visits.filter((v) => new Date(v.t).getUTCFullYear() === y);
    const worst = vs.length ? vs.reduce((a, v) => (SEVERITY[v.status] > SEVERITY[a] ? v.status : a), vs[0].status) : null;
    rows.push({ year: y, heat: heatPeak(y), mud: mudPeak(y), visits: vs.length, worst });
  }
  return rows;
}
