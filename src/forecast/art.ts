/**
 * The FORECAST page's hero pictures (PLAN 7.52, redrawn as Kinetic Plus in PLAN 7.69): a full-bleed colour field
 * that IS the rating, a living particle field showing what moves the water (swell, wind, tide flow, the rip, the
 * murk), and over it a crisp diagram per activity that carries the numbers. Everything is drawn from the reading
 * (`heroParams`, pure and tested), never from example values:
 *
 *   SURF     the face height range on a scale with knee, waist, chest and head lines for a 1.7 m adult; a hatched
 *            swell profile on the swell's own period; particles travel with the swell's direction
 *   FISH     the moon's phase and age on a lunar bezel; today's tide curve with the best window, now and the next
 *            turn; an echo-sounder strip whose density follows the bite score
 *   SWIM     a beach from above: crests broken where the rip runs out, the lifeguard flag in the rip's colour,
 *            the shore break, a sun with a UV ring of 11 segments
 *   SNORKEL  a section from the surface to the reef: a snorkeller, sight lines fading to murk at the visibility,
 *            marker posts every 5 m, the water over the reef at this tide
 *   DIVE     a depth column: a diver at the activity depth, range arcs at 5, 10 and 15 m, murk past the visibility,
 *            a lead line, the surge swinging with its strength
 *   SPEAR    the DIVE column with a breath-hold freediver, no tank, a speargun held out in front and a surface float on its line
 *   SAIL     a chart-room wind rose with a damped needle, barbs, the no-go wedge and the gust sector, the boat at its
 *            hub on the harder coast leg with the wind angle; the boat in section from astern heeled to leeward by
 *            the rule-of-thumb heel (physics/heel.ts) on a protractor with the reef band; a 0-30 kt scale
 *
 * Also the live-map card's radar (rings in real kilometres when the map capture gives its scale).
 */
import { t, type Key } from '../i18n';
import { localClock } from '../tide-chart';
import { localDayStart } from '../physics/astro';
import { REGION } from '../region';
import { moonPhase } from '../physics/astro';
import type { Plan } from '../metrics/plan';
import { chopFor, type FcActivity, type FcDeps, type FcRead, type Level, type TimelineHour } from './model';
import { cmp, dayHoursOf, headline, levelWord, moonAgeDays, n0, n1, planDayOf, sentence, tideNow } from './view';
import { capsule, clamp, D2R, DISP, hatch, lerp, moonPath, rgba, sq, TAU, txt, type Ctx2D, type RGB, type Tokens } from './kit';
import { reefAt } from './tiles';
import { boomDeg, coastPose, heelDeg, REEF_HEEL_DEG, type SailPose } from '../physics/heel';
import type { PointOfSail } from '../boat/route';

const H = 3.6e6;
const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/** Body heights of a 1.7 m adult, m (the surf size words in model.ts surfSize use the same frame). */
export const BODY_M = { knee: 0.5, waist: 1.0, chest: 1.35, head: 1.7 } as const;

export interface HeroParams {
  act: FcActivity;
  level: Level | null;
  /** False before the activity has data: the field drifts, no diagram. */
  ok: boolean;
  surf?: { lo: number; hi: number; hb: number; period: number; dir: number; guides: [number, string][]; caption: string };
  sail?: {
    windKt: number; gustKt: number | null; fromDeg: number | null; seaM: number | null; from: string; gust: string; kt: string;
    /** The harder coast leg as the boat sails it, its labels, and the rule-of-thumb heel at the mean and the gusts; null with no wind direction. */
    pose: (SailPose & { leg: string; otherLeg: string; tackK: string; heel: number; heelGust: number }) | null;
    heelK: string; heelNow: string; reefK: string; noGoK: string; coastK: string; windK: string; ruleK: string;
  };
  fish?: { illum: number; waxing: boolean; age: number; moon: string; tide: (number | null)[]; nowH: number; best: [number, number] | null; turn: { h: number; label: string } | null; share: number; tideK: string; bestK: string; nowK: string; echo: string };
  swim?: { rip: 'LOW' | 'MOD' | 'HIGH'; ripK: string; shore: string; flag: string; uv: number | null; uvK: string };
  water?: { visM: number | null; vis: string; depthM: number; waterM: number | null; overReef: string; chop: string; hvis: string; at: string; surge: string; surgeMs: number };
}

/** Everything the hero picture shows, from the reading at the hero's hour (and the day's tide and best window). */
export function heroParams(r: FcRead, ctx: { deps: FcDeps; ms: number; plan: Plan | null; tl: readonly TimelineHour[] }): HeroParams {
  const base = { act: r.activity, level: r.level, ok: r.score !== null } as HeroParams;
  if (r.surf && r.score !== null) {
    const s = r.surf;
    const [lo, hi] = s.range;
    base.surf = {
      lo, hi, hb: s.hb, period: s.tp, dir: s.dir,
      guides: [[BODY_M.knee, t('fc.g.knee')], [BODY_M.waist, t('fc.g.waist')], [BODY_M.chest, t('fc.g.chest')], [BODY_M.head, t('fc.g.head')]],
      caption: t('fc.cap.surf', { v: headline(r).value, tp: n0(s.tp), dir: cmp(s.dir) }),
    };
  }
  if (r.sail && fin(r.sail.windKt)) {
    const s = r.sail;
    base.sail = {
      windKt: s.windKt!, gustKt: fin(s.gustKt) ? s.gustKt : null, fromDeg: fin(s.fromDeg) ? s.fromDeg : null, seaM: fin(s.swellM) ? s.swellM : null,
      from: fin(s.fromDeg) ? t('fc.cap.from', { deg: String(Math.round(s.fromDeg) % 360).padStart(3, '0'), dir: cmp(s.fromDeg) }) : '',
      gust: fin(s.gustKt) ? t('fc.cap.gust', { kt: n0(s.gustKt) }) : '', kt: `${n0(s.windKt!)} kt`,
      pose: null, heelK: t('fc.sail.heel'), heelNow: t('fc.sail.heelNow', { d: '{d}' }), reefK: t('fc.sail.reef'), noGoK: t('fc.sail.noGo'),
      coastK: t('fc.sail.coast'), windK: t('fc.sail.wind'), ruleK: t('fc.sail.rule'),
    };
    if (fin(s.fromDeg)) {
      const q = coastPose(s.fromDeg, REGION.coastTrendDeg);
      const pos = (k: PointOfSail) => t(`route.sail.${k}` as Key).toLowerCase();
      base.sail.pose = {
        ...q,
        leg: q.beat ? t('fc.sail.beat', { dir: cmp(q.courseDeg), twa: n0(q.twa) }) : t('fc.sail.leg', { dir: cmp(q.courseDeg), sail: pos(q.sail), twa: n0(q.twa) }),
        otherLeg: t('fc.sail.leg', { dir: cmp(q.other.courseDeg), sail: pos(q.other.sail), twa: n0(q.other.twa) }),
        tackK: t(`fc.sail.tack.${q.tack}` as Key),
        heel: heelDeg(s.windKt!, q.twa), heelGust: heelDeg(fin(s.gustKt) ? Math.max(s.gustKt, s.windKt!) : s.windKt!, q.twa),
      };
    }
    base.ok = true;
  }
  if (r.fish && r.score !== null) {
    const f = r.fish;
    const tz = REGION.tzOffsetH;
    const d0 = localDayStart(ctx.ms, tz);
    const day = dayHoursOf(ctx.tl, ctx.ms);
    const win = ctx.plan?.days[planDayOf(ctx.plan, ctx.ms)] ?? null;
    const tn = tideNow(ctx.deps.env, ctx.ms);
    const turnH = (tn.next.t - d0) / H;
    const age = moonAgeDays(moonPhase(ctx.ms).elongation);
    base.fish = {
      illum: f.moonIllum, waxing: f.moonPhase <= 4, age,
      moon: t('fc.cap.moon', { p: n0(f.moonIllum * 100), d: n0(age) }),
      tide: day.map((h) => h.tideM), nowH: (ctx.ms - d0) / H,
      best: win && win.dayMs === d0 ? [(win.startMs - d0) / H, (win.endMs - d0) / H] : null,
      turn: turnH <= 24 ? { h: turnH, label: sentence(t(`fc.tide.next.${tn.next.type}` as Key, { t: localClock(tn.next.t) })) } : null,
      share: r.share ?? 0, tideK: t('fc.cap.tide'), bestK: t('fc.cap.best'), nowK: t('fc.now'), echo: t('fc.cap.echo', { w: levelWord(r) }),
    };
  }
  if (r.swim && r.score !== null) {
    const s = r.swim;
    base.swim = {
      rip: s.rip, ripK: `${t('fc.ripRisk')} · ${t(`fc.ripw.${s.rip}` as Key).toLowerCase()}`, shore: t('fc.cap.shore', { m: n1(s.breakerM) }),
      flag: t(`fc.flagw.${s.rip}` as Key), uv: fin(s.uv) ? s.uv : null, uvK: fin(s.uv) ? `UV ${n0(s.uv)}` : '',
    };
  }
  if (r.water && r.score !== null) {
    const w = r.water;
    base.water = {
      visM: w.visM, vis: w.visM === null ? '' : t('fc.cap.vis', { m: w.visM >= 10 ? n0(w.visM) : n1(w.visM) }), depthM: w.depthM,
      waterM: w.waterM, overReef: w.waterM === null ? '' : t('fc.cap.overReef', { m: n1(w.waterM) }),
      chop: w.windKt === null ? '' : `${t('fc.chop')} · ${t(`fc.chop.${chopFor(w.windKt)}` as Key).toLowerCase()}`,
      hvis: t('fc.cap.hvis'), at: t('fc.cap.at', { d: w.depthM }), surge: `${t('fc.cap.surge')} · ${t(`fc.surge.${w.surge}` as Key).toLowerCase()}`, surgeMs: w.surgeMs,
    };
  }
  return base;
}

/** The headline number's breathing: font width and weight following the swell period, the gusts, the tide. */
export function numVar(p: HeroParams, tt: number, reduced: boolean): [number, number] {
  if (reduced) return [86, 800];
  switch (p.act) {
    case 'surf': return [84 + 12 * Math.sin((TAU * tt) / (p.surf?.period || 10)), 800];
    case 'sail': { const g = gust(tt); return [72 + 36 * g, 760 + 140 * g]; }
    case 'fish': return [86, 700 + 160 * (0.5 + 0.5 * Math.cos((TAU * tt) / 26))];
    case 'swim': return [84 + 8 * Math.sin((TAU * tt) / 9), 800];
    default: return [86 + 6 * Math.sin((TAU * tt) / 8), 640 + 220 * (0.5 + 0.5 * Math.sin((TAU * tt) / 8))];
  }
}
/** The widest the number gets (to fit it to its box). */
export const VMAX: Record<FcActivity, [number, number]> = { surf: [96, 800], sail: [108, 900], fish: [86, 860], swim: [92, 800], snorkel: [92, 860], dive: [92, 860], spear: [92, 860] };

/** Gust envelope 0..1: smooth gusts roughly every 7 s (illustrative motion, the numbers are the reading's). */
export function gust(tt: number) {
  let g = 0;
  const k = Math.floor(tt / 7);
  for (let j = k - 1; j <= k + 1; j++) {
    const c = j * 7 + 3.5 + 2.2 * Math.sin(j * 12.9898), amp = 0.55 + 0.45 * Math.abs(Math.sin(j * 78.233));
    const d = (tt - c) / 1.3;
    g = Math.max(g, amp * Math.exp(-d * d));
  }
  return g;
}
const nz = (x: number, y: number, tt: number) =>
  Math.sin(x * 0.0031 + tt * 0.13 + Math.sin(y * 0.0047 - tt * 0.09) * 1.7) + Math.cos(y * 0.0029 - tt * 0.11 + Math.sin(x * 0.0041 + tt * 0.05) * 1.3);

const lvKey = (l: Level | null, p: 'lv' | 'on' | 'ac') => (l === null ? (`${p}n` as const) : (`${p}${l}` as const));

