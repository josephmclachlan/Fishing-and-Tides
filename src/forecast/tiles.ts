/**
 * The conditions tiles' pictures (PLAN 7.52, redrawn for Kinetic Plus in PLAN 7.69): one small animated canvas
 * drawing per tile kind, driven by the tile's own numbers (view.ts TileViz), never by example values. `t` is the
 * time in seconds (a fixed moment under reduced motion). Ink, the hero's accent and the tile's block colour come
 * from the page tokens, so light and dark mode restyle them.
 *
 * Also the tips' bands: which tip a value opens to, on the page's own bands.
 */
import type { TileKind, TileViz } from './view';
import { arrow, clamp, D2R, DISP, moonPath, rgba, sq, TAU, txt, type Ctx2D, type RGB } from './kit';

const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

export type TipKind = 'uv' | 'feels' | 'water' | 'wind' | 'chop' | 'gust' | 'swell' | 'breaker' | 'current' | 'reef' | 'boat' | 'moon' | 'stingers' | 'rainpct' | 'humidity';
/**
 * Which tip a tile opens to, on the page's own bands: the WHO UV bands, the NWS heat-index levels (32 and 39 °C),
 * wetsuit habits for water. Surge and rip tips follow their own bands (surge.ts, rip.ts), so the page picks those by name.
 */
export function tipBand(kind: TipKind, v: number | null): string | null {
  if (!fin(v)) return null;
  switch (kind) {
    case 'uv': return v >= 10.5 ? 'extreme' : v >= 7.5 ? 'vhigh' : v >= 5.5 ? 'high' : v >= 2.5 ? 'mod' : 'low';
    case 'feels': return v >= 39 ? 'danger' : v >= 32 ? 'hot' : v >= 26 ? 'warm' : 'mild';
    case 'water': return v >= 28 ? 'bath' : v >= 26 ? 'warm' : v >= 24 ? 'fresh' : 'cool';
    case 'wind': case 'chop': return v >= 20 ? 'strong' : v >= 12 ? 'breezy' : v >= 5 ? 'light' : 'calm';
    case 'gust': return v >= 25 ? 'strong' : v >= 18 ? 'gusty' : 'steady';
    case 'swell': return v >= 2 ? 'big' : v >= 1 ? 'solid' : v >= 0.5 ? 'fun' : 'small';
    case 'breaker': return v > 1.3 ? 'dump' : v >= 0.6 ? 'time' : 'easy';
    case 'current': return v >= 1 ? 'strong' : v >= 0.5 ? 'mod' : 'easy';
    case 'reef': return v < 0.8 ? 'shallow' : 'ok';
    case 'boat': return v >= 75 ? 'smooth' : v >= 50 ? 'lively' : 'rough';
    case 'moon': return v >= 0.85 || v <= 0.15 ? 'spring' : 'neap';
    case 'stingers': return v ? 'maybe' : 'low';
    case 'rainpct': return v >= 80 ? 'wet' : v >= 50 ? 'likely' : v >= 20 ? 'chance' : 'dry';
    case 'humidity': return v >= 80 ? 'muggy' : v >= 65 ? 'humid' : 'comfy';
    default: return null;
  }
}

/** Colours and words a tile picture needs. */
export interface TilePaint {
  I: string;
  A: string;
  B: string;
  sand: RGB;
  reduced: boolean;
  words: { period: string; from: string };
}
type Draw = (c: Ctx2D, w: number, h: number, t: number, z: TileViz, P: TilePaint) => void;

/** Smooth reef profile 0..1 across, shared with the hero (a fixed shape, not data). */
const REEF = Array.from({ length: 14 }, (_, i) => 0.55 + 0.35 * Math.sin(i * 1.7) * Math.cos(i * 0.63) + 0.15 * Math.sin(i * 3.1));
export function reefAt(u: number) {
  const f = clamp(u, 0, 1) * 13, i = Math.floor(f), k = f - i, a = REEF[clamp(i, 0, 13)], b = REEF[clamp(i + 1, 0, 13)];
  return a + (b - a) * k * k * (3 - 2 * k);
}

