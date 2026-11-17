/**
 * The FORECAST page's time dock (forecast page rethink, option D, Joseph 2026-11-17): a slim bar pinned to the
 * bottom of the page that moves the whole page through time. Its top line names the hour the page shows and that
 * day's real sunrise and sunset; under it, 24 hour cells in the rating's colours (tap one), and a strip of the
 * week's hours, each a bar as tall as its rating, with each day's best window marked over it (drag along it).
 * Everything above it (the hero, the spot cards, the tiles, the day bars and the chart cursor) follows.
 *
 * The cells and the strip are worked out here, pure and tested (dock.test.ts); page.ts draws and wires them.
 */
import type { Level, TimelineHour } from './model';
import { clamp, MONO, rgba, type Ctx2D, type Tokens, type TokenName } from './kit';

const H = 3.6e6;

export interface DockCell {
  /** The hour's index in the timeline. */
  i: number;
  ms: number;
  level: Level | null;
  /** The sun is up at the middle of the hour. */
  day: boolean;
  /** The hour is over (it cannot be picked). */
  past: boolean;
  /** The hour the page shows. */
  on: boolean;
}

/**
 * The 24 hours in the cell row. On today they start at the present hour (the hours already gone are no use to pick);
 * on a later day they run midnight to midnight, so a whole day reads at once.
 */
export function dockCells(
  tl: readonly TimelineHour[], nowMs: number, showMs: number, dayStartOf: (ms: number) => number,
  beyond?: (ms: number) => { level: Level | null; day: boolean },
): DockCell[] {
  // Past the week (days 8 to 30): that day's hours, read one by one.
  if (beyond && (!tl.length || showMs >= tl[tl.length - 1].ms + H)) {
    const d0 = dayStartOf(showMs);
    return Array.from({ length: 24 }, (_, k) => {
      const ms = d0 + k * H, b = beyond(ms);
      return { i: -1, ms, level: b.level, day: b.day, past: false, on: ms === showMs };
    });
  }
  if (!tl.length) return [];
  const t0 = tl[0].ms;
  const today = dayStartOf(nowMs) === dayStartOf(showMs);
  const start = today ? nowMs : dayStartOf(showMs);
  const first = clamp(Math.round((start - t0) / H), 0, Math.max(0, tl.length - 24));
  const out: DockCell[] = [];
  for (let i = first; i < Math.min(tl.length, first + 24); i++) {
    const h = tl[i];
    const mid = h.ms + H / 2;
    const day = h.sunriseMs != null && h.sunsetMs != null ? mid >= h.sunriseMs && mid < h.sunsetMs : h.day;
    out.push({ i, ms: h.ms, level: h.read.level, day, past: h.ms + H <= nowMs, on: h.ms === showMs });
  }
  return out;
}

/** The week strip's hours: from the present hour to the end of the timeline. */
export function stripRange(tl: readonly TimelineHour[], nowMs: number): [number, number] {
  if (!tl.length) return [0, 0];
  const a = clamp(Math.floor((nowMs - tl[0].ms) / H), 0, tl.length - 1);
  return [a, tl.length];
}

/** The timeline hour under a point along the strip (0..1 across), clamped to the strip. */
export function stripHourAt(f: number, range: [number, number]): number {
  const [a, b] = range;
  if (b <= a) return a;
  return clamp(a + Math.floor(clamp(f, 0, 0.9999) * (b - a)), a, b - 1);
}

const lvTok = (l: Level | null, p: 'lv') => (l === null ? `${p}n` : `${p}${l}`) as TokenName;

/**
 * The week strip: one bar per hour, as tall as its rating, in its level's colour (dim at night); a hairline and the
 * day's initial and date at each midnight; each day's best window as an ink bar along the top; the shown hour as a
 * cursor. Square ends and 1 px lines throughout.
 */
export function drawDockStrip(
  c: Ctx2D, w: number, h: number, tl: readonly TimelineHour[], range: [number, number], showI: number,
  wins: readonly { startMs: number; endMs: number }[], T: Tokens, dayName: (ms: number) => string, dayStartOf: (ms: number) => number,
) {
  c.clearRect(0, 0, w, h);
  const [a, b] = range;
  if (b <= a) return;
  const n = b - a, top = 7, base = h - 12, X = (i: number) => ((i - a) / n) * w, bw = w / n;
  const ink = rgba(T.ink), grid = rgba(T['c-grid2']), ink2 = rgba(T.ink2);
  for (let i = a; i < b; i++) {
    const hr = tl[i];
    // As tall as its rating (five steps, as on the spot cards), so a good stretch stands out at a glance.
    const l = hr.read.level;
    const ht = l === null ? 2 : ((l + 1) / 5) * (base - top);
    c.fillStyle = rgba(T[lvTok(hr.read.level, 'lv')], hr.day ? 1 : 0.38);
    c.fillRect(X(i), base - ht, Math.max(0.8, bw - (bw > 2.5 ? 0.6 : 0)), ht);
  }
  c.font = `600 8px ${MONO}`;
  c.textBaseline = 'alphabetic';
  for (let i = a + 1; i < b; i++) {
    if (dayStartOf(tl[i].ms) === dayStartOf(tl[i - 1].ms)) continue;
    const x = Math.round(X(i)) + 0.5;
    c.fillStyle = grid;
    c.fillRect(x - 0.5, 0, 1, base);
    c.fillStyle = ink2;
    c.textAlign = 'left';
    if (x + 26 < w) c.fillText(dayName(tl[i].ms).toUpperCase(), x + 2, h - 2);
  }
  c.fillStyle = ink;
  for (const win of wins) {
    const x0 = X(a + (win.startMs - tl[a].ms) / H), x1 = X(a + (win.endMs - tl[a].ms) / H);
    if (x1 <= 0 || x0 >= w) continue;
    c.fillRect(Math.max(0, x0), 0, Math.max(3, Math.min(w, x1) - Math.max(0, x0)), 3);
  }
  if (showI >= a && showI < b) {
    const x = Math.round(X(showI) + bw / 2);
    c.fillStyle = ink;
    c.fillRect(x - 1, 0, 2, base + 2);
    c.fillRect(x - 4, base + 1, 8, 2);
  }
  c.fillStyle = grid;
  c.fillRect(0, base, w, 1);
}

/** The cell row as markup: square buttons in the level's colours. */
export function dockCellsHtml(cells: readonly DockCell[], label: (ms: number) => string): string {
  return cells
    .map((d) => {
      const cls = `fc-dk-c ${d.level === null ? 'ln' : `l${d.level}`}${d.day ? '' : ' nt'}${d.past ? ' past' : ''}${d.on ? ' on' : ''}`;
      return `<button type="button" class="${cls}" data-ms="${d.ms}" aria-pressed="${d.on}" aria-label="${label(d.ms)}"${d.past ? ' disabled' : ''}></button>`;
    })
    .join('');
}

/** Four hour marks under the cells (every 6 hours), as the clock reads them. */
export function dockMarks(cells: readonly DockCell[], clock: (ms: number) => string): string[] {
  return [0, 6, 12, 18].map((k) => (cells[k] ? clock(cells[k].ms) : ''));
}
