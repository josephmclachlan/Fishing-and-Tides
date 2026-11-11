/**
 * Drifting rain and sargassum (PLAN 7.86, the motion pass; mockup G's moving weather and weed, from real data), on one
 * 2-D canvas over the map, animated without redrawing the map (layers/flow.ts says why).
 *
 * - **Rain**: the satellite rain field for the slider's time in soft blue bands (`--r-rain0..4`, light to very heavy),
 *   drifting along the motion measured between the last scans (rain/nowcast.ts). Two copies half a loop apart cross-fade,
 *   so it flows on with no jump: each slides ahead RAIN_AHEAD_MIN minutes of the measured motion and fades out as the other
 *   fades in. No measured motion (or under 3 km/h): it holds still.
 * - **Sargassum**: each mat the forecast drifted (layers/sargassum.ts; the current plus 2 % of the wind) drawn as a little
 *   clump of weed riding its own track from the slider's time SARG_AHEAD_H hours on, in two cross-fading copies the same way.
 *
 * Reduced motion: both hold still at the slider's time.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import { sizeOf } from '../layout-size';
import { bandOf } from './bands';
import { trackAt } from './sargassum';

/** Minutes of measured rain motion each copy slides through, and the seconds that takes on screen. */
export const RAIN_AHEAD_MIN = 40;
const RAIN_LOOP_S = 5;
/** Hours of forecast drift each sargassum copy rides, and the seconds that takes on screen. */
export const SARG_AHEAD_H = 18;
const SARG_LOOP_S = 7;
/** A drawn mat's size, m, and its fronds. */
const MAT_M = 900;
const FRONDS = 9;
/** Drawn from this zoom. */
const MIN_ZOOM = 7;
/** Rain rate band edges, mm/h: under the first is dry; then light, moderate, heavy, very heavy, violent (`--r-rain0..4`). */
export const RAIN_STEPS = [0.5, 2.5, 5, 10, 20] as const;
/** Upsampling of the 2 km rain grid, so the bands have smooth edges: about a band pixel per 2 screen px, in powers of two. */
const RAIN_UP = 4;
const RAIN_UP_MAX = 128;
/** The banded image is kept under this many pixels (memory on a phone). */
const RAIN_MAX_PX = 4e6;
/** The upsampling for a rain cell `cellPx` screen pixels wide. Pure. */
export function rainUp(cellPx: number, cells: number): number {
  let up = RAIN_UP;
  while (up < RAIN_UP_MAX && cellPx / up > 1.5 && cells * (up * 2) ** 2 <= RAIN_MAX_PX) up *= 2;
  return up;
}

type Rgb = [number, number, number];
const cssRgb = (name: string, fallback: Rgb): Rgb => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fallback;
};

/** A rain grid as the nowcast keeps it: `nx` × `ny` cells of `step` degrees from the (west, north) corner. */
export interface RainField {
  west: number;
  north: number;
  step: number;
  nx: number;
  ny: number;
  rate: ArrayLike<number>;
}

/** The cells of the rain grid painted: columns c0 .. c0 + cw, rows r0 .. r0 + rh. */
export interface RainWindow {
  c0: number;
  r0: number;
  cw: number;
  rh: number;
}
/** Cells painted beyond the view on each side: the measured drift's reach over RAIN_AHEAD_MIN plus two, so a drifting copy
 * (and a short pan) stays covered. */
const RAIN_MARGIN_MIN = 2;

/**
 * The rain field as banded pixels, `up` per cell, blended between cell centres so the band edges are smooth; with a
 * fine darker rim along each band edge. RGBA bytes; alpha 0 where dry. Pure (exported for tests).
 */
export function rainBands(f: RainField, colours: readonly Rgb[], rim: Rgb, up = RAIN_UP, win: RainWindow = { c0: 0, r0: 0, cw: f.nx, rh: f.ny }): { w: number; h: number; data: Uint8ClampedArray<ArrayBuffer> } {
  const w = win.cw * up, h = win.rh * up;
  const band = new Int8Array(w * h);
  const at = (c: number, r: number) => f.rate[Math.min(f.ny - 1, Math.max(0, r)) * f.nx + Math.min(f.nx - 1, Math.max(0, c))] || 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fx = win.c0 + (x + 0.5) / up - 0.5, fy = win.r0 + (y + 0.5) / up - 0.5;
      const c = Math.floor(fx), r = Math.floor(fy), tx = fx - c, ty = fy - r;
      const v = (at(c, r) * (1 - tx) + at(c + 1, r) * tx) * (1 - ty) + (at(c, r + 1) * (1 - tx) + at(c + 1, r + 1) * tx) * ty;
      band[y * w + x] = v >= RAIN_STEPS[0] ? bandOf(RAIN_STEPS, v) - 1 : -1;
    }
  const data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x, b = band[k];
      if (b < 0) continue;
      const edge = (x > 0 && band[k - 1] < b) || (x < w - 1 && band[k + 1] < b) || (y > 0 && band[k - w] < b) || (y < h - 1 && band[k + w] < b);
      const col = edge ? rim : colours[Math.min(colours.length - 1, b)];
      // Light rain is a soft wash; heavier bands are more solid.
      data.set([col[0], col[1], col[2], edge ? 200 : Math.round(255 * Math.min(0.78, 0.42 + 0.09 * b))], k * 4);
    }
  return { w, h, data };
}

