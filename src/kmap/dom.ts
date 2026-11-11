/** Small DOM and canvas helpers for the Kinetic Plus map (PLAN 7.70). */
import type { Mode } from './model';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

let lang: 'en' | 'es' = 'en';
export const setKmLang = (l: 'en' | 'es') => (lang = l);
export const kmLang = () => lang;
/** The text in the active language: the map's own words live beside the code that shows them. */
export const L2 = (en: string, es: string) => (lang === 'es' ? es : en);

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

const COMP = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const COMP_ES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
export const compass = (deg: number) => (lang === 'es' ? COMP_ES : COMP)[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

/** Activity and coral icons: the forecast page's tab set, with a part that moves on the selected tab. */
export const ICON: Record<Mode, string> = {
  fish: '<path class="k-mv" d="M2 12c4-6 11-6 15 0-4 6-11 6-15 0z"/><path d="M17 12l5-4.5v9z"/>',
  surf: '<path class="k-mv" d="M2 17c4 0 5-10 12-10 3.5 0 6 2.3 6 5-2.2-1.6-6-.6-6 2.6 0 1.4 1 2.4 2.4 2.4"/><path d="M2 21h20"/>',
  swim: '<circle class="k-mv" cx="17" cy="6" r="2.2"/><path d="M2 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 20c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/>',
  snorkel: '<path class="k-mv" d="M2 9h13v6.5H10L8.5 13 7 15.5H2z"/><path d="M20 2v13a5 5 0 0 1-5 5h-2"/>',
  dive: '<path class="k-mv" d="M12 2v13M6.5 10l5.5 5.5 5.5-5.5"/><path d="M2 20h20"/>',
  sail: '<path class="k-mv" d="M11 2v15M11 3l8 14h-8z"/><path d="M8 7l-5 10h5"/><path d="M2 21c5 1.5 15 1.5 20 0"/>',
  coral: '<path class="k-mv" d="M12 22V12M12 12L7 7M7 7V3M7 7L3 5M12 12l5-4M17 8V4M17 8l4-1M12 16l-4-2"/>',
};
export const svg = (inner: string, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
export const ARROW = svg('<path d="M9 5l7 7-7 7"/>');
export const BACK = svg('<path d="M15 5l-7 7 7 7"/>');
export const CLOSE = svg('<path d="M4 4l12 12M16 4L4 16"/>', '0 0 20 20');
export const GRIP = '<svg viewBox="0 0 12 16" aria-hidden="true"><rect x="1" y="1" width="3" height="3"/><rect x="8" y="1" width="3" height="3"/><rect x="1" y="6.5" width="3" height="3"/><rect x="8" y="6.5" width="3" height="3"/><rect x="1" y="12" width="3" height="3"/><rect x="8" y="12" width="3" height="3"/></svg>';
export const PLUS = svg('<path d="M12 4v16M4 12h16"/>');
export const LOCK = svg('<rect x="4" y="9" width="12" height="9"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/>', '0 0 20 20');

/** Map mode words. */
export const modeName = (m: Mode) =>
  ({ surf: L2('Surf', 'Surf'), fish: L2('Fish', 'Pesca'), swim: L2('Swim', 'Nadar'), snorkel: L2('Snorkel', 'Snorkel'), dive: L2('Dive', 'Buceo'), sail: L2('Sail', 'Navegar'), coral: L2('Coral', 'Coral') })[m];
/** Rating words on the forecast page's five levels. */
export const levelWord = (l: number | null) => (l === null ? L2('No data', 'Sin datos') : [L2('Very poor', 'Muy malo'), L2('Poor', 'Malo'), L2('Fair', 'Regular'), L2('Good', 'Bueno'), L2('Great', 'Excelente')][l]);

/* ---------- canvas tokens ---------- */
export type RGB = [number, number, number];
export function parseCol(s: string): RGB {
  s = (s || '').trim();
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
}
const tk = new Map<string, RGB>();
/** A token's colour (cached until `resetTokens`, which a scheme change calls). */
export function tok(name: string): RGB {
  let c = tk.get(name);
  if (!c) tk.set(name, (c = parseCol(getComputedStyle(document.documentElement).getPropertyValue(`--${name}`))));
  return c;
}
export const resetTokens = () => tk.clear();
export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const hex = (c: RGB) => `#${c.map((v) => (v | 0).toString(16).padStart(2, '0')).join('')}`;
export const MONO = '"Geist Mono Variable","Geist Mono",ui-monospace,Menlo,monospace';
export const DISP = '"Anybody Variable","Anybody","Arial Narrow",Arial,sans-serif';

/** Size a canvas to its box at the device's pixel ratio (2 at most); returns its context and CSS size, or null when hidden. */
export function fitCanvas(cv: HTMLCanvasElement): { c: CanvasRenderingContext2D; w: number; h: number } | null {
  const r = cv.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const d = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(r.width * d), H = Math.round(r.height * d);
  if (cv.width !== W) cv.width = W;
  if (cv.height !== H) cv.height = H;
  const c = cv.getContext('2d');
  if (!c) return null;
  c.setTransform(d, 0, 0, d, 0, 0);
  return { c, w: r.width, h: r.height };
}
export function hatch(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, gap: number, col: string, lw: number) {
  c.save();
  c.beginPath();
  c.rect(x0, y0, x1 - x0, y1 - y0);
  c.clip();
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.beginPath();
  for (let k = x0 - (y1 - y0); k < x1; k += gap) {
    c.moveTo(k, y1);
    c.lineTo(k + (y1 - y0), y0);
  }
  c.stroke();
  c.restore();
}

export const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
