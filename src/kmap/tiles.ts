/**
 * Readings under the crosshair (mockup G, note 4): only the layers on the map are read, plus tide and UV always.
 * On a phone they are the forecast chart's ink readout bar over the map; on a desktop, equal tiles each with a small
 * picture drawn from the value (a wind arrow over streaks, the swell trains as a rose, the tide's day as a curve...).
 * Every tile opens its plain-words explainer.
 */
import { D2R, esc, fitCanvas, MONO, rgba, TAU, tok } from './dom';

export interface Reading {
  k: string;
  /** Label, value, unit and a short line under it. */
  l: string;
  v: string;
  u: string;
  s: string;
  /** Source caption on the tile. */
  src?: string;
  /** Explainer id (src/explain.ts HELP ids). */
  help?: string;
  /** Direction for arrows and roses: FROM for wind and swell, TOWARD for current. */
  deg?: number;
  /** The value as a number, for bars. */
  val?: number;
  /** Swell trains for the rose: height m, period s, from deg. */
  trains?: { hs: number; tp: number; deg: number }[];
  /** The day's tide curve, m, hourly from local midnight, and where now is (hours). */
  curve?: number[];
  at?: number;
  /** Rating level for a coloured cell (0..4). */
  lv?: number | null;
}

export const barHTML = (R: readonly Reading[]) =>
  R.map((r) => `<span class="k-rc${r.lv !== undefined && r.lv !== null ? ` k-here k-lv${r.lv}` : ''}" data-k="${r.k}"><span>${esc(r.l)}</span><b>${esc(r.v)}<small>${esc(r.u)}</small></b></span>`).join('');

export const tileHTML = (r: Reading) =>
  `<button type="button" class="k-tile" data-k="${r.k}"${r.help ? ` data-help="${r.help}"` : ''}><span class="k-tt k-mono"><span>${esc(r.l)}</span><span class="k-src">${esc(r.src ?? '')}</span></span><canvas aria-hidden="true"></canvas><span class="k-tv">${esc(r.v)}<small>${esc(r.u)}</small></span><span class="k-ts">${esc(r.s)}</span></button>`;

