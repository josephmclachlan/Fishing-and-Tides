/**
 * Spot-page charts: the quality ribbon (best hours per activity) and the hourly strips (swell,
 * wind with direction arrows, tide) for one local day at one spot. Pure: builds data and SVG
 * markup, no DOM, so it is testable. Colours come from `.sc-*` classes in style.css (theme
 * variables only). Every chart uses the same 24 h x-axis as the tide chart, so a tap maps to the
 * slider with `offsetForTap`.
 */
import type { SeaState } from './adapters/waves';
import { predict, type Harmonics } from './physics/tide';
import { BEST_FROM_H, BEST_LEN_H, BEST_TO_H } from './metrics/forecast';

const HOUR = 3.6e6;
const KT = 1.94384;
const f = (n: number) => n.toFixed(1);

/** What the strips read. Each returns null where nothing covers the place or hour. */
export interface StripEnv {
  sea(lng: number, lat: number, ms: number): SeaState | null;
  /** Wind speed m/s and the direction it blows FROM, compass degrees. */
  wind(lng: number, lat: number, ms: number): { ms: number; fromDeg: number } | null;
  tide: Harmonics;
}

export interface HourRow {
  t: number;
  /** Swell height m and period s (the swell train when there is one, else the whole sea), and where it comes FROM. */
  hs: number | null;
  tp: number | null;
  swellFrom: number | null;
  windKt: number | null;
  windFrom: number | null;
  /** Tide height, m above mean sea level. */
  tideM: number;
}

const fin = (x: number | undefined | null): x is number => typeof x === 'number' && Number.isFinite(x);

/** 24 hourly rows for the local day starting at `dayStartMs`. */
export function hourRows(env: StripEnv, lngLat: [number, number], dayStartMs: number): HourRow[] {
  return Array.from({ length: 24 }, (_, h) => {
    const t = dayStartMs + h * HOUR;
    const s = env.sea(lngLat[0], lngLat[1], t);
    const w = env.wind(lngLat[0], lngLat[1], t);
    const swell = !!s && fin(s.swellHs) && fin(s.swellT) && s.swellT > 0;
    return {
      t,
      hs: s ? (swell ? s.swellHs : fin(s.hs) ? s.hs : null) : null,
      tp: s ? (swell ? s.swellT : fin(s.tm) ? s.tm : null) : null,
      swellFrom: s ? (swell && fin(s.swellDir) ? s.swellDir : fin(s.dir) ? s.dir : null) : null,
      windKt: w ? w.ms * KT : null,
      windFrom: w ? w.fromDeg : null,
      tideM: predict(env.tide, t),
    };
  });
}

export type Tone = 'g' | 'a' | 'r' | 'n';
/** Colour band of a 0..1 hour score (the same scale as the BEST TODAY button). */
export const scoreTone = (s: number | null): Tone => (s === null ? 'n' : s >= 0.6 ? 'g' : s >= 0.35 ? 'a' : 'r');

/** The best BEST_LEN_H consecutive hours (local hour of day, inside BEST_FROM_H..BEST_TO_H) of a day's scores, or null. */
export function bestWindow(scores: readonly (number | null)[]): { from: number; to: number } | null {
  let best: { from: number; v: number } | null = null;
  for (let h = BEST_FROM_H; h + BEST_LEN_H <= BEST_TO_H; h++) {
    let sum = 0, ok = true;
    for (let k = 0; k < BEST_LEN_H; k++) {
      const s = scores[h + k];
      if (s === null || s === undefined) ok = false;
      else sum += s;
    }
    if (!ok) continue;
    const v = sum / BEST_LEN_H;
    if (!best || v > best.v + 1e-9) best = { from: h, v };
  }
  return best ? { from: best.from, to: best.from + BEST_LEN_H } : null;
}

export interface RibbonRow {
  /** Row label, already translated. */
  label: string;
  /** 24 hour scores 0..1, null for no data. */
  scores: (number | null)[];
}

