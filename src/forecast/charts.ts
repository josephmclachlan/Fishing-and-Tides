/**
 * Hour-by-hour charts for the FORECAST page (PLAN 7.52 part 2, redrawn for Kinetic Plus in PLAN 7.69).
 *
 * Every row shares one time axis (`px` pixels per hour from the first local midnight), stacked in one horizontal
 * scroller under a pinned label column, so one cursor line crosses them all. Each row is one measure on one scale
 * (never two y-axes). The headline row and UV are coloured by level, the rest are ink; only each day's peak is
 * labelled, and the tide's highs and lows. Nights are shaded, and each day's best window (WATCH's, plan.ts) is a
 * soft band that breathes.
 *
 * The scales, labels, bands and layout are pure functions (tested in charts.test.ts); the drawing paints them on two
 * canvases: a base (rows, grows in when the activity changes) and a top layer (bands, the now line, the cursor).
 */
import { uvLevel, type FcActivity, type Level, type TimelineHour } from './model';
import { arrow, clamp, DISP, MONO, rgba, TAU, txt, type Ctx2D, type TokenName, type Tokens } from './kit';

export interface Window { startMs: number; endMs: number }

export interface RowSpec {
  id: string;
  kind: 'bars' | 'area';
  value: (h: TimelineHour) => number | null;
  /** Rating level per hour (the headline row): bars coloured by it. */
  level?: (h: TimelineHour) => Level | null;
  /** Smallest top of the scale, so a calm week is not drawn as a storm. */
  minMax: number;
  /** Bottom of the scale (default 0): temperatures start at 20 °C so a hot day stands out from a warm one. */
  floor?: number;
  decimals: number;
  /** Wind arrows every 3 h (degrees FROM). */
  arrow?: (h: TimelineHour) => number | null;
  /** A second mark per hour on the same scale (gusts over wind). */
  tick?: (h: TimelineHour) => number | null;
  /** Label each day's peak (bars) or the highs and lows (area). */
  label: 'peak' | 'extrema' | 'none';
  /** The shared weather rows, drawn under a WEATHER heading after the activity's own. */
  wx?: boolean;
  /** UV: bars coloured by the WHO band. */
  uv?: boolean;
  /** Largest top of the scale (percentages stop at 100). */
  cap?: number;
}

const H = 3.6e6;
const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);
const localHour = (ms: number, tz: number) => Math.round(((((ms + tz * H) % 864e5) + 864e5) % 864e5) / H) % 24;

/**
 * The rows each activity shows, top to bottom (the rating strip is drawn separately): the activity's own rows,
 * then the same weather rows for every activity (Joseph, 2026-11-10: "weather should be a fully traditional
 * forecast"): temperature, real feel, humidity, chance of rain, rain and UV.
 */
