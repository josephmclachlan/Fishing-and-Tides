/**
 * Hour-by-hour charts for the FORECAST page (PLAN 7.52 part 2). Pure SVG strings, no DOM.
 *
 * Every row shares one time axis (`px` pixels per hour from the first local midnight), so the page stacks
 * them in one horizontal scroller and one cursor line crosses them all. Each row is one measure on one
 * scale (never two y-axes). Bars are thin with a 2 px gap, the headline row is coloured by rating level
 * (the readout and the hero carry the word, so colour is never the only cue), the other rows are ink.
 * Only each day's peak is labelled, and tide highs and lows. Nights are shaded, and the day's best window
 * (WATCH's, from plan.ts) is a soft highlight band that pulses.
 */
import { uvLevel, type FcActivity, type Level, type TimelineHour } from './model';

export interface ChartGeom {
  /** Pixels per hour. */
  px: number;
  tzOffsetH: number;
}
export interface Window { startMs: number; endMs: number }

export interface RowSpec {
  id: string;
  kind: 'bars' | 'area';
  value: (h: TimelineHour) => number | null;
  /** Rating level per hour (the headline row): bars coloured by it. */
  level?: (h: TimelineHour) => Level | null;
  /** Smallest top of the scale, so a calm week is not drawn as a storm. */
  minMax: number;
  decimals: number;
  /** Wind arrows every 3 h (degrees FROM). */
  arrow?: (h: TimelineHour) => number | null;
  /** A second mark per hour on the same scale (gusts over wind). */
  tick?: (h: TimelineHour) => number | null;
  /** Label each day's peak (bars) or the highs and lows (area). */
  label: 'peak' | 'extrema' | 'none';
}

const H = 3.6e6;
const f1 = (x: number) => Math.round(x * 10) / 10;
const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);
const localHour = (ms: number, tz: number) => Math.round(((((ms + tz * H) % 864e5) + 864e5) % 864e5) / H) % 24;

/** The rows each activity shows, top to bottom (the rating strip is drawn separately). */
export function rowsFor(a: FcActivity): RowSpec[] {
  const wind: RowSpec = { id: 'wind', kind: 'bars', value: (h) => h.windKt, minMax: 15, decimals: 0, arrow: (h) => h.windFromDeg, tick: (h) => h.gustKt, label: 'peak' };
  const tide: RowSpec = { id: 'tide', kind: 'area', value: (h) => h.tideM, minMax: 0, decimals: 1, label: 'extrema' };
  const rain: RowSpec = { id: 'rain', kind: 'bars', value: (h) => h.rainMmH, minMax: 5, decimals: 1, label: 'peak' };
  // Every activity is out in the sun: UV coloured by its WHO band, each day's peak labelled (Joseph, 2026-11-10).
  const uv: RowSpec = { id: 'uv', kind: 'bars', value: (h) => h.uv, level: (h) => (h.uv === null ? null : uvLevel(h.uv)), minMax: 11, decimals: 0, label: 'peak' };
  switch (a) {
    case 'surf':
      return [{ id: 'surf', kind: 'bars', value: (h) => h.read.surf?.hb ?? null, level: (h) => h.read.level, minMax: 1.2, decimals: 1, label: 'peak' }, wind, tide, uv];
    case 'fish':
      return [{ id: 'bite', kind: 'bars', value: (h) => h.read.score, level: (h) => h.read.level, minMax: 100, decimals: 0, label: 'peak' }, tide, wind, rain, uv];
    case 'snorkel':
      // At the surface over a shallow reef: getting in through the surf, chop, drift and the water left over the reef.
      return [
        { id: 'vis', kind: 'area', value: (h) => h.read.water?.visM ?? null, minMax: 15, decimals: 0, label: 'peak' },
        { id: 'score', kind: 'bars', value: (h) => h.read.score, level: (h) => h.read.level, minMax: 100, decimals: 0, label: 'peak' },
        { id: 'entry', kind: 'bars', value: (h) => h.read.water?.breakerM ?? null, minMax: 1, decimals: 1, label: 'peak' },
        { id: 'chop', kind: 'bars', value: (h) => h.windKt, minMax: 15, decimals: 0, arrow: (h) => h.windFromDeg, label: 'peak' },
        { id: 'current', kind: 'bars', value: (h) => h.read.water?.currentKt ?? null, minMax: 1, decimals: 1, label: 'peak' },
        tide,
        uv,
      ];
    case 'dive':
      return [
        { id: 'vis', kind: 'area', value: (h) => h.read.water?.visM ?? null, minMax: 15, decimals: 0, label: 'peak' },
        { id: 'score', kind: 'bars', value: (h) => h.read.score, level: (h) => h.read.level, minMax: 100, decimals: 0, label: 'peak' },
        { id: 'surge', kind: 'bars', value: (h) => h.read.water?.surgeMs ?? null, minMax: 0.6, decimals: 2, label: 'peak' },
        { id: 'current', kind: 'bars', value: (h) => h.read.water?.currentKt ?? null, minMax: 1, decimals: 1, label: 'peak' },
        tide,
        wind,
        uv,
      ];
    case 'sail':
      return [
        { ...wind, level: (h) => h.read.level },
        { id: 'swell', kind: 'bars', value: (h) => h.read.sail?.swellM ?? null, minMax: 1.5, decimals: 1, label: 'peak' },
        rain,
        tide,
        uv,
      ];
  }
}