export function drawTiles(el: HTMLElement, R: readonly Reading[], accent: string) {
  el.querySelectorAll<HTMLElement>('.k-tile').forEach((tl, i) => {
    const r = R[i];
    const cv = tl.querySelector('canvas');
    const f = r && cv ? fitCanvas(cv) : null;
    if (!f) return;
    const { c, w, h } = f;
    c.clearRect(0, 0, w, h);
    const I = rgba(tok('ink')), A = rgba(tok(accent));
    c.lineCap = 'round';
    const arrow = (deg: number, col: string) => {
      // Points the way it moves: deg is the heading.
      const a = deg * D2R, cx = w / 2, cy = h / 2, L = Math.min(w, h) * 0.36, ux = Math.sin(a), uy = -Math.cos(a);
      c.strokeStyle = rgba(tok('ink'), 0.22);
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx, cy, L + 6, 0, TAU);
      c.stroke();
      c.strokeStyle = col;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(cx - ux * L, cy - uy * L);
      c.lineTo(cx + ux * L, cy + uy * L);
      c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(cx + ux * (L + 4), cy + uy * (L + 4));
      c.lineTo(cx + ux * (L - 8) - uy * 6, cy + uy * (L - 8) + ux * 6);
      c.lineTo(cx + ux * (L - 8) + uy * 6, cy + uy * (L - 8) - ux * 6);
      c.closePath();
      c.fill();
      c.fillStyle = rgba(tok('ink2'));
      c.font = `700 8.5px ${MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('N', cx, cy - L - 6);
    };
    const ramp = (cols: string[], v: number) => {
      const n = cols.length, gw = (w - (n - 1) * 2) / n;
      cols.forEach((col, k) => {
        const hh = h * (0.3 + (0.55 * k) / (n - 1));
        c.fillStyle = rgba(tok(col), k / n <= v ? 1 : 0.22);
        c.fillRect(k * (gw + 2), h - hh, gw, hh);
      });
    };
    switch (r.k) {
      case 'wind': {
        const a = ((r.deg ?? 0) + 180) * D2R;
        c.strokeStyle = rgba(tok('ink'), 0.22);
        c.lineWidth = 1.2;
        for (let k = 0; k < 18; k++) {
          const yy = (((k * 37) % 100) / 100) * h, xx = (((k * 53) % 100) / 100) * w;
          c.beginPath();
          c.moveTo(xx, yy);
          c.lineTo(xx + Math.sin(a) * 10, yy - Math.cos(a) * 10);
          c.stroke();
        }
        arrow((r.deg ?? 0) + 180, I);
        break;
      }
      case 'current':
        arrow(r.deg ?? 0, rgba(tok('t-snorkel')));
        break;
      case 'swell': {
        const cx = h / 2, cy = h / 2, R0 = h * 0.45;
        c.strokeStyle = rgba(tok('ink'), 0.3);
        c.lineWidth = 1;
        for (const k of [0.5, 1]) {
          c.beginPath();
          c.arc(cx, cy, R0 * k, 0, TAU);
          c.stroke();
        }
        const trains = r.trains?.length ? r.trains : r.deg !== undefined ? [{ hs: 1, tp: 0, deg: r.deg }] : [];
        const top = Math.max(0.1, ...trains.map((t) => t.hs));
        trains
          .slice()
          .reverse()
          .forEach((t, k, all) => {
            const lead = k === all.length - 1, L = R0 * (0.35 + 0.6 * (t.hs / top)), a = t.deg * D2R;
            const vx = Math.sin(a), vy = -Math.cos(a), qx = -vy, qy = vx, wd = L * 0.32;
            c.globalAlpha = lead ? 1 : 0.5;
            c.fillStyle = lead ? rgba(tok('t-surf')) : rgba(tok('ink2'));
            c.beginPath();
            c.moveTo(cx, cy);
            c.lineTo(cx + vx * L * 0.45 + qx * wd, cy + vy * L * 0.45 + qy * wd);
            c.lineTo(cx + vx * L, cy + vy * L);
            c.lineTo(cx + vx * L * 0.45 - qx * wd, cy + vy * L * 0.45 - qy * wd);
            c.closePath();
            c.fill();
            c.globalAlpha = 1;
          });
        c.fillStyle = I;
        c.font = `700 8.5px ${MONO}`;
        c.textAlign = 'center';
        c.fillText('N', cx, 6);
        c.textAlign = 'left';
        c.fillStyle = rgba(tok('ink2'));
        c.font = `600 9px ${MONO}`;
        (r.trains ?? []).slice(0, 3).forEach((t, k) => c.fillText(`${t.hs.toFixed(1)} m ${Math.round(t.tp)} s`, h + 4, h * 0.3 + k * 13));
        break;
      }
      case 'sst':
        ramp(['r-sst0', 'r-sst1', 'r-sst2', 'r-sst3', 'r-sst4', 'r-sst5'], ((r.val ?? 27) - 26.5) / 3.5);
        break;
      case 'clarity':
        ramp(['r-vis0', 'r-vis1', 'r-vis2', 'r-vis3', 'r-vis4', 'r-vis5'], (r.val ?? 0) / 22);
        break;
      case 'uv':
        ramp(['uv0', 'uv1', 'uv2', 'uv3', 'uv4'], (r.val ?? 0) / 11);
        break;
      case 'heat':
        ramp(['lv4', 'lv3', 'lv2', 'lv1', 'lv0'], (r.val ?? 0) / 12);
        break;
      case 'depth': {
        const d = Math.min(1, Math.sqrt((r.val ?? 0) / 200));
        c.fillStyle = rgba(tok('m-sea-b'), 0.55);
        c.beginPath();
        c.moveTo(0, h * 0.12);
        for (let x = 0; x <= w; x += 4) c.lineTo(x, h * (0.18 + 0.7 * d * Math.pow(x / w, 0.6)) + Math.sin(x * 0.2) * 1.5);
        c.lineTo(w, h);
        c.lineTo(0, h);
        c.closePath();
        c.fill();
        c.strokeStyle = I;
        c.lineWidth = 1.5;
        c.setLineDash([3, 3]);
        c.beginPath();
        c.moveTo(0, h * 0.12);
        c.lineTo(w, h * 0.12);
        c.stroke();
        c.setLineDash([]);
        break;
      }
      case 'tide': {
        const cv = r.curve ?? [];
        if (cv.length < 2) break;
        const lo = Math.min(...cv), hi = Math.max(...cv), sp = Math.max(0.05, hi - lo);
        const hx = (q: number) => 2 + (q / (cv.length - 1)) * (w - 4), hy = (v: number) => h * 0.85 - ((v - lo) / sp) * h * 0.7;
        c.fillStyle = rgba(tok('t-surf'), 0.16);
        c.beginPath();
        c.moveTo(hx(0), h);
        cv.forEach((v, q) => c.lineTo(hx(q), hy(v)));
        c.lineTo(hx(cv.length - 1), h);
        c.fill();
        c.strokeStyle = I;
        c.lineWidth = 2;
        c.beginPath();
        cv.forEach((v, q) => (q ? c.lineTo(hx(q), hy(v)) : c.moveTo(hx(q), hy(v))));
        c.stroke();
        const at = r.at ?? 0, i = Math.min(cv.length - 2, Math.floor(at)), fr = at - i;
        c.fillStyle = A;
        c.beginPath();
        c.arc(hx(at), hy(cv[i] + (cv[i + 1] - cv[i]) * fr), 4.5, 0, TAU);
        c.fill();
        break;
      }
      case 'rain': {
        c.strokeStyle = rgba(tok('r-rain2'));
        c.lineWidth = 1.6;
        const n = Math.round(4 + Math.min(40, (r.val ?? 0) * 4));
        for (let k = 0; k < n; k++) {
          const x = ((k * 0.618) % 1) * w, y = ((k * 0.37) % 1) * (h - 10);
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x - 3, y + 9);
          c.stroke();
        }
        break;
      }
      case 'lightning': {
        const km = r.val ?? 99, n = km < 10 ? 3 : km < 30 ? 2 : 1;
        c.fillStyle = rgba(tok('m-bolt'));
        for (let k = 0; k < n; k++) {
          const x = w * (0.25 + k * 0.25), s = h * 0.32;
          c.beginPath();
          c.moveTo(x, h * 0.1);
          c.lineTo(x - s * 0.35, h * 0.1 + s * 1.05);
          c.lineTo(x + s * 0.05, h * 0.1 + s * 1.05);
          c.lineTo(x - s * 0.2, h * 0.1 + s * 2);
          c.lineTo(x + s * 0.45, h * 0.1 + s * 0.8);
          c.lineTo(x + s * 0.05, h * 0.1 + s * 0.8);
          c.closePath();
          c.fill();
        }
        break;
      }
      case 'rip':
      case 'bite':
      case 'sarg':
      default: {
        const lv = r.lv ?? null;
        const n = 10, filled = lv === null ? 0 : Math.round(((lv + 1) / 5) * n), gw = (w - (n - 1) * 3) / n;
        for (let k = 0; k < n; k++) {
          c.fillStyle = k < filled ? rgba(tok(lv === null ? 'lvn' : `lv${lv}`)) : rgba(tok('ink'), 0.1);
          c.fillRect(k * (gw + 3), h * 0.55, gw, h * 0.3);
        }
      }
    }
  });
}