export function rowsFor(a: FcActivity): RowSpec[] {
  return [...activityRows(a), ...WEATHER_ROWS];
}
const WEATHER_ROWS: RowSpec[] = [
  // Temperatures from 20 °C, so a hot afternoon stands out from a warm one; each day's peak labelled.
  { id: 'air', kind: 'area', value: (h) => h.airC, minMax: 34, floor: 20, decimals: 0, label: 'peak', wx: true },
  { id: 'feels', kind: 'area', value: (h) => h.feelsC, minMax: 38, floor: 20, decimals: 0, label: 'peak', wx: true },
  { id: 'humidity', kind: 'area', value: (h) => h.humidityPct, minMax: 100, cap: 100, floor: 40, decimals: 0, label: 'peak', wx: true },
  { id: 'rainpct', kind: 'bars', value: (h) => h.rainPct, minMax: 100, cap: 100, decimals: 0, label: 'peak', wx: true },
  { id: 'rain', kind: 'bars', value: (h) => h.rainMmH, minMax: 5, decimals: 1, label: 'peak', wx: true },
  // Every activity is out in the sun: UV coloured by its WHO band, each day's peak labelled (Joseph, 2026-11-10).
  { id: 'uv', kind: 'bars', value: (h) => h.uv, level: (h) => (h.uv === null ? null : uvLevel(h.uv)), uv: true, minMax: 11, decimals: 0, label: 'peak', wx: true },
];
function activityRows(a: FcActivity): RowSpec[] {
  const wind: RowSpec = { id: 'wind', kind: 'bars', value: (h) => h.windKt, minMax: 15, decimals: 0, arrow: (h) => h.windFromDeg, tick: (h) => h.gustKt, label: 'peak' };
  const tide: RowSpec = { id: 'tide', kind: 'area', value: (h) => h.tideM, minMax: 0, decimals: 2, label: 'extrema' };
  switch (a) {
    case 'surf':
      return [{ id: 'surf', kind: 'bars', value: (h) => h.read.surf?.hb ?? null, level: (h) => h.read.level, minMax: 1.2, decimals: 1, label: 'peak' }, wind, tide];
    case 'fish':
      return [{ id: 'bite', kind: 'bars', value: (h) => h.read.score, level: (h) => h.read.level, minMax: 100, cap: 100, decimals: 0, label: 'peak' }, tide, wind];
    case 'snorkel':
      // At the surface over a shallow reef: getting in through the surf, chop, drift and the water left over the reef.
      return [
        { id: 'vis', kind: 'area', value: (h) => h.read.water?.visM ?? null, minMax: 15, decimals: 0, label: 'peak' },
        { id: 'score', kind: 'bars', value: (h) => h.read.score, level: (h) => h.read.level, minMax: 100, cap: 100, decimals: 0, label: 'peak' },
        { id: 'entry', kind: 'bars', value: (h) => h.read.water?.breakerM ?? null, minMax: 1, decimals: 1, label: 'peak' },
        { id: 'chop', kind: 'bars', value: (h) => h.windKt, minMax: 15, decimals: 0, arrow: (h) => h.windFromDeg, label: 'peak' },
        { id: 'current', kind: 'bars', value: (h) => h.read.water?.currentKt ?? null, minMax: 1, decimals: 1, label: 'peak' },
        tide,
      ];
    case 'dive':
      return [
        { id: 'vis', kind: 'area', value: (h) => h.read.water?.visM ?? null, minMax: 15, decimals: 0, label: 'peak' },
        { id: 'score', kind: 'bars', value: (h) => h.read.score, level: (h) => h.read.level, minMax: 100, cap: 100, decimals: 0, label: 'peak' },
        { id: 'surge', kind: 'bars', value: (h) => h.read.water?.surgeMs ?? null, minMax: 0.6, decimals: 2, label: 'peak' },
        { id: 'current', kind: 'bars', value: (h) => h.read.water?.currentKt ?? null, minMax: 1, decimals: 1, label: 'peak' },
        tide,
        wind,
      ];
    case 'swim': {
      // A beach day: the score, then what decides it, safety first (rip, shore break); sun, heat and rain are in the weather rows.
      const ripLv = { LOW: 3, MOD: 2, HIGH: 0 } as const;
      return [
        { id: 'swim', kind: 'bars', value: (h) => h.read.score, level: (h) => h.read.level, minMax: 100, cap: 100, decimals: 0, label: 'peak' },
        { id: 'rip', kind: 'bars', value: (h) => h.read.swim?.ripScore ?? null, level: (h) => (h.read.swim ? ripLv[h.read.swim.rip] : null), minMax: 0.8, decimals: 2, label: 'peak' },
        { id: 'shorebreak', kind: 'bars', value: (h) => h.read.swim?.breakerM ?? null, minMax: 1, decimals: 1, label: 'peak' },
        wind,
        tide,
      ];
    }
    case 'sail':
      return [
        { ...wind, level: (h) => h.read.level },
        { id: 'swell', kind: 'bars', value: (h) => h.read.sail?.swellM ?? null, minMax: 1.5, decimals: 1, label: 'peak' },
        tide,
      ];
  }
}