/** Shared background: night bands, day lines and the best windows. */
function backdrop(hours: readonly TimelineHour[], g: ChartGeom, ht: number, wins: readonly Window[]): string {
  const t0 = hours[0]?.ms ?? 0;
  const x = (ms: number) => ((ms - t0) / H) * g.px;
  let out = '';
  for (let i = 0; i < hours.length; ) {
    if (hours[i].day) { i++; continue; }
    let j = i;
    while (j < hours.length && !hours[j].day) j++;
    out += `<rect class="fc-c-night" x="${f1(i * g.px)}" y="0" width="${f1((j - i) * g.px)}" height="${ht}"/>`;
    i = j;
  }
  for (const w of wins) out += `<rect class="fc-c-win" x="${f1(x(w.startMs))}" y="0" width="${f1(x(w.endMs) - x(w.startMs))}" height="${ht}" rx="3"/>`;
  hours.forEach((h, i) => {
    if (i > 0 && localHour(h.ms, g.tzOffsetH) === 0) out += `<line class="fc-c-day" x1="${f1(i * g.px)}" x2="${f1(i * g.px)}" y1="0" y2="${ht}"/>`;
  });
  return out;
}

/** The rating strip: one rounded segment per hour, coloured by level, gaps where there is no data. */
export function ratingStrip(hours: readonly TimelineHour[], g: ChartGeom): string {
  const w = hours.length * g.px, ht = 14;
  const segs = hours
    .map((h, i) => (h.read.level === null ? '' : `<rect class="fc-c-lv l${h.read.level}" x="${f1(i * g.px)}" y="4" width="${f1(g.px + 0.6)}" height="6"/>`))
    .join('');
  return `<svg class="fc-chart fc-c-rating" width="${f1(w)}" height="${ht}" viewBox="0 0 ${f1(w)} ${ht}" aria-hidden="true">${segs}</svg>`;
}

/** Time header: day names at each midnight, hour ticks at 06, 12 and 18. */
export function timeAxis(hours: readonly TimelineHour[], g: ChartGeom, dayName: (ms: number, i: number) => string): string {
  const w = hours.length * g.px, ht = 34;
  let out = '';
  let day = 0;
  hours.forEach((h, i) => {
    const lh = localHour(h.ms, g.tzOffsetH);
    const x = f1(i * g.px);
    if (lh === 0) out += `<text class="fc-c-dname" x="${f1(i * g.px + 4)}" y="13">${dayName(h.ms, day++)}</text>`;
    else if (lh % 6 === 0 && g.px * 6 >= 22) out += `<text class="fc-c-hr" x="${x}" y="29" text-anchor="middle">${lh}</text>`;
  });
  return `<svg class="fc-chart fc-c-axis" width="${f1(w)}" height="${ht}" viewBox="0 0 ${f1(w)} ${ht}" aria-hidden="true">${out}</svg>`;
}

export type SkyKind = 'sun' | 'moon' | 'partly-sun' | 'partly-moon' | 'cloud' | 'rain' | 'storm';
/** One weather word per hour from cloud, rain and squall risk; null before the weather loads. */
export function skyKind(h: Pick<TimelineHour, 'cloudPct' | 'rainMmH' | 'squall' | 'day'>): SkyKind | null {
  if (!fin(h.cloudPct) && !fin(h.rainMmH)) return null;
  if (fin(h.squall) && h.squall >= 2) return 'storm';
  if (fin(h.rainMmH) && h.rainMmH >= 0.5) return fin(h.squall) && h.squall >= 1 ? 'storm' : 'rain';
  const c = h.cloudPct ?? 0;
  if (c >= 75) return 'cloud';
  if (c >= 35) return h.day ? 'partly-sun' : 'partly-moon';
  return h.day ? 'sun' : 'moon';
}