export interface ChartOptions {
  width?: number;
  /** The slider time, epoch ms, drawn as a cursor. */
  cursor?: number;
  dayStartMs: number;
  /** Accessible label. */
  label?: string;
}

const LEFT = 34; // room for row labels
const hx = (W: number, hour: number) => LEFT + (hour / 24) * (W - LEFT);
const hourTicks = (W: number, y: number) =>
  [0, 6, 12, 18, 24].map((h) => `<text class="sc-hr" x="${f(hx(W, h))}" y="${y}" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${String(h % 24).padStart(2, '0')}</text>`).join('');
const cursorAt = (W: number, o: ChartOptions, y0: number, y1: number) => {
  if (o.cursor === undefined) return '';
  const hr = (o.cursor - o.dayStartMs) / HOUR;
  return hr >= 0 && hr <= 24 ? `<line class="sc-cursor" x1="${f(hx(W, hr))}" x2="${f(hx(W, hr))}" y1="${y0}" y2="${y1}"/>` : '';
};

/** One strip of 24 coloured cells per activity, the best two hours of each boxed. */
export function ribbonSvg(rows: readonly RibbonRow[], o: ChartOptions): string {
  const W = o.width ?? 320, rowH = 16, gap = 6, top = 4;
  const H = top + rows.length * (rowH + gap) + 12;
  const cw = (W - LEFT) / 24;
  const body = rows
    .map((r, i) => {
      const y = top + i * (rowH + gap);
      const cells = r.scores.map((s, h) => `<rect class="sc-cell sc-${scoreTone(s)}" x="${f(LEFT + h * cw + 0.5)}" y="${y}" width="${f(cw - 1)}" height="${rowH}"/>`).join('');
      const w = bestWindow(r.scores);
      const box = w ? `<rect class="sc-best" x="${f(hx(W, w.from))}" y="${y - 1.5}" width="${f(cw * (w.to - w.from))}" height="${rowH + 3}"/>` : '';
      return `<text class="sc-lbl" x="0" y="${y + 11}">${r.label}</text>${cells}${box}`;
    })
    .join('');
  return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${o.label ?? ''}" preserveAspectRatio="xMidYMid meet">${body}${cursorAt(W, o, top, H - 12)}${hourTicks(W, H - 2)}</svg>`;
}

/** A small arrow pointing where the thing is going (FROM direction + 180°), centred on (x, y). */
const arrow = (x: number, y: number, fromDeg: number, cls: string) =>
  `<path class="${cls}" transform="translate(${f(x)} ${f(y)}) rotate(${f((fromDeg + 180) % 360)})" d="M0 -5 L3.2 3.5 L0 1.8 L-3.2 3.5Z"/>`;

