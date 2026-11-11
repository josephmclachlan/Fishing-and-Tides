/**
 * The CORAL page's hero picture (PLAN 7.66, redrawn in the Kinetic Plus language in PLAN 7.69): a reef section
 * on the colour field of its heat alert, drawn on a canvas in the field's own ink. Two readings drive it, and
 * nothing else:
 *
 *   heat (bleachShare, DHW 1 → 12)   the corals lose their fill and turn to outlines, white flecks spread
 *   murk (murkShare, MUD WEEKS)      marine snow thickens, the light rays fade, the far reef steps into the
 *                                    murk, fish thin out
 *
 * The shapes (branching, brain, fan and plate corals, the sand, the fish) are fixed illustration, not data. The
 * two captions are the readings themselves. `reefScene` is pure geometry (tested); `drawReef` paints it.
 */
import { clamp, hatch, rgba, TAU, txt, type Ctx2D, type RGB } from '../forecast/kit';

export interface ReefPaint {
  /** 0..1 from bleachShare. */
  bleach: number;
  /** 0..1 from murkShare. */
  murk: number;
  /** Captions: the heat and the murk readings, already formatted ("DHW 2.4"), or '' without data. */
  heat: string;
  mud: string;
  /** Ink on the field, the field itself (for murk), and the page background. */
  on: RGB;
  field: RGB;
  reduced: boolean;
}

/** The scene's fixed layout in a w × h box: the sand line, coral heads and fish lanes. */
export function reefScene(w: number, h: number, o: Pick<ReefPaint, 'bleach' | 'murk'>) {
  const sand = h * 0.78;
  const corals = [
    { k: 'branch' as const, x: 0.16, s: 1 },
    { k: 'brain' as const, x: 0.4, s: 1 },
    { k: 'fan' as const, x: 0.66, s: 1.1 },
    { k: 'plate' as const, x: 0.86, s: 0.9 },
    { k: 'brain' as const, x: 0.06, s: 0.55 },
    { k: 'branch' as const, x: 0.53, s: 0.6 },
  ].map((c) => ({ ...c, x: c.x * w }));
  // Clear water holds a school; murky water a straggler or none.
  const fish = Math.round(clamp(1 - o.murk, 0, 1) * 7);
  const snow = Math.round(40 + 420 * clamp(o.murk, 0, 1));
  const fill = clamp(1 - o.bleach, 0, 1);
  return { sand, corals, fish, snow, fill };
}