const CLOUD = 'M-5.5,4 a3.5,3.5 0 0 1 0.4,-7 a4.6,4.6 0 0 1 8.8,-0.6 a3.4,3.4 0 0 1 1.8,7.6 Z';
const SKY_ICON: Record<SkyKind, string> = {
  sun: `<circle class="fc-i-sun" r="3.6"/><path class="fc-i-ray" d="M0,-7v2M0,5v2M-7,0h2M5,0h2M-4.9,-4.9l1.4,1.4M3.5,3.5l1.4,1.4M-4.9,4.9l1.4,-1.4M3.5,-3.5l1.4,-1.4"/>`,
  moon: `<path class="fc-i-moon" d="M2.5,-5.5 a6,6 0 1 0 3,10 a5,5 0 0 1 -3,-10 Z"/>`,
  'partly-sun': `<g transform="translate(-3 -3) scale(0.8)"><circle class="fc-i-sun" r="3.6"/><path class="fc-i-ray" d="M0,-7v2M-7,0h2M-4.9,-4.9l1.4,1.4M3.5,-3.5l1.4,-1.4"/></g><path class="fc-i-cloud" transform="translate(1.5 2)" d="${CLOUD}"/>`,
  'partly-moon': `<path class="fc-i-moon" transform="translate(-3 -3) scale(0.75)" d="M2.5,-5.5 a6,6 0 1 0 3,10 a5,5 0 0 1 -3,-10 Z"/><path class="fc-i-cloud" transform="translate(1.5 2)" d="${CLOUD}"/>`,
  cloud: `<path class="fc-i-cloud" d="${CLOUD}"/>`,
  rain: `<path class="fc-i-cloud" transform="translate(0 -2)" d="${CLOUD}"/><path class="fc-i-drop" d="M-3,4.5l-1,2.5M0.5,4.5l-1,2.5M4,4.5l-1,2.5"/>`,
  storm: `<path class="fc-i-cloud" transform="translate(0 -2)" d="${CLOUD}"/><path class="fc-i-bolt" d="M1,2.5 L-1.5,6.5 H0.8 L-0.6,9.5 L3,5 H0.8 L2.2,2.5 Z"/>`,
};

/** The sky row: one weather icon per 3 h (the worst hour of the three wins, so a squall is never hidden). */
export function skyRow(hours: readonly TimelineHour[], g: ChartGeom): string {
  const w = hours.length * g.px, ht = 24;
  const order: SkyKind[] = ['sun', 'moon', 'partly-sun', 'partly-moon', 'cloud', 'rain', 'storm'];
  let out = '';
  for (let i = 0; i < hours.length; i += 3) {
    const kinds = hours.slice(i, i + 3).map(skyKind).filter((k): k is SkyKind => k !== null);
    if (!kinds.length) continue;
    // Day or night from the middle hour; the worst weather of the block.
    const worst = kinds.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a));
    const mid = hours[Math.min(hours.length - 1, i + 1)];
    const k = worst === 'sun' || worst === 'moon' ? (mid.day ? 'sun' : 'moon') : worst.startsWith('partly') ? (mid.day ? 'partly-sun' : 'partly-moon') : worst;
    out += `<g class="fc-i fc-i-${k}" transform="translate(${f1((i + 1.5) * g.px)} 12) scale(${g.px * 3 >= 24 ? 1 : 0.8})">${SKY_ICON[k]}</g>`;
  }
  return `<svg class="fc-chart fc-c-sky" width="${f1(w)}" height="${ht}" viewBox="0 0 ${f1(w)} ${ht}" aria-hidden="true">${out}</svg>`;
}

const fmt = (v: number, d: number) => (d === 0 ? String(Math.round(v)) : v.toFixed(d));