/** The hero's two canvases: the particle field (trails fade) and the crisp diagram over it. */
export class HeroEngine {
  private fctx: Ctx2D;
  private octx: Ctx2D;
  private W = 0;
  private H = 0;
  private AR = { x: 0, y: 0, w: 1, h: 1 };
  private N = 0;
  private PX = new Float32Array(0);
  private PY = new Float32Array(0);
  private OX = new Float32Array(0);
  private OY = new Float32Array(0);
  private LF = new Float32Array(0);
  private ML = new Float32Array(0);
  private PZ = new Float32Array(0);
  private onCol: number[] = [0, 0, 0];
  private fdCol: number[] = [0, 0, 0];
  private modeT0 = 0;
  private T: Tokens | null = null;
  p: HeroParams = { act: 'surf', level: null, ok: false };
  reduced = false;
  private SN = { a: 0, v: 0, h: 10, hv: 0, t: 0 };
  private paths: number[][] = Array.from({ length: 5 }, () => []);

  constructor(private fx: HTMLCanvasElement, private ov: HTMLCanvasElement, private box: HTMLElement, private art: HTMLElement) {
    this.fctx = fx.getContext('2d')!;
    this.octx = ov.getContext('2d')!;
  }
  setTokens(T: Tokens, snap = false) {
    this.T = T;
    if (snap) (this.onCol = [...this.on()]), (this.fdCol = [...this.fd()]);
    this.fctx.clearRect(0, 0, this.W, this.H);
  }
  private on(): RGB { return this.T ? this.T[lvKey(this.p.level, 'on')] : [0, 0, 0]; }
  private fd(): RGB { return this.T ? this.T[lvKey(this.p.level, 'lv')] : [200, 200, 200]; }
  /** New reading. A new activity restarts the field; a new hour of the same one only retunes it. */
  set(p: HeroParams, now: number) {
    const modeChanged = p.act !== this.p.act || !this.N;
    this.p = p;
    if (p.sail?.fromDeg !== undefined && p.sail.fromDeg !== null && modeChanged) this.SN.a = p.sail.fromDeg;
    if (modeChanged) {
      this.modeT0 = now;
      this.init();
    }
  }
  resize() {
    const r = this.box.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const c of [this.fx, this.ov]) {
      c.width = Math.max(1, Math.round(this.W * dpr));
      c.height = Math.max(1, Math.round(this.H * dpr));
    }
    this.fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const a = this.art.getBoundingClientRect();
    this.AR = { x: a.left - r.left, y: a.top - r.top, w: Math.max(1, a.width), h: Math.max(1, a.height) };
    this.init();
  }
  private dots() { return this.p.act === 'snorkel' || this.p.act === 'dive' || this.p.act === 'spear'; }
  private shoreY() { return this.AR.y + this.AR.h * 0.8; }
  private spawn(i: number, anywhere: boolean) {
    const x = Math.random() * this.W;
    const y = this.p.act === 'swim' ? Math.random() * this.shoreY() : Math.random() * this.H;
    this.PX[i] = this.OX[i] = x;
    this.PY[i] = this.OY[i] = y;
    this.LF[i] = anywhere ? Math.random() * 4 : 0;
    this.ML[i] = 2 + Math.random() * 5;
    this.PZ[i] = Math.random();
  }
  private init() {
    const area = this.W * this.H;
    let N = this.dots() ? clamp((area / 520) | 0, 320, 1700) : clamp((area / 250) | 0, 900, 4200);
    if (this.p.act === 'sail') N = (N * 0.8) | 0;
    this.N = N;
    this.PX = new Float32Array(N); this.PY = new Float32Array(N); this.OX = new Float32Array(N); this.OY = new Float32Array(N);
    this.LF = new Float32Array(N); this.ML = new Float32Array(N); this.PZ = new Float32Array(N);
    for (let i = 0; i < N; i++) this.spawn(i, true);
    this.fctx.clearRect(0, 0, this.W, this.H);
  }
  /** Velocity (px/s) and brightness at a point. */
  private vel(x: number, y: number, tt: number, out: number[]) {
    const p = this.p, { W, H: Hh, AR } = this;
    if (p.act === 'surf') {
      const per = p.surf?.period ?? 10, m = p.surf?.hb ?? 0.3, dir = p.surf?.dir ?? 60;
      const B = (dir + 180) * D2R, dx = Math.sin(B), dy = -Math.cos(B), nx = -dy, ny = dx;
      const lam = clamp(Math.max(W, Hh) * 0.2, 150, 320), k = TAU / lam, w = TAU / per;
      const ph = k * (x * dx + y * dy) - w * tt, c = (lam / per) * 0.5, A = 9 + 9 * Math.min(m, 3), n = nz(x, y, tt) * 5;
      const cp = Math.cos(ph), sp = Math.sin(ph);
      out[0] = dx * (c + A * cp) + nx * (A * 0.55 * sp + n);
      out[1] = dy * (c + A * cp) + ny * (A * 0.55 * sp + n);
      out[2] = 0.5 + 0.5 * cp;
    } else if (p.act === 'sail') {
      const kt = p.sail?.windKt ?? 6, g = gust(tt), gk = p.sail?.gustKt ?? kt, gf = 1 + (kt > 0 ? (gk / kt - 1) * g : 0);
      const B = ((p.sail?.fromDeg ?? 70) + 180) * D2R + 0.1 * nz(x * 1.3, y * 1.3, tt * 2), v = Math.max(2, kt) * 11 * gf;
      out[0] = Math.sin(B) * v; out[1] = -Math.cos(B) * v; out[2] = 0.35 + 0.55 * g;
    } else if (p.act === 'fish') {
      const U = 34 * Math.cos((TAU * tt) / 26), n = nz(x, y, tt * 0.6);
      out[0] = U + 10 * n; out[1] = 9 * Math.sin(x * 0.006 + tt * 0.2) + 5 * n; out[2] = 0.45 + 0.35 * Math.abs(Math.cos((TAU * tt) / 26));
    } else if (p.act === 'swim') {
      // The rip runs out through the gap in the crests; stronger with the risk.
      const rk = p.swim ? { LOW: 0.45, MOD: 0.75, HIGH: 1 }[p.swim.rip] : 0.5;
      const Y = this.shoreY(), cx = AR.x + AR.w * 0.56, dx = x - cx, inX = x > AR.x - 40 && x < AR.x + AR.w + 40 ? 1 : 0;
      const g = Math.exp(-sq(dx / (AR.w * 0.065))), near = clamp(1 - (Y - y) / (AR.h * 0.38), 0, 1);
      const yh = Y - AR.h * 0.66, head = Math.exp(-sq((y - yh) / (AR.h * 0.1))) * Math.exp(-sq(dx / (AR.w * 0.2)));
      let vx = nz(x, y, tt) * 6, vy = 16 * (1 - g * inX);
      if (inX) {
        vx += -Math.sign(dx) * 30 * near * (1 - g) * Math.exp(-sq(dx / (AR.w * 0.45))) + Math.sign(dx) * 46 * head * rk;
        vy -= 70 * rk * g * clamp((y - yh + AR.h * 0.1) / (AR.h * 0.4), 0, 1) + 22 * head * rk;
        vy *= 1 - near * 0.55 * (1 - g);
      }
      out[0] = vx; out[1] = vy; out[2] = inX ? 0.35 + 0.6 * g + 0.4 * head : 0.3;
    } else {
      const n = nz(x, y, tt * 0.5), sg = clamp((p.water?.surgeMs ?? 0.1) / 0.3, 0.3, 2);
      const surge = p.act === 'dive' || p.act === 'spear' ? 16 * sg * Math.sin((TAU * tt) / 8) : 4 * Math.sin((TAU * tt) / 6);
      out[0] = -4 + surge + 4 * n; out[1] = (p.act === 'dive' || p.act === 'spear' ? 3.5 : 0.5) + 3 * Math.sin(x * 0.01 + tt * 0.3); out[2] = 1;
    }
  }
  private V = [0, 0, 0];
  /** One frame of the field. */
  step(dt: number, tt: number) {
    if (!this.T) return;
    const on = this.on(), fd = this.fd();
    for (let i = 0; i < 3; i++) (this.onCol[i] = lerp(this.onCol[i], on[i], Math.min(1, dt * 4))), (this.fdCol[i] = lerp(this.fdCol[i], fd[i], Math.min(1, dt * 3.2)));
    const c = this.fctx, { W, H: Hh, AR } = this;
    const mA = clamp((tt - this.modeT0) / 0.8, 0, 1);
    const dots = this.dots();
    if (dots) c.clearRect(0, 0, W, Hh);
    else {
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = `rgba(0,0,0,${this.p.act === 'sail' ? 0.16 : 0.085})`;
      c.fillRect(0, 0, W, Hh);
      c.globalCompositeOperation = 'source-over';
    }
    const BUCK = 5, paths = this.paths;
    for (const b of paths) b.length = 0;
    const Y = this.shoreY(), vis = this.p.water?.visM ?? 6, V = this.V;
    const { PX, PY, OX, OY, LF, ML, PZ } = this;
    for (let i = 0; i < this.N; i++) {
      OX[i] = PX[i]; OY[i] = PY[i];
      this.vel(PX[i], PY[i], tt, V);
      PX[i] += V[0] * dt; PY[i] += V[1] * dt; LF[i] += dt;
      const x = PX[i], y = PY[i];
      if (x < -20 || x > W + 20 || y < -20 || y > Hh + 20 || LF[i] > ML[i] || (this.p.act === 'swim' && y > Y)) {
        if (dots) {
          if (x < -20) PX[i] = OX[i] = W + 10; else if (x > W + 20) PX[i] = OX[i] = -10;
          if (y > Hh + 20) PY[i] = OY[i] = -10; else if (y < -20) PY[i] = OY[i] = Hh + 10;
          LF[i] = 0;
          continue;
        }
        this.spawn(i, false);
        continue;
      }
      let br: number;
      if (dots) {
        const d = clamp((x - AR.x) / AR.w, 0, 1) * 20, f = clamp(1 - d / Math.max(0.5, vis), 0, 1);
        br = Math.pow(f, 1.3) * (0.35 + 0.65 * PZ[i]);
      } else {
        const life = LF[i] / ML[i], fade = Math.min(1, life * 6, (1 - life) * 4);
        br = V[2] * fade;
      }
      const b = Math.min(BUCK - 1, (br * BUCK) | 0);
      if (br > 0.02) paths[b].push(i);
    }
    if (dots) {
      for (let b = 0; b < BUCK; b++) {
        const L = paths[b];
        if (!L.length) continue;
        c.fillStyle = rgba(this.onCol as unknown as RGB, ((b + 0.5) / BUCK) * 0.72 * mA);
        c.beginPath();
        for (const i of L) {
          const d = clamp((PX[i] - AR.x) / AR.w, 0, 1), r = 0.6 + 2.1 * (1 - d) * (0.4 + 0.6 * PZ[i]);
          c.moveTo(PX[i] + r, PY[i]); c.arc(PX[i], PY[i], r, 0, TAU);
        }
        c.fill();
      }
    } else {
      c.lineWidth = this.p.act === 'sail' ? 1.1 : 1;
      for (let b = 0; b < BUCK; b++) {
        const L = paths[b];
        if (!L.length) continue;
        c.strokeStyle = rgba(this.onCol as unknown as RGB, (0.1 + ((b + 0.5) / BUCK) * 0.62) * mA);
        c.beginPath();
        for (const i of L) { c.moveTo(OX[i], OY[i]); c.lineTo(PX[i], PY[i]); }
        c.stroke();
      }
    }
  }
  /** The diagram, redrawn each frame. */
  overlay(tt: number) {
    const c = this.octx;
    c.clearRect(0, 0, this.W, this.H);
    if (!this.T || !this.p.ok) return;
    const mA = clamp((tt - this.modeT0 - 0.15) / 0.7, 0, 1);
    if (mA <= 0) return;
    c.save();
    c.globalAlpha = mA;
    const on = this.onCol as unknown as RGB;
    const S: Style = { ink: rgba(on, 1), soft: rgba(on, 0.68), faint: rgba(on, 0.24), on, fd: this.fdCol as unknown as RGB, T: this.T, reduced: this.reduced };
    c.fillStyle = S.ink; c.strokeStyle = S.ink;
    const p = this.p, A = this.AR;
    if (p.act === 'surf' && p.surf) drawSurf(c, A, tt, p.surf, S);
    else if (p.act === 'sail' && p.sail) drawSail(c, A, tt, p.sail, S, this.SN);
    else if (p.act === 'fish' && p.fish) drawFish(c, A, tt, p.fish, S);
    else if (p.act === 'swim' && p.swim) drawSwim(c, A, tt, p.swim, S, this.shoreY());
    else if (p.act === 'snorkel' && p.water) drawSnorkel(c, A, tt, p.water, S);
    else if ((p.act === 'dive' || p.act === 'spear') && p.water) drawDive(c, A, tt, p.water, S, p.act);
    c.restore();
  }
  /** A still frame for reduced motion: the field run for a moment, then held. */
  still() {
    const tt = 3.2;
    this.modeT0 = -10;
    this.onCol = [...this.on()];
    this.fdCol = [...this.fd()];
    this.fctx.clearRect(0, 0, this.W, this.H);
    const steps = this.dots() ? 1 : 70;
    for (let i = 0; i < steps; i++) this.step(1 / 30, tt + i / 30);
    this.overlay(tt);
  }
}