/** Flat cloud bars drifting across: the Kinetic sky mark. */
function bars(c: Ctx2D, w: number, h: number, t: number, P: TilePaint, list: [number, number, number, number][]) {
  c.lineCap = 'round';
  list.forEach(([yf, lf, lw, sp], i) => {
    const len = w * lf, span = w + len, x = (((t * sp + i * 60) % span) + span) % span - len * 0.5, yy = h * yf;
    c.strokeStyle = P.B; c.lineWidth = lw + 6; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + len, yy); c.stroke();
    c.strokeStyle = P.I; c.lineWidth = lw; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + len, yy); c.stroke();
  });
  c.lineCap = 'butt';
}
function drops(c: Ctx2D, w: number, h: number, t: number, P: TilePaint, n: number, y0: number) {
  c.lineCap = 'round'; c.strokeStyle = P.A; c.lineWidth = 1.8;
  for (let i = 0; i < n; i++) {
    const x = ((i * 0.618034) % 1) * w, sp = 70 + ((i * 13) % 30), y = y0 + ((t * sp + i * 41) % Math.max(1, h - y0));
    c.globalAlpha = 0.9 - ((y - y0) / Math.max(1, h - y0)) * 0.6;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 9); c.stroke();
  }
  c.globalAlpha = 1; c.lineCap = 'butt';
}
function sun(c: Ctx2D, x: number, y: number, r: number, t: number, P: TilePaint) {
  c.strokeStyle = P.A; c.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.12;
    c.beginPath(); c.moveTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4)); c.lineTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); c.stroke();
  }
  c.fillStyle = P.A; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
/** A thin profile wave of height `m` against a 0..`max` m scale with a reference line at `ref` m. */
function waveBox(c: Ctx2D, w: number, h: number, t: number, P: TilePaint, m: number, max: number, ref: number) {
  const base = h * 0.84, sc = (h * 0.7) / max;
  c.strokeStyle = P.I; c.globalAlpha = 0.45; c.lineWidth = 1; c.setLineDash([2, 3]);
  c.beginPath(); c.moveTo(0, base - ref * sc); c.lineTo(w, base - ref * sc); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  c.fillStyle = P.I; txt(c, `${ref} m`, w, base - ref * sc - 8, 'right', 9.5);
  const pr = (t / 4) % 1;
  const hAt = (x: number) => {
    const u = x / w - pr * 1.4 + 0.2;
    return base - (Math.exp(-sq((u - 0.5) / 0.14)) + Math.exp(-sq((u + 0.9) / 0.14))) * Math.min(m, max) * sc;
  };
  c.fillStyle = P.A; c.beginPath(); c.moveTo(0, base);
  for (let x = 0; x <= w; x += 2) c.lineTo(x, hAt(x));
  c.lineTo(w, base); c.closePath(); c.fill();
  c.strokeStyle = P.I; c.lineWidth = 2; c.beginPath(); c.moveTo(0, base); c.lineTo(w, base); c.stroke();
}
/** A horizontal scale bar from lo to hi filled to v, with ticks: water, feels, current. */
function meter(c: Ctx2D, w: number, h: number, t: number, P: TilePaint, v: number, lo: number, hi: number, marks: number[], fmt: (x: number) => string, flow = false) {
  const f = clamp((v - lo) / (hi - lo), 0, 1), y0 = h * 0.38, bh = Math.min(18, h * 0.26);
  c.strokeStyle = P.I; c.lineWidth = 1.5; c.strokeRect(0.75, y0, w - 1.5, bh);
  const ex = 2 + (w - 4) * f;
  c.fillStyle = P.A; c.beginPath(); c.moveTo(2, y0 + 2);
  for (let yy = y0 + 2; yy <= y0 + bh - 2; yy += 2) c.lineTo(ex + Math.sin(yy * 0.5 + t * 3) * (P.reduced ? 0 : 2), yy);
  c.lineTo(2, y0 + bh - 2); c.closePath(); c.fill();
  if (flow) {
    // Dashes running along the fill, faster with more current.
    c.strokeStyle = P.B; c.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const x = 2 + (((t * (20 + 80 * f) + k * 37) % Math.max(10, ex)) + Math.max(10, ex)) % Math.max(10, ex);
      if (x + 8 < ex) { c.beginPath(); c.moveTo(x, y0 + bh / 2); c.lineTo(x + 8, y0 + bh / 2); c.stroke(); }
    }
  } else {
    const sh = (t * 0.35) % 1;
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(2 + Math.max(0, ex - 14) * sh, y0 + 2, 10, bh - 4);
  }
  for (let k = 0; k <= 12; k++) { const xx = 1 + (k / 12) * (w - 2); c.fillStyle = P.I; c.fillRect(xx - 0.5, y0 + bh + 3, 1, k % 6 === 0 ? 7 : 4); }
  marks.forEach((m, i) => { const xx = ((m - lo) / (hi - lo)) * w; c.fillStyle = P.I; txt(c, fmt(m), xx, y0 + bh + 18, i === 0 ? 'left' : i === marks.length - 1 ? 'right' : 'center', 9.5); });
}

