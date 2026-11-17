/**
 * Canvas kit for the FORECAST and CORAL pages (PLAN 7.69, the Kinetic Plus redesign): theme tokens read from
 * the page's CSS variables, colour strings, mono captions, hatching and a few shared marks. The drawings in
 * art.ts, tiles.ts and charts.ts paint with these, so light and dark mode restyle every canvas from one place.
 * Small and DOM-light: only `readTokens` touches the document.
 */
export type RGB = readonly [number, number, number];
export type Ctx2D = CanvasRenderingContext2D;

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const sq = (v: number) => v * v;
export const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/** The page's fonts (self-hosted, src/forecast/fonts.ts). Canvas text uses the mono and display faces. */
export const MONO = '"Geist Mono Variable", ui-monospace, Menlo, monospace';
export const DISP = '"Anybody Variable", "Arial Narrow", Arial, sans-serif';

/** Every token the canvases read, without the `--fc-` prefix. */
export const TOKEN_NAMES = [
  'ink', 'ink2', 'bg', 'block', 'line', 'card', 'sand', 'moon',
  'lv0', 'lv1', 'lv2', 'lv3', 'lv4', 'on0', 'on1', 'on2', 'on3', 'on4', 'ac0', 'ac1', 'ac2', 'ac3', 'ac4', 'lvn', 'onn', 'acn',
  'uv0', 'uv1', 'uv2', 'uv3', 'uv4',
  'c-card', 'c-head', 'c-night', 'c-grid', 'c-grid2', 'c-acc', 'c-bar', 'c-ink2', 'c-warm', 'c-win', 'c-sun',
  'map-ring', 'map-sea', 'map-ink',
] as const;
export type TokenName = (typeof TOKEN_NAMES)[number];
export type Tokens = Record<TokenName, RGB>;

/** "#0a1626", "#abc" or "rgb(1, 2, 3)" → [r, g, b]. */
export function parseCol(s: string): RGB {
  const v = s.trim();
  if (v[0] === '#') {
    let h = v.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0];
  }
  const m = v.match(/[\d.]+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
}

/** Read the `--fc-*` tokens off an element (the page root, whose data-scheme picks light or dark). */
export function readTokens(el: Element): Tokens {
  const cs = getComputedStyle(el);
  const out = {} as Record<TokenName, RGB>;
  for (const n of TOKEN_NAMES) out[n] = parseCol(cs.getPropertyValue(`--fc-${n}`) || '#000');
  return out;
}

export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** A caption in the mono face, caps, at `size` px (scaled a touch, as the HTML labels are). */
export function txt(c: Ctx2D, s: string, x: number, y: number, align: CanvasTextAlign = 'left', size = 11, wgt = 600) {
  c.font = `${wgt} ${(size * 1.12).toFixed(1)}px ${MONO}`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(s.toUpperCase(), x, y);
}

/** Horizontal line fill under a profile: `hAt(x)` gives the profile's y; rows every `gap` px from `bot` up to `top`. */
export function hatch(c: Ctx2D, x0: number, x1: number, top: number, bot: number, hAt: (x: number) => number, gap: number, col: string) {
  c.strokeStyle = col;
  c.lineWidth = 1.2;
  c.beginPath();
  const step = 2;
  for (let yy = bot; yy >= top; yy -= gap) {
    let on = false, sx = 0;
    for (let xx = x0; xx <= x1; xx += step) {
      const inside = yy >= hAt(xx);
      if (inside && !on) (on = true), (sx = xx);
      if ((!inside || xx + step > x1) && on) {
        on = false;
        c.moveTo(sx, yy);
        c.lineTo(xx, yy);
      }
    }
  }
  c.stroke();
}

/** A solid arrowhead at (x, y) pointing `toward` degrees (0 up, clockwise), `s` px long. */
export function arrow(c: Ctx2D, x: number, y: number, toward: number, s: number, col: string) {
  c.save();
  c.translate(x, y);
  c.rotate(toward * D2R);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(0, -s);
  c.lineTo(s * 0.62, s * 0.55);
  c.lineTo(0, s * 0.22);
  c.lineTo(-s * 0.62, s * 0.55);
  c.closePath();
  c.fill();
  c.restore();
}

/** The lit part of a moon of illuminated fraction `f` (0..1), lit on the right while waxing. */
export function moonPath(c: Ctx2D, cx: number, cy: number, R: number, f: number, waxing: boolean) {
  const rx = R * Math.abs(2 * f - 1);
  c.beginPath();
  c.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, !waxing);
  // A gibbous moon's terminator bulges into the dark half, a crescent's into the lit half.
  const ccw = f >= 0.5 ? !waxing : waxing;
  c.ellipse(cx, cy, rx, R, 0, Math.PI / 2, -Math.PI / 2, ccw);
  c.closePath();
}

