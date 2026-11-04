/**
 * Small SVG charts for the CORAL panel (PLAN 7.32), as strings so they are testable without a DOM.
 * Colours come from the HUD variables only: green below DHW 4, amber 4 to 8, red from 8.
 */
import { DHW_BLEACHING, DHW_SEVERE } from '../adapters/coral-parse';

const tone = (dhw: number) => (dhw >= DHW_SEVERE ? 'var(--red)' : dhw >= DHW_BLEACHING ? 'var(--amber)' : 'var(--green)');

/** The 12-week DHW build-up: a line over day index, with dashed lines at 4 and 8. */
export function dhwTrendSvg(dhw: readonly (number | null)[], w = 280, h = 64): string {
  const pts = dhw.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const top = Math.max(DHW_SEVERE + 2, ...pts.map((p) => p[1]));
  const x = (i: number) => ((i / Math.max(1, dhw.length - 1)) * (w - 2) + 1).toFixed(1);
  const y = (v: number) => (h - 1 - (v / top) * (h - 2)).toFixed(1);
  const guide = (v: number, c: string) => `<line x1="0" x2="${w}" y1="${y(v)}" y2="${y(v)}" style="stroke:${c};stroke-width:1;stroke-dasharray:3 3;opacity:.6"/>`;
  const last = pts[pts.length - 1];
  const line = pts.length > 1 ? `<polyline fill="none" style="stroke:${tone(last[1])};stroke-width:2" points="${pts.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')}"/>` : '';
  const dot = last ? `<circle cx="${x(last[0])}" cy="${y(last[1])}" r="3" style="fill:${tone(last[1])}"/>` : '';
  return `<svg class="coral-chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img">${guide(DHW_BLEACHING, 'var(--amber)')}${guide(DHW_SEVERE, 'var(--red)')}${line}${dot}</svg>`;
}

/** One bar per year, height by that year's peak DHW (capped at 20), coloured by threshold. */
export function peaksSvg(years: readonly number[], peaks: readonly (number | null)[], w = 280, h = 56): string {
  const n = years.length;
  const bw = w / Math.max(1, n);
  const cap = 20;
  const bars = peaks.map((p, i) => {
    if (p === null) return '';
    const bh = Math.max(1, (Math.min(p, cap) / cap) * (h - 2));
    return `<rect x="${(i * bw + 0.5).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${bh.toFixed(1)}" style="fill:${tone(p)}"><title>${years[i]}: ${p.toFixed(1)}</title></rect>`;
  }).join('');
  const y8 = (h - (DHW_SEVERE / cap) * (h - 2)).toFixed(1);
  return `<svg class="coral-chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img"><line x1="0" x2="${w}" y1="${y8}" y2="${y8}" style="stroke:var(--red);stroke-width:1;stroke-dasharray:3 3;opacity:.6"/>${bars}</svg>`;
}

/** The years whose peak reached a threshold, newest first, e.g. for "SEVERE: 2024 2023 2020". */
export const yearsOver = (years: readonly number[], peaks: readonly (number | null)[], min: number) =>
  years.filter((_, i) => (peaks[i] ?? -1) >= min).reverse();