/** Swell bars + period, wind line with arrows, and a tide line, on one shared 24 h axis. */
export function stripsSvg(rows: readonly HourRow[], o: ChartOptions): string {
  const W = o.width ?? 320, H = 190;
  const cw = (W - LEFT) / 24;
  const cx = (h: number) => LEFT + (h + 0.5) * cw;

  // Swell: bars up to 3 m (taller clip), period under every third hour, arrow at the top.
  const sTop = 16, sBase = 62, sMax = Math.max(2, ...rows.map((r) => r.hs ?? 0));
  const bars = rows
    .map((r, h) => {
      if (r.hs === null) return '';
      const bh = Math.max(1, (r.hs / sMax) * (sBase - sTop - 6));
      return `<rect class="sc-bar" x="${f(cx(h) - cw * 0.35)}" y="${f(sBase - bh)}" width="${f(cw * 0.7)}" height="${f(bh)}"/>`;
    })
    .join('');
  const sArrows = rows.map((r, h) => (h % 3 === 1 && r.swellFrom !== null ? arrow(cx(h), 9, r.swellFrom, 'sc-arr-sw') : '')).join('');
  const periods = rows.map((r, h) => (h % 3 === 1 && r.tp !== null ? `<text class="sc-val" x="${f(cx(h))}" y="${sBase + 9}" text-anchor="middle">${r.tp.toFixed(0)}S</text>` : '')).join('');

  // Wind: line, arrows and a value every third hour.
  const wTop = 88, wBase = 128, wMax = Math.max(15, ...rows.map((r) => r.windKt ?? 0));
  const wy = (kt: number) => wBase - (kt / wMax) * (wBase - wTop);
  const wPts = rows.map((r, h) => (r.windKt === null ? null : `${f(cx(h))} ${f(wy(r.windKt))}`)).filter((p): p is string => p !== null);
  const wLine = wPts.length > 1 ? `<path class="sc-wind" d="M${wPts.join('L')}"/>` : '';
  const wMarks = rows
    .map((r, h) => (h % 3 === 1 && r.windKt !== null && r.windFrom !== null ? arrow(cx(h), wy(r.windKt) - 8, r.windFrom, 'sc-arr-wd') + `<text class="sc-val" x="${f(cx(h))}" y="${f(wy(r.windKt) + 11)}" text-anchor="middle">${Math.round(r.windKt)}</text>` : ''))
    .join('');

  // Tide: line over the same axis.
  const tTop = 146, tBase = 172;
  const tMin = Math.min(...rows.map((r) => r.tideM)), tMax = Math.max(...rows.map((r) => r.tideM));
  const ty = (m: number) => tBase - ((m - tMin) / Math.max(0.05, tMax - tMin)) * (tBase - tTop);
  const tLine = `<path class="sc-tide" d="M${rows.map((r, h) => `${f(cx(h))} ${f(ty(r.tideM))}`).join('L')}"/>`;

  const labels = `<text class="sc-lbl" x="0" y="${sTop + 4}">SWELL</text><text class="sc-lbl" x="0" y="${wTop - 2}">WIND</text><text class="sc-lbl" x="0" y="${tTop + 6}">TIDE</text>`;
  const rules = [sBase, wBase, tBase].map((y) => `<line class="sc-rule" x1="${LEFT}" x2="${W}" y1="${y}" y2="${y}"/>`).join('');
  return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${o.label ?? ''}" preserveAspectRatio="xMidYMid meet">${rules}${labels}${bars}${sArrows}${periods}${wLine}${wMarks}${tLine}${cursorAt(W, o, 4, tBase)}${hourTicks(W, H - 6)}</svg>`;
}

// ---- Swell rose ----

export interface RoseTrain {
  kind: 'sw1' | 'sw2' | 'ws';
  /** Compass degrees the train comes FROM. */
  from: number;
  hs: number;
  tp: number | null;
}

export interface RoseData {
  trains: RoseTrain[];
  wind: { kt: number; from: number } | null;
  /** Bearing the shore faces (seaward normal) for a catalog break, else null. */
  facing: number | null;
}

/** The swell trains, wind sea and wind at one place and hour. Trains the model does not report are left out. */
export function roseData(env: StripEnv, lngLat: [number, number], ms: number, facing: number | null): RoseData {
  const s = env.sea(lngLat[0], lngLat[1], ms);
  const w = env.wind(lngLat[0], lngLat[1], ms);
  const trains: RoseTrain[] = [];
  if (s) {
    const add = (kind: RoseTrain['kind'], hs: number, tp: number, from: number) => {
      if (fin(hs) && fin(from) && hs > 0.05) trains.push({ kind, from, hs, tp: fin(tp) && tp > 0 ? tp : null });
    };
    add('sw1', s.swellHs, s.swellT, s.swellDir);
    add('sw2', s.swell2Hs, s.swell2T, s.swell2Dir);
    add('ws', s.windSeaHs, s.windSeaT, s.windSeaDir);
    // A model with no partitions still has one mean sea: show it as the main train.
    if (!trains.length) add('sw1', s.hs, s.tm, s.dir);
  }
  return { trains, wind: w ? { kt: w.ms * KT, from: w.fromDeg } : null, facing };
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
/** 16-point compass name of a bearing. */
export const compassName = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];