interface Style { ink: string; soft: string; faint: string; on: RGB; fd: RGB; T: Tokens; reduced: boolean }
type Box = { x: number; y: number; w: number; h: number };

function drawSurf(c: Ctx2D, A: Box, tt: number, s: NonNullable<HeroParams['surf']>, S: Style) {
  const { x, y, w, h } = A, maxM = Math.max(2.2, s.hi * 1.2);
  const base = y + h - 14, top = y + 30, mpx = (base - top) / maxM, lx = x + 40;
  const rx = x + w - 58;
  for (const [m, n] of s.guides) {
    if (m > maxM) continue;
    const yy = base - m * mpx;
    c.strokeStyle = S.faint; c.lineWidth = 1; c.setLineDash([2, 4]); c.beginPath(); c.moveTo(lx, yy); c.lineTo(rx, yy); c.stroke(); c.setLineDash([]);
    c.fillStyle = S.ink; txt(c, n, x + w, yy, 'right', 10.5, 700);
    c.fillStyle = S.soft; txt(c, m.toFixed(1), x, yy, 'left', 10.5);
  }
  c.strokeStyle = S.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, base); c.lineTo(rx, base); c.stroke();
  c.fillStyle = S.soft; txt(c, '0 m', x, base, 'left', 10.5);
  // Swell crests travelling across on the swell's own period, their faces between the range's two ends.
  const w0 = TAU / Math.max(4, s.period), lam = Math.max(170, (rx - lx) * 0.62), mid = (s.lo + s.hi) / 2, half = (s.hi - s.lo) / 2;
  const hAt = (xx: number) => {
    const u = (xx - lx) / lam, ph = TAU * u - w0 * tt;
    const crest = mid + half * Math.sin(w0 * tt * 0.5 + u * 1.3);
    return base - (crest * Math.pow(0.5 + 0.5 * Math.cos(ph), 2.2) + 0.04) * mpx;
  };
  hatch(c, lx, rx, top, base - 1, hAt, 3.2, rgba(S.on, 0.78));
  c.strokeStyle = S.ink; c.lineWidth = 2.4; c.beginPath();
  for (let xx = lx; xx <= rx; xx += 3) { const yy = hAt(xx); xx === lx ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
  c.stroke();
  // The range bracket.
  const y1 = base - s.hi * mpx, y2 = base - s.lo * mpx;
  c.fillStyle = S.ink; c.fillRect(lx - 12, y1, 6, Math.max(2, y2 - y1));
  c.fillStyle = S.ink; txt(c, s.caption, lx - 12, y + 6, 'left', 10.5, 700);
  drawPerson(c, rx - 2, base, mpx, tt, S, rx);
}

/** The figure's halo, shorts and board deck: light on every level colour, in both themes. */
const CREAM: RGB = [255, 246, 232];
/** Typical shortboard, m: the figure is drawn at BODY_M.head on the same scale, so the board reads true beside it. */
export const BOARD_M = { len: 1.85, wid: 0.5 } as const;

/**
 * A standing adult with a shortboard planted behind, drawn to the wave scale: feet on the 0 m line, the crown at
 * BODY_M.head (1.7 m) on the same metres-to-pixels scale as the crests and guide lines, the board at its real length.
 * Only the left half is drawn, highly translucent, at the right end of the chart (`cx` is its centre line, `edge` the label's
 * right limit), so the waves and numbers read through it. A light halo keeps it legible on every level colour; the arms and chest ease gently so it is alive
 * without moving the scale (still under reduced motion).
 */
function paintPerson(c: Ctx2D, cx: number, base: number, mpx: number, tt: number, S: Style) {
  const u = BODY_M.head * mpx; // crown height in px
  const br = S.reduced ? 0 : Math.sin(tt * 1.6), sway = S.reduced ? 0 : Math.sin(tt * 0.7);
  const cream = (a: number) => rgba(CREAM, a);
  c.save();
  // Contact shadow on the sand line.
  c.fillStyle = rgba(S.on, 0.22);
  c.beginPath(); c.ellipse(cx - 0.04 * u, base + 1, 0.3 * u, 0.022 * u + 1, 0, 0, TAU); c.fill();

  // The board: nose up, leaning back and a little left, tail in the sand, a stringer, a rail stripe and a deck panel.
  const L = BOARD_M.len * mpx, Wd = BOARD_M.wid * mpx, lean = -0.13 + 0.004 * sway;
  c.save();
  c.translate(cx - 0.17 * u, base);
  c.rotate(lean);
  const bp = () => {
    c.beginPath();
    c.moveTo(0, -L); // nose
    c.bezierCurveTo(Wd * 0.46, -L * 0.82, Wd * 0.52, -L * 0.42, Wd * 0.46, -L * 0.12);
    c.bezierCurveTo(Wd * 0.44, -L * 0.03, Wd * 0.3, 0, Wd * 0.14, 0); // tail
    c.lineTo(-Wd * 0.14, 0);
    c.bezierCurveTo(-Wd * 0.3, 0, -Wd * 0.44, -L * 0.03, -Wd * 0.46, -L * 0.12);
    c.bezierCurveTo(-Wd * 0.52, -L * 0.42, -Wd * 0.46, -L * 0.82, 0, -L);
    c.closePath();
  };
  bp(); c.fillStyle = cream(0.96); c.fill();
  c.save(); bp(); c.clip();
  c.fillStyle = rgba(S.on, 0.9); c.fillRect(-Wd, -L * 0.7, Wd * 2, L * 0.16); // stripe
  c.fillStyle = rgba(S.on, 0.9); c.fillRect(-Wd, -L * 0.5, Wd * 2, L * 0.03);
  c.fillStyle = rgba(S.fd, 0.5); c.beginPath(); c.moveTo(-Wd, -L * 0.2); c.lineTo(Wd, -L * 0.28); c.lineTo(Wd, -L * 0.08); c.lineTo(-Wd, -L * 0.02); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = rgba(S.on, 1); c.lineWidth = 2; bp(); c.stroke();
  c.lineWidth = 1; c.strokeStyle = rgba(S.on, 0.55); c.beginPath(); c.moveTo(0, -L * 0.96); c.lineTo(0, -L * 0.03); c.stroke();
  c.restore();

  const hipY = base - 0.5 * u, shY = base - 0.8 * u - 0.004 * u * br, neckY = base - 0.855 * u;
  const headR = 0.062 * u, headY = base - 0.935 * u, hx = cx + sway * 0.004 * u;
  const limbs = (col: string, grow: number) => {
    c.strokeStyle = col;
    for (const sd of [-1, 1]) {
      capsule(c, hx + sd * 0.045 * u, hipY, cx + sd * 0.042 * u, base - 0.26 * u, 0.066 * u + grow);
      capsule(c, cx + sd * 0.042 * u, base - 0.26 * u, cx + sd * 0.046 * u, base - 0.03 * u, 0.05 * u + grow);
      capsule(c, cx + sd * 0.046 * u, base - 0.014 * u, cx + sd * 0.085 * u, base - 0.014 * u, 0.026 * u + grow);
    }
    capsule(c, hx, shY + 0.07 * u, hx, hipY - 0.02 * u, 0.13 * u + grow);
    capsule(c, hx - 0.085 * u, shY + 0.012 * u, hx + 0.085 * u, shY + 0.012 * u, 0.06 * u + grow);
    for (const sd of [-1, 1]) {
      const el = 0.03 * u * (1 + 0.5 * br * sd);
      capsule(c, hx + sd * 0.095 * u, shY + 0.02 * u, hx + sd * (0.12 * u + el), base - 0.57 * u, 0.042 * u + grow);
      capsule(c, hx + sd * (0.12 * u + el), base - 0.57 * u, hx + sd * 0.115 * u, base - 0.4 * u, 0.036 * u + grow);
    }
    capsule(c, hx, shY - 0.02 * u, hx, neckY, 0.04 * u + grow);
  };
  limbs(cream(0.9), 0.022 * u);
  c.fillStyle = cream(0.9); c.beginPath(); c.arc(hx, headY, headR + 0.018 * u, 0, TAU); c.fill();
  limbs(S.ink, 0);
  c.fillStyle = S.ink; c.beginPath(); c.arc(hx, headY, headR, 0, TAU); c.fill();
  // Board shorts: a light panel with a level-colour drawstring band.
  c.strokeStyle = cream(0.97);
  capsule(c, hx, hipY - 0.03 * u, hx, hipY + 0.03 * u, 0.15 * u);
  for (const sd of [-1, 1]) capsule(c, hx + sd * 0.045 * u, hipY + 0.02 * u, cx + sd * 0.043 * u, base - 0.34 * u, 0.07 * u);
  c.strokeStyle = rgba(S.on, 0.9); c.lineWidth = Math.max(1.5, 0.014 * u);
  c.beginPath(); c.moveTo(hx - 0.075 * u, hipY - 0.045 * u); c.lineTo(hx + 0.075 * u, hipY - 0.045 * u); c.stroke();
  c.restore();
}

/** Opacity of the whole figure over the chart. */
const PERSON_ALPHA = 0.3;
/**
 * The left half of the figure and board (`cx` is the centre line), drawn as ONE solid image and then faded as a whole,
 * so overlapping limbs and board never show through each other (no joints, no wire look); the height tick and label
 * stay crisp (`edge` is the label's right limit).
 */
export function drawPerson(c: Ctx2D, cx: number, base: number, mpx: number, tt: number, S: Style, edge = cx + 40) {
  const u = BODY_M.head * mpx; // crown height in px
  if (!(u > 8) || !Number.isFinite(cx)) return;
  const ox = cx - 0.9 * u, oy = base - 1.25 * u, w = 0.9 * u, h = 1.3 * u;
  const dpr = typeof c.getTransform === 'function' ? Math.max(1, c.getTransform().a || 1) : 1;
  let layer: HTMLCanvasElement | null = null;
  if (typeof document !== 'undefined') {
    try {
      layer = document.createElement('canvas');
      layer.width = Math.max(1, Math.ceil(w * dpr)); layer.height = Math.max(1, Math.ceil(h * dpr));
    } catch { layer = null; }
  }
  const lc = layer?.getContext('2d') ?? null;
  if (layer && lc) {
    lc.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    paintPerson(lc, cx, base, mpx, tt, S);
    c.save();
    c.globalAlpha = (typeof c.globalAlpha === 'number' ? c.globalAlpha : 1) * PERSON_ALPHA;
    c.drawImage(layer, ox, oy, w, h);
    c.restore();
  } else {
    // No offscreen canvas (tests): draw directly, clipped to the left half.
    c.save();
    c.beginPath(); c.rect(ox, oy, w, h); c.clip();
    paintPerson(c, cx, base, mpx, tt, S);
    c.restore();
  }
  // Height tick at the crown and the label, kept inside the chart's right edge.
  c.save();
  c.strokeStyle = S.soft; c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx - 0.14 * u, base - u); c.lineTo(edge, base - u); c.stroke();
  c.fillStyle = S.ink; txt(c, t('fc.g.person'), edge, Math.max(base - 1.17 * u, 8), 'right', 10.5, 700);
  c.restore();
}