/** The smallest "nice" number (1, 1.5, 2, 2.5 … × 10ⁿ) at or above v. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const st = Math.pow(10, Math.floor(Math.log10(v))) / 2;
  return Math.round(Math.ceil(v / st) * st * 1000) / 1000;
}

/**
 * A row's scale [lo, hi]. The tide is centred on zero (it swings both ways about mean sea level), with 25 % room.
 * The rest run from their floor (0 or the row's own) to the larger of the row's minimum top and the week's
 * largest value (gusts included), rounded up to a nice number with 6 % headroom for the labels.
 */
export function rowScale(spec: RowSpec, hours: readonly TimelineHour[]): { lo: number; hi: number } {
  const vals = hours.map(spec.value).filter(fin);
  if (spec.id === 'tide') {
    const a = Math.max(0.05, ...vals.map(Math.abs)) * 1.25;
    return { lo: -a, hi: a };
  }
  const ticks = spec.tick ? hours.map(spec.tick).filter(fin) : [];
  const lo = spec.floor ?? 0;
  const top = Math.max(...vals, ...ticks, lo);
  // UV is read off its own whole-number scale (0..11+), so its top is the next whole number, not a "nice" one.
  const nice = spec.uv ? Math.ceil(top) : niceCeil(top * 1.06);
  const hi = Math.max(spec.minMax, top > lo ? nice : lo + 1, lo + 1e-6);
  return { lo, hi: spec.cap !== undefined ? Math.min(spec.cap, hi) : hi };
}

export interface RowLabel { i: number; v: number; below: boolean }
/**
 * Which hours a row labels: each local day's peak (bars and areas), or the tide's turning points, each standing
 * clear of the hours 3 h either side so a flat stand is not labelled twice. `hours` starts at a local midnight.
 */
export function rowLabels(spec: RowSpec, hours: readonly TimelineHour[]): RowLabel[] {
  const vals = hours.map(spec.value);
  const out: RowLabel[] = [];
  if (spec.label === 'peak') {
    for (let d0 = 0; d0 < vals.length; d0 += 24) {
      let bi = -1;
      for (let i = d0; i < Math.min(vals.length, d0 + 24); i++) if (fin(vals[i]) && (bi < 0 || vals[i]! > vals[bi]!)) bi = i;
      if (bi >= 0 && vals[bi]! > (spec.floor ?? 0)) out.push({ i: bi, v: vals[bi]!, below: false });
    }
  } else if (spec.label === 'extrema') {
    for (let i = 1; i < vals.length - 1; i++) {
      const a = vals[i - 1], b = vals[i], c = vals[i + 1];
      if (!fin(a) || !fin(b) || !fin(c)) continue;
      const hi = b >= a && b > c, lo = b <= a && b < c;
      const far = [vals[i - 3], vals[i + 3]].filter(fin);
      if ((hi || lo) && far.length && far.every((v) => Math.abs(v - b) >= 0.03)) out.push({ i, v: b, below: lo });
    }
  }
  return out;
}