/**
 * Compass dial: one arrow per swell train and wind sea, pointing the way the waves travel (from the
 * bearing they come from toward the centre), longer for bigger waves, plus the wind and the shore.
 * The legend lines under the dial give height, period and direction as text, so the dial is never
 * the only carrier of the numbers.
 */
export function roseSvg(d: RoseData, o: { width?: number; label?: string; names: { sw1: string; sw2: string; ws: string; wind: string; shore: string } }): string {
  const W = o.width ?? 320, cx = W / 2, cy = 82, R = 62;
  const fmt = (n: number) => f(n);
  const arrowTo = (from: number, len: number, cls: string, dash = false) => {
    const [x0, y0] = polar(cx, cy, R, from);
    const [x1, y1] = polar(cx, cy, Math.max(8, R - len), from);
    const head = (a: number) => {
      const [hx, hy] = polar(x1, y1, 7, from + a);
      return `${fmt(hx)} ${fmt(hy)}`;
    };
    return `<line class="${cls}" x1="${fmt(x0)}" y1="${fmt(y0)}" x2="${fmt(x1)}" y2="${fmt(y1)}"${dash ? ' stroke-dasharray="4 3"' : ''}/><path class="${cls} sc-head" d="M${head(-25)} L${fmt(x1)} ${fmt(y1)} L${head(25)}"/>`;
  };
  const trains = d.trains.map((t) => arrowTo(t.from, Math.min(R - 8, 14 + t.hs * 22), `sc-rose-${t.kind}`)).join('');
  const wind = d.wind ? arrowTo(d.wind.from, Math.min(R - 8, 10 + d.wind.kt * 2), 'sc-rose-wind', true) : '';
  let shore = '';
  if (d.facing !== null) {
    const a0 = polar(cx, cy, R + 4, d.facing - 28), a1 = polar(cx, cy, R + 4, d.facing + 28);
    shore = `<path class="sc-shore" d="M${fmt(a0[0])} ${fmt(a0[1])} A${R + 4} ${R + 4} 0 0 1 ${fmt(a1[0])} ${fmt(a1[1])}"/>`;
  }
  const ticks = [0, 90, 180, 270].map((a, i) => {
    const [x, y] = polar(cx, cy, R + 12, a);
    return `<text class="sc-lbl" x="${fmt(x)}" y="${fmt(y + 3)}" text-anchor="middle">${'NESW'[i]}</text>`;
  }).join('');
  const legend: string[] = d.trains.map((t) => `<tspan class="sc-rose-${t.kind}-t">${o.names[t.kind]} ${t.hs.toFixed(1)}M${t.tp ? ' ' + t.tp.toFixed(0) + 'S' : ''} ${compassName(t.from)}</tspan>`);
  if (d.wind) legend.push(`<tspan class="sc-rose-wind-t">${o.names.wind} ${Math.round(d.wind.kt)}KN ${compassName(d.wind.from)}</tspan>`);
  if (d.facing !== null) legend.push(`<tspan class="sc-rose-shore-t">${o.names.shore} ${compassName(d.facing)}</tspan>`);
  const H = 164 + legend.length * 15;
  const lines = legend.map((l, i) => `<text class="sc-val" x="${cx}" y="${160 + i * 15}" text-anchor="middle" font-size="11">${l}</text>`).join('');
  return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${o.label ?? ''}"><circle class="sc-ring" cx="${cx}" cy="${cy}" r="${R}"/><circle class="sc-ring sc-ring2" cx="${cx}" cy="${cy}" r="${R / 2}"/>${shore}${ticks}${trains}${wind}${lines}</svg>`;
}