/**
 * SAIL, drawn after the chart-room mockup in the Kinetic Plus ink: on the left a wind rose (bezel with degree ticks,
 * a hairline 16-point star, the no-go wedge either side of the wind, the gust sector hatched on the bezel, the
 * needle from the wind's side with its barbs) and at its hub the boat seen from above on the harder coast leg, its
 * main and jib eased to leeward for the point of sail, the wind angle off the bow arced and numbered. On the right
 * the same boat in section seen from astern (starboard on the right), heeled to leeward by the rule-of-thumb heel
 * (physics/heel.ts) on a protractor with the reef band, a ghost at the gust heel and the wind blowing across. Under
 * it the 0-30 kt scale, the mean solid and the gusts hatched.
 */
function drawSail(c: Ctx2D, A: Box, tt: number, a: NonNullable<HeroParams['sail']>, S: Style, SN: { a: number; v: number; h: number; hv: number; t: number }) {
  const { x, y, w, h } = A, g = S.reduced ? 0.55 : gust(tt), P = a.pose;
  const dt = S.reduced ? 1 : clamp(tt - SN.t, 0, 0.05);
  SN.t = tt;
  const from = a.fromDeg ?? 0;
  const tgtA = from + (S.reduced ? 0 : 3 * Math.sin(tt * 0.6) + 2 * Math.sin(tt * 1.7) + 4 * g);
  const tgtH = P ? P.heel + (P.heelGust - P.heel) * g + (S.reduced ? 0 : 0.8 * Math.sin((tt * TAU) / 6)) : 0;
  if (S.reduced) (SN.a = tgtA), (SN.h = tgtH);
  else {
    // The short way round, so 350° → 10° swings 20°.
    const da = ((((tgtA - SN.a) % 360) + 540) % 360) - 180;
    SN.v += (da * 7 - SN.v * 2.6) * dt; SN.a += SN.v * dt;
    SN.hv += ((tgtH - SN.h) * 5 - SN.hv * 2.2) * dt; SN.h += SN.hv * dt;
  }
  // Points on the rose: 0° up, clockwise, like a compass card.
  const pol = (r: number, d: number): [number, number] => [cx + Math.sin(d * D2R) * r, cy - Math.cos(d * D2R) * r];
  const line = (p: [number, number], q: [number, number]) => { c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); };
  const wedge = (r0: number, r1: number, d0: number, d1: number) => {
    c.beginPath(); c.arc(cx, cy, r1, (d0 - 90) * D2R, (d1 - 90) * D2R); c.arc(cx, cy, r0, (d1 - 90) * D2R, (d0 - 90) * D2R, true); c.closePath();
  };
  const stripes = (gap: number, col: string) => {
    c.strokeStyle = col; c.lineWidth = 1; c.beginPath();
    for (let k = -2 * R; k < 2 * R; k += gap) { c.moveTo(cx + k - R, cy + R); c.lineTo(cx + k + R, cy - R); }
    c.stroke();
  };

  // --- The rose.
  const R = Math.max(40, Math.min(h * 0.37, w * 0.235)), ri = R - Math.max(11, R * 0.13);
  const cx = x + R + 4, cy = y + R + 10;
  c.lineCap = 'butt';
  if (a.fromDeg !== null) {
    // No-go wedge either side of the wind, inside the card.
    c.save(); wedge(0, ri, from - 40, from + 40); c.fillStyle = rgba(S.on, 0.07); c.fill(); c.clip(); stripes(5, rgba(S.on, 0.1)); c.restore();
    // Gust sector on the bezel, hatched; it widens with the gust.
    const sp = 12 + 8 * g;
    c.save(); wedge(ri, R, from - sp, from + sp); c.fillStyle = rgba(S.on, 0.18 + 0.16 * g); c.fill(); c.clip(); stripes(4, rgba(S.on, 0.6)); c.restore();
  }
  c.strokeStyle = S.ink; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.lineWidth = 1; c.strokeStyle = S.soft; c.beginPath(); c.arc(cx, cy, ri, 0, TAU); c.stroke();
  for (let d = 0; d < 360; d += 5) {
    const l = d % 30 === 0 ? R - ri : d % 10 === 0 ? (R - ri) * 0.6 : (R - ri) * 0.35;
    c.strokeStyle = d % 30 === 0 ? S.ink : S.soft; c.lineWidth = d % 30 === 0 ? 1.6 : 1;
    c.beginPath(); line(pol(R, d), pol(R - l, d)); c.stroke();
  }
  // Hairline 16-point star and the dotted ring, as on a chart's compass rose.
  c.strokeStyle = S.faint; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < 16; i++) {
    const d = i * 22.5, rr = i % 4 === 0 ? ri * 0.62 : i % 2 === 0 ? ri * 0.42 : ri * 0.28;
    const p = pol(rr, d), q1 = pol(ri * 0.08, d - 11.25), q2 = pol(ri * 0.08, d + 11.25);
    c.moveTo(q1[0], q1[1]); c.lineTo(p[0], p[1]); c.lineTo(q2[0], q2[1]);
  }
  c.stroke();
  c.setLineDash([1, 4]); c.beginPath(); c.arc(cx, cy, ri * 0.76, 0, TAU); c.stroke(); c.setLineDash([]);
  const small = R < 70;
  for (let d = 30; d < 360; d += 30) if (d % 90) { const p = pol(ri - 9, d); c.fillStyle = S.soft; txt(c, String(d).padStart(3, '0'), p[0], p[1], 'center', small ? 7.5 : 8.5, 600); }
  c.fillStyle = S.ink; c.font = `800 ${Math.round(Math.max(11, R * 0.15))}px ${DISP}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  ([['N', 0], ['E', 90], ['S', 180], [t('hemi.W'), 270]] as const).forEach(([s, d]) => { const p = pol(ri - 11, d); c.fillText(s, p[0], p[1]); });

  const L = ri * 0.62; // boat length on the card
  if (P) {
    // The coast line through the hub, the leg's course ahead of the bow.
    c.strokeStyle = S.soft; c.lineWidth = 1; c.setLineDash([5, 4]); c.beginPath(); line(pol(ri * 0.98, P.courseDeg), pol(ri * 0.98, P.courseDeg + 180)); c.stroke(); c.setLineDash([]);
    const ce = pol(ri * 0.66, P.courseDeg + 180), ang = ((P.courseDeg + 180) % 180) - 90; // label along the line, upright
    c.save(); c.translate(ce[0], ce[1]); c.rotate(ang * D2R); c.fillStyle = S.soft; txt(c, a.coastK, 0, -6, 'center', 7.5, 700); c.restore();
    // The wind angle off the bow, arced and numbered.
    const rel = ((((from - P.headingDeg) % 360) + 540) % 360) - 180, ra = ri * 0.5;
    const d0 = rel >= 0 ? P.headingDeg : P.headingDeg + rel, d1 = rel >= 0 ? P.headingDeg + rel : P.headingDeg;
    c.strokeStyle = S.ink; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, ra, (d0 - 90) * D2R, (d1 - 90) * D2R); c.stroke();
    c.beginPath(); line(pol(ra - 4, P.headingDeg), pol(ra + 4, P.headingDeg)); c.stroke();
    const lp = pol(ra + 10, P.headingDeg + rel / 2);
    c.fillStyle = S.ink; txt(c, `${Math.round(P.twa)}°`, lp[0], lp[1], 'center', small ? 8.5 : 9.5, 800);
  }
  if (a.fromDeg !== null) {
    // Needle from the wind's side to the boat, the head towards it; barbs on the tail (a full barb 10 kt, a half 5 kt).
    const an = SN.a * D2R, ux = Math.sin(an), uy = -Math.cos(an), px = -uy, py = ux;
    const tail = R + 14, head = P ? L * 0.72 : 10;
    c.strokeStyle = S.ink; c.fillStyle = S.ink; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + ux * tail, cy + uy * tail); c.lineTo(cx + ux * (head + 10), cy + uy * (head + 10)); c.stroke();
    c.beginPath(); c.moveTo(cx + ux * head, cy + uy * head); c.lineTo(cx + ux * (head + 13) + px * 6, cy + uy * (head + 13) + py * 6); c.lineTo(cx + ux * (head + 13) - px * 6, cy + uy * (head + 13) - py * 6); c.closePath(); c.fill();
    const barb = (d: number, len: number) => { const bx = cx + ux * d, by = cy + uy * d; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + (ux * 0.5 + px) * len, by + (uy * 0.5 + py) * len); c.stroke(); };
    c.lineWidth = 2.4;
    const full = Math.floor(Math.round(a.windKt / 5) / 2), half = Math.round(a.windKt / 5) % 2;
    let d = tail;
    for (let i = 0; i < Math.min(full, 5); i++, d -= 7) barb(d, 13);
    if (half) barb(d, 7);
    c.lineCap = 'butt';
    // The no-go label inside the wedge, on the needle's side away from the bow (clear of the wind-angle number).
    const side = P && ((((P.headingDeg - from) % 360) + 360) % 360) < 180 ? -1 : 1, nd = from + side * 27, np = pol(ri * 0.6, nd);
    c.save(); c.translate(np[0], np[1]); c.rotate(((((nd % 180) + 180) % 180) - 90) * D2R); c.fillStyle = S.soft; txt(c, a.noGoK, 0, 0, 'center', 7, 700); c.restore();
  }
  if (P) {
    // The boat from above: bow along the heading, starboard on +x before the turn; main and jib eased to leeward.
    const lee = P.tack === 'port' ? 1 : -1, bw = L * 0.34, boom = boomDeg(P.twa) * D2R;
    c.save(); c.translate(cx, cy); c.rotate(P.headingDeg * D2R);
    c.beginPath(); c.moveTo(0, -L / 2);
    c.bezierCurveTo(bw * 0.55, -L * 0.3, bw * 0.55, L * 0.2, bw * 0.4, L / 2); c.lineTo(-bw * 0.4, L / 2);
    c.bezierCurveTo(-bw * 0.55, L * 0.2, -bw * 0.55, -L * 0.3, 0, -L / 2); c.closePath();
    c.fillStyle = rgba(S.fd); c.fill(); c.strokeStyle = S.ink; c.lineWidth = 2; c.stroke();
    const mY = -L * 0.08, bl = L * 0.52, bx = lee * Math.sin(boom) * bl, by = mY + Math.cos(boom) * bl;
    // Mainsail: the boom straight, the sail's foot bellied to leeward of it.
    const qx = bx / 2 + lee * Math.cos(boom) * bl * 0.2, qy = (mY + by) / 2 + Math.sin(boom) * bl * 0.2;
    c.fillStyle = rgba(S.on, 0.4); c.beginPath(); c.moveTo(0, mY); c.quadraticCurveTo(qx, qy, bx, by); c.closePath(); c.fill();
    c.strokeStyle = S.ink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, mY); c.quadraticCurveTo(qx, qy, bx, by); c.stroke();
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, mY); c.lineTo(bx, by); c.stroke();
    // Jib: tack at the bow, clew a little to leeward, sheeted a touch wider than the main.
    const jb = Math.min(85, boomDeg(P.twa) + 6) * D2R, jl = L * 0.4, jx = lee * Math.sin(jb) * jl * 0.8, jy = -L / 2 + Math.cos(jb) * jl;
    c.strokeStyle = S.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -L / 2 + 2); c.quadraticCurveTo(jx * 0.5 + lee * L * 0.08, (-L / 2 + jy) / 2, jx, jy); c.stroke();
    c.fillStyle = S.ink; c.beginPath(); c.arc(0, mY, 2.6, 0, TAU); c.fill();
    c.restore();
  }
  // Captions under the rose: where the wind is from, the leg, the other leg.
  let ly = cy + R + 16;
  if (a.from) { c.fillStyle = S.ink; txt(c, a.from, cx, ly, 'center', 10.5, 800); ly += 14; }
  if (P) {
    c.fillStyle = S.ink; txt(c, P.leg, cx, ly, 'center', 9.5, 700); ly += 13;
    c.fillStyle = S.soft; txt(c, P.otherLeg, cx, ly, 'center', 9, 600);
  }

  // --- The section, seen from astern.
  const sx0 = cx + R + (small ? 20 : 34), sx1 = x + w, sw = sx1 - sx0, hc = sx0 + sw * 0.5;
  const sy = y + h - 14; // the wind scale's line
  c.fillStyle = S.ink; txt(c, a.heelK, sx0, y + 6, 'left', small ? 8.5 : 9.5, 800);
  if (P) { c.fillStyle = S.ink; txt(c, P.tackK, sx0, y + 19, 'left', small ? 8 : 9, 700); c.fillStyle = S.soft; txt(c, a.ruleK, sx0, y + 31, 'left', small ? 7 : 8, 600); }
  const B = Math.max(24, Math.min(sw * 0.36, h * 0.16)); // beam
  const wl = sy - 40 - B * 1.05; // waterline: the keel bulb clears the scale's title
  const mH = Math.max(B * 1.2, Math.min(B * 2.4, wl - y - 40));
  const sea = S.reduced ? 0 : Math.sin((tt * TAU) / 6.5) * 1.5, seaAmp = clamp(a.seaM ?? 0.6, 0.2, 2.5);
  const lee = P ? (P.tack === 'port' ? 1 : -1) : 1;
  // Water under the waterline.
  const waveY = (xx: number, k: number) => wl + sea + k * 7 + Math.sin(xx * 0.06 - tt * 1.5 + k * 0.8) * (k ? 1.4 : 1.8 * seaAmp);
  const wg = c.createLinearGradient(0, wl, 0, wl + B * 1.25);
  wg.addColorStop(0, rgba(S.on, 0.14)); wg.addColorStop(1, rgba(S.on, 0));
  c.fillStyle = wg; c.beginPath(); c.moveTo(sx0, waveY(sx0, 0));
  for (let xx = sx0; xx <= sx1; xx += 3) c.lineTo(xx, waveY(xx, 0));
  c.lineTo(sx1, wl + B * 1.25); c.lineTo(sx0, wl + B * 1.25); c.closePath(); c.fill();
  // Protractor on the leeward side, the reef band past REEF_HEEL_DEG.
  const pr = mH * 0.78, ang = (d: number) => (lee * d - 90) * D2R;
  const pp = (r: number, d: number): [number, number] => [hc + Math.cos(ang(d)) * r, wl + Math.sin(ang(d)) * r];
  c.save();
  c.beginPath(); c.arc(hc, wl, pr + 7, ang(REEF_HEEL_DEG), ang(45), lee < 0); c.arc(hc, wl, pr, ang(45), ang(REEF_HEEL_DEG), lee > 0); c.closePath();
  c.fillStyle = rgba(S.on, 0.22); c.fill(); c.clip();
  c.strokeStyle = rgba(S.on, 0.7); c.lineWidth = 1; c.beginPath();
  for (let k = -mH; k < mH * 2; k += 4) { c.moveTo(hc + k, wl - mH * 1.2); c.lineTo(hc + k - mH, wl); }
  c.stroke(); c.restore();
  c.strokeStyle = S.soft; c.lineWidth = 1; c.beginPath(); c.arc(hc, wl, pr, ang(-5), ang(45), lee < 0); c.stroke();
  c.beginPath();
  for (let d = -5; d <= 45; d += 5) { const q0 = pp(pr, d), q1 = pp(pr + (d % 10 ? 4 : 8), d); line(q0, q1); }
  c.stroke();
  [10, 20, 30].forEach((d) => { const q = pp(pr + 16, d); c.fillStyle = S.soft; txt(c, `${d}°`, q[0], q[1], 'center', 8, 600); });
  const rq = pp(pr + 10, 47); c.fillStyle = S.ink; txt(c, a.reefK, rq[0], rq[1], lee > 0 ? 'left' : 'right', 7.5, 800);
  // Upright reference.
  c.strokeStyle = S.faint; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(hc, wl + B * 0.3); c.lineTo(hc, wl - pr - 10); c.stroke(); c.setLineDash([]);
  const heel = P ? Math.max(0, SN.h) : 0;
  // The wind across the boat, from the windward side, level (it does not heel).
  if (P) {
    const ay = wl - mH * 0.62, ax1 = hc - lee * B * 0.55, ax0 = clamp(hc - lee * (B * 0.6 + Math.min(sw * 0.42, B * 1.5)), sx0, sx1);
    c.strokeStyle = S.ink; c.lineWidth = 2; c.lineCap = 'round';
    for (const [dy, k] of [[0, 1], [-11, 0.7], [11, 0.7]] as const) {
      const o = S.reduced ? 0 : ((tt * 30) % 8) * lee;
      const xa = ax0 + (ax1 - ax0) * (1 - k) + o, xb = ax1 + o * 0.2;
      c.globalAlpha *= dy ? 0.55 : 1; c.beginPath(); c.moveTo(xa, ay + dy); c.lineTo(xb, ay + dy); c.stroke(); c.globalAlpha /= dy ? 0.55 : 1;
    }
    c.fillStyle = S.ink; c.beginPath(); c.moveTo(ax1 + lee * 8, ay); c.lineTo(ax1 - lee * 2, ay - 5); c.lineTo(ax1 - lee * 2, ay + 5); c.closePath(); c.fill();
    c.lineCap = 'butt';
    // Ghost at the gust heel.
    const q0 = pp(pr - 5, P.heelGust), q1 = pp(pr + 9, P.heelGust);
    c.strokeStyle = S.soft; c.lineWidth = 1.5; c.setLineDash([2, 2]); c.beginPath(); line(q0, q1); c.stroke(); c.setLineDash([]);
  }
  // The boat, rotated by the heel about the waterline.
  c.save(); c.translate(hc, wl + sea * 0.5); c.rotate(lee * heel * D2R);
  const hb = B / 2;
  const hull = () => {
    c.beginPath(); c.moveTo(-hb, -0.2 * B);
    c.bezierCurveTo(-hb, 0.14 * B, -0.26 * B, 0.27 * B, 0, 0.28 * B); c.bezierCurveTo(0.26 * B, 0.27 * B, hb, 0.14 * B, hb, -0.2 * B);
    c.quadraticCurveTo(0, -0.27 * B, -hb, -0.2 * B); c.closePath();
  };
  // Keel and bulb.
  c.beginPath(); c.moveTo(-0.05 * B, 0.25 * B); c.lineTo(-0.035 * B, 0.98 * B); c.lineTo(0.035 * B, 0.98 * B); c.lineTo(0.05 * B, 0.25 * B); c.closePath();
  c.fillStyle = rgba(S.fd); c.fill(); c.strokeStyle = S.ink; c.lineWidth = 1.4; c.stroke();
  c.fillStyle = S.ink; c.beginPath(); c.ellipse(0, 1.0 * B, 0.13 * B, 0.05 * B, 0, 0, TAU); c.fill();
  hull(); c.fillStyle = rgba(S.fd); c.fill(); c.strokeStyle = S.ink; c.lineWidth = 2; c.stroke();
  // Shrouds over the spreaders, the mast, the main sheeted out to leeward.
  const spY = -mH * 0.55, spX = 0.24 * B;
  c.strokeStyle = S.soft; c.lineWidth = 1; c.beginPath();
  c.moveTo(-hb + 2, -0.2 * B); c.lineTo(-spX, spY); c.lineTo(0, -mH); c.lineTo(spX, spY); c.lineTo(hb - 2, -0.2 * B); c.moveTo(-spX, spY); c.lineTo(spX, spY); c.stroke();
  if (P) {
    const gy = -0.24 * B - B * 0.35, bo = boomDeg(P.twa) * D2R, bx = lee * Math.sin(bo) * B * 1.2;
    c.fillStyle = rgba(S.on, 0.3); c.beginPath(); c.moveTo(0, -mH + 3); c.quadraticCurveTo(bx * 0.7 + lee * 3, gy - mH * 0.35, bx, gy); c.lineTo(0, gy); c.closePath(); c.fill();
    c.strokeStyle = S.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -mH + 3); c.quadraticCurveTo(bx * 0.7 + lee * 3, gy - mH * 0.35, bx, gy); c.stroke();
    c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, gy); c.lineTo(bx, gy); c.stroke();
  }
  c.strokeStyle = S.ink; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, -0.24 * B); c.lineTo(0, -mH); c.stroke();
  c.restore();
  // Surface lines over the hull's foot.
  for (let k = 0; k < 3; k++) {
    c.strokeStyle = k ? rgba(S.on, 0.3) : S.ink; c.lineWidth = k ? 1 : 1.6; c.beginPath();
    for (let xx = sx0; xx <= sx1; xx += 3) { const yy = waveY(xx, k); xx === sx0 ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
    c.stroke();
  }
  // Heel marker on the protractor and the readout.
  if (P) {
    const q0 = pp(pr - 6, heel), q1 = pp(pr + 11, heel);
    c.strokeStyle = S.ink; c.lineWidth = 3; c.beginPath(); line(q0, q1); c.stroke();
    c.fillStyle = S.ink; txt(c, a.heelNow.replace('{d}', String(Math.round(heel))) + (heel >= REEF_HEEL_DEG ? ` · ${a.reefK}` : ''), sx1, sy - 26, 'right', small ? 10 : 11.5, 800);
  }

  // --- Wind scale 0-30 kt: ticks, the mean solid above the line, the gusts hatched beyond it.
  const k2x = (k: number) => sx0 + (clamp(k, 0, 30) / 30) * sw;
  c.strokeStyle = S.soft; c.lineWidth = 1; c.beginPath(); c.moveTo(sx0, sy); c.lineTo(sx1, sy);
  for (let k = 0; k <= 30; k++) { c.moveTo(k2x(k), sy); c.lineTo(k2x(k), sy + (k % 10 ? (k % 5 ? 2.5 : 4) : 6)); }
  c.stroke();
  [0, 10, 20, 30].forEach((k) => { c.fillStyle = S.soft; txt(c, String(k), k2x(k), sy + 12, k ? (k === 30 ? 'right' : 'center') : 'left', 8, 600); });
  c.fillStyle = S.ink; c.fillRect(sx0, sy - 9, k2x(a.windKt) - sx0, 6);
  if (a.gustKt !== null && a.gustKt > a.windKt) {
    const gx0 = k2x(a.windKt), gx1 = k2x(a.windKt + (a.gustKt - a.windKt) * (0.4 + 0.6 * g));
    c.save(); c.beginPath(); c.rect(gx0, sy - 9, gx1 - gx0, 6); c.fillStyle = rgba(S.on, 0.25); c.fill(); c.clip();
    c.strokeStyle = S.ink; c.lineWidth = 1; c.beginPath(); for (let xx = gx0 - 8; xx < gx1 + 8; xx += 3) { c.moveTo(xx, sy - 3); c.lineTo(xx + 6, sy - 9); } c.stroke(); c.restore();
  }
  c.fillStyle = S.ink; txt(c, a.windK, sx0, sy - 26, 'left', small ? 8.5 : 9.5, 800);
  c.fillStyle = S.ink; txt(c, a.kt, sx0, sy - 15, 'left', 8.5, 800);
  if (a.gustKt !== null) { c.fillStyle = rgba(S.on, 0.55 + 0.45 * g); txt(c, a.gust, sx1, sy - 15, 'right', 8.5, 800); }
}

const SCHOOLS = [[0.16, 0.45, 0.13, 0.2, 0.01, 0.9], [0.48, 0.62, 0.17, 0.22, 0.007, 1], [0.78, 0.38, 0.11, 0.17, 0.013, 0.8], [0.32, 0.82, 0.12, 0.12, 0.006, 0.6], [0.95, 0.7, 0.14, 0.2, 0.009, 0.85]];
function drawFish(c: Ctx2D, A: Box, tt0: number, a: NonNullable<HeroParams['fish']>, S: Style) {
  const { x, y, w, h } = A, tt = S.reduced ? 3 : tt0;
  const wide = w > h * 1.15, topH = h * (wide ? 0.46 : 0.48);
  // Moon on a lunar-age bezel.
  const R = Math.min(topH * 0.36, w * 0.15), cx = x + R + 22, cy = y + R + 22;
  const age = a.age, ageA = -Math.PI / 2 + (age / 29.53) * TAU;
  c.strokeStyle = S.ink; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R + 16, 0, TAU); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R + 9, -Math.PI / 2, ageA); c.stroke();
  for (let d = 0; d < 30; d++) {
    const an = -Math.PI / 2 + (d / 29.53) * TAU, l = d % 7 === 0 ? 7 : 3.5;
    c.strokeStyle = d <= age ? rgba(S.fd) : S.soft; c.lineWidth = d % 7 === 0 ? 1.8 : 1;
    c.beginPath(); c.moveTo(cx + Math.cos(an) * (R + 12.5 - l / 2), cy + Math.sin(an) * (R + 12.5 - l / 2)); c.lineTo(cx + Math.cos(an) * (R + 12.5 + l / 2) * 0.98, cy + Math.sin(an) * (R + 12.5 + l / 2) * 0.98); c.stroke();
  }
  [0, 7, 15, 22].forEach((d) => { const an = -Math.PI / 2 + (d / 29.53) * TAU; c.fillStyle = S.soft; txt(c, String(d), cx + Math.cos(an) * (R + 26), cy + Math.sin(an) * (R + 26), 'center', 8.5, 600); });
  const pa = 0.55 + 0.45 * Math.sin(tt * 2);
  c.fillStyle = S.ink; c.beginPath(); c.arc(cx + Math.cos(ageA) * (R + 9), cy + Math.sin(ageA) * (R + 9), 5 + pa * 1.5, 0, TAU); c.fill();
  c.fillStyle = rgba(S.on, 0.16); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
  if (a.illum > 0.01) {
    c.fillStyle = rgba(S.T.moon); moonPath(c, cx, cy, R, a.illum, a.waxing); c.fill();
    c.save(); moonPath(c, cx, cy, R, a.illum, a.waxing); c.clip();
    [[0.35, -0.25, 0.22], [-0.1, 0.3, 0.16], [0.15, 0.55, 0.1], [0.5, 0.25, 0.12]].forEach(([u, v, r]) => { c.fillStyle = rgba(S.fd, 0.22); c.beginPath(); c.arc(cx + u * R, cy + v * R, r * R, 0, TAU); c.fill(); });
    c.restore();
  }
  c.strokeStyle = S.ink; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.fillStyle = S.ink; txt(c, a.moon, cx - R - 16, cy + R + 36, 'left', 10.5, 700);
  // Today's tide from the harmonic prediction, hour by hour.
  const tv = a.tide.filter(fin);
  const tx0 = cx + R + 46, tx1 = x + w, ty0 = y + 26, ty1 = y + topH - 6, tm = (ty0 + ty1) / 2, amp = (ty1 - ty0) * 0.36;
  if (tv.length >= 2 && tx1 - tx0 > 60) {
    const lo = Math.min(...tv), hi = Math.max(...tv), mid = (lo + hi) / 2, half = Math.max(0.03, (hi - lo) / 2);
    const n = a.tide.length - 1;
    const at = (hr: number) => { const i = clamp(Math.floor(hr), 0, n - 1), k = hr - i, p = a.tide[i], q = a.tide[i + 1]; return fin(p) && fin(q) ? p + (q - p) * k : mid; };
    const hx = (hr: number) => tx0 + (hr / 24) * (tx1 - tx0), hy = (hr: number) => tm - ((at(hr) - mid) / half) * amp;
    if (a.best) {
      const [b0, b1] = [clamp(a.best[0], 0, 24), clamp(a.best[1], 0, 24)];
      c.fillStyle = S.faint; c.fillRect(hx(b0), ty0 - 4, hx(b1) - hx(b0), ty1 - ty0 + 4);
      c.save(); c.beginPath(); c.rect(hx(b0), ty0 - 4, hx(b1) - hx(b0), ty1 - ty0 + 4); c.clip();
      c.strokeStyle = rgba(S.on, 0.5); c.lineWidth = 1; c.beginPath();
      for (let k = -60; k < 120; k += 5) { c.moveTo(hx(b0) + k, ty1); c.lineTo(hx(b0) + k + 40, ty0 - 4); }
      c.stroke(); c.restore();
      c.fillStyle = S.ink; txt(c, a.bestK, hx((b0 + b1) / 2), ty0 + 4, 'center', 9.5, 800);
    }
    c.strokeStyle = S.soft; c.lineWidth = 1; c.beginPath(); c.moveTo(tx0, tm); c.lineTo(tx1, tm); c.stroke();
    c.fillStyle = rgba(S.on, 0.2); c.beginPath(); c.moveTo(hx(0), ty1);
    for (let hr = 0; hr <= n; hr += 0.25) c.lineTo(hx(hr), hy(hr));
    c.lineTo(hx(n), ty1); c.closePath(); c.fill();
    c.strokeStyle = S.ink; c.lineWidth = 2.6; c.beginPath();
    for (let hr = 0; hr <= n; hr += 0.25) (hr ? c.lineTo(hx(hr), hy(hr)) : c.moveTo(hx(hr), hy(hr)));
    c.stroke();
    [0, 6, 12, 18, 24].forEach((hr) => { c.fillStyle = S.soft; txt(c, String(hr).padStart(2, '0'), hx(hr), ty1 + 10, hr === 0 ? 'left' : hr === 24 ? 'right' : 'center', 9); });
    c.fillStyle = S.ink; txt(c, a.tideK, tx0, y + 8, 'left', 10.5, 700);
    if (a.turn) txt(c, a.turn.label, tx1, y + 8, 'right', 10.5, 700);
    if (!S.reduced) {
      const sw = (tt * 1.4) % n;
      c.strokeStyle = rgba(S.on, 0.6); c.lineWidth = 1; c.beginPath(); c.moveTo(hx(sw), ty0); c.lineTo(hx(sw), ty1); c.stroke();
      c.fillStyle = rgba(S.on, 0.7); c.beginPath(); c.arc(hx(sw), hy(sw), 3.5, 0, TAU); c.fill();
    }
    const nh = clamp(a.nowH, 0, n);
    const pr = (tt % 2.2) / 2.2;
    c.strokeStyle = rgba(S.on, 0.8 * (1 - pr)); c.lineWidth = 2; c.beginPath(); c.arc(hx(nh), hy(nh), 5 + pr * 13, 0, TAU); c.stroke();
    c.fillStyle = S.ink; c.beginPath(); c.arc(hx(nh), hy(nh), 5.5, 0, TAU); c.fill();
    txt(c, a.nowK, hx(nh) + (nh > 3 ? -10 : 10), hy(nh) - 14, nh > 3 ? 'right' : 'left', 9.5, 800);
  }
  // Echo-sounder strip: schools as dense as the bite score.
  const ex0 = x, ex1 = x + w, ey0 = y + topH + (wide ? 34 : 40), ey1 = y + h, cs = 2;
  const cols = Math.floor((ex1 - ex0) / cs), rows = Math.max(0, Math.floor((ey1 - ey0 - 16) / cs));
  if (rows < 6 || cols < 10) return;
  const top = ey0 + 16, amt = 0.35 + 0.9 * a.share;
  c.fillStyle = S.ink; txt(c, a.echo, ex0, ey0 + 4, 'left', 10.5, 700);
  c.strokeStyle = S.ink; c.lineWidth = 2; c.strokeRect(ex0 + 1, top, ex1 - ex0 - 2, rows * cs);
  const q = new Uint8Array(cols * rows);
  const sc = SCHOOLS.map(([sx, sy, rx, ry, sp, am]) => [((((sx - tt * sp) % 1.25) + 1.25) % 1.25) - 0.12, sy + 0.04 * Math.sin(tt * 0.5 + sx * 9), rx, ry, am * amt]);
  for (let j = 0; j < rows; j++) {
    const v = j / rows, th = 0.3 * Math.exp(-(((v - 0.2) / 0.07) ** 2));
    for (let i = 0; i < cols; i++) {
      const u = i / cols;
      let f = th + 0.1 * Math.sin(u * 19 + v * 7 + tt * 0.3) * Math.sin(v * 11 - u * 6 - tt * 0.2);
      for (const [sx, sy, rx, ry, am] of sc) { const dx = (u - sx) / rx, dy = (v - sy) / ry; f += am * Math.exp(-(dx * dx + dy * dy)); }
      q[j * cols + i] = Math.min(6, Math.max(0, Math.floor(f * 6.2)));
    }
  }
  const AL = [0, 0.07, 0.15, 0.25, 0.38, 0.55, 0.78];
  for (let lv = 1; lv <= 6; lv++) {
    c.fillStyle = rgba(S.on, AL[lv]); c.beginPath();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (q[j * cols + i] === lv) c.rect(ex0 + i * cs, top + j * cs, cs + 0.3, cs + 0.3);
    c.fill();
  }
  c.strokeStyle = S.ink; c.lineWidth = 1; c.beginPath();
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = q[j * cols + i];
    if (i + 1 < cols && q[j * cols + i + 1] !== v && Math.max(v, q[j * cols + i + 1]) >= 2) { c.moveTo(ex0 + (i + 1) * cs, top + j * cs); c.lineTo(ex0 + (i + 1) * cs, top + (j + 1) * cs); }
    if (j + 1 < rows && q[(j + 1) * cols + i] !== v && Math.max(v, q[(j + 1) * cols + i]) >= 2) { c.moveTo(ex0 + i * cs, top + (j + 1) * cs); c.lineTo(ex0 + (i + 1) * cs, top + (j + 1) * cs); }
  }
  c.stroke();
  const bot = top + rows * cs;
  hatch(c, ex0 + 2, ex1 - 2, bot - 16, bot - 1, (xx) => bot - 8 - 5 * Math.sin((xx - ex0) * 0.02) - 3 * Math.sin((xx - ex0) * 0.061), 3, rgba(S.on, 0.85));
}

function drawSwim(c: Ctx2D, A: Box, tt: number, a: NonNullable<HeroParams['swim']>, S: Style, Y: number) {
  const { x, y, w, h } = A, cx = x + w * 0.56, gap = w * (a.rip === 'HIGH' ? 0.1 : a.rip === 'MOD' ? 0.075 : 0.05);
  const shore = (xx: number) => Y + Math.sin(xx * 0.03 + tt * 0.8) * 2.5 + Math.exp(-sq((xx - cx) / (gap * 1.4))) * -6;
  c.fillStyle = rgba(S.T.sand); c.beginPath(); c.moveTo(x, y + h);
  for (let xx = x; xx <= x + w; xx += 4) c.lineTo(xx, shore(xx));
  c.lineTo(x + w, y + h); c.closePath(); c.fill();
  c.strokeStyle = S.ink; c.lineWidth = 2; c.beginPath();
  for (let xx = x; xx <= x + w; xx += 4) (xx === x ? c.moveTo(xx, shore(xx)) : c.lineTo(xx, shore(xx)));
  c.stroke();
  // Crests coming in, broken where the rip runs out.
  for (let i = 0; i < 5; i++) {
    const k = (tt / 9 + i / 5) % 1, yy = y + h * 0.08 + k * (Y - y - h * 0.1), al = Math.min(1, k * 4) * (k > 0.93 ? (1 - k) / 0.07 : 1);
    c.strokeStyle = rgba(S.on, 0.75 * al); c.lineWidth = 1.2 + k * k * 4; c.beginPath();
    c.moveTo(x, yy); c.lineTo(cx - gap * (1 + k), yy + 2 * (1 - k)); c.moveTo(cx + gap * (1 + k), yy + 2 * (1 - k)); c.lineTo(x + w, yy); c.stroke();
  }
  const ay = y + h * 0.38;
  c.strokeStyle = S.ink; c.fillStyle = S.ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx, Y - 18); c.lineTo(cx, ay); c.stroke();
  c.beginPath(); c.moveTo(cx, ay - 10); c.lineTo(cx - 7, ay + 2); c.lineTo(cx + 7, ay + 2); c.closePath(); c.fill();
  txt(c, a.ripK, cx + 12, ay + 4, 'left', 11, 700);
  c.fillStyle = S.soft; txt(c, a.shore, x + w, Y - 14, 'right', 10.5, 600);
  // The lifeguard flag in the rip's colour.
  const fx0 = x + w * 0.16, fy = Y + (y + h - Y) * 0.78, pole = Math.min(64, h * 0.3);
  c.strokeStyle = S.ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(fx0, fy); c.lineTo(fx0, fy - pole); c.stroke();
  const fw = 36, fh = 22, top = fy - pole, wave = S.reduced ? 0 : tt * 5;
  c.beginPath(); c.moveTo(fx0, top);
  for (let i = 0; i <= 12; i++) { const u = i / 12; c.lineTo(fx0 + u * fw, top + Math.sin(u * 4 - wave) * 3 * u); }
  for (let i = 12; i >= 0; i--) { const u = i / 12; c.lineTo(fx0 + u * fw, top + fh + Math.sin(u * 4 - wave) * 3 * u); }
  c.closePath();
  c.fillStyle = rgba(S.T[a.rip === 'HIGH' ? 'lv0' : a.rip === 'MOD' ? 'lv2' : 'lv3']); c.fill(); c.lineWidth = 2; c.strokeStyle = S.ink; c.stroke();
  c.fillStyle = S.ink; txt(c, a.flag, fx0 + fw + 10, top + fh / 2, 'left', 10.5, 700);
  // The sun with its UV ring, one segment per index point up to 11.
  if (a.uv !== null) {
    const sr = Math.min(w, h) * 0.085, sx = x + w - sr - 22, sy = y + sr + 22;
    c.fillStyle = S.ink; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
    for (let i = 0; i < 11; i++) {
      const a0 = -Math.PI / 2 + (i / 11) * TAU + 0.05, a1 = a0 + TAU / 11 - 0.1;
      c.strokeStyle = i < Math.round(a.uv) ? S.ink : S.faint; c.lineWidth = 5; c.beginPath(); c.arc(sx, sy, sr + 10, a0, a1); c.stroke();
    }
    c.fillStyle = S.ink; txt(c, a.uvK, sx - sr - 22, sy, 'right', 11, 700);
  }
}

// --- snorkel and dive: shared reef, figures and murk ---------------------------------------------------------------
function brainCoral(c: Ctx2D, bx: number, by: number, r: number, fill: string, cut: string) {
  c.fillStyle = fill; c.beginPath(); c.ellipse(bx, by, r, r * 0.74, 0, Math.PI, 0); c.closePath(); c.fill();
  c.strokeStyle = cut; c.lineWidth = 1.3;
  for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(bx, by, r * (1 - k * 0.23), r * 0.74 * (1 - k * 0.23), 0, Math.PI * 1.04, -0.04 * Math.PI); c.stroke(); }
}
function branchCoral(c: Ctx2D, x: number, y: number, len: number, ang: number, depth: number, wd: number, sway: number) {
  if (!depth || len < 2.5) return;
  const a = ang + sway, x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
  c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
  branchCoral(c, x2, y2, len * 0.72, ang - 0.5, depth - 1, wd * 0.72, sway * 1.2);
  branchCoral(c, x2, y2, len * 0.7, ang + 0.42, depth - 1, wd * 0.72, sway * 1.2);
}
function seaFan(c: Ctx2D, x: number, y: number, r: number, sway: number, fill: string, line: string) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(x, y);
  for (let i = 0; i <= 16; i++) { const a = -1.05 + (i / 16) * 2.1 + sway; c.lineTo(x + Math.sin(a) * r, y - Math.cos(a) * r * 0.95); }
  c.closePath(); c.fill();
  c.strokeStyle = line; c.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { const a = -1 + (i / 8) * 2 + sway; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.sin(a) * r * 0.45, y - Math.cos(a) * r * 0.55, x + Math.sin(a) * r * 0.96, y - Math.cos(a) * r * 0.9); c.stroke(); }
  c.lineWidth = 2.4; c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x + Math.sin(sway) * r * 0.25, y - r * 0.25); c.stroke();
}
/** A swimmer seen side on, facing right, mask at (0, 0). */
function figure(c: Ctx2D, mx: number, my: number, s: number, tt: number, kit: 'snorkel' | 'dive' | 'spear', body: string, cut: string, gear: string) {
  c.save(); c.translate(mx, my); c.scale(s, s);
  const kick = Math.sin(tt * (kit === 'snorkel' ? 3.4 : 2.4));
  c.strokeStyle = body; c.fillStyle = body;
  capsule(c, -14, 3, -50, 5, 13);
  capsule(c, -50, 5, -76, 3 + kick * 4, 6.5);
  capsule(c, -50, 6, -76, 8 - kick * 4, 6.5);
  c.beginPath(); c.moveTo(-74, 3 + kick * 4); c.lineTo(-94, kick * 7 - 2); c.lineTo(-92, 6 + kick * 6); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-74, 8 - kick * 4); c.lineTo(-94, 6 - kick * 6); c.lineTo(-91, 14 - kick * 7); c.closePath(); c.fill();
  capsule(c, -16, 7, 6, 13, 4.5);
  c.beginPath(); c.arc(-4, 0, 7.5, 0, TAU); c.fill();
  c.fillStyle = cut; c.fillRect(-1.5, -4.5, 7, 5);
  c.fillStyle = gear; c.strokeStyle = gear;
  if (kit === 'dive') {
    capsule(c, -44, -8, -18, -8, 8.5);
    c.fillStyle = cut; c.fillRect(-20, -12, 2, 8);
    c.strokeStyle = body; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-18, -8); c.quadraticCurveTo(-6, -12, 2, 4); c.stroke();
  } else if (kit === 'spear') {
    // A breath-hold hunter: no tank. The speargun held out in front (stock at the hands, barrel and band forward, the shaft's tip beyond), its line to the float above.
    c.lineCap = 'round'; c.strokeStyle = gear; c.lineWidth = 3.2; c.beginPath(); c.moveTo(4, 12); c.lineTo(58, 10); c.stroke();
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(16, 11.6); c.quadraticCurveTo(22, 17, 34, 10.8); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.moveTo(58, 10); c.lineTo(66, 9.7); c.stroke();
    c.strokeStyle = body; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(-4, 13); c.quadraticCurveTo(-30, -60, -26, -150); c.stroke(); c.setLineDash([]);
    c.fillStyle = gear; c.beginPath(); c.arc(-26, -152, 5, 0, TAU); c.fill();
    c.lineCap = 'butt';
  } else { c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(-8, -3); c.lineTo(-9, -22); c.lineTo(-5, -25); c.stroke(); c.lineCap = 'butt'; }
  c.restore();
}
/** Stepped murk: flat bands of the field colour, thicker past the visibility. */
function murk(c: Ctx2D, x0: number, x1: number, y0: number, y1: number, vis: number, mpx: number, fd: RGB) {
  const steps: [number, number][] = [[vis * 0.7, 0.18], [vis * 0.85, 0.34], [vis, 0.58], [vis * 1.12, 0.78], [vis * 1.28, 0.9]];
  for (const [d, a] of steps) { const xx = x0 + d * mpx; if (xx >= x1) break; c.fillStyle = rgba(fd, a); c.fillRect(xx, y0, x1 - xx, y1 - y0); }
}
function reefScene(c: Ctx2D, x0: number, x1: number, yTop: number, yBot: number, mx: number, mpx: number, tt: number, S: Style) {
  const rAt = (xx: number) => yTop + (1 - reefAt(clamp((xx - x0) / (x1 - x0), 0, 1))) * (yBot - yTop) * 0.5;
  c.fillStyle = rgba(S.on, 0.34); c.beginPath(); c.moveTo(x0, yBot);
  for (let xx = x0; xx <= x1; xx += 3) c.lineTo(xx, rAt(xx));
  c.lineTo(x1, yBot); c.closePath(); c.fill();
  hatch(c, x0, x1, yTop, yBot, rAt, 3.4, rgba(S.on, 0.35));
  c.strokeStyle = S.ink; c.lineWidth = 2; c.beginPath();
  for (let xx = x0; xx <= x1; xx += 3) (xx === x0 ? c.moveTo(xx, rAt(xx)) : c.lineTo(xx, rAt(xx)));
  c.stroke();
  const sw = S.reduced ? 0 : Math.sin(tt * 0.9) * 0.12, sc = clamp(mpx / 18, 0.65, 1.4);
  const list: [number, 'brain' | 'branch' | 'fan', number][] = [[1.5, 'brain', 15], [4, 'branch', 26], [6.5, 'fan', 30], [9, 'brain', 12], [11.5, 'branch', 22], [14, 'fan', 26], [16.5, 'brain', 14]];
  for (const [m, k, r] of list) {
    const xx = mx + m * mpx;
    if (xx > x1 - 6 || xx < x0) continue;
    const yy = rAt(xx) + 2, rr = r * sc;
    c.strokeStyle = S.ink; c.fillStyle = S.ink;
    if (k === 'brain') brainCoral(c, xx, yy, rr, S.ink, rgba(S.fd));
    else if (k === 'branch') branchCoral(c, xx, yy, rr * 0.55, 0, 4, 4 * sc, sw * 0.5);
    else seaFan(c, xx, yy, rr, sw, rgba(S.on, 0.6), S.ink);
  }
  return rAt;
}
function drawSnorkel(c: Ctx2D, A: Box, tt: number, a: NonNullable<HeroParams['water']>, S: Style) {
  const { x, y, w, h } = A, wide = w > h * 1.15, s = wide ? 1.1 : 0.8, vis = a.visM ?? 0;
  const span = Math.max(16.5, vis * 1.15);
  const sy = y + h * 0.26, mx = x + 98 * s + 6, mpx = (x + w - mx) / span;
  const bob = S.reduced ? 0 : Math.sin(tt * 1.3) * 1.5;
  const surf = (xx: number) => sy + Math.sin(xx * 0.09 - tt * 2.2) * 2 + Math.sin(xx * 0.21 + tt * 3.1) * 1.1;
  c.fillStyle = rgba(S.on, 0.07); c.fillRect(x, sy, w, h - (sy - y));
  const rAt = reefScene(c, x, x + w, y + h * 0.66, y + h, mx, mpx, tt, S);
  // Marker posts every 5 m.
  for (let m = 5; m < span; m += 5) {
    const xx = mx + m * mpx, yb = rAt(xx), y0 = sy + 26;
    c.fillStyle = S.ink; c.fillRect(xx - 1, y0, 2, yb - y0);
    c.font = `700 ${(10 * 1.12).toFixed(1)}px "Geist Mono Variable", monospace`;
    const tw = c.measureText(`${m} M`).width + 10;
    c.fillRect(xx - tw / 2, y0 - 9, tw, 17); c.fillStyle = rgba(S.fd); txt(c, `${m} m`, xx, y0 - 0.5, 'center', 10, 700);
  }
  if (a.visM !== null) {
    const ex = mx + 5 * s, ey = sy + 5 + bob;
    for (let k = 0; k < 7; k++) {
      const an = (-3 + k * 4.2) * D2R, L = (vis * mpx) / Math.cos(an);
      for (let seg = 0; seg < 4; seg++) {
        const f0 = seg / 4, f1 = (seg + 1) / 4;
        c.strokeStyle = rgba(S.on, 0.8 - seg * 0.2); c.lineWidth = 1.6 - seg * 0.25;
        c.beginPath(); c.moveTo(ex + Math.cos(an) * L * f0, ey + Math.sin(an) * L * f0); c.lineTo(ex + Math.cos(an) * L * f1, ey + Math.sin(an) * L * f1); c.stroke();
      }
    }
    murk(c, mx, x + w + 40, sy + 3, y + h, vis, mpx, S.fd);
  }
  c.strokeStyle = S.ink; c.lineWidth = 2.4; c.beginPath();
  for (let xx = x; xx <= x + w; xx += 3) (xx === x ? c.moveTo(xx, surf(xx)) : c.lineTo(xx, surf(xx)));
  c.stroke();
  figure(c, mx, sy + 5 + bob, s, tt, 'snorkel', S.ink, rgba(S.fd), S.ink);
  // Horizontal visibility ruler, metres from the mask.
  const ry = y + 14;
  c.strokeStyle = S.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(mx, ry); c.lineTo(mx + vis * mpx, ry); c.stroke();
  c.strokeStyle = S.soft; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(mx + vis * mpx, ry); c.lineTo(x + w, ry); c.stroke(); c.setLineDash([]);
  for (let m = 0; m <= Math.floor(span); m++) {
    const xx = mx + m * mpx;
    c.strokeStyle = m <= vis ? S.ink : S.soft; c.lineWidth = m % 5 ? 1 : 1.8;
    c.beginPath(); c.moveTo(xx, ry - (m % 5 ? 3 : 6)); c.lineTo(xx, ry + (m % 5 ? 3 : 6)); c.stroke();
  }
  if (a.visM !== null) {
    const vx = mx + vis * mpx;
    c.fillStyle = S.ink; c.fillRect(vx - 1.5, ry - 10, 3, 20);
    const right = vx + 120 > x + w;
    txt(c, a.vis, right ? vx - 8 : vx + 8, ry + 18, right ? 'right' : 'left', 11, 800);
  }
  c.fillStyle = S.soft; txt(c, a.hvis, mx, ry + 18, 'left', 9.5, 600);
  if (a.chop) { c.fillStyle = S.soft; txt(c, a.chop, x + w, sy - 12, 'right', 10, 600); }
  // Water over the reef at this tide.
  if (a.waterM !== null) {
    const bx = mx + 3.2 * mpx, by = rAt(bx) - 3;
    c.strokeStyle = S.ink; c.lineWidth = 1.5; c.beginPath();
    c.moveTo(bx, sy + 8); c.lineTo(bx, by); c.moveTo(bx - 5, sy + 8); c.lineTo(bx + 5, sy + 8); c.moveTo(bx - 5, by); c.lineTo(bx + 5, by); c.stroke();
    c.fillStyle = S.ink; txt(c, a.overReef, bx - 8, (sy + by) / 2 + 10, 'right', 10.5, 700);
  }
}
function drawDive(c: Ctx2D, A: Box, tt: number, a: NonNullable<HeroParams['water']>, S: Style, kit: 'dive' | 'spear' = 'dive') {
  const { x, y, w, h } = A, wide = w > h * 1.15, s = wide ? 1.05 : 0.74, vis = a.visM ?? 0;
  const span = 20, top = y + 16, bot = y + h - 4, mp = (bot - top) / span, lx = x + 26;
  const sg = clamp(a.surgeMs / 0.3, 0.3, 2);
  const surge = S.reduced ? 0 : Math.sin((TAU * tt) / 8) * sg;
  for (let k = 1; k < 4; k++) { c.fillStyle = rgba(S.on, 0.045 * k); c.fillRect(lx, top + k * 5 * mp, x + w - lx, 5 * mp); }
  c.strokeStyle = S.soft; c.lineWidth = 1; c.setLineDash([2, 4]);
  for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(lx, top + k * 5 * mp); c.lineTo(x + w, top + k * 5 * mp); c.stroke(); }
  c.setLineDash([]);
  // The diver at the activity depth, the reef just below.
  const my = top + a.depthM * mp, sb = my + 2.5 * mp, mx = lx + 120 * s, mpx = (x + w - mx) / 17;
  reefScene(c, lx, x + w, sb - 6, bot + 4, mx, mpx, tt, S);
  const dmx = mx + surge * 7;
  if (a.visM !== null) {
    c.save(); c.beginPath(); c.rect(lx, top, x + w - lx, sb - top); c.clip();
    [5, 10, 15].forEach((m) => {
      const r = m * mpx, on = Math.abs(m - vis) < 2.5;
      c.strokeStyle = on ? S.ink : S.soft; c.lineWidth = on ? 2.6 : 1.2; if (!on) c.setLineDash([4, 4]);
      c.beginPath(); c.arc(dmx, my, r, -34 * D2R, 34 * D2R); c.stroke(); c.setLineDash([]);
    });
    c.strokeStyle = S.ink; c.lineWidth = 2.6; c.beginPath(); c.arc(dmx, my, vis * mpx, -34 * D2R, 34 * D2R); c.stroke();
    c.restore();
    murk(c, mx, x + w + 40, top + 2, bot + 4, vis, mpx, S.fd);
    [5, 10].forEach((m) => { const r = m * mpx; c.fillStyle = S.ink; txt(c, `${m} m`, dmx + r * Math.cos(-34 * D2R) + 4, my + r * Math.sin(-34 * D2R) - 6, 'center', 10, 700); });
    const r = vis * mpx;
    c.fillStyle = S.ink; txt(c, a.vis, Math.min(dmx + r * Math.cos(-30 * D2R) - 4, x + w), Math.max(top + 10, my + r * Math.sin(-30 * D2R) - 8), 'right', 11, 800);
  }
  c.strokeStyle = S.ink; c.lineWidth = 2.4; c.beginPath();
  for (let xx = lx; xx <= x + w; xx += 3) { const yy = top + Math.sin(xx * 0.08 - tt * 1.6) * 1.8; xx === lx ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
  c.stroke();
  // Lead line with a mark every 5 m down to the diver's depth.
  const lb = lx + surge * 3;
  c.strokeStyle = S.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, top - 8); c.lineTo(lb, my); c.stroke();
  for (let m = 0; m <= span; m++) {
    const yy = top + m * mp, xx = lx + (lb - lx) * Math.min(1, m / a.depthM);
    c.strokeStyle = m % 5 ? S.soft : S.ink; c.lineWidth = m % 5 ? 1 : 3;
    c.beginPath(); c.moveTo(xx - (m % 5 ? 3 : 6), yy); c.lineTo(xx + (m % 5 ? 3 : 6), yy); c.stroke();
    if (m % 5 === 0) { c.fillStyle = S.soft; txt(c, String(m), x + 2, yy, 'left', 9.5, 600); }
  }
  c.fillStyle = S.ink; c.beginPath(); c.moveTo(lb - 4, my - 12); c.lineTo(lb + 4, my - 12); c.lineTo(lb + 7, my); c.lineTo(lb - 7, my); c.closePath(); c.fill();
  c.fillStyle = S.ink; txt(c, a.at, lx + 14, my - 18, 'left', 10.5, 800);
  for (let i = 0; i < (kit === 'spear' ? 0 : 9); i++) { // a breath-hold hunter breathes out only at the surface: no bubble stream
    const k = S.reduced ? i / 9 : (tt * 0.32 + i / 9) % 1, by = my - 6 - k * (my - top - 10), bx = dmx + 8 * s + Math.sin(k * 14 + i) * 3;
    c.strokeStyle = rgba(S.on, 0.95 - k * 0.5); c.lineWidth = 1.3; c.beginPath(); c.arc(bx, by, 1.6 + k * 3.2, 0, TAU); c.stroke();
  }
  figure(c, dmx, my, s, tt, kit, S.ink, rgba(S.fd), rgba(S.T.lv2));
  // Surge: a double arrow swinging as far as the surge is strong.
  const sx = mx - 30 * s, syy = my + 1.6 * mp, sw2 = surge * 10;
  c.strokeStyle = S.ink; c.fillStyle = S.ink; c.lineWidth = 2;
  c.beginPath(); c.moveTo(sx - 24 + sw2, syy); c.lineTo(sx + 24 + sw2, syy); c.stroke();
  [-1, 1].forEach((sgn) => { c.beginPath(); c.moveTo(sx + sw2 + sgn * 30, syy); c.lineTo(sx + sw2 + sgn * 21, syy - 5.5); c.lineTo(sx + sw2 + sgn * 21, syy + 5.5); c.closePath(); c.fill(); });
  txt(c, a.surge, sx, syy + 15, 'center', 10.5, 800);
}

// --- the live-map card's radar -------------------------------------------------------------------------------------
export interface RadarOpts {
  /** Where the spot sits on the card, px. */
  cx: number;
  cy: number;
  /** Pixels per kilometre on the card, or null when the map capture's scale is unknown (no km labels then). */
  kmPx: number | null;
  name: string;
  level: Level | null;
  T: Tokens;
  reduced: boolean;
}
/** Range rings (one per km), a compass bezel, a sweeping beam and the spot's ping. */
export function drawRadar(c: Ctx2D, w: number, h: number, tt: number, o: RadarOpts) {
  const { cx, cy, T } = o, G = T['map-ring'], Rmax = Math.hypot(w, h) * 0.55;
  c.clearRect(0, 0, w, h);
  c.lineWidth = 1;
  const step = o.kmPx && o.kmPx > 12 ? o.kmPx : Math.min(w, h) * 0.12;
  for (let k = 1; k * step < Rmax && k < 60; k++) {
    const r = k * step;
    c.strokeStyle = rgba(G, k % 2 ? 0.2 : 0.34); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
    if (o.kmPx && k <= 5) { c.fillStyle = rgba(G, 0.8); txt(c, `${k} km`, cx + r * 0.7071 + 4, cy - r * 0.7071 - 6, 'left', 9.5, 600); }
  }
  c.strokeStyle = rgba(G, 0.16); c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, h); c.moveTo(0, cy); c.lineTo(w, cy); c.stroke();
  const RB = Math.min(w, h) * 0.4;
  for (let d = 0; d < 360; d += 5) {
    const a = d * D2R, l = d % 90 === 0 ? 12 : d % 30 === 0 ? 8 : 3.5;
    c.strokeStyle = rgba(G, d % 30 ? 0.45 : 0.85); c.lineWidth = d % 30 ? 1 : 1.5;
    c.beginPath(); c.moveTo(cx + Math.sin(a) * RB, cy - Math.cos(a) * RB); c.lineTo(cx + Math.sin(a) * (RB - l), cy - Math.cos(a) * (RB - l)); c.stroke();
    if (d % 90 === 0) { c.fillStyle = rgba(G, 0.95); txt(c, ['N', 'E', 'S', t('hemi.W')][d / 90], cx + Math.sin(a) * (RB + 11), cy - Math.cos(a) * (RB + 11), 'center', 10, 700); }
  }
  const per = 4.2, th = o.reduced ? 2.2 : ((tt / per) % 1) * TAU, an = th - Math.PI / 2, tail = 1.5;
  if ('createConicGradient' in c) {
    const g = c.createConicGradient(an - tail, cx, cy), f = tail / TAU;
    g.addColorStop(0, rgba(G, 0)); g.addColorStop(f * 0.6, rgba(G, 0.06)); g.addColorStop(f * 0.999, rgba(G, 0.34)); g.addColorStop(f, rgba(G, 0)); g.addColorStop(1, rgba(G, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, Rmax, an - tail, an); c.closePath(); c.fill();
  }
  c.strokeStyle = rgba(G, 0.95); c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(an) * Rmax, cy + Math.sin(an) * Rmax); c.stroke();
  const L = rgba(T[lvKey(o.level, 'lv')]), ph = o.reduced ? 0.3 : (tt / per) % 1;
  for (let k = 0; k < 2; k++) {
    const q = ph - k * 0.14;
    if (q < 0) continue;
    c.strokeStyle = L; c.globalAlpha = Math.pow(1 - q, 1.6); c.lineWidth = 2.2 - k * 0.8; c.beginPath(); c.arc(cx, cy, 9 + q * 54, 0, TAU); c.stroke();
  }
  c.globalAlpha = 1;
  c.fillStyle = rgba(T['map-sea']); c.beginPath(); c.arc(cx, cy, 10.5, 0, TAU); c.fill();
  c.fillStyle = rgba(T['map-ink']); c.beginPath(); c.arc(cx, cy, 9, 0, TAU); c.fill();
  c.fillStyle = L; c.beginPath(); c.arc(cx, cy, 6.5, 0, TAU); c.fill();
  c.fillStyle = rgba(T['map-ink']); txt(c, o.name, cx + 16, cy - 2, 'left', 11, 700);
}