/** Sunrise and sunset marks of the chart: x on the axis and the local clock time ("05:48"), at the minute. */
export function sunMarks(hours: readonly TimelineHour[], t0: number, px: number, tz = -6): { x: number; rise: boolean; ms: number; label: string }[] {
  const out: { x: number; rise: boolean; ms: number; label: string }[] = [];
  const seen = new Set<number>();
  const clock = (ms: number) => { const d = new Date(ms + tz * 3.6e6); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  for (const h of hours) {
    for (const [ms, rise] of [[h.sunriseMs, true], [h.sunsetMs, false]] as const) {
      if (ms === null || ms === undefined || seen.has(ms)) continue;
      seen.add(ms);
      const x = ((ms - t0) / 3.6e6) * px;
      if (x >= 0) out.push({ x, rise, ms, label: clock(ms) });
    }
  }
  return out;
}

/** The best windows as hour spans [start, end) on the chart's axis (hours from its first midnight). */
export function bestBands(wins: readonly Window[], t0: number): [number, number][] {
  return wins.map((w) => [(w.startMs - t0) / H, (w.endMs - t0) / H] as [number, number]).filter(([s, e]) => e > s);
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
const SKY_ORDER: SkyKind[] = ['sun', 'moon', 'partly-sun', 'partly-moon', 'cloud', 'rain', 'storm'];
/** The sky glyph for a 3 h block: the worst weather of the three, day or night from its middle hour. */
export function skyBlock(hours: readonly TimelineHour[], i: number): SkyKind | null {
  const kinds = hours.slice(i, i + 3).map(skyKind).filter((k): k is SkyKind => k !== null);
  if (!kinds.length) return null;
  const worst = kinds.reduce((a, b) => (SKY_ORDER.indexOf(b) > SKY_ORDER.indexOf(a) ? b : a));
  const mid = hours[Math.min(hours.length - 1, i + 1)];
  if (worst === 'sun' || worst === 'moon') return mid.day ? 'sun' : 'moon';
  if (worst.startsWith('partly')) return mid.day ? 'partly-sun' : 'partly-moon';
  return worst;
}

// --- Layout and drawing -------------------------------------------------------------------------------------------

export type ChartRow =
  | { t: 'axis' | 'sky' | 'rate' | 'head'; y: number; h: number }
  | { t: 'data'; y: number; h: number; spec: RowSpec; lo: number; hi: number; labels: RowLabel[]; vals: (number | null)[] };
export interface ChartLayout { px: number; W: number; H: number; rows: ChartRow[]; t0: number; tz: number }

/** Rows top to bottom with their heights: the axis, the sky, the rating strip, the activity's rows, WEATHER, its rows. */
export function chartLayout(a: FcActivity, hours: readonly TimelineHour[], px: number, wide: boolean, tz: number): ChartLayout {
  const RA = wide ? 66 : 58, RW = wide ? 52 : 46;
  const rows: ChartRow[] = [{ t: 'axis', y: 0, h: 38 }, { t: 'sky', y: 0, h: 30 }, { t: 'rate', y: 0, h: 18 }];
  const specs = rowsFor(a);
  specs.forEach((spec, i) => {
    if (spec.wx && !specs[i - 1]?.wx) rows.push({ t: 'head', y: 0, h: 30 });
    const { lo, hi } = rowScale(spec, hours);
    rows.push({ t: 'data', y: 0, h: spec.wx ? RW : RA, spec, lo, hi, labels: rowLabels(spec, hours), vals: hours.map(spec.value) });
  });
  let y = 0;
  for (const r of rows) (r.y = y), (y += r.h);
  return { px, W: Math.round(hours.length * px), H: y, rows, t0: hours[0]?.ms ?? 0, tz };
}

/** UV colour token for a UV value: WHO band, green (low) to violet (extreme). */
const uvTok = (v: number) => `uv${4 - uvLevel(v)}` as TokenName;
const lvTok = (l: Level | null | undefined): TokenName => (l === null || l === undefined ? 'lvn' : (`lv${l}` as TokenName));

function skyGlyph(c: Ctx2D, x: number, y: number, k: SkyKind, T: Tokens) {
  const I = rgba(T['c-ink2']), A = rgba(T['c-sun']);
  const disc = (r: number, dayDisc: boolean) => {
    if (dayDisc) {
      c.fillStyle = A;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    } else {
      c.fillStyle = I;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.fillStyle = rgba(T['c-night']);
      c.beginPath(); c.arc(x + r * 0.55, y - r * 0.35, r * 0.85, 0, TAU); c.fill();
    }
  };
  const bar = (dx: number, dy: number, l: number, w: number) => {
    c.strokeStyle = I; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + dx - l / 2, y + dy); c.lineTo(x + dx + l / 2, y + dy); c.stroke();
    c.lineCap = 'butt';
  };
  if (k === 'sun' || k === 'moon') disc(5, k === 'sun');
  else if (k === 'partly-sun' || k === 'partly-moon') {
    disc(4.5, k === 'partly-sun');
    c.strokeStyle = rgba(T[k === 'partly-sun' ? 'c-card' : 'c-night']); c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 3, y + 3); c.lineTo(x + 8, y + 3); c.stroke();
    bar(2.5, 3, 11, 3);
  } else if (k === 'cloud') {
    bar(-1, -2, 12, 3); bar(2, 3, 12, 3);
  } else {
    bar(0, -4, 14, 3);
    c.strokeStyle = k === 'storm' ? I : rgba(T['c-acc']); c.lineWidth = 1.6; c.beginPath();
    if (k === 'storm') { c.moveTo(x + 1, y - 1); c.lineTo(x - 2, y + 4); c.lineTo(x + 2, y + 4); c.lineTo(x - 1, y + 9); }
    else { c.moveTo(x - 3, y); c.lineTo(x - 4.5, y + 5); c.moveTo(x + 1, y); c.lineTo(x - 0.5, y + 5); c.moveTo(x + 5, y); c.lineTo(x + 3.5, y + 5); }
    c.stroke();
  }
}