/** One row. `wins` are the best windows highlighted behind it. */
export function rowSvg(spec: RowSpec, hours: readonly TimelineHour[], g: ChartGeom, wins: readonly Window[] = []): string {
  const w = hours.length * g.px;
  const ht = spec.arrow ? 78 : 64;
  const top = 14, base = spec.arrow ? 60 : ht - 4;
  const vals = hours.map(spec.value);
  const ticks = spec.tick ? hours.map(spec.tick) : [];
  const max = Math.max(spec.minMax, ...vals.filter(fin), ...ticks.filter(fin)) || 1;
  const y = (v: number) => base - (Math.max(0, v) / max) * (base - top);
  let marks = '';
  if (spec.kind === 'bars') {
    const bw = Math.max(1.5, g.px - 2);
    vals.forEach((v, i) => {
      if (!fin(v)) return;
      const lv = spec.level?.(hours[i]);
      const hgt = Math.max(1.5, base - y(v));
      marks += `<rect class="fc-c-bar${lv === null || lv === undefined ? '' : ` l${lv}`}" x="${f1(i * g.px + (g.px - bw) / 2)}" y="${f1(base - hgt)}" width="${f1(bw)}" height="${f1(hgt)}" rx="${f1(Math.min(2, bw / 2))}"/>`;
    });
    ticks.forEach((v, i) => {
      if (fin(v)) marks += `<rect class="fc-c-tick" x="${f1(i * g.px + 0.5)}" y="${f1(y(v) - 1)}" width="${f1(Math.max(1, g.px - 1))}" height="2" rx="1"/>`;
    });
  } else {
    // Area: a 2 px line over a soft fill, broken where there is no data.
    let d = '', fill = '', run: [number, number][] = [];
    const flush = () => {
      if (run.length > 1) {
        const p = run.map(([x, yy]) => `${f1(x)},${f1(yy)}`).join(' L');
        d += `M${p} `;
        fill += `M${f1(run[0][0])},${base} L${p} L${f1(run[run.length - 1][0])},${base} Z `;
      }
      run = [];
    };
    vals.forEach((v, i) => (fin(v) ? run.push([i * g.px + g.px / 2, y(v)]) : flush()));
    flush();
    marks = `<path class="fc-c-fill" d="${fill}"/><path class="fc-c-line" d="${d}"/>`;
  }
  // Selective labels: each day's peak, or the tide's turning points.
  let labels = '';
  if (spec.label === 'peak') {
    for (let d0 = 0; d0 < vals.length; d0 += 24) {
      let bi = -1;
      for (let i = d0; i < Math.min(vals.length, d0 + 24); i++) if (fin(vals[i]) && (bi < 0 || vals[i]! > vals[bi]!)) bi = i;
      if (bi >= 0 && vals[bi]! > 0) labels += `<text class="fc-c-val" x="${f1(bi * g.px + g.px / 2)}" y="${f1(y(vals[bi]!) - 4)}" text-anchor="middle">${fmt(vals[bi]!, spec.decimals)}</text>`;
    }
  } else if (spec.label === 'extrema') {
    for (let i = 1; i < vals.length - 1; i++) {
      const a = vals[i - 1], b = vals[i], c = vals[i + 1];
      if (!fin(a) || !fin(b) || !fin(c)) continue;
      const hi = b >= a && b > c, lo = b <= a && b < c;
      // A real turning point stands clear of the hours 3 h either side (a flat stand is not labelled twice).
      const far = [vals[i - 3], vals[i + 3]].filter(fin);
      if ((hi || lo) && far.length && far.every((v) => Math.abs(v - b) >= 0.03)) labels += `<text class="fc-c-val" x="${f1(i * g.px + g.px / 2)}" y="${f1(hi ? y(b) - 5 : Math.min(base - 2, y(b) + 13))}" text-anchor="middle">${fmt(b, spec.decimals)}</text>`;
    }
  }
  let arrows = '';
  if (spec.arrow) {
    hours.forEach((h, i) => {
      if (localHour(h.ms, g.tzOffsetH) % 3 !== 0) return;
      const deg = spec.arrow!(h);
      if (!fin(deg)) return;
      // Points where the wind blows to (FROM + 180).
      arrows += `<path class="fc-c-arrow" transform="translate(${f1(i * g.px + g.px / 2)} ${ht - 8}) rotate(${Math.round(deg + 180)})" d="M0,-5 L3.5,3 L0,1.5 L-3.5,3 Z"/>`;
    });
  }
  return `<svg class="fc-chart fc-c-${spec.id}" width="${f1(w)}" height="${ht}" viewBox="0 0 ${f1(w)} ${ht}" aria-hidden="true">${backdrop(hours, g, base, wins)}<line class="fc-c-base" x1="0" x2="${f1(w)}" y1="${base}" y2="${base}"/>${marks}${labels}${arrows}</svg>`;
}