/** Cross-fade weight of two copies half a loop apart at phase `p` (0..1): each fades in, holds, fades out. Pure. */
export const loopWeight = (p: number) => Math.sin(Math.PI * (((p % 1) + 1) % 1));

type Track = { path: [number, number, number][] };

export interface DriftMotion {
  setRain(f: RainField | null, motion: { eastKmh: number; northKmh: number; speedKmh: number } | null): void;
  setSargassum(tracks: readonly Track[], ms: number): void;
  setVisible(kind: 'rain' | 'sargassum', on: boolean): void;
}

export function mountDriftMotion(map: MapLibreMap): DriftMotion | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'flow-canvas motion-drift';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const container = map.getContainer();
  const swell = container.querySelector('.motion-swell');
  (swell ?? container.querySelector('.maplibregl-canvas-container'))?.after(canvas);

  const show = { rain: false, sargassum: false };
  let rain: { img: HTMLCanvasElement; f: RainField; up: number; win: RainWindow; motion: { eastKmh: number; northKmh: number } | null } | null = null;
  let rainSrc: RainField | null = null;
  let rainMotion: { eastKmh: number; northKmh: number; speedKmh: number } | null = null;
  let tracks: readonly Track[] = [];
  let sargMs = 0;
  let sargCol = 'rgb(140,106,18)';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const covered = () => document.body.classList.contains('fc-open');

  /** The cells in view (plus a margin) and the upsampling for the current zoom: zoomed in, only what shows, sharper. */
  const wanted = (f: RainField): { win: RainWindow; up: number } | null => {
    const { w, h } = sizeOf(container);
    const nw = map.unproject([0, 0]), se = map.unproject([w, h]);
    const reachKm = rainMotion && rainMotion.speedKmh >= 3 ? (rainMotion.speedKmh * RAIN_AHEAD_MIN) / 60 : 0;
    const m = RAIN_MARGIN_MIN + Math.ceil(reachKm / (f.step * 111.32));
    const c0 = Math.max(0, Math.floor((nw.lng - f.west) / f.step) - m), c1 = Math.min(f.nx, Math.ceil((se.lng - f.west) / f.step) + m);
    const r0 = Math.max(0, Math.floor((f.north - nw.lat) / f.step) - m), r1 = Math.min(f.ny, Math.ceil((f.north - se.lat) / f.step) + m);
    if (c1 <= c0 || r1 <= r0) return null;
    const win = { c0, r0, cw: c1 - c0, rh: r1 - r0 };
    const a = map.project([f.west, f.north]), b = map.project([f.west + f.step, f.north]);
    return { win, up: rainUp(Math.abs(b.x - a.x), win.cw * win.rh) };
  };
  /** The painted rain no longer covers the view, or is too coarse or fine for the zoom. */
  const stale = () => {
    if (!rain || !rainSrc) return !!rainSrc;
    const want = wanted(rainSrc);
    if (!want) return false;
    const a = rain.win, b = want.win;
    const inside = b.c0 >= a.c0 && b.r0 >= a.r0 && b.c0 + b.cw <= a.c0 + a.cw && b.r0 + b.rh <= a.r0 + a.rh;
    return want.up !== rain.up || (!inside && (a.cw < rainSrc.nx || a.rh < rainSrc.ny));
  };
  const paintRain = () => {
    if (!rainSrc) return void (rain = null);
    const want = wanted(rainSrc);
    if (!want) return void (rain = null);
    const { up, win } = want;
    const colours = [0, 1, 2, 3, 4].map((k) => cssRgb(`--r-rain${k}`, [[185, 215, 255], [107, 170, 247], [10, 102, 224], [67, 56, 214], [212, 23, 107]][k] as Rgb));
    const rim = cssRgb('--r-rain3', [67, 56, 214]);
    const b = rainBands(rainSrc, colours, rim, up, win);
    const img = document.createElement('canvas');
    img.width = b.w;
    img.height = b.h;
    img.getContext('2d')!.putImageData(new ImageData(b.data, b.w, b.h), 0, 0);
    rain = { img, f: rainSrc, up, win, motion: rainMotion && rainMotion.speedKmh >= 3 ? rainMotion : null };
  };
  const readColours = () => {
    const c = cssRgb('--m-sarg', [140, 106, 18]);
    sargCol = `rgb(${c[0]},${c[1]},${c[2]})`;
    paintRain();
  };
  readColours();
  new MutationObserver(() => (readColours(), draw())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-theme'] });

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = sizeOf(container);
    const w = Math.round(s.w * dpr), h = Math.round(s.h * dpr);
    if (canvas.width !== w || canvas.height !== h) (canvas.width = w), (canvas.height = h);
    return dpr;
  };

  const drawRain = (now: number) => {
    if (!rain) return;
    const { f, img, motion, win } = rain;
    const copy = (aheadMin: number, alpha: number) => {
      if (alpha <= 0.01) return;
      const kmE = motion ? (motion.eastKmh * aheadMin) / 60 : 0, kmN = motion ? (motion.northKmh * aheadMin) / 60 : 0;
      const dLat = kmN / 111.32, dLng = kmE / (111.32 * Math.cos((f.north * Math.PI) / 180));
      const west = f.west + win.c0 * f.step + dLng, north = f.north - win.r0 * f.step + dLat;
      const a = map.project([west, north]), b = map.project([west + win.cw * f.step, north - win.rh * f.step]);
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, a.x, a.y, b.x - a.x, b.y - a.y);
    };
    if (!motion || reduced?.matches) return copy(0, 1);
    const p = now / 1000 / RAIN_LOOP_S;
    for (const off of [0, 0.5]) {
      const q = (p + off) % 1;
      copy(q * RAIN_AHEAD_MIN, loopWeight(q));
    }
    ctx.globalAlpha = 1;
  };

  const drawSargassum = (now: number) => {
    if (!tracks.length) return;
    const z = map.getZoom();
    // A mat is a clump of weed about MAT_M across (never under 9 px, so it reads zoomed out), each frond a short curl.
    const mPerPx = (40075016.686 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / (512 * 2 ** z);
    const spread = Math.max(9, Math.min(30, MAT_M / mPerPx));
    const len = Math.max(3, Math.min(7, spread / 3));
    ctx.strokeStyle = sargCol;
    ctx.lineCap = 'round';
    ctx.lineWidth = z >= 11 ? 2.2 : 1.6;
    const still = reduced?.matches;
    const copies: [number, number][] = still ? [[0, 1]] : [0, 0.5].map((off) => {
      const q = (now / 1000 / SARG_LOOP_S + off) % 1;
      return [q * SARG_AHEAD_H * 3.6e6, loopWeight(q)];
    });
    const W = canvas.width, H = canvas.height;
    tracks.forEach((tr, i) => {
      for (const [ahead, alpha] of copies) {
        if (alpha <= 0.02) continue;
        const p = trackAt(tr.path, sargMs + ahead);
        const q = p && trackAt(tr.path, sargMs + ahead + 3.6e6);
        if (!p || !q) continue;
        const s = map.project(p);
        if (s.x < -20 || s.y < -20 || s.x > W + 20 || s.y > H + 20) continue;
        const e = map.project(q);
        // Weed lies along its drift, with a slow sway.
        const base = Math.atan2(e.y - s.y, e.x - s.x) || 0;
        ctx.globalAlpha = 0.9 * alpha;
        for (let k = 0; k < FRONDS; k++) {
          const h1 = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453, h2 = Math.sin(i * 39.346 + k * 11.135) * 24634.6345;
          // Spread along the drift more than across it, as wind rows of weed lie.
          const a1 = (h1 - Math.floor(h1) - 0.5) * spread, a2 = (h2 - Math.floor(h2) - 0.5) * spread * 0.5;
          const jx = Math.cos(base) * a1 - Math.sin(base) * a2, jy = Math.sin(base) * a1 + Math.cos(base) * a2;
          const an = base + (h1 - Math.floor(h1) - 0.5) * 0.9 + (still ? 0 : Math.sin(now / 2500 + i + k) * 0.2);
          const cx = s.x + jx, cy = s.y + jy, dx = Math.cos(an) * len, dy = Math.sin(an) * len;
          ctx.beginPath();
          ctx.moveTo(cx - dx, cy - dy);
          ctx.quadraticCurveTo(cx - dy * 0.35, cy + dx * 0.35, cx + dx, cy + dy);
          ctx.stroke();
        }
      }
    });
    ctx.globalAlpha = 1;
  };

  const draw = (now = performance.now()) => {
    const dpr = resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (map.getZoom() < MIN_ZOOM) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (show.rain) drawRain(now);
    if (show.sargassum) drawSargassum(now);
  };

  let raf = 0;
  const moving = () => !reduced?.matches && !covered() && map.getZoom() >= MIN_ZOOM && ((show.rain && !!rain?.motion) || (show.sargassum && tracks.length > 0));
  const frame = (now: number) => {
    raf = 0;
    if (!moving()) return void draw(now);
    raf = requestAnimationFrame(frame);
    draw(now);
  };
  const kick = () => {
    if (moving()) {
      if (!raf) raf = requestAnimationFrame(frame);
    } else draw();
  };
  new MutationObserver(kick).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reduced?.addEventListener?.('change', kick);
  map.on('render', () => (show.rain || show.sargassum) && draw());
  map.on('moveend', () => {
    // Sharper (or lighter) rain bands for the new zoom, or the part of the rain now in view.
    if (show.rain && stale()) paintRain();
    kick();
  });

  return {
    setRain(f, m) {
      rainSrc = f;
      rainMotion = m;
      paintRain();
      kick();
    },
    setSargassum(t, ms) {
      tracks = t;
      sargMs = ms;
      kick();
    },
    setVisible(kind, on) {
      show[kind] = on;
      kick();
    },
  };
}
