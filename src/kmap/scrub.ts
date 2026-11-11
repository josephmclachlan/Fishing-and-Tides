/**
 * The time slider drawn as the selected spot's rating over 30 days (mockup G, note 5): solid bars for FORECAST,
 * hatched for LOW CONF, dotted outlines for the OUTLOOK climate average, nights shaded, the best daylight hours of
 * the week marked green as on the forecast page's hour chart. Drag, tap or use the arrow keys.
 */
import { offsetOfX, slots, xOfOffset, ZONES } from './model';
import { clamp, fitCanvas, hatch, L2, MONO, rgba, tok } from './dom';
import type { Level } from '../forecast/model';

export interface ScrubData {
  /** Rating level at each slot start offset (hours from now), null without data. */
  level: (o: number) => Level | null;
  /** Daylight at an offset, for the night shading. */
  isDay: (o: number) => boolean;
  /** Local date parts for an offset. */
  date: (o: number) => { wd: string; n: number; hh: number };
}

export function mountScrub(el: HTMLElement, onSet: (o: number) => void) {
  const cv = document.createElement('canvas');
  el.appendChild(cv);
  let data: ScrubData | null = null;
  let cursor = 0;
  let best = -1;

  const draw = () => {
    const f = fitCanvas(cv);
    if (!f || !data) return;
    const { c, w, h } = f;
    const big = h > 80, hd = big ? 18 : 16, dr = big ? 16 : 14, y0 = hd + dr, bh = h - y0 - 1;
    c.clearRect(0, 0, w, h);
    c.fillStyle = rgba(tok('c-card'));
    c.fillRect(0, 0, w, h);
    // Band header in the chart's green.
    for (const z of ZONES) {
      const x0 = xOfOffset(z.a, w), x1 = xOfOffset(z.b, w);
      c.fillStyle = rgba(tok('c-head'), z.band === 'forecast' ? 1 : z.band === 'lowconf' ? 0.6 : 0.32);
      c.fillRect(x0, 0, x1 - x0, hd);
      if (z.band === 'lowconf') hatch(c, x0, 0, x1, hd, 5, rgba(tok('c-ink2'), 0.35), 1);
      c.fillStyle = rgba(tok('c-ink2'));
      c.font = `600 ${big ? 10 : 9}px ${MONO}`;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      const lab = { forecast: L2('Forecast · 7 d', 'Pronóstico · 7 d'), lowconf: L2('Low conf', 'Baja conf.'), outlook: L2('Outlook', 'Perspectiva') }[z.band];
      if (x1 - x0 > 50) c.fillText(lab.toUpperCase(), x0 + 5, hd / 2 + 0.5);
    }
    // Nights in the forecast week.
    c.fillStyle = rgba(tok('c-night'));
    for (let o = 0; o < 168; o++) if (!data.isDay(o)) c.fillRect(xOfOffset(o, w), y0, xOfOffset(o + 1, w) - xOfOffset(o, w) + 0.5, bh);
    // Bars.
    const levels = new Map<number, Level | null>();
    for (const s of slots()) {
      const l = data.level(s.band === 'outlook' ? s.o + 6 : s.o);
      levels.set(s.o, l);
      const x0 = xOfOffset(s.o, w), x1 = xOfOffset(Math.min(720, s.o + s.w), w);
      if (l === null) {
        c.fillStyle = rgba(tok('lvn'), 0.6);
        c.fillRect(x0, h - 1 - bh * 0.12, x1 - x0, bh * 0.12);
        continue;
      }
      const hh = bh * (0.26 + 0.18 * l), col = tok(`lv${l}`), gap = x1 - x0 > 5 ? 1 : 0;
      if (s.band === 'outlook') {
        c.fillStyle = rgba(col, 0.38);
        c.fillRect(x0 + 1, h - 1 - hh, x1 - x0 - 2, hh);
        c.strokeStyle = rgba(col);
        c.lineWidth = 1.5;
        c.setLineDash([2, 2]);
        c.strokeRect(x0 + 1.75, h - 1 - hh + 0.75, x1 - x0 - 3.5, hh - 1.5);
        c.setLineDash([]);
        continue;
      }
      c.fillStyle = rgba(col, s.band === 'lowconf' ? 0.75 : 1);
      c.fillRect(x0, h - 1 - hh, x1 - x0 - gap, hh);
    }
    hatch(c, xOfOffset(168, w), y0, xOfOffset(384, w), h, 6, rgba(tok('c-card'), 0.55), 1.6);
    // Best daylight hours of the week: the top level seen in daylight, Good or better.
    let top = -1;
    for (let o = 0; o < 168; o++) if (data.isDay(o)) top = Math.max(top, levels.get(o) ?? -1);
    best = -1;
    c.fillStyle = rgba(tok('c-win'));
    if (top >= 3)
      for (let o = 0; o < 168; o++)
        if (data.isDay(o) && levels.get(o) === top) {
          c.fillRect(xOfOffset(o, w), y0, xOfOffset(o + 1, w) - xOfOffset(o, w) + 0.4, 3);
          if (best < 0 && o >= cursor - 0) best = o;
        }
    if (best < 0 && top >= 3) for (let o = 0; o < 168; o++) if (data.isDay(o) && levels.get(o) === top) { best = o; break; }
    // Day ticks at local midnight.
    c.font = `600 ${big ? 10 : 9}px ${MONO}`;
    c.textBaseline = 'middle';
    const pxDay = xOfOffset(24, w) - xOfOffset(0, w);
    for (let o = 0; o < 720; o++) {
      const d = data.date(o);
      if (d.hh !== 0) continue;
      const x = xOfOffset(o, w), fc = o < 168, lc = o < 384;
      c.fillStyle = rgba(tok('ink'), fc ? 0.55 : 0.3);
      c.fillRect(x, y0, 1, bh);
      const show = fc || (lc ? d.n % 3 === 0 : d.n % 7 === 0);
      if (!show || x > w - 22 || x < 4) continue;
      c.fillStyle = rgba(tok('ink'));
      c.fillText(fc && pxDay > 44 ? `${d.wd} ${d.n}`.toUpperCase() : String(d.n), x + 3, hd + dr / 2 + 0.5);
    }
    c.fillStyle = rgba(tok('ink'));
    for (const o of [168, 384]) c.fillRect(xOfOffset(o, w) - 0.5, 0, 1.5, h);
    c.strokeStyle = rgba(tok('c-grid2'));
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, w - 1, h - 1);
    // Cursor.
    const cx = xOfOffset(cursor, w);
    c.fillStyle = rgba(tok('ink'));
    c.fillRect(cx - 1, hd, 2, h - hd);
    c.fillRect(cx - 6, hd - 2, 12, 5);
  };

  let dragging = false;
  const fromX = (clientX: number) => {
    const r = el.getBoundingClientRect();
    onSet(offsetOfX(clamp(clientX - r.left, 0, r.width), r.width));
  };
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    fromX(e.clientX);
  });
  el.addEventListener('pointermove', (e) => dragging && fromX(e.clientX));
  const up = () => (dragging = false);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  new ResizeObserver(() => draw()).observe(el);

  return {
    set(d: ScrubData, o: number) {
      data = d;
      cursor = o;
      draw();
    },
    cursor(o: number) {
      cursor = o;
      draw();
    },
    best: () => best,
    draw,
  };
}