const hash = (i: number) => {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export function drawReef(c: Ctx2D, w: number, h: number, tt0: number, o: ReefPaint) {
  c.clearRect(0, 0, w, h);
  if (w < 20 || h < 20) return;
  const tt = o.reduced ? 3 : tt0;
  const S = reefScene(w, h, o);
  const ink = rgba(o.on), soft = rgba(o.on, 0.6);
  const sway = (k: number) => Math.sin(tt * 0.6 + k) * 0.04;

  // Light rays from the surface, fading with murk.
  c.save();
  c.globalAlpha = (1 - o.murk) * 0.35;
  c.strokeStyle = ink;
  c.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const x0 = w * (0.08 + i * 0.11) + Math.sin(tt * 0.3 + i) * 6, x1 = x0 - h * 0.28;
    c.beginPath(); c.moveTo(x0, 14); c.lineTo(x1, S.sand); c.stroke();
  }
  c.restore();
  // The surface.
  c.strokeStyle = ink; c.lineWidth = 2; c.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const y = 12 + Math.sin(x * 0.045 + tt * 1.2) * 2.2;
    x ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke();

  // Sand: a hatched bank.
  const sandAt = (x: number) => S.sand + Math.sin(x * 0.011) * 6 + Math.sin(x * 0.031) * 3;
  hatch(c, 0, w, S.sand - 10, h, sandAt, 4, soft);
  c.strokeStyle = ink; c.lineWidth = 2; c.beginPath();
  for (let x = 0; x <= w; x += 4) (x ? c.lineTo(x, sandAt(x)) : c.moveTo(x, sandAt(x)));
  c.stroke();

  // Corals: filled while healthy, outlines with flecks as they bleach.
  const R = Math.min(h * 0.32, w * 0.16);
  for (const [k, cr] of S.corals.entries()) {
    const base = sandAt(cr.x) + 2, r = R * cr.s;
    c.save();
    c.translate(cr.x, base);
    c.rotate(sway(k));
    c.beginPath();
    if (cr.k === 'branch') {
      const arm = (x: number, y: number, a: number, len: number, d: number) => {
        const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
        c.moveTo(x, y); c.lineTo(x2, y2);
        if (d > 0) (arm(x2, y2, a - 0.5, len * 0.7, d - 1), arm(x2, y2, a + 0.45, len * 0.72, d - 1));
      };
      arm(0, 0, 0, r * 0.45, 3);
      c.lineCap = 'round';
      c.lineWidth = Math.max(3, r * 0.09);
      c.strokeStyle = ink; c.globalAlpha = 0.25 + 0.75 * S.fill; c.stroke();
      if (S.fill < 0.9) { c.globalAlpha = 1; c.lineWidth = 1.2; c.strokeStyle = ink; c.stroke(); }
      c.lineCap = 'butt';
    } else {
      if (cr.k === 'brain') c.ellipse(0, -r * 0.32, r * 0.62, r * 0.38, 0, Math.PI, 0);
      else if (cr.k === 'fan') { c.moveTo(-r * 0.05, 0); c.quadraticCurveTo(-r * 0.75, -r * 0.9, 0, -r * 1.25); c.quadraticCurveTo(r * 0.8, -r * 0.85, r * 0.05, 0); }
      else { c.moveTo(-r * 0.08, 0); c.lineTo(-r * 0.05, -r * 0.42); c.lineTo(-r * 0.7, -r * 0.48); c.lineTo(-r * 0.6, -r * 0.58); c.lineTo(r * 0.65, -r * 0.6); c.lineTo(r * 0.72, -r * 0.5); c.lineTo(r * 0.05, -r * 0.42); c.lineTo(r * 0.08, 0); }
      c.closePath();
      c.fillStyle = ink; c.globalAlpha = S.fill; c.fill();
      c.globalAlpha = 1; c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
      // Grooves on the brain coral, ribs on the fan.
      c.globalAlpha = S.fill > 0.5 ? 0.45 : 0.9;
      c.strokeStyle = S.fill > 0.5 ? rgba(o.field) : ink; c.lineWidth = 1.2;
      c.beginPath();
      if (cr.k === 'brain') for (let i = 1; i < 4; i++) { c.moveTo(-r * 0.55 + i * 0.05 * r, -r * 0.1 * i); c.bezierCurveTo(-r * 0.2, -r * 0.22 * i, r * 0.2, -r * 0.08 * i, r * 0.5, -r * 0.14 * i); }
      if (cr.k === 'fan') for (let i = -3; i <= 3; i++) { c.moveTo(0, 0); c.lineTo(i * r * 0.16, -r * (1.05 - Math.abs(i) * 0.08)); }
      c.stroke();
    }
    c.restore();
    // White flecks: the bleached tissue.
    if (o.bleach > 0.05) {
      c.fillStyle = rgba([255, 255, 255], 0.9);
      const n = Math.round(o.bleach * 14 * cr.s);
      for (let i = 0; i < n; i++) {
        const a = hash(k * 31 + i) * Math.PI, d = hash(k * 17 + i * 3) * r * 0.6;
        c.beginPath(); c.arc(cr.x + Math.cos(a) * d * 0.9, base - r * 0.15 - Math.sin(a) * d, 1.6, 0, TAU); c.fill();
      }
    }
  }

  // Fish: a school that thins out as the water clouds.
  c.fillStyle = ink;
  for (let i = 0; i < S.fish; i++) {
    const lane = h * (0.22 + 0.36 * hash(i + 3)), sp = 14 + 10 * hash(i + 9);
    const x = ((tt * sp + hash(i) * w * 2) % (w + 60)) - 30, y = lane + Math.sin(tt * 0.9 + i) * 4, s = 5 + 3 * hash(i + 5);
    c.beginPath(); c.moveTo(x + s * 1.6, y); c.quadraticCurveTo(x, y - s, x - s * 1.2, y); c.quadraticCurveTo(x, y + s, x + s * 1.6, y);
    c.moveTo(x - s * 1.1, y); c.lineTo(x - s * 2, y - s * 0.7); c.lineTo(x - s * 2, y + s * 0.7); c.closePath(); c.fill();
  }

  // Murk: the far side steps into the field colour, and marine snow drifts.
  if (o.murk > 0.02) {
    for (let k = 0; k < 4; k++) {
      c.fillStyle = rgba(o.field, o.murk * (0.18 + k * 0.12));
      c.fillRect(w * (0.55 + k * 0.11), 16, w, S.sand + 14);
    }
  }
  c.fillStyle = soft;
  for (let i = 0; i < S.snow; i++) {
    const x = (hash(i) * w + Math.sin(tt * 0.2 + i) * 8 + tt * 3) % w, y = 18 + ((hash(i + 0.5) * (S.sand - 18) + tt * (2 + 4 * hash(i + 2))) % (S.sand - 18));
    c.globalAlpha = 0.25 + 0.6 * hash(i + 7);
    c.fillRect(x, y, 1.6, 1.6);
  }
  c.globalAlpha = 1;

  // The two readings, in the field's ink.
  c.fillStyle = ink;
  if (o.heat) txt(c, o.heat, 4, 32, 'left', 11, 700);
  if (o.mud) txt(c, o.mud, w - 4, 32, 'right', 11, 700);
}