export interface BaseOpts {
  /** Day name at each midnight, by day index. */
  dayName: (ms: number, i: number) => string;
  /** Text for a row label value. */
  text: (spec: RowSpec, v: number) => string;
}
/**
 * The chart's base layer: card, header band, nights, rules, the axis, sky glyphs, the rating strip and every row.
 * `p` 0..1 grows the bars and lines in from the left (the activity switch); labels appear at 1.
 */
export function drawChartBase(c: Ctx2D, L: ChartLayout, hours: readonly TimelineHour[], T: Tokens, p: number, opt: BaseOpts) {
  const { W, H: Hc, px } = L;
  const I = rgba(T.ink), Lg = rgba(T['c-grid']), L2 = rgba(T['c-grid2']), BAR = rgba(T['c-bar']);
  const ax = L.rows[0].h;
  const ease = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : 1 - Math.pow(1 - k, 3));
  const n = Math.max(1, hours.length);
  const pp = (i: number) => ease((p - (i / n) * 0.35) / 0.65);
  c.clearRect(0, 0, W, Hc);
  c.fillStyle = rgba(T['c-card']); c.fillRect(0, 0, W, Hc);
  c.fillStyle = rgba(T['c-head']); c.fillRect(0, 0, W, ax);
  c.fillStyle = rgba(T['c-night']);
  hours.forEach((h, i) => { if (!h.day) c.fillRect(i * px, ax, px + 0.5, Hc - ax); });
  L.rows.forEach((o, k) => { if (k) { c.fillStyle = o.t === 'head' ? L2 : Lg; c.fillRect(0, o.y, W, 1); } });
  c.fillStyle = L2; c.fillRect(0, ax - 1, W, 1);
  // Dotted 6-hour guides, solid midnights with the day names, ticks at 06, 12 and 18.
  let day = 0;
  hours.forEach((h, i) => {
    const lh = localHour(h.ms, L.tz), x = i * px;
    if (lh === 0) {
      c.fillStyle = L2; c.fillRect(x, 0, 1, Hc);
      c.fillStyle = I; c.font = `800 15px ${DISP}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(opt.dayName(h.ms, day++), x + 5, 16);
    } else if (lh % 6 === 0) {
      c.fillStyle = Lg; for (let yy = ax; yy < Hc; yy += 5) c.fillRect(x, yy, 1, 2);
      c.fillStyle = BAR; c.fillRect(x, ax - 7, 1, 5);
      txt(c, String(lh).padStart(2, '0'), x, ax - 13, 'center', 9, 600);
    }
  });
  // Sunrise and sunset to the minute: a sun-coloured line down the chart and the time under the axis, the hours every best window sits between.
  for (const m of sunMarks(hours, L.t0, px, L.tz)) {
    c.fillStyle = rgba(T['c-sun']); c.globalAlpha = 0.9;
    for (let yy = ax; yy < Hc; yy += 4) c.fillRect(m.x, yy, 1, 2);
    c.fillRect(m.x - 0.5, ax - 12, 2, 12);
    c.globalAlpha = 1;
    c.fillStyle = I; txt(c, `${m.rise ? '↑' : '↓'}${m.label}`, m.x + 4, ax - 3, 'left', 9, 700);
  }
  for (const o of L.rows) {
    if (o.t === 'sky') {
      for (let i = 0; i < hours.length; i += 3) {
        const k = skyBlock(hours, i);
        if (!k) continue;
        c.globalAlpha = pp(i);
        skyGlyph(c, (i + 1.5) * px, o.y + o.h / 2, k, T);
      }
      c.globalAlpha = 1;
    }
    if (o.t === 'rate') {
      hours.forEach((h, i) => {
        if (h.read.level === null) return;
        c.fillStyle = rgba(T[lvTok(h.read.level)]);
        c.fillRect(i * px, o.y + 4, (px > 5 ? px - 1 : px) * pp(i), o.h - 8);
      });
    }
    if (o.t !== 'data') continue;
    const s = o.spec, top = o.y + (s.arrow ? 26 : 15), bot = o.y + o.h - 3;
    const sy = (v: number) => bot - ((clamp(v, o.lo, o.hi) - o.lo) / (o.hi - o.lo)) * (bot - top);
    const base = s.id === 'tide' ? sy(0) : bot;
    if (s.kind === 'bars') {
      hours.forEach((h, i) => {
        const v = o.vals[i], k = pp(i);
        if (!k) return;
        if (s.tick) {
          const g = s.tick(h);
          if (g !== null && Number.isFinite(g)) { c.fillStyle = rgba(T.ink, 0.55); c.fillRect(i * px, base - (base - sy(g)) * k - 0.6, px - 0.5, 1.2); }
        }
        if (v === null || !Number.isFinite(v)) return;
        const hh = Math.max(1, (base - sy(v)) * k);
        const lv = s.level?.(h);
        c.fillStyle = s.uv ? rgba(T[uvTok(v)]) : lv !== undefined && lv !== null ? rgba(T[lvTok(lv)]) : BAR;
        c.fillRect(i * px + 0.5, base - hh, Math.max(1, px - 1.5), hh);
        if (s.level) { c.fillStyle = rgba(T.ink, 0.3); c.fillRect(i * px + 0.5, base - hh, Math.max(1, px - 1.5), 1); }
      });
      if (s.arrow) {
        for (let i = 0; i < hours.length; i++) {
          if (localHour(hours[i].ms, L.tz) % 3 !== 1) continue;
          const d = s.arrow(hours[i]);
          if (d === null || !Number.isFinite(d)) continue;
          c.globalAlpha = pp(i);
          // Points where the wind blows to (FROM + 180).
          arrow(c, (i + 0.5) * px, o.y + 11, d + 180, 5.5, rgba(T['c-ink2']));
        }
        c.globalAlpha = 1;
      }
    } else {
      const col = s.id === 'air' || s.id === 'feels' ? T['c-warm'] : T['c-acc'];
      // Runs broken where there is no data.
      const runs: [number, number][][] = [];
      let run: [number, number][] = [];
      o.vals.forEach((v, i) => {
        if (v === null || !Number.isFinite(v)) { if (run.length) runs.push(run); run = []; return; }
        const k = pp(i);
        const vv = s.id === 'tide' ? v * k : o.lo + (Math.max(o.lo, v) - o.lo) * k;
        run.push([(i + 0.5) * px, sy(vv)]);
      });
      if (run.length) runs.push(run);
      for (const r of runs) {
        if (r.length < 2) continue;
        c.beginPath(); c.moveTo(r[0][0], base);
        for (const [x, y] of r) c.lineTo(x, y);
        c.lineTo(r[r.length - 1][0], base); c.closePath();
        c.fillStyle = rgba(col, 0.13); c.fill();
        c.beginPath();
        r.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.strokeStyle = rgba(col); c.lineWidth = 1.7; c.lineJoin = 'round'; c.stroke();
      }
      if (s.id === 'tide') { c.fillStyle = L2; c.fillRect(0, Math.round(base), W, 1); }
    }
    if (p < 1) continue;
    for (const lb of o.labels) {
      // Kept off the chart's ends so a label at the first or last hour is not cut.
      const x = clamp((lb.i + 0.5) * px, 14, W - 14);
      if (s.id === 'tide') {
        c.fillStyle = rgba(T['c-card']); c.strokeStyle = rgba(T['c-acc']); c.lineWidth = 1.4;
        c.beginPath(); c.arc(x, sy(lb.v), 2.6, 0, TAU); c.fill(); c.stroke();
      }
      let y = lb.below ? sy(lb.v) + 10 : sy(lb.v) - 6;
      y = clamp(y, o.y + 7, o.y + o.h - 5);
      if (s.arrow && !lb.below) y = Math.max(y, o.y + 21);
      c.fillStyle = I;
      txt(c, opt.text(s, lb.v), x, y, 'center', 9, 700);
    }
  }
}

/** The top layer: the best-window bands (breathing), the now line with its tag, and the cursor. */
export function drawChartTop(c: Ctx2D, L: ChartLayout, T: Tokens, o: { bands: [number, number][]; breath: number; nowI: number; nowLabel: string; cursorI: number | null }) {
  const { W, H: Hc, px } = L, ax = L.rows[0].h;
  c.clearRect(0, 0, W, Hc);
  for (const [s, e] of o.bands) {
    const WIN = T['c-win'];
    c.fillStyle = rgba(WIN, 0.06 + 0.09 * o.breath); c.fillRect(s * px, ax, (e - s) * px, Hc - ax);
    c.fillStyle = rgba(WIN, 0.45); c.fillRect(s * px, ax, 1, Hc - ax); c.fillRect(e * px - 1, ax, 1, Hc - ax);
    c.fillStyle = rgba(WIN); c.fillRect(s * px, ax - 3, (e - s) * px, 3);
  }
  if (o.nowI >= 0 && o.nowI < W / px) {
    const nx = (o.nowI + 0.5) * px;
    c.fillStyle = rgba(T.ink); c.fillRect(nx - 1, 2, 2, Hc - 2);
    c.font = `700 ${(8.5 * 1.12).toFixed(1)}px ${MONO}`;
    const tw = c.measureText(o.nowLabel.toUpperCase()).width + 8;
    c.fillRect(nx - 1, 2, tw, 14);
    c.fillStyle = rgba(T.bg); txt(c, o.nowLabel, nx + 3, 9.5, 'left', 8.5, 700);
  }
  if (o.cursorI !== null) {
    const h = o.cursorI, cx = (h + 0.5) * px;
    c.fillStyle = rgba(T['c-acc'], 0.1); c.fillRect(h * px, ax, px, Hc - ax);
    c.fillStyle = rgba(T['c-acc']); c.fillRect(cx - 0.75, ax, 1.5, Hc - ax);
    c.beginPath(); c.moveTo(cx, ax + 1); c.lineTo(cx - 5, ax - 6); c.lineTo(cx + 5, ax - 6); c.closePath(); c.fill();
  }
}