/** Short travelling streaks across a w × h box, heading `toward` degrees at `speed` px/s (wind, current). */
export function stream(c: Ctx2D, w: number, h: number, t: number, toward: number, speed: number, col: string, n: number) {
  const d = toward * D2R, dx = Math.sin(d), dy = -Math.cos(d), nx = -dy, ny = dx, L = Math.hypot(w, h), cx = w / 2, cy = h / 2;
  c.strokeStyle = col;
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const lane = (((i * 0.618034) % 1) - 0.5) * L, sp = speed * (0.7 + 0.6 * ((i * 0.37) % 1));
    const u = ((t * sp + i * 97.3) % L) - L / 2, len = 6 + speed * 0.25;
    const x = cx + dx * u + nx * lane, y = cy + dy * u + ny * lane;
    if (x < -len || x > w + len || y < -len || y > h + len) continue;
    const fade = 1 - Math.abs(u) / (L / 2);
    c.globalAlpha = Math.min(1, fade * 1.6);
    c.lineWidth = 1.6 + ((i * 0.53) % 1) * 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - dx * len, y - dy * len);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.lineCap = 'butt';
}

/** A round-capped stroke from (x1, y1) to (x2, y2). */
export function capsule(c: Ctx2D, x1: number, y1: number, x2: number, y2: number, wd: number) {
  c.lineCap = 'round';
  c.lineWidth = wd;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
  c.lineCap = 'butt';
}

/** Size a canvas to its CSS box at the device ratio (capped); returns its CSS size. */
export function fitCanvas(cv: HTMLCanvasElement, maxDpr = 2): { w: number; h: number } {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== W) cv.width = W;
  if (cv.height !== H) cv.height = H;
  cv.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: r.width, h: r.height };
}

/**
 * A label as a hard-edged block (the Kinetic look: square, no rounding): `fill` behind, the caps text knocked out in
 * `ink`. Anchored at (x, y) by `align` (left edge, centre or right edge; y is the middle). Returns the box it drew.
 */
export function tag(c: Ctx2D, s: string, x: number, y: number, align: CanvasTextAlign, size: number, fill: string, ink: string, outline = false, maxW = Infinity): { x: number; y: number; w: number; h: number } {
  c.font = `800 ${(size * 1.12).toFixed(1)}px ${MONO}`;
  // Longer words (Spanish) shrink to fit their room rather than run off the picture, down to 70%.
  const full = c.measureText(s.toUpperCase()).width + Math.round(size * 0.6) * 2;
  if (full > maxW) { size *= Math.max(0.7, maxW / full); c.font = `800 ${(size * 1.12).toFixed(1)}px ${MONO}`; }
  const tw = c.measureText(s.toUpperCase()).width, px = Math.round(size * 0.6), h = Math.round(size * 1.9);
  const w = Math.round(tw + px * 2), x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x), y0 = Math.round(y - h / 2);
  if (outline) {
    c.strokeStyle = fill; c.lineWidth = 1.5; c.lineJoin = 'miter'; c.strokeRect(x0 + 0.75, y0 + 0.75, w - 1.5, h - 1.5);
  } else { c.fillStyle = fill; c.fillRect(x0, y0, w, h); }
  c.fillStyle = outline ? fill : ink; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText(s.toUpperCase(), x0 + px, y0 + h / 2 + 0.5);
  return { x: x0, y: y0, w, h };
}

/** A hard chevron (two square-ended strokes meeting in a mitre) at (x, y) pointing along `ang` radians (0 = +x). */
export function chevron(c: Ctx2D, x: number, y: number, ang: number, s: number, wd: number) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const p = (u: number, v: number): [number, number] => [x + u * ca - v * sa, y + u * sa + v * ca];
  const a = p(-s * 0.6, -s * 0.75), b = p(s * 0.4, 0), d = p(-s * 0.6, s * 0.75);
  c.lineWidth = wd; c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 6;
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.stroke();
}

/** Four corner brackets around a box (the highlight on a tapped part of a picture). */
export function brackets(c: Ctx2D, x: number, y: number, w: number, h: number, arm: number, wd: number) {
  const a = Math.min(arm, w / 2, h / 2);
  c.lineWidth = wd; c.lineCap = 'butt'; c.lineJoin = 'miter';
  c.beginPath();
  c.moveTo(x, y + a); c.lineTo(x, y); c.lineTo(x + a, y);
  c.moveTo(x + w - a, y); c.lineTo(x + w, y); c.lineTo(x + w, y + a);
  c.moveTo(x + w, y + h - a); c.lineTo(x + w, y + h); c.lineTo(x + w - a, y + h);
  c.moveTo(x + a, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h - a);
  c.stroke();
}

/** A part of a hero picture that explains itself when tapped: its box (hero px) and the key of its words. */
export interface Hot { x: number; y: number; w: number; h: number; k: string }

/** The size `tag` would draw `s` at (same font, padding and Spanish shrink), without drawing it: for laying words out first. */
export function tagSize(c: Ctx2D, s: string, size: number, maxW = Infinity): { w: number; h: number } {
  c.font = `800 ${(size * 1.12).toFixed(1)}px ${MONO}`;
  const full = c.measureText(s.toUpperCase()).width + Math.round(size * 0.6) * 2;
  if (full > maxW) { size *= Math.max(0.7, maxW / full); c.font = `800 ${(size * 1.12).toFixed(1)}px ${MONO}`; }
  return { w: Math.round(c.measureText(s.toUpperCase()).width + Math.round(size * 0.6) * 2), h: Math.round(size * 1.9) };
}

/** Whether two boxes overlap (with `pad` px of air kept between them). */
export const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** Smoothstep 0..1 of `v` between `a` and `b`. */
export const ease = (a: number, b: number, v: number) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