const TV: Record<TileKind, Draw> = {
  weather(c, w, h, t, z, P) {
    const sky = z.sky ?? null;
    const r = Math.min(h * 0.3, w * 0.16), sx = w * 0.22 + r * 0.2, sy = h * 0.42;
    if (sky === 'sun' || sky === 'partly') sun(c, sx, sy, sky === 'sun' ? r * 1.15 : r, t, P);
    if (sky === 'partly') bars(c, w, h, t, P, [[0.5, 0.62, 5, 7], [0.68, 0.44, 4, -5]]);
    else if (sky === 'cloud') bars(c, w, h, t, P, [[0.3, 0.6, 7, 6], [0.5, 0.7, 6, -4], [0.7, 0.5, 5, 5]]);
    else if (sky === 'showers' || sky === 'rain' || sky === 'storm') {
      bars(c, w, h, t, P, [[0.16, 0.66, 7, 5], [0.32, 0.5, 6, -4]]);
      drops(c, w, h, t, P, Math.round(8 + 0.3 * (z.rainPct ?? 40) + (sky === 'rain' ? 10 : 0)), h * 0.42);
      if (sky === 'storm') {
        const fl = P.reduced ? 1 : (t % 3.2) < 0.18 ? 1 : 0.35;
        c.globalAlpha = fl; c.fillStyle = P.I; c.beginPath();
        const bx = w * 0.62, by = h * 0.4;
        c.moveTo(bx + 6, by); c.lineTo(bx - 6, by + h * 0.24); c.lineTo(bx + 2, by + h * 0.24); c.lineTo(bx - 4, by + h * 0.5); c.lineTo(bx + 12, by + h * 0.18); c.lineTo(bx + 3, by + h * 0.18); c.lineTo(bx + 10, by);
        c.closePath(); c.fill(); c.globalAlpha = 1;
      }
    } else if (sky === null) { c.strokeStyle = P.I; c.globalAlpha = 0.3; c.lineWidth = 4; c.beginPath(); c.moveTo(0, h * 0.5); c.lineTo(w * 0.6, h * 0.5); c.stroke(); c.globalAlpha = 1; }
  },
  swell(c, w, h, t, z, P) {
    // Swell rose: a petal from where the swell comes, as long as its height; crests arrive on its period.
    const T = fin(z.period) ? z.period : 10, m = fin(z.v) ? z.v : 0, deg = fin(z.deg) ? z.deg : null;
    const R = Math.min(h * 0.47, w * 0.3), cx = R + 3, cy = h / 2;
    c.strokeStyle = P.I; c.lineWidth = 1; c.globalAlpha = 0.3;
    [0.33, 0.66].forEach((k) => { c.beginPath(); c.arc(cx, cy, R * k, 0, TAU); c.stroke(); });
    c.globalAlpha = 1; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, l = i % 4 ? 3 : 7;
      c.lineWidth = i % 4 ? 1 : 2; c.beginPath(); c.moveTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); c.lineTo(cx + Math.sin(a) * (R - l), cy - Math.cos(a) * (R - l)); c.stroke();
    }
    c.fillStyle = P.I; txt(c, 'N', cx, cy - R + 12, 'center', 8.5, 700);
    if (deg !== null) {
      const an = deg * D2R, ux = Math.sin(an), uy = -Math.cos(an), px = -uy, py = ux;
      const petal = (d: number, L: number, al: number) => {
        const a = d * D2R, vx = Math.sin(a), vy = -Math.cos(a), qx = -vy, qy = vx, wd = Math.max(5, L * 0.3);
        c.globalAlpha = al; c.fillStyle = P.A; c.beginPath(); c.moveTo(cx, cy);
        c.lineTo(cx + vx * L * 0.45 + qx * wd, cy + vy * L * 0.45 + qy * wd); c.lineTo(cx + vx * L, cy + vy * L); c.lineTo(cx + vx * L * 0.45 - qx * wd, cy + vy * L * 0.45 - qy * wd);
        c.closePath(); c.fill(); c.globalAlpha = 1;
      };
      const L = R * clamp(m / 2.4, 0.3, 0.92);
      petal(deg - 22.5, L * 0.48, 0.38); petal(deg + 22.5, L * 0.58, 0.38); petal(deg, L, 1);
      for (let k = 0; k < 3; k++) {
        const ph = P.reduced ? 0.25 + k * 0.25 : (t / T + k / 3) % 1, d = R * 1.02 * (1 - ph), sl = R * 0.55 * (1 - ph * 0.55);
        c.strokeStyle = P.I; c.globalAlpha = Math.sin(ph * Math.PI) * 0.9; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath();
        c.moveTo(cx + ux * d + px * sl, cy + uy * d + py * sl); c.quadraticCurveTo(cx + ux * (d + 4), cy + uy * (d + 4), cx + ux * d - px * sl, cy + uy * d - py * sl);
        c.stroke(); c.lineCap = 'butt';
      }
      c.globalAlpha = 1;
    }
    c.fillStyle = P.I; c.beginPath(); c.arc(cx, cy, 3.2, 0, TAU); c.fill();
    const tx = cx + R + 10, fz = Math.round(Math.min(h * 0.34, 34, (w - tx) / 1.9));
    if (fz >= 14 && fin(z.period)) {
      c.font = `850 ${fz}px ${DISP}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(`${Math.round(z.period)}s`, tx, cy + 4);
      txt(c, P.words.period, tx, cy - fz * 0.78 - 4, 'left', 9, 600);
    }
  },
  wind(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    if (!fin(z.deg)) return void bars(c, w, h, t, P, [[0.5, 0.5, 3, 18 + z.v * 4]]);
    const to = z.deg + 180;
    c.save(); c.beginPath(); c.rect(0, 0, w - 34, h); c.clip();
    c.globalAlpha = 1; drawStream(c, w - 34, h, t, to, 18 + z.v * 4, P.A, Math.round(20 + z.v * 2));
    c.restore();
    arrow(c, w - 16, h / 2, to, 13, P.I);
  },
  current(c, w, h, t, z, P) {
    // The feed gives the drift's speed only, so a speed bar (0 to 2 kt) with the water running in it.
    if (!fin(z.v)) return;
    meter(c, w, h, t, P, z.v, 0, 2, [0, 1, 2], (x) => `${x} kt`, true);
  },
  tide(c, w, h, t, z, P) {
    const s = z.series ?? [];
    const vals = s.filter(fin);
    if (vals.length < 2) return;
    const lo = Math.min(...vals), hi = Math.max(...vals), mid = (lo + hi) / 2, amp = Math.max(0.05, (hi - lo) / 2);
    const hx = (hr: number) => 6 + (hr / 23) * (w - 12);
    const hy = (v: number) => h * 0.5 - ((v - mid) / amp) * h * 0.3;
    const at = (hr: number) => {
      const i = clamp(Math.floor(hr), 0, s.length - 2), k = hr - i, a = s[i], b = s[i + 1];
      return fin(a) && fin(b) ? a + (b - a) * k : mid;
    };
    c.fillStyle = P.A; c.globalAlpha = 0.22; c.beginPath(); c.moveTo(hx(0), h);
    for (let hr = 0; hr <= s.length - 1; hr += 0.25) c.lineTo(hx(hr), hy(at(hr)));
    c.lineTo(hx(s.length - 1), h); c.closePath(); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = P.I; c.lineWidth = 2; c.beginPath();
    for (let hr = 0; hr <= s.length - 1; hr += 0.25) (hr ? c.lineTo(hx(hr), hy(at(hr))) : c.moveTo(hx(hr), hy(at(hr))));
    c.stroke();
    if (!P.reduced) { const mh = (t * 1.6) % (s.length - 1); c.fillStyle = P.A; c.beginPath(); c.arc(hx(mh), hy(at(mh)), 3.5, 0, TAU); c.fill(); }
    if (fin(z.at)) {
      const pr = (t % 2) / 2, x = hx(z.at), y = hy(at(z.at));
      c.strokeStyle = P.I; c.globalAlpha = P.reduced ? 0 : 1 - pr; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 5 + pr * 10, 0, TAU); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = P.I; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
    }
    if (fin(z.turnAt) && z.turnAt <= s.length - 1) { c.fillStyle = P.I; txt(c, z.turnHigh ? 'H' : 'L', hx(z.turnAt), hy(at(z.turnAt)) + (z.turnHigh ? -10 : 12), 'center', 9.5, 700); }
  },
  water(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    meter(c, w, h, t, P, z.v, 20, 32, [20, 26, 32], (x) => `${x}°`);
  },
  feels(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    meter(c, w, h, t, P, z.v, 20, 44, [20, 32, 44], (x) => `${x}°`);
  },
  uv(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    const v = z.v, n = 11, g = 3, sw = (w - g * (n - 1)) / n, cyc = 7, p = P.reduced ? 1 : clamp((t % cyc) / 1.4, 0, 1);
    const fill = p * Math.min(v, 11);
    for (let i = 0; i < n; i++) {
      const hh = h * (0.32 + (0.38 * i) / (n - 1)), x = i * (sw + g), y = h * 0.82 - hh;
      if (i < Math.floor(fill)) { c.fillStyle = P.A; c.fillRect(x, y, sw, hh); }
      else if (i < fill) { c.fillStyle = P.A; c.fillRect(x, y + hh * (1 - (fill - i)), sw, hh * (fill - i)); c.strokeStyle = P.I; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, sw - 1, hh - 1); }
      else { c.strokeStyle = P.I; c.globalAlpha = 0.45; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, sw - 1, hh - 1); c.globalAlpha = 1; }
    }
    c.fillStyle = P.I; txt(c, '0', 0, h * 0.94, 'left', 9.5); txt(c, '11+', w, h * 0.94, 'right', 9.5);
  },
  rain(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    const n = Math.round(4 + 0.36 * z.v);
    c.lineCap = 'round'; c.strokeStyle = P.I; c.lineWidth = 4; c.beginPath(); c.moveTo(w * 0.12, 8); c.lineTo(w * 0.7, 8); c.moveTo(w * 0.4, 18); c.lineTo(w * 0.9, 18); c.stroke(); c.lineCap = 'butt';
    drops(c, w, h, t, P, n, 26);
  },
  window(c, w, h, t, z, P) {
    const bx = (hr: number) => (hr / 24) * w, y = h * 0.62;
    if (fin(z.from) && fin(z.to)) {
      const s = clamp(z.from, 0, 24), e = clamp(z.to, 0, 24);
      c.fillStyle = P.A; c.fillRect(bx(s), y - h * 0.42, bx(e) - bx(s), h * 0.42);
      const sc = P.reduced ? 0.5 : (t * 0.4) % 1;
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bx(s) + Math.max(0, bx(e) - bx(s) - 4) * sc, y - h * 0.42, 4, h * 0.42);
    }
    c.strokeStyle = P.I; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    for (let hr = 0; hr <= 24; hr += 3) { c.lineWidth = hr % 6 ? 1 : 1.5; c.beginPath(); c.moveTo(bx(hr), y); c.lineTo(bx(hr), y + (hr % 6 ? 4 : 7)); c.stroke(); }
    c.fillStyle = P.I; [0, 12, 24].forEach((hr) => txt(c, String(hr).padStart(2, '0'), bx(hr), y + 17, hr ? (hr === 24 ? 'right' : 'center') : 'left', 9.5));
  },
  moon(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    const R = h * 0.36, cx = w * 0.5, cy = h * 0.5, tilt = -0.25, oa = t * 0.5, OR = R + 16;
    c.strokeStyle = P.I; c.globalAlpha = 0.4; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, cy, OR, OR * 0.34, tilt, 0, TAU); c.stroke(); c.globalAlpha = 1;
    const ox = cx + Math.cos(oa) * OR * Math.cos(tilt) - Math.sin(oa) * OR * 0.34 * Math.sin(tilt), oy = cy + Math.cos(oa) * OR * Math.sin(tilt) + Math.sin(oa) * OR * 0.34 * Math.cos(tilt);
    c.fillStyle = P.I; c.globalAlpha = 0.12; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = P.I; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    if (z.v > 0.01) { c.fillStyle = P.A; moonPath(c, cx, cy, R, z.v, !!z.waxing); c.fill(); }
    c.fillStyle = P.I; c.beginPath(); c.arc(ox, oy, 2.5, 0, TAU); c.fill();
  },
  catch(c, w, h, t, z, P) {
    // The likely fish as flat silhouettes swimming at three depths.
    const n = Math.max(0, Math.min(3, z.count ?? 0));
    for (let i = 0; i < n; i++) {
      const s = 1 - i * 0.18, span = w + 80, x = ((t * (16 + i * 6) + i * 70) % span) - 40, y = h * (0.28 + i * 0.26) + Math.sin(t * 1.3 + i) * 3;
      c.save(); c.translate(x, y); c.scale(s, s);
      c.fillStyle = i ? P.I : P.A; c.globalAlpha = i ? 0.75 : 1;
      c.beginPath(); c.moveTo(-18, 0); c.bezierCurveTo(-10, -11, 10, -11, 18, 0); c.bezierCurveTo(10, 11, -10, 11, -18, 0); c.fill();
      const tail = Math.sin(t * 6 + i) * 3;
      c.beginPath(); c.moveTo(-16, 0); c.lineTo(-28, -8 + tail); c.lineTo(-28, 8 + tail); c.closePath(); c.fill();
      c.globalAlpha = 1; c.fillStyle = P.B; c.beginPath(); c.arc(10, -2, 1.8, 0, TAU); c.fill();
      c.restore();
    }
  },
  rip(c, w, h, t, z, P) {
    // A beach from above: crests coming in, broken where the rip runs out; the outflow as dots, more and faster with risk.
    const sy = h * 0.78, cx = w * 0.5, k0 = clamp((z.v ?? 0) / 0.8, 0, 1);
    c.fillStyle = rgba(P.sand); c.fillRect(0, sy, w, h - sy);
    c.strokeStyle = P.I; c.lineWidth = 2; c.beginPath(); c.moveTo(0, sy); c.lineTo(w, sy); c.stroke();
    for (let i = 0; i < 3; i++) {
      const k = (t / 6 + i / 3) % 1, yy = h * 0.1 + k * (sy - h * 0.16);
      c.globalAlpha = Math.min(1, k * 3) * 0.8; c.lineWidth = 1.4; c.beginPath();
      c.moveTo(0, yy); c.lineTo(cx - 14 - 8 * k, yy); c.moveTo(cx + 14 + 8 * k, yy); c.lineTo(w, yy); c.stroke();
    }
    c.globalAlpha = 1; c.fillStyle = P.A;
    const n = Math.round(6 + 22 * k0);
    for (let i = 0; i < n; i++) {
      const s = (t * (0.12 + 0.18 * k0) + i / n) % 1, side = (i % 2 ? 1 : -1) * ((i * 0.37) % 1), spread = s > 0.6 ? (s - 0.6) * 2.2 : 0;
      const x = cx + side * (8 + spread * w * 0.5), y = sy - 6 - s * (sy - h * 0.06);
      c.globalAlpha = Math.min(1, (1 - s) * 3); c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  },
  breaker(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    waveBox(c, w, h, t, P, z.v, Math.max(1.3, z.v * 1.15), 1);
  },
  sea(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    waveBox(c, w, h, t, P, z.v, Math.max(2, z.v * 1.15), 1);
  },
  chop(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    const a = clamp(z.v / 10, 0.1, 2.2);
    for (let j = 0; j < 3; j++) {
      c.strokeStyle = j ? P.I : P.A; c.globalAlpha = j ? 0.5 : 1; c.lineWidth = j ? 1.2 : 2.4; c.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = h * (0.4 + j * 0.2) + (Math.sin(x * 0.35 - t * 4 + j) * 3 + Math.sin(x * 0.17 + t * 2.3) * 2) * a * (1 - j * 0.3);
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  },
  reef(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    // Surface at the top, the reef top `v` metres below on a 0..3 m scale.
    const sy = h * 0.16, mpx = (h * 0.62) / 3, depth = sy + clamp(z.v, 0.2, 3) * mpx;
    const rAt = (x: number) => depth + (1 - reefAt(x / w)) * h * 0.22;
    c.strokeStyle = P.I; c.lineWidth = 2; c.beginPath();
    for (let x = 0; x <= w; x += 3) { const y = sy + Math.sin(x * 0.12 - t * 2) * 1.8; x ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    c.fillStyle = P.A; c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 3) c.lineTo(x, rAt(x));
    c.lineTo(w, h); c.closePath(); c.fill();
    let bx = 0, best = Infinity;
    for (let x = w * 0.5; x <= w * 0.85; x += 2) if (rAt(x) < best) (best = rAt(x)), (bx = x);
    const by = sy + 4 + Math.sin(t * 1.2) * 1.5;
    c.strokeStyle = P.I; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, best - 2); c.moveTo(bx - 4, by); c.lineTo(bx + 4, by); c.moveTo(bx - 4, best - 2); c.lineTo(bx + 4, best - 2); c.stroke();
  },
  stingers(c, w, h, t, z, P) {
    const n = z.count ?? 0;
    for (let i = 0; i < n; i++) {
      const x = w * (n === 1 ? 0.5 : 0.2 + 0.3 * i) + Math.sin(t * 0.4 + i * 2) * 10, y = h * 0.5 + Math.cos(t * 0.3 + i) * h * 0.2, p = 0.5 + 0.5 * Math.sin(t * 1.6 + i * 2);
      c.strokeStyle = P.A; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 7 + p * 3, Math.PI, 0); c.closePath(); c.stroke();
      c.strokeStyle = P.I; c.globalAlpha = 0.5; c.lineWidth = 1;
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 4, y); c.quadraticCurveTo(x + k * 4 + Math.sin(t * 2 + k) * 3, y + 8, x + k * 4, y + 14 + p * 3); c.stroke(); }
      c.globalAlpha = 1;
    }
  },
  surge(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    // Particles swinging back and forth, the swing as wide as the surge (0.6 m/s fills the tile).
    const amp = clamp(z.v / 0.6, 0.08, 1) * w * 0.2, ph = (tt: number) => Math.sin((TAU * tt) / 8);
    for (let i = 0; i < 6; i++) {
      const y = h * (0.2 + i * 0.12), x0 = w * (0.2 + ((i * 0.37) % 1) * 0.6);
      for (let g = 4; g >= 0; g--) {
        const x = x0 + ph(t - g * 0.12) * amp;
        c.fillStyle = g ? P.I : P.A; c.globalAlpha = g ? (0.12 * (5 - g)) / 4 : 1; c.beginPath(); c.arc(x, y, g ? 2 : 3, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
    const ax = w * 0.5 + ph(t) * amp, ay = h * 0.92;
    c.strokeStyle = P.I; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ax - 18, ay); c.lineTo(ax + 18, ay); c.stroke();
    arrow(c, ax - 20, ay, 270, 5, P.I); arrow(c, ax + 20, ay, 90, 5, P.I);
  },
  gust(c, w, h, t, z, P) {
    // The day's hourly gusts as bars over the mean wind line; the hour shown is marked.
    const g = z.series ?? [], m = z.mean ?? [];
    const top = Math.max(15, ...g.filter(fin), ...m.filter(fin)) * 1.1;
    const n = Math.max(1, g.length), gap = 2, bw = (w - gap * (n - 1)) / n, base = h * 0.9, sc = (h * 0.8) / top;
    const grow = P.reduced ? 1 : clamp((t % 9) / 1.2, 0, 1);
    g.forEach((v, i) => {
      if (!fin(v)) return;
      const mean = m[i];
      const hi = fin(mean) && v - mean >= 8;
      c.fillStyle = hi ? P.A : P.I; c.globalAlpha = hi ? 1 : 0.55; c.fillRect(i * (bw + gap), base - v * sc * grow, bw, v * sc * grow);
    });
    c.globalAlpha = 1; c.strokeStyle = P.I; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.beginPath();
    let on = false;
    m.forEach((v, i) => { if (!fin(v)) return void (on = false); const x = i * (bw + gap) + bw / 2, y = base - v * sc; on ? c.lineTo(x, y) : c.moveTo(x, y); on = true; });
    c.stroke(); c.setLineDash([]);
    if (fin(z.at)) { const x = Math.floor(z.at) * (bw + gap) + bw / 2; c.fillStyle = P.I; c.beginPath(); c.moveTo(x, base + 2); c.lineTo(x - 4, base + 8); c.lineTo(x + 4, base + 8); c.closePath(); c.fill(); }
  },
  boat(c, w, h, t, z, P) {
    if (!fin(z.v)) return;
    // Comfort as a ring filled to the score, a hull rocking more the rougher it is.
    const R = Math.min(h * 0.42, w * 0.28), cx = R + 4, cy = h / 2, f = clamp(z.v / 100, 0, 1);
    c.strokeStyle = P.I; c.globalAlpha = 0.25; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy, R - 4, 0, TAU); c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = P.A; c.beginPath(); c.arc(cx, cy, R - 4, -Math.PI / 2, -Math.PI / 2 + f * TAU); c.stroke();
    const roll = (P.reduced ? 0.5 : Math.sin(t * 1.4)) * (1 - f) * 0.5, hx = cx + R + (w - cx - R) / 2, wl = h * 0.62, s = Math.min(1.2, (w - cx - R) / 70);
    c.save(); c.translate(hx, wl); c.rotate(roll); c.scale(s, s);
    c.fillStyle = P.I; c.beginPath(); c.moveTo(-22, -4); c.lineTo(22, -4); c.bezierCurveTo(20, 6, 10, 12, 0, 12); c.bezierCurveTo(-10, 12, -20, 6, -22, -4); c.fill();
    c.fillRect(-1.5, -34, 3, 30); c.globalAlpha = 0.6; c.beginPath(); c.moveTo(-1, -32); c.lineTo(-1, -8); c.lineTo(-18, -8); c.closePath(); c.fill(); c.globalAlpha = 1;
    c.restore();
    c.strokeStyle = P.I; c.lineWidth = 2; c.beginPath();
    for (let x = cx + R + 4; x <= w; x += 3) { const y = wl + 4 + Math.sin(x * 0.12 + t * 2) * 3 * (1 - f + 0.2); x === cx + R + 4 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
  },
  squall(c, w, h, t, z, P) {
    const lv = fin(z.v) ? z.v : 0;
    bars(c, w, h, t, P, [[0.2, 0.5, 10, 5], [0.38, 0.4, 8, -4]]);
    drops(c, w, h, t, P, [2, 8, 16][clamp(Math.round(lv), 0, 2)], h * 0.5);
    if (lv >= 2) { c.fillStyle = P.A; c.beginPath(); const bx = w * 0.7, by = h * 0.45; c.moveTo(bx + 5, by); c.lineTo(bx - 5, by + 16); c.lineTo(bx + 1, by + 16); c.lineTo(bx - 3, by + 30); c.lineTo(bx + 9, by + 12); c.lineTo(bx + 2, by + 12); c.lineTo(bx + 8, by); c.closePath(); c.fill(); }
  },
};
/** Streaks toward `toward` degrees: wind on its tile. */
function drawStream(c: Ctx2D, w: number, h: number, t: number, toward: number, speed: number, col: string, n: number) {
  const d = toward * D2R, dx = Math.sin(d), dy = -Math.cos(d), nx = -dy, ny = dx, L = Math.hypot(w, h), cx = w / 2, cy = h / 2;
  c.strokeStyle = col; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const lane = (((i * 0.618034) % 1) - 0.5) * L, sp = speed * (0.7 + 0.6 * ((i * 0.37) % 1));
    const u = ((t * sp + i * 97.3) % L) - L / 2, len = 6 + speed * 0.25;
    const x = cx + dx * u + nx * lane, y = cy + dy * u + ny * lane;
    if (x < -len || x > w + len || y < -len || y > h + len) continue;
    c.globalAlpha = Math.min(1, (1 - Math.abs(u) / (L / 2)) * 1.6); c.lineWidth = 1.6 + ((i * 0.53) % 1) * 1.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - dx * len, y - dy * len); c.stroke();
  }
  c.globalAlpha = 1; c.lineCap = 'butt';
}

/** Paint one tile's picture into a w × h box. */
export function drawTile(kind: TileKind, c: Ctx2D, w: number, h: number, t: number, z: TileViz, P: TilePaint) {
  c.clearRect(0, 0, w, h);
  if (w < 4 || h < 4) return;
  TV[kind](c, w, h, t, z, P);
}
