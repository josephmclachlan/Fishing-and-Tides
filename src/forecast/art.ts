/**
 * The FORECAST page's hero pictures (PLAN 7.52, redrawn as Kinetic Plus in PLAN 7.69): a full-bleed colour field
 * that IS the rating, a living particle field showing what moves the water (swell, wind, tide flow, the rip, the
 * murk), and over it a crisp diagram per activity that carries the numbers. Everything is drawn from the reading
 * (`heroParams`, pure and tested), never from example values:
 *
 *   SURF     (redrawn PLAN 13.1) side on: a set rolling in on the swell's period and breaking (lip, face, whitewater)
 *            inside the face range's band, against a 1.7 m adult with a shortboard and knee, waist, chest and head marks;
 *            a ruler one crest gap long, a compass with the swell against the beach
 *   FISH     (redrawn PLAN 13.1) the moon on a lunar bezel (big-tide days thicker); today's tide with the best window
 *            hatched, now and the next turn; a fish finder whose arches follow the bite score
 *   SWIM     a beach from above (PLAN 13.1): white water over the sandbars, the darker rip channel between them
 *            with chevrons running in along the shore, out through the gap and fanning out into a sandy plume, a
 *            swimmer showing the way out (out, sideways, in), the rip chance as a coloured square, a UV ring of 11 blocks
 *   SNORKEL  (redrawn PLAN 13.5) a section from the surface to the reef: a snorkeller floating face down, fins kicking;
 *            a ruler and a cone of sight from the mask out to the visibility, murk past it; the water over the reef
 *            at this tide as a dimension line; the surge as a swinging double arrow; brain and staghorn coral, a sea
 *            fan, sponges, sea grass and fish on a faceted rock; the surface chopping with the wind
 *   DIVE     (redrawn PLAN 13.5) a depth column read like an instrument: a solid depth scale with the metres in tags, a
 *            diver with a tank at the activity depth, bubbles swelling as they rise, the sight ruler out to the visibility,
 *            the surge under the diver swinging with its strength, a reef rising ahead
 *   SPEAR    the DIVE column with a breath-hold freediver, no tank, a speargun held out in front, the 3 to 5 m of a shot
 *            striped on the ruler, and a float with the dive flag on its line
 *   SAIL     (redrawn PLAN 13.1) a chart-room wind rose with a solid bezel, a damped needle, barbs, the no-go wedge and the gust sector, the boat at its
 *            hub on the harder coast leg with the wind angle; the boat in section from astern heeled to leeward by
 *            the rule-of-thumb heel (physics/heel.ts) on a protractor with the reef band; a 0-30 kt scale
 *
 * Words in the pictures are square knock-out tags. Each part of every hero picture is a tap target (`hots`): the
 * page brackets the tapped part and shows its plain words in a square box.
 *
 * Also the live-map card's radar (rings in real kilometres when the map capture gives its scale).
 */
import { dec, t, type Key } from '../i18n';
import { localClock } from '../tide-chart';
import { localDayStart } from '../physics/astro';
import { REGION } from '../region';
import { moonPhase } from '../physics/astro';
import type { Plan } from '../metrics/plan';
import { chopFor, type FcActivity, type FcDeps, type FcRead, type Level, type TimelineHour } from './model';
import { cmp, dayHoursOf, headline, pushOf, levelWord, moonAgeDays, n0, n1, planDayOf, sentence, tideNow } from './view';
import { arrow, brackets, capsule, clamp, D2R, dimLine, DISP, hatch, keyTag, MONO, lerp, moonPath, overlaps, rgba, sq, tag, tagSize, TAU, txt, type Ctx2D, type Hot, type RGB, type Tokens } from './kit';
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
  surf?: {
    lo: number; hi: number; hb: number; period: number; dir: number; guides: [number, string][]; caption: string;
    /** The beach's seaward facing, degrees (null when unknown); the face range, the period and the swell's direction as tags. */
    facing: number | null; rangeK: string; everyK: string; fromK: string;
  };
  sail?: {
    windKt: number; gustKt: number | null; fromDeg: number | null; seaM: number | null; from: string; gust: string; kt: string;
    /** The harder coast leg as the boat sails it, its labels, and the rule-of-thumb heel at the mean and the gusts; null with no wind direction. */
    pose: (SailPose & { leg: string; otherLeg: string; tackK: string; heel: number; heelGust: number }) | null;
    heelK: string; heelNow: string; reefK: string; noGoK: string; coastK: string; windK: string; ruleK: string;
  };
  fish?: {
    illum: number; waxing: boolean; age: number; moon: string; tide: (number | null)[]; nowH: number; best: [number, number] | null; turn: { h: number; label: string; high: boolean } | null; share: number; tideK: string; bestK: string; nowK: string; echo: string; newK?: string; fullK?: string;
    /** The best window's clock times ("05:10–06:00"), '' with none today; the moon's lit share and age as one tag. */
    bestT: string; litK: string;
  };
  /** Paddling: the launch beach on the left, the sea to its right, the wind's arrow in that frame (rel: where it blows toward, degrees clockwise from out-to-sea). */
  paddle?: {
    craft: 'kayak' | 'sup'; rel: number | null; effKt: number; side: 'offshore' | 'onshore' | 'cross' | 'calm'; rangeKm: number; rangeK: string; pushK: string; windK: string; shoreK: string; seaK: string; capK: string;
    /** The wind push's level (pushOf: offshore past the craft's limits reads red), the breakers at the launch, m, and their tag. */
    pushLv: Level | null; brkM: number; brkK: string;
  };
  swim?: { rip: 'LOW' | 'MOD' | 'HIGH'; ripK: string; shore: string; flag: string; uv: number | null; uvK: string; sideK: string };
  water?: {
    visM: number | null; vis: string; depthM: number; waterM: number | null; overReef: string; chop: string; hvis: string; at: string; surge: string; surgeMs: number;
    /** The surge's band (physics/surge.ts) and speed in words; the wind, kt, for the chop on the surface (null when that feed has nothing). */
    band: 'CALM' | 'SURGY' | 'DANGEROUS'; surgeV: string; windKt: number | null;
  };
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
      facing: fin(s.facing) ? s.facing : null, rangeK: t('fc.surf.faces', { v: headline(r).value }), everyK: t('fc.surf.every', { s: n0(s.tp) }), fromK: t('fc.surf.from', { dir: cmp(s.dir) }),
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
      turn: turnH <= 24 ? { h: turnH, label: sentence(t(`fc.tide.next.${tn.next.type}` as Key, { t: localClock(tn.next.t) })), high: tn.next.type === 'high' } : null,
      share: r.share ?? 0, tideK: t('fc.cap.tide'), bestK: t('fc.cap.best'), nowK: t('fc.now'), echo: t('fc.cap.echo', { w: levelWord(r) }), newK: t('fc.cap.newMoon'), fullK: t('fc.cap.fullMoon'),
      bestT: win && win.dayMs === d0 ? `${localClock(win.startMs)}–${localClock(win.endMs)}` : '',
      litK: t('fc.fish.lit', { p: n0(f.moonIllum * 100), d: n0(age) }),
    };
  }
  if (r.paddle && r.score !== null) {
    const x = r.paddle, push = pushOf(x);
    base.paddle = {
      craft: x.craft, rel: push.rel, effKt: x.effWindKt ?? 0, side: push.side, rangeKm: x.rangeKm,
      rangeK: x.rangeKm > 0 ? t('fc.cap.range', { km: dec(x.rangeKm, 1) }) : t('fc.paddle.stay'),
      pushK: push.side === 'calm' ? t('fc.push.calm') : `${push.v} · ${push.sub}`,
      windK: x.windKt === null ? '' : `${n0(x.windKt)} kt`, shoreK: t('fc.cap.land'), seaK: t('fc.cap.sea'),
      capK: t(`paddle.craft.${x.craft}` as Key),
      pushLv: push.lv, brkM: x.breakerM, brkK: t('fc.cap.shore', { m: n1(x.breakerM) }),
    };
  }
  if (r.swim && r.score !== null) {
    const s = r.swim;
    base.swim = {
      rip: s.rip, ripK: `${t('fc.ripRisk')} · ${t(`fc.ripw.${s.rip}` as Key).toLowerCase()}`, shore: t('fc.cap.shore', { m: n1(s.breakerM) }),
      flag: t(`fc.flagw.${s.rip}` as Key), uv: fin(s.uv) ? s.uv : null, uvK: fin(s.uv) ? `UV ${n0(s.uv)}` : '', sideK: t('fc.swim.side'),
    };
  }
  if (r.water && r.score !== null) {
    const w = r.water;
    base.water = {
      visM: w.visM, vis: w.visM === null ? '' : t('fc.cap.vis', { m: w.visM >= 10 ? n0(w.visM) : n1(w.visM) }), depthM: w.depthM,
      waterM: w.waterM, overReef: w.waterM === null ? '' : t('fc.cap.overReef', { m: n1(w.waterM) }),
      chop: w.windKt === null ? '' : `${t('fc.chop')} · ${t(`fc.chop.${chopFor(w.windKt)}` as Key).toLowerCase()}`,
      hvis: t('fc.cap.hvis'), at: t('fc.cap.at', { d: w.depthM }), surge: `${t('fc.cap.surge')} · ${t(`fc.surge.${w.surge}` as Key).toLowerCase()}`, surgeMs: w.surgeMs,
      band: w.surge, surgeV: `${dec(w.surgeMs, 2)} m/s`, windKt: w.windKt,
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
    case 'paddle': return [84 + 10 * gust(tt), 760 + 100 * gust(tt)];
    default: return [86 + 6 * Math.sin((TAU * tt) / 8), 640 + 220 * (0.5 + 0.5 * Math.sin((TAU * tt) / 8))];
  }
}
/** The widest the number gets (to fit it to its box). */
export const VMAX: Record<FcActivity, [number, number]> = { surf: [96, 800], sail: [108, 900], fish: [86, 860], swim: [92, 800], paddle: [94, 860], snorkel: [92, 860], dive: [92, 860], spear: [92, 860] };

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
      this.active = null;
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
  /** Paddle: x of the beach edge; the land lies to its left. */
  private paddleShoreX() { return this.AR.x + this.AR.w * 0.14; }
  private shoreY() { return this.AR.y + this.AR.h * 0.8; }
  private spawn(i: number, anywhere: boolean) {
    const x = Math.random() * this.W;
    const y = this.p.act === 'swim' ? Math.random() * this.shoreY() : Math.random() * this.H;
    const x2 = this.p.act === 'paddle' ? this.paddleShoreX() + Math.random() * (this.W - this.paddleShoreX()) : x;
    this.PX[i] = this.OX[i] = x2;
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
    } else if (p.act === 'paddle') {
      // The wind in the launch's frame (shore left, sea right): speed by the effective wind, a gust now and then.
      const q = p.paddle, kt = q?.effKt ?? 6, g = gust(tt), rel = ((q?.rel ?? 0) + 0) * D2R, v = (Math.max(2, kt) * 9) * (1 + 0.35 * g);
      const n = 0.12 * nz(x * 1.3, y * 1.3, tt * 2);
      out[0] = Math.cos(rel + n) * v; out[1] = Math.sin(rel + n) * v; out[2] = 0.35 + 0.5 * g;
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
      // The specks swing with the surge on the picture's own 8 s beat, harder the stronger it is (gentler near the surface).
      const n = nz(x, y, tt * 0.5), sg = clamp((p.water?.surgeMs ?? 0.1) / 0.3, 0.3, 2);
      const surge = (p.act === 'dive' || p.act === 'spear' ? 16 : 8) * sg * Math.sin((TAU * tt) / 8);
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
    // The water pictures: specks only under the surface, bright up to the mask and fading out at the visibility ahead of it.
    const wf = dots && this.p.water ? waterFrame(AR, this.p.act as WaterKit, this.p.water) : null;
    const { PX, PY, OX, OY, LF, ML, PZ } = this;
    for (let i = 0; i < this.N; i++) {
      OX[i] = PX[i]; OY[i] = PY[i];
      this.vel(PX[i], PY[i], tt, V);
      PX[i] += V[0] * dt; PY[i] += V[1] * dt; LF[i] += dt;
      const x = PX[i], y = PY[i];
      if (x < -20 || x > W + 20 || y < -20 || y > Hh + 20 || LF[i] > ML[i] || (this.p.act === 'swim' && y > Y) || (this.p.act === 'paddle' && x < this.paddleShoreX())) {
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
        const d = wf ? Math.max(0, x - wf.mx) / wf.hm : clamp((x - AR.x) / AR.w, 0, 1) * 20, f = wf && y < wf.sy ? 0 : clamp(1 - d / Math.max(0.5, vis), 0, 1);
        br = Math.pow(f, 1.3) * (0.25 + 0.5 * PZ[i]);
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
          const d = wf ? clamp((PX[i] - wf.mx) / wf.hm / Math.max(0.5, vis), 0, 1) : clamp((PX[i] - AR.x) / AR.w, 0, 1), r = 0.6 + 1.5 * (1 - d) * (0.4 + 0.6 * PZ[i]);
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
    this.hots = [];
    const S: Style = { ink: rgba(on, 1), soft: rgba(on, 0.68), faint: rgba(on, 0.24), on, fd: this.fdCol as unknown as RGB, T: this.T, reduced: this.reduced, hot: this.hots };
    c.fillStyle = S.ink; c.strokeStyle = S.ink;
    const p = this.p, A = this.AR;
    if (p.act === 'surf' && p.surf) drawSurf(c, A, tt, p.surf, S);
    else if (p.act === 'sail' && p.sail) drawSail(c, A, tt, p.sail, S, this.SN);
    else if (p.act === 'fish' && p.fish) drawFish(c, A, tt, p.fish, S);
    else if (p.act === 'paddle' && p.paddle) drawPaddle(c, A, tt, p.paddle, S, this.paddleShoreX());
    else if (p.act === 'swim' && p.swim) drawSwim(c, A, tt, p.swim, S, this.shoreY());
    else if (p.act === 'snorkel' && p.water) drawSnorkel(c, A, tt, p.water, S);
    else if ((p.act === 'dive' || p.act === 'spear') && p.water) drawDive(c, A, tt, p.water, S, p.act);
    // The tapped part, held in corner brackets; and once, as a picture opens, a quick sweep over each tappable part.
    const big = (k: string) => this.hots.filter((q) => q.k === k).sort((m, n) => n.w * n.h - m.w * m.h)[0];
    c.strokeStyle = S.ink;
    if (this.active) {
      const q = big(this.active);
      if (q) { const pu = this.reduced ? 0 : 1.5 * (0.5 + 0.5 * Math.sin(tt * 5)); brackets(c, q.x - 3 - pu, q.y - 3 - pu, q.w + 6 + 2 * pu, q.h + 6 + 2 * pu, 12, 3); }
    } else if (!this.reduced) {
      const keys = [...new Set(this.hots.map((q) => q.k))], since = tt - this.modeT0 - 1.2, i = Math.floor(since / 0.45);
      if (since > 0 && i < keys.length) { const q = big(keys[i]), f = 1 - (since % 0.45) / 0.45; c.globalAlpha = mA * f * 0.85; brackets(c, q.x - 3, q.y - 3, q.w + 6, q.h + 6, 10, 2.5); }
    }
    c.restore();
  }
  /** Tappable parts drawn in the last frame, and the one tapped (its box is bracketed, the page shows its words). */
  hots: Hot[] = [];
  active: string | null = null;
  /** The part under a point in hero px (the first, most specific, match), or null. */
  hit(px: number, py: number): Hot | null {
    return this.hots.find((q) => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h) ?? null;
  }
  /** The biggest box of a part (where its words box points). */
  boxOf(k: string): Hot | null {
    return this.hots.filter((q) => q.k === k).sort((m, n) => n.w * n.h - m.w * m.h)[0] ?? null;
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

interface Style { ink: string; soft: string; faint: string; on: RGB; fd: RGB; T: Tokens; reduced: boolean; hot: Hot[] }
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
    c.fillStyle = S.soft; txt(c, dec(m, 1), x, yy, 'left', 10.5);
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

/** The page's off-white (foam, boards, hulls, the figure's shorts): light on every level colour, in both themes. */
const CREAM: RGB = [255, 246, 232];
/** Text on a cream tag: dark in both themes. */
const DARK: RGB = [12, 22, 28];
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
  // Rose and section side by side on one centre line: the rose's needle tail and the masthead at the top, its
  // captions and the wind scale at the bottom. R is as large as the box allows; the text grows with it.
  const fs = clamp(Math.min(w, 760) / 560, 0.9, 1.3);
  const tx = (s: string, px: number, py: number, al: CanvasTextAlign, size: number, wgt: number) => txt(c, s, px, py, al, size * fs, wgt);
  const head = 46 * fs, foot = 66 * fs; // section titles above, captions and wind scale below
  const R = Math.max(40, Math.min(w * 0.235, (h - head - foot) / 2 - 10)), ri = R - Math.max(11, R * 0.13);
  const slack = Math.max(0, h - head - foot - 2 * R - 20);
  const cx = x + Math.max(R + 4, w * 0.25), cy = y + head + 10 + R + slack / 2;
  c.lineCap = 'butt';
  if (a.fromDeg !== null) {
    // No-go wedge either side of the wind, inside the card.
    c.save(); wedge(0, ri, from - 40, from + 40); c.fillStyle = rgba(S.on, 0.07); c.fill(); c.clip(); stripes(5, rgba(S.on, 0.1)); c.restore();
  }
  // The bezel: a solid ink band, its degree ticks knocked out in the field colour (an instrument, read at a glance).
  c.fillStyle = S.ink; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.arc(cx, cy, ri, 0, TAU, true); c.fill();
  if (a.fromDeg !== null) {
    const sp = 12 + 8 * g;
    c.save(); wedge(ri, R, from - sp, from + sp); c.fillStyle = rgba(CREAM, 0.35 + 0.35 * g); c.fill(); c.clip(); stripes(3, rgba(CREAM, 0.95)); c.restore();
  }
  const fdc = rgba(S.fd);
  for (let d = 0; d < 360; d += 5) {
    const l = d % 30 === 0 ? (R - ri) * 0.62 : d % 10 === 0 ? (R - ri) * 0.42 : (R - ri) * 0.24;
    c.strokeStyle = fdc; c.lineWidth = d % 30 === 0 ? 2 : 1.2;
    c.beginPath(); line(pol(R - 1, d), pol(R - 1 - l, d)); c.stroke();
  }
  c.strokeStyle = S.ink; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R + 4, 0, TAU); c.stroke();
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
  for (let d = 30; d < 360; d += 30) if (d % 90) { const p = pol(ri - 9, d); c.fillStyle = S.soft; tx(String(d).padStart(3, '0'), p[0], p[1], 'center', small ? 7.5 : 8.5, 600); }
  c.fillStyle = S.ink; c.font = `800 ${Math.round(Math.max(11, R * 0.15))}px ${DISP}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  ([['N', 0], ['E', 90], ['S', 180], [t('hemi.W'), 270]] as const).forEach(([s, d]) => { const p = pol(ri - 11, d); c.fillText(s, p[0], p[1]); });

  const L = ri * 0.62; // boat length on the card
  if (P) {
    // The coast line through the hub, the leg's course ahead of the bow.
    c.strokeStyle = S.soft; c.lineWidth = 1; c.setLineDash([5, 4]); c.beginPath(); line(pol(ri * 0.98, P.courseDeg), pol(ri * 0.98, P.courseDeg + 180)); c.stroke(); c.setLineDash([]);
    const ce = pol(ri * 0.66, P.courseDeg + 180), ang = ((P.courseDeg + 180) % 180) - 90; // label along the line, upright
    c.save(); c.translate(ce[0], ce[1]); c.rotate(ang * D2R); c.fillStyle = S.soft; tx(a.coastK, 0, -6, 'center', 7.5, 700); c.restore();
    // The wind angle off the bow, arced and numbered.
    const rel = ((((from - P.headingDeg) % 360) + 540) % 360) - 180, ra = ri * 0.5;
    const d0 = rel >= 0 ? P.headingDeg : P.headingDeg + rel, d1 = rel >= 0 ? P.headingDeg + rel : P.headingDeg;
    c.strokeStyle = S.ink; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, ra, (d0 - 90) * D2R, (d1 - 90) * D2R); c.stroke();
    c.beginPath(); line(pol(ra - 4, P.headingDeg), pol(ra + 4, P.headingDeg)); c.stroke();
    const lp = pol(ra + 10, P.headingDeg + rel / 2);
    tag(c, `${Math.round(P.twa)}°`, lp[0], lp[1], 'center', (small ? 8.5 : 9.5) * fs, S.ink, fdc);
  }
  if (a.fromDeg !== null) {
    // Needle from the wind's side to the boat, the head towards it; barbs on the tail (a full barb 10 kt, a half 5 kt).
    const an = SN.a * D2R, ux = Math.sin(an), uy = -Math.cos(an), px = -uy, py = ux;
    const tail = R + 14, head = P ? L * 0.72 : 10;
    c.strokeStyle = S.ink; c.fillStyle = S.ink; c.lineWidth = 3.4; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(cx + ux * tail, cy + uy * tail); c.lineTo(cx + ux * (head + 10), cy + uy * (head + 10)); c.stroke();
    c.beginPath(); c.moveTo(cx + ux * head, cy + uy * head); c.lineTo(cx + ux * (head + 16) + px * 7, cy + uy * (head + 16) + py * 7); c.lineTo(cx + ux * (head + 12), cy + uy * (head + 12)); c.lineTo(cx + ux * (head + 16) - px * 7, cy + uy * (head + 16) - py * 7); c.closePath(); c.fill();
    const barb = (d: number, len: number) => { const bx = cx + ux * d, by = cy + uy * d; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + (ux * 0.5 + px) * len, by + (uy * 0.5 + py) * len); c.stroke(); };
    c.lineWidth = 2.6;
    const full = Math.floor(Math.round(a.windKt / 5) / 2), half = Math.round(a.windKt / 5) % 2;
    let d = tail;
    for (let i = 0; i < Math.min(full, 5); i++, d -= 7) barb(d, 13);
    if (half) barb(d, 7);
    c.lineCap = 'butt';
    // The no-go label inside the wedge, on the needle's side away from the bow (clear of the wind-angle number).
    const side = P && ((((P.headingDeg - from) % 360) + 360) % 360) < 180 ? -1 : 1, nd = from + side * 27, np = pol(ri * 0.6, nd);
    c.save(); c.translate(np[0], np[1]); c.rotate(((((nd % 180) + 180) % 180) - 90) * D2R); c.fillStyle = S.soft; tx(a.noGoK, 0, 0, 'center', 7, 700); c.restore();
  }
  if (P) {
    // The boat from above: bow along the heading, starboard on +x before the turn; main and jib eased to leeward.
    const lee = P.tack === 'port' ? 1 : -1, bw = L * 0.34, boom = boomDeg(P.twa) * D2R;
    c.save(); c.translate(cx, cy); c.rotate(P.headingDeg * D2R);
    c.beginPath(); c.moveTo(0, -L / 2);
    c.bezierCurveTo(bw * 0.55, -L * 0.3, bw * 0.55, L * 0.2, bw * 0.4, L / 2); c.lineTo(-bw * 0.4, L / 2);
    c.bezierCurveTo(-bw * 0.55, L * 0.2, -bw * 0.55, -L * 0.3, 0, -L / 2); c.closePath();
    c.fillStyle = rgba(CREAM, 0.97); c.fill(); c.strokeStyle = S.ink; c.lineWidth = 2; c.lineJoin = 'miter'; c.stroke();
    c.strokeStyle = S.ink; c.lineWidth = 1.2; c.strokeRect(-bw * 0.16, L * 0.14, bw * 0.32, L * 0.24); // cockpit
    c.strokeRect(-bw * 0.13, -L * 0.2, bw * 0.26, L * 0.26); // cabin top
    const mY = -L * 0.08, bl = L * 0.52, bx = lee * Math.sin(boom) * bl, by = mY + Math.cos(boom) * bl;
    // Mainsail: the boom straight, the sail's foot bellied to leeward of it.
    const qx = bx / 2 + lee * Math.cos(boom) * bl * 0.2, qy = (mY + by) / 2 + Math.sin(boom) * bl * 0.2;
    c.fillStyle = rgba(CREAM, 0.9); c.beginPath(); c.moveTo(0, mY); c.quadraticCurveTo(qx, qy, bx, by); c.closePath(); c.fill();
    c.strokeStyle = S.ink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, mY); c.quadraticCurveTo(qx, qy, bx, by); c.stroke();
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, mY); c.lineTo(bx, by); c.stroke();
    // Jib: tack at the bow, clew a little to leeward, sheeted a touch wider than the main.
    const jb = Math.min(85, boomDeg(P.twa) + 6) * D2R, jl = L * 0.4, jx = lee * Math.sin(jb) * jl * 0.8, jy = -L / 2 + Math.cos(jb) * jl;
    c.strokeStyle = S.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -L / 2 + 2); c.quadraticCurveTo(jx * 0.5 + lee * L * 0.08, (-L / 2 + jy) / 2, jx, jy); c.stroke();
    c.fillStyle = S.ink; c.fillRect(-2.6, mY - 2.6, 5.2, 5.2);
    c.restore();
  }
  // Captions under the rose: where the wind is from, the leg, the other leg.
  let ly = cy + R + 16 * fs;
  if (a.from) { c.fillStyle = S.ink; tx(a.from, cx, ly, 'center', 10.5, 800); ly += 14 * fs; }
  if (P) {
    c.fillStyle = S.ink; tx(P.leg, cx, ly, 'center', 9.5, 700); ly += 13 * fs;
    c.fillStyle = S.soft; tx(P.otherLeg, cx, ly, 'center', 9, 600);
  }

  // --- The section, seen from astern.
  const sx0 = Math.max(cx + R + (small ? 20 : 34), x + w * 0.54), sx1 = x + w, sw = sx1 - sx0, hc = sx0 + sw * 0.5;
  const sy = Math.min(y + h - 14 * fs, cy + R + foot - 14 * fs); // the wind scale's line
  // The heel itself leads, as a tag; the tack and the boat it is worked out for under it.
  const heelTag = () => P ? tag(c, a.heelNow.replace('{d}', String(Math.round(Math.max(0, SN.h)))) + (SN.h >= REEF_HEEL_DEG ? ` · ${a.reefK}` : ''), sx0, y + 9 * fs, 'left', (small ? 10 : 11.5) * fs, S.ink, rgba(S.fd)) : null;
  if (!P) { c.fillStyle = S.ink; tx(a.heelK, sx0, y + 6 * fs, 'left', small ? 8.5 : 9.5, 800); }
  if (P) { c.fillStyle = S.ink; tx(P.tackK, sx0, y + 28 * fs, 'left', small ? 8 : 9, 700); c.fillStyle = S.soft; tx(a.ruleK, sx0, y + 40 * fs, 'left', small ? 7 : 8, 600); }
  // The masthead level with the top of the rose, the keel bulb clear of the scale's title.
  const B = Math.max(24, Math.min(sw * 0.36, R * 0.62)); // beam
  const wl = Math.min(sy - 34 * fs - B * 1.05, cy + R * 0.32); // waterline
  const mH = Math.max(B * 1.2, Math.min(B * 2.4, wl - (cy - R), wl - y - head));
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
  [10, 20, 30].forEach((d) => { const q = pp(pr + 16, d); c.fillStyle = S.soft; tx(`${d}°`, q[0], q[1], 'center', 8, 600); });
  // The reef label just inside the band's end, so it never runs off the picture.
  const rq = pp(pr - 13, 38); c.fillStyle = S.ink; tx(a.reefK, rq[0], rq[1], 'center', 7.5, 800);
  // Upright reference.
  c.strokeStyle = S.faint; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(hc, wl + B * 0.3); c.lineTo(hc, wl - pr - 10); c.stroke(); c.setLineDash([]);
  const heel = P ? Math.max(0, SN.h) : 0;
  // The wind across the boat, from the windward side, level (it does not heel).
  if (P) {
    const ay = wl - mH * 0.62, ax1 = hc - lee * B * 0.55, ax0 = clamp(hc - lee * (B * 0.6 + Math.min(sw * 0.42, B * 1.5)), sx0, sx1);
    c.strokeStyle = S.ink; c.lineWidth = 2; c.lineCap = 'butt';
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
  // The hull in section: flared topsides to a hard turn of the bilge, a flat run to the keel root, a cambered deck.
  const hull = () => {
    c.beginPath(); c.moveTo(-hb, -0.2 * B);
    c.lineTo(-hb * 0.94, 0.04 * B); c.quadraticCurveTo(-hb * 0.86, 0.2 * B, -0.2 * B, 0.25 * B); c.lineTo(0, 0.28 * B);
    c.lineTo(0.2 * B, 0.25 * B); c.quadraticCurveTo(hb * 0.86, 0.2 * B, hb * 0.94, 0.04 * B); c.lineTo(hb, -0.2 * B);
    c.quadraticCurveTo(0, -0.25 * B, -hb, -0.2 * B); c.closePath();
  };
  // Keel and bulb.
  c.beginPath(); c.moveTo(-0.05 * B, 0.25 * B); c.lineTo(-0.035 * B, 0.98 * B); c.lineTo(0.035 * B, 0.98 * B); c.lineTo(0.05 * B, 0.25 * B); c.closePath();
  c.fillStyle = S.ink; c.fill();
  c.beginPath(); c.moveTo(-0.13 * B, 1.0 * B); c.lineTo(-0.1 * B, 0.95 * B); c.lineTo(0.12 * B, 0.95 * B); c.lineTo(0.15 * B, 1.0 * B); c.lineTo(0.12 * B, 1.05 * B); c.lineTo(-0.1 * B, 1.05 * B); c.closePath(); c.fill(); // bulb
  hull(); c.fillStyle = rgba(CREAM, 0.97); c.fill();
  c.save(); hull(); c.clip(); c.fillStyle = S.ink; c.fillRect(-B, 0.02 * B, 2 * B, 0.05 * B); c.restore(); // waterline stripe
  hull(); c.strokeStyle = S.ink; c.lineWidth = 2; c.lineJoin = 'miter'; c.stroke();
  // Cabin top and the lifelines on their stanchions.
  c.fillStyle = rgba(CREAM, 0.97); c.beginPath(); c.moveTo(-0.26 * B, -0.235 * B); c.lineTo(-0.2 * B, -0.36 * B); c.lineTo(0.2 * B, -0.36 * B); c.lineTo(0.26 * B, -0.235 * B); c.closePath(); c.fill(); c.lineWidth = 1.6; c.stroke();
  c.fillStyle = S.ink; c.fillRect(-0.14 * B, -0.33 * B, 0.08 * B, 0.04 * B); c.fillRect(0.06 * B, -0.33 * B, 0.08 * B, 0.04 * B);
  c.lineWidth = 1.2; c.beginPath(); c.moveTo(-hb + 1, -0.2 * B); c.lineTo(-hb + 1, -0.42 * B); c.lineTo(-0.3 * B, -0.42 * B); c.moveTo(hb - 1, -0.2 * B); c.lineTo(hb - 1, -0.42 * B); c.lineTo(0.3 * B, -0.42 * B); c.stroke();
  // Shrouds over the spreaders, the mast, the main sheeted out to leeward.
  const spY = -mH * 0.55, spX = 0.24 * B;
  c.strokeStyle = S.soft; c.lineWidth = 1; c.beginPath();
  c.moveTo(-hb + 2, -0.2 * B); c.lineTo(-spX, spY); c.lineTo(0, -mH); c.lineTo(spX, spY); c.lineTo(hb - 2, -0.2 * B); c.moveTo(-spX, spY); c.lineTo(spX, spY); c.stroke();
  if (P) {
    const gy = -0.24 * B - B * 0.35, bo = boomDeg(P.twa) * D2R, bx = lee * Math.sin(bo) * B * 1.2;
    c.fillStyle = rgba(CREAM, 0.9); c.beginPath(); c.moveTo(0, -mH + 3); c.quadraticCurveTo(bx * 0.7 + lee * 3, gy - mH * 0.35, bx, gy); c.lineTo(0, gy); c.closePath(); c.fill();
    // Battens across the main, and a telltale flicking off its leech.
    c.save(); c.clip(); c.strokeStyle = rgba(S.on, 0.5); c.lineWidth = 1; c.beginPath();
    for (const k of [0.25, 0.5, 0.75]) { const yy = -mH + 3 + (gy + mH - 3) * k; c.moveTo(0, yy); c.lineTo(bx * 1.2, yy); }
    c.stroke(); c.restore();
    { const ty = gy - (gy + mH) * 0.45, tx0 = bx * 0.55 + lee * 2, fl = S.reduced ? 0 : Math.sin(tt * 9) * 2.5; c.strokeStyle = S.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(tx0, ty); c.lineTo(tx0 + lee * 9, ty + fl); c.stroke(); }
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
    heelTag();
  }

  // --- Wind scale 0-30 kt: ticks, the mean solid above the line, the gusts hatched beyond it.
  const k2x = (k: number) => sx0 + (clamp(k, 0, 30) / 30) * sw;
  c.strokeStyle = S.soft; c.lineWidth = 1; c.beginPath(); c.moveTo(sx0, sy); c.lineTo(sx1, sy);
  for (let k = 0; k <= 30; k++) { c.moveTo(k2x(k), sy); c.lineTo(k2x(k), sy + (k % 10 ? (k % 5 ? 2.5 : 4) : 6)); }
  c.stroke();
  [0, 10, 20, 30].forEach((k) => { c.fillStyle = S.soft; tx(String(k), k2x(k), sy + 12 * fs, k ? (k === 30 ? 'right' : 'center') : 'left', 8, 600); });
  c.fillStyle = S.ink; c.fillRect(sx0, sy - 9, k2x(a.windKt) - sx0, 6);
  if (a.gustKt !== null && a.gustKt > a.windKt) {
    const gx0 = k2x(a.windKt), gx1 = k2x(a.windKt + (a.gustKt - a.windKt) * (0.4 + 0.6 * g));
    c.save(); c.beginPath(); c.rect(gx0, sy - 9, gx1 - gx0, 6); c.fillStyle = rgba(S.on, 0.25); c.fill(); c.clip();
    c.strokeStyle = S.ink; c.lineWidth = 1; c.beginPath(); for (let xx = gx0 - 8; xx < gx1 + 8; xx += 3) { c.moveTo(xx, sy - 3); c.lineTo(xx + 6, sy - 9); } c.stroke(); c.restore();
  }
  c.fillStyle = S.ink; tx(a.windK, sx0, sy - 26 * fs, 'left', small ? 8.5 : 9.5, 800);
  c.fillStyle = S.ink; tx(a.kt, sx0, sy - 15 * fs, 'left', 8.5, 800);
  if (a.gustKt !== null) { c.fillStyle = rgba(S.on, 0.55 + 0.45 * g); tx(a.gust, sx1, sy - 15 * fs, 'right', 8.5, 800); }

  // Tap targets, most specific first.
  if (P) S.hot.push({ x: cx - L * 0.55, y: cy - L * 0.55, w: L * 1.1, h: L * 1.1, k: 'sail.boat' });
  if (a.fromDeg !== null) { const np = pol(ri * 0.62, from); S.hot.push({ x: np[0] - 22, y: np[1] - 22, w: 44, h: 44, k: 'sail.nogo' }); }
  S.hot.push({ x: sx0 - 4, y: sy - 34 * fs, w: sw + 8, h: 34 * fs + 18, k: 'sail.gust' });
  S.hot.push({ x: sx0 - 4, y: y, w: sw + 8, h: sy - 34 * fs - y, k: 'sail.heel' });
  S.hot.push({ x: cx - R - 10, y: cy - R - 10, w: 2 * R + 20, h: 2 * R + 20, k: 'sail.wind' });
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
  // The bezel's two named points in words (day 0 new moon at the top, day 15 full moon at the bottom), not bare day numbers.
  ([[0, a.newK ?? '0', -1], [14.77, a.fullK ?? '15', 1]] as const).forEach(([d, s, side]) => {
    const an = -Math.PI / 2 + (d / 29.53) * TAU;
    c.fillStyle = S.soft; txt(c, s, cx + Math.cos(an) * (R + 22) + 12, cy + Math.sin(an) * (R + 22) + side * 4, 'left', 9, 700);
  });
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
  // Two short lines under the bezel ("MOON 43% LIT" / "DAY 7 OF 29"), clear of the FULL mark and the tide's hour labels.
  const [m1, m2] = a.moon.split(' · ');
  c.fillStyle = S.ink; txt(c, m1, cx - R - 16, cy + R + 42, 'left', 10.5, 700);
  if (m2) txt(c, m2, cx - R - 16, cy + R + 55, 'left', 10.5, 700);
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
      // Lower when the tide's turn sits on its own line under the title (Spanish), so the two never touch.
      c.font = `700 ${(10.5 * 1.12).toFixed(1)}px ${MONO}`;
      const oneLine = !a.turn || tx0 + c.measureText(a.tideK.toUpperCase()).width + 10 < tx1 - c.measureText(a.turn.label.toUpperCase()).width;
      c.fillStyle = S.ink; txt(c, a.bestK, hx((b0 + b1) / 2), oneLine ? ty0 + 4 : ty0 + 14, 'center', 9.5, 800);
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
    if (a.turn) {
      // Side by side when they fit; in a narrow box (Spanish words are longer) the turn goes under the title, clear of the BEST mark (review 2026-11-16).
      c.font = `700 ${(10.5 * 1.12).toFixed(1)}px ${MONO}`;
      const fits = tx0 + c.measureText(a.tideK.toUpperCase()).width + 10 < tx1 - c.measureText(a.turn.label.toUpperCase()).width;
      if (fits) txt(c, a.turn.label, tx1, y + 8, 'right', 10.5, 700);
      else txt(c, a.turn.label, tx0, y + 21, 'left', 10.5, 700);
    }
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

/**
 * PADDLE, from above (PLAN 13.1): the launch beach on the left (sand, the wet strip, the swash and the breakers rolling
 * in, as many and as wide as the breakers at the launch), the sea to its right, in the wind's frame so "off the land"
 * always points out to sea. The wind is rows of chevrons marching the way it blows, faster and heavier as it gets up.
 * The craft (a kayak with its double blade, or a paddleboard with its single paddle) sits off the launch, stroking;
 * a dashed half ring is how far to go today, and a dashed line from the craft shows where the wind would drift it
 * (broadside, as a craft lies when nobody paddles). When the answer is to stay ashore the craft is pulled up on the
 * sand, the water's edge is a red and ink barrier and the sea says so in a big tag.
 */
function drawPaddle(c: Ctx2D, A: Box, tt0: number, a: NonNullable<HeroParams['paddle']>, S: Style, sx: number) {
  const { x, y, w, h } = A, tt = S.reduced ? 2.4 : tt0, fs = clamp(Math.min(w, 760) / 380, 1, 1.3);
  const ink = S.ink, fdc = rgba(S.fd), cream = (al: number) => rgba(CREAM, al), go = a.rangeKm > 0;
  const cy = Math.round(y + h * 0.5 + 4);
  c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 6;
  const shore = (yy: number) => sx + Math.sin(yy * 0.045 + 0.7) * 2 + Math.sin(yy * 0.013 + 2) * 3;

  // --- The sea's words first (their boxes keep the drawing clear of them): the wind's push top right, the shore break bottom left.
  const lvC = a.pushLv === null ? null : S.T[`lv${a.pushLv}` as 'lv0'];
  const pS = tagSize(c, a.pushK, 9.5 * fs, x + w - sx - 34);
  const pushBox = { x: x + w - pS.w - pS.h - 4, y: y + 1, w: pS.w + pS.h + 4, h: pS.h };
  const kS = tagSize(c, a.brkK, 9 * fs, x + w - sx - 12);
  const brkBox = { x: sx + 10, y: y + h - kS.h - 1, w: kS.w, h: kS.h };

  // --- Wind: rows of chevrons marching downwind over the sea.
  if (a.rel !== null && a.side !== 'calm') {
    const d = a.rel * D2R, ux = Math.cos(d), uy = Math.sin(d), kt = clamp(a.effKt, 0, 30);
    const lane = 30 * fs, gap = 30 * fs, v = 10 + kt * 2.2, sz = (5 + kt * 0.16) * fs;
    const mx = (sx + x + w) / 2, my = y + h / 2, R = Math.hypot(w, h);
    for (let li = -Math.ceil(R / lane); li <= Math.ceil(R / lane); li++) {
      const o = li * lane, sh = (li & 1 ? gap / 2 : 0) + ((tt * v) % gap);
      for (let s0 = -R / 2 - gap + sh; s0 < R / 2 + gap; s0 += gap) {
        const px = mx + ux * s0 - uy * o, py = my + uy * s0 + ux * o;
        if (px < shore(py) + 14 || px > x + w - 8 || py < y + 6 || py > y + h - 6) continue;
        const fe = Math.min(1, (px - shore(py) - 14) / 30, (x + w - 8 - px) / 30, (py - y - 6) / 24, (y + h - 6 - py) / 24);
        arrow(c, px, py, a.rel + 90, sz, rgba(S.on, 0.6 * fe));
      }
    }
  }

  // --- The beach: sand with grain, the wet strip, breakers rolling in and the swash.
  // The land runs to the canvas's edge on a phone; beside the words on a wide screen it stops at the picture's edge.
  const land = x < 40 ? 0 : x;
  c.fillStyle = rgba(S.T.sand); c.beginPath(); c.moveTo(land, y);
  for (let yy = y; yy <= y + h; yy += 4) c.lineTo(shore(yy), yy);
  c.lineTo(shore(y + h), y + h); c.lineTo(land, y + h); c.closePath(); c.fill();
  c.save(); c.clip();
  for (let i = 0; i < 260; i++) { c.fillStyle = rgba(S.on, 0.1 + 0.16 * hash1(i + 5)); c.fillRect(Math.round(land + hash1(i + 11) * (sx - land)), Math.round(y + hash1(i + 23) * h), 1.5, 1.5); }
  c.fillStyle = rgba(S.on, 0.16); c.beginPath(); c.moveTo(sx - 9, y);
  for (let yy = y; yy <= y + h; yy += 4) c.lineTo(shore(yy) + 1, yy);
  c.lineTo(sx - 9, y + h); c.closePath(); c.fill();
  c.restore();
  const brk = clamp(a.brkM, 0, 2), zone = 10 + brk * 26, nb = brk < 0.15 ? 1 : brk < 0.5 ? 2 : 3;
  for (let i = 0; i < nb; i++) {
    const k = S.reduced ? (i + 0.5) / nb : ((tt / 7 + i / nb) % 1), dd = 6 + (1 - k) * zone, al = Math.min(1, k * 4, (1 - k) * 6), bwid = 2 + brk * 4 * (0.6 + 0.4 * k);
    c.fillStyle = cream(0.9 * al);
    for (let yy = y; yy < y + h; yy += 3) {
      const xx = shore(yy) + dd, jag = hash1(i * 97 + Math.round(yy)) * 3;
      c.fillRect(Math.round(xx), yy, Math.round(bwid + jag), 3);
      if (hash1(Math.round(yy) * 3 + i) < 0.35) c.fillRect(Math.round(xx + bwid + jag + 2 + hash1(yy + i) * 6), yy, 2, 2);
    }
  }
  const wash = S.reduced ? 0 : Math.sin(tt * 0.9) * 3;
  c.strokeStyle = cream(0.95); c.lineWidth = 2.5; c.beginPath();
  for (let yy = y; yy <= y + h; yy += 4) { const xx = shore(yy) - 3 - wash * (0.6 + 0.4 * Math.sin(yy * 0.05)); yy === y ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
  c.stroke();
  c.strokeStyle = ink; c.lineWidth = 2; c.beginPath();
  for (let yy = y; yy <= y + h; yy += 4) (yy === y ? c.moveTo(shore(yy), yy) : c.lineTo(shore(yy), yy));
  c.stroke();

  // --- The craft's place: just past the breakers off the launch, or up on the sand.
  const kayak = a.craft === 'kayak', CL = (kayak ? 56 : 62) * fs, CW = (kayak ? 12 : 17) * fs;
  const bob = S.reduced ? 0 : Math.sin(tt * 1.4);
  const kx = go ? sx + zone + 10 + CL / 2 : Math.min(sx - CW / 2 - 8, x + (sx - x) / 2 + 6), ky = cy + (go ? bob * 1.5 : 0), hd = go ? (S.reduced ? 0 : Math.sin(tt * 0.8) * 3 * D2R) : -Math.PI / 2;
  const craftBox = { x: kx - CL / 2 - 4, y: cy - 30 * fs, w: CL + 8, h: 60 * fs };

  // --- How far to go: a dashed half ring around the launch, 5 km (a kayak's best day) to the picture's room.
  // 5 km (a kayak's best day) is most of the sea's width; the ring runs off the picture's top and bottom like a chart's,
  // and is never drawn smaller than the craft it holds (the tag gives the number).
  const full = Math.max(60, Math.min(h * 0.75, x + w - sx - 24)), rr = go ? Math.max(zone + 14 + CL * 0.75, (a.rangeKm / 5) * full) : 0;
  let rangeBox: Box;
  if (go) {
    c.save(); c.beginPath(); c.rect(x - 1, y, w + 2, h); c.clip();
    c.fillStyle = rgba(S.on, 0.07); c.beginPath(); c.arc(sx, cy, rr, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill();
    c.beginPath(); c.rect(x - 1, y, w + 2, h);
    for (const b of [pushBox, brkBox]) c.rect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
    c.clip('evenodd');
    c.strokeStyle = ink; c.lineWidth = 2; c.setLineDash([7, 5]); c.beginPath(); c.arc(sx, cy, rr, -Math.PI / 2, Math.PI / 2); c.stroke(); c.setLineDash([]);
    c.restore();
    // Its tag just outside the ring, up and to the right, clear of the dashes; when the ring runs off the top, set in
    // the ring's line on its right like a chart's label (the dashes stop at the tag).
    const rs = tagSize(c, a.rangeK, 10 * fs, x + w - sx - 16), top = y + 24 * fs + rs.h / 2, ty = Math.min(cy - rr * 0.82, craftBox.y - rs.h / 2 - 4), yb = ty + rs.h / 2;
    const xr = sx + Math.sqrt(Math.max(0, rr * rr - (cy - yb) * (cy - yb))), out = ty >= top && xr + 7 + rs.w <= x + w - 2;
    const ly = Math.max(top, Math.min(cy - rr * 0.35, craftBox.y - rs.h / 2 - 4)), lx = sx + Math.sqrt(Math.max(0, rr * rr - (cy - ly) * (cy - ly)));
    rangeBox = out ? tag(c, a.rangeK, xr + 7, ty, 'left', 10 * fs, ink, fdc, false, x + w - sx - 16)
      : tag(c, a.rangeK, clamp(lx, sx + zone + 16 + rs.w / 2, x + w - 2 - rs.w / 2), ly, 'center', 10 * fs, ink, fdc, false, x + w - sx - 16);
  } else {
    // Stay ashore: the water's edge barred, the sea says so.
    const L = y + h, seg = 10;
    for (let yy = y, i = 0; yy < L; yy += seg, i++) { c.fillStyle = i & 1 ? ink : cream(0.97); c.fillRect(Math.round(shore(yy + seg / 2)) - 3, yy, 7, Math.min(seg, L - yy)); }
    const sw = x + w - sx - 24, ss = tagSize(c, a.rangeK, 12.5 * fs, sw - 30), tx = sx + 20 + (sw - ss.w - ss.h - 6) / 2 + ss.h + 6;
    rangeBox = tag(c, a.rangeK, tx, cy - h * 0.12, 'left', 12.5 * fs, ink, fdc, false, sw - 30);
    // A no-entry sign: the red square, an ink edge, a cream bar.
    const q = rangeBox.h, qx = rangeBox.x - q - 4, qy = rangeBox.y;
    c.fillStyle = rgba(S.T.lv0); c.fillRect(qx, qy, q, q);
    c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(qx + 1, qy + 1, q - 2, q - 2);
    c.fillStyle = ink; c.fillRect(qx + q * 0.18, qy + q * 0.38, q * 0.64, q * 0.24); c.fillStyle = cream(1); c.fillRect(qx + q * 0.22, qy + q * 0.42, q * 0.56, q * 0.16);
    rangeBox = { x: rangeBox.x - rangeBox.h - 4, y: rangeBox.y, w: rangeBox.w + rangeBox.h + 4, h: rangeBox.h };
  }

  // --- The craft: off the launch and stroking, or pulled up on the sand.
  const hull = (L: number, W: number) => {
    c.beginPath();
    if (kayak) {
      c.moveTo(L / 2, 0); c.quadraticCurveTo(L * 0.22, -W * 0.56, -L * 0.05, -W / 2); c.quadraticCurveTo(-L * 0.32, -W * 0.46, -L / 2, 0);
      c.quadraticCurveTo(-L * 0.32, W * 0.46, -L * 0.05, W / 2); c.quadraticCurveTo(L * 0.22, W * 0.56, L / 2, 0);
    } else {
      c.moveTo(L / 2, 0); c.bezierCurveTo(L / 2, -W * 0.36, L * 0.3, -W / 2, L * 0.08, -W / 2); c.lineTo(-L * 0.44, -W * 0.44); c.lineTo(-L / 2, -W * 0.3); c.lineTo(-L / 2, W * 0.3); c.lineTo(-L * 0.44, W * 0.44); c.lineTo(L * 0.08, W / 2);
      c.bezierCurveTo(L * 0.3, W / 2, L / 2, W * 0.36, L / 2, 0);
    }
    c.closePath();
  };
  // Drift: where the wind would carry it, lying broadside, with nobody paddling.
  let driftBox: Box | null = null;
  if (go && a.rel !== null && a.side !== 'calm') {
    const d = a.rel * D2R, ux = Math.cos(d), uy = Math.sin(d), avoid = [pushBox, brkBox, rangeBox];
    let len = clamp(26 + a.effKt * 6, 46, 150);
    const ghostAt = (L: number): Box => ({ x: kx + ux * L - CL * 0.32, y: ky + uy * L - CL * 0.32, w: CL * 0.64, h: CL * 0.64 });
    const ok = (L: number) => { const g = ghostAt(L), ex = kx + ux * L, ey = ky + uy * L; return ex > shore(ey) + CL * 0.35 && ex < x + w - CL * 0.3 && ey > y + CW && ey < y + h - CW && !avoid.some((b) => overlaps(g, b, 2)); };
    while (len > 34 && !ok(len)) len -= 4;
    if (ok(len)) {
      const ex = kx + ux * len, ey = ky + uy * len, s0 = CL * 0.5 + 4;
      c.strokeStyle = ink; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(kx + ux * s0, ky + uy * s0); c.lineTo(ex - ux * (CW * 0.6 + 6), ey - uy * (CW * 0.6 + 6)); c.stroke(); c.setLineDash([]);
      arrow(c, ex - ux * (CW * 0.6 + 4), ey - uy * (CW * 0.6 + 4), a.rel + 90, 8, ink);
      c.save(); c.translate(ex, ey); c.rotate(d + Math.PI / 2); hull(CL * 0.8, CW * 0.8); c.fillStyle = cream(0.4); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.setLineDash([3, 2]); c.stroke(); c.setLineDash([]); c.restore();
      driftBox = { x: Math.min(kx + ux * s0, ex) - 12, y: Math.min(ky + uy * s0, ey) - 12, w: Math.abs(ex - kx - ux * s0) + 24, h: Math.abs(ey - ky - uy * s0) + 24 };
    }
  }
  c.save(); c.translate(kx, ky); c.rotate(hd);
  hull(CL, CW); c.fillStyle = cream(0.97); c.fill(); c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
  const stroke = S.reduced ? 0.3 : Math.sin(tt * (kayak ? 2.6 : 2.1));
  if (kayak) {
    // Deck: the ridge, bungee crosses fore and aft, the cockpit with the paddler.
    c.strokeStyle = rgba(S.on, 0.7); c.lineWidth = 1; c.beginPath(); c.moveTo(CL * 0.46, 0); c.lineTo(CL * 0.14, 0); c.moveTo(-CL * 0.16, 0); c.lineTo(-CL * 0.46, 0);
    for (const bx of [CL * 0.26, -CL * 0.3]) { c.moveTo(bx - 4, -CW * 0.3); c.lineTo(bx + 4, CW * 0.3); c.moveTo(bx - 4, CW * 0.3); c.lineTo(bx + 4, -CW * 0.3); }
    c.stroke();
    c.fillStyle = ink; c.beginPath(); c.moveTo(CL * 0.12, -CW * 0.18); c.lineTo(CL * 0.12, CW * 0.18); c.lineTo(CL * 0.06, CW * 0.32); c.lineTo(-CL * 0.14, CW * 0.32); c.lineTo(-CL * 0.14, -CW * 0.32); c.lineTo(CL * 0.06, -CW * 0.32); c.closePath(); c.fill();
    if (go) {
      // The double blade sweeping on alternate sides.
      const ang = Math.PI / 2 + 0.42 * stroke, sh = 21 * fs, ca = Math.cos(ang), sa = Math.sin(ang);
      c.strokeStyle = ink; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-ca * sh, -sa * sh); c.lineTo(ca * sh, sa * sh); c.stroke();
      for (const e of [-1, 1]) {
        c.save(); c.translate(e * ca * (sh + 5), e * sa * (sh + 5)); c.rotate(ang); c.fillStyle = ink; c.fillRect(-6, -3, 12, 6); c.restore();
        // The blade in the water stirs a little white.
        if (e * stroke > 0.3) { c.fillStyle = cream(0.8 * (e * stroke - 0.3)); for (let i = 0; i < 4; i++) c.fillRect(Math.round(e * ca * (sh + 5) - 8 - i * 4), Math.round(e * sa * (sh + 5) + (hash1(i) - 0.5) * 6), 2, 2); }
      }
      c.fillStyle = ink; c.fillRect(-CW * 0.5, -CW * 0.75, CW * 0.55, CW * 1.5); // shoulders
      c.fillStyle = cream(1); c.beginPath(); c.arc(-CW * 0.2, 0, CW * 0.36, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 2; c.stroke(); // the hat
    }
  } else {
    // The board: the traction pad hatched, the paddler standing on it with a single paddle.
    c.save(); c.beginPath(); c.rect(-CL * 0.3, -CW * 0.34, CL * 0.36, CW * 0.68); c.clip();
    c.strokeStyle = rgba(S.on, 0.7); c.lineWidth = 1; c.beginPath(); for (let k = -CL * 0.3; k < CL * 0.1; k += 3) { c.moveTo(Math.round(k) + 0.5, -CW); c.lineTo(Math.round(k) + 0.5, CW); } c.stroke(); c.restore();
    c.strokeStyle = rgba(S.on, 0.7); c.lineWidth = 1; c.beginPath(); c.moveTo(CL * 0.46, 0); c.lineTo(CL * 0.14, 0); c.stroke();
    if (go) {
      const side = S.reduced ? 1 : Math.floor(tt / 6) % 2 ? -1 : 1, bx = CL * 0.18 - (0.5 + 0.5 * stroke) * CL * 0.36;
      c.strokeStyle = ink; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-CL * 0.08, side * CW * 0.2); c.lineTo(bx, side * (CW * 0.5 + 9)); c.stroke();
      c.save(); c.translate(bx, side * (CW * 0.5 + 9)); c.fillStyle = ink; c.fillRect(-7, -3, 14, 6); c.restore();
      if (stroke > -0.2) { c.fillStyle = cream(0.7); for (let i = 0; i < 4; i++) c.fillRect(Math.round(bx + 9 + i * 4), Math.round(side * (CW * 0.5 + 9) + (hash1(i + 3) - 0.5) * 6), 2, 2); }
      c.fillStyle = ink; c.fillRect(-CL * 0.13, -CW * 0.55, CW * 0.45, CW * 1.1); // shoulders
      c.fillStyle = cream(1); c.beginPath(); c.arc(-CL * 0.13 + CW * 0.25, 0, CW * 0.27, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 2; c.stroke(); // the hat
    }
  }
  c.restore();
  if (!go) {
    // The paddle laid on the sand beside the craft.
    const px0 = kx + CW / 2 + 5;
    c.fillStyle = ink; c.fillRect(Math.round(px0), Math.round(ky - CL * 0.42), 2.4, Math.round(CL * 0.84));
    c.fillRect(Math.round(px0 - 2.3), Math.round(ky - CL * 0.42 - 10), 7, 11);
    if (kayak) c.fillRect(Math.round(px0 - 2.3), Math.round(ky + CL * 0.42 - 1), 7, 11);
  }

  // --- The words, last, on top.
  if (lvC) { c.fillStyle = rgba(lvC); c.fillRect(pushBox.x, pushBox.y, pS.h, pS.h); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(pushBox.x + 1, pushBox.y + 1, pS.h - 2, pS.h - 2); }
  tag(c, a.pushK, x + w, pushBox.y + pS.h / 2, 'right', 9.5 * fs, ink, fdc, false, x + w - sx - 34);
  tag(c, a.brkK, brkBox.x, brkBox.y + kS.h / 2, 'left', 9 * fs, ink, fdc, false, x + w - sx - 12);

  // --- Tap targets, most specific first.
  const cr = Math.max(CL, CW) / 2 + 4;
  S.hot.push({ x: kx - cr, y: ky - cr, w: 2 * cr, h: 2 * cr, k: 'paddle.craft' });
  S.hot.push({ ...rangeBox, k: 'paddle.range' });
  S.hot.push({ ...pushBox, k: 'paddle.push' });
  S.hot.push({ ...brkBox, k: 'paddle.shore' });
  if (driftBox) S.hot.push({ ...driftBox, k: 'paddle.drift' });
  S.hot.push({ x: x, y: y, w: sx - x + 10, h: h, k: 'paddle.shore' });
  if (go) S.hot.push({ x: sx, y: Math.max(y, cy - rr), w: rr, h: Math.min(y + h, cy + rr) - Math.max(y, cy - rr), k: 'paddle.range' });
  S.hot.push({ x: sx + 10, y: y, w: x + w - sx - 10, h: h, k: 'paddle.push' });
}

/** Deterministic 0..1 noise for texture (sand grain, foam edges), so a picture does not shimmer frame to frame. */
const hash1 = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };



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
  // A dot in the rip's colour with its plain words (only Cocles and Playa Negra fly flags).
  const fx0 = x + w * 0.16, fy = Y + (y + h - Y) * 0.78;
  c.beginPath(); c.arc(fx0, fy - 10, 9, 0, TAU);
  c.fillStyle = rgba(S.T[a.rip === 'HIGH' ? 'lv0' : a.rip === 'MOD' ? 'lv2' : 'lv3']); c.fill(); c.lineWidth = 2; c.strokeStyle = S.ink; c.stroke();
  c.fillStyle = S.ink; txt(c, a.flag, fx0 + 18, fy - 10, 'left', 10.5, 700);
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

// --- snorkel, dive and spear: one section from the surface to the reef -----------------------------------------------
type WaterKit = 'snorkel' | 'dive' | 'spear';
type WaterA = NonNullable<HeroParams['water']>;

/**
 * The frame the water pictures share with the field (whose drifting specks fade out at the visibility): the surface,
 * the swimmer's eye (the mask) and its length, metres to pixels along the sight line ahead of it, and for DIVE and
 * SPEAR the depth scale (metres to pixels down, its left edge). The sight line always reaches past the visibility, so
 * the murk starts inside the picture.
 */
function waterFrame(A: Box, act: WaterKit, a: Pick<WaterA, 'visM' | 'depthM'>) {
  const { x, y, w, h } = A, fs = clamp(Math.min(w, 760) / 380, 1, 1.3), vis = a.visM ?? 0;
  // SPEAR reads 0 to 8 m ahead (a shot is 3 to 5 m and its visibility counts in full from 6 m); clearer water runs off the end.
  const hspan = act === 'spear' ? 8 : Math.max(6, vis * 1.25);
  if (act === 'snorkel') {
    const sy = y + Math.max(46 * fs, Math.min(h * 0.2, 72 * fs)), u = clamp(w * 0.47, 150, 250);
    const mx = x + 24 * fs + u * 0.97, ey = sy + u * 0.026;
    return { fs, sy, u, mx, ey, hspan, hm: (x + w - 8 - mx) / hspan, mp: 0, span: 0, bx: x, bw: 0 };
  }
  const sy = y + 30 * fs, span = a.depthM + 6, mp = (y + h - 6 - sy) / span;
  const bx = x + 26 * fs, bw = 7 * fs, u = act === 'spear' ? clamp(w * 0.4, 130, 210) : clamp(w * 0.46, 140, 240);
  const mx = bx + bw + 14 * fs + u * (act === 'spear' ? 1.07 : 0.97), ey = sy + a.depthM * mp;
  return { fs, sy, u, mx, ey, hspan, hm: (x + w - 8 - mx) / hspan, mp, span, bx, bw };
}

/** Level colour for a band: what is fine, what needs care, what is bad. */
const bandCol = (S: Style, b: 0 | 1 | 2) => rgba(S.T[b === 0 ? 'lv3' : b === 1 ? 'lv2' : 'lv0']);
const surgeLv = (a: WaterA): 0 | 1 | 2 => (a.band === 'DANGEROUS' ? 2 : a.band === 'SURGY' ? 1 : 0);
/** Chop by the snorkeller's words (model.ts chopFor): flat and light are fine, choppy needs care, rough is bad. */
const chopLv = (kt: number): 0 | 1 | 2 => { const k = chopFor(kt); return k === 'rough' ? 2 : k === 'choppy' ? 1 : 0; };
/** Water over the reef: under 0.5 m you touch the coral (outing.ts), under 0.8 m it is shallow (tiles.ts tipBand). */
const reefLv = (m: number): 0 | 1 | 2 => (m < 0.5 ? 2 : m < 0.8 ? 1 : 0);
const hits = (p: Box, q: Box, pad = 4) => p.x < q.x + q.w + pad && q.x < p.x + p.w + pad && p.y < q.y + q.h + pad && q.y < p.y + p.h + pad;

/** A filled polygon from points. */
function poly(c: Ctx2D, pts: [number, number][], fill?: string, line?: string, wd = 1.5) {
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (line) { c.strokeStyle = line; c.lineWidth = wd; c.lineJoin = 'miter'; c.stroke(); }
}

/** Brain coral: a hard dome cut by meandering grooves, the way the real one looks from the side. */
function brainCoral(c: Ctx2D, bx: number, by: number, r: number, S: Style, seed: number) {
  const rv = r * 0.72;
  const dome = () => { c.beginPath(); c.moveTo(bx - r, by); c.bezierCurveTo(bx - r, by - rv * 1.33, bx + r, by - rv * 1.33, bx + r, by); c.closePath(); };
  dome(); c.fillStyle = S.ink; c.fill();
  c.save(); dome(); c.clip();
  c.strokeStyle = rgba(S.fd, 0.85); c.lineWidth = Math.max(1, r * 0.075); c.lineJoin = 'miter'; c.lineCap = 'butt';
  const gap = Math.max(3.2, r * 0.2);
  for (let k = 0, yy = by - gap * 0.6; yy > by - rv * 1.1; k++, yy -= gap) {
    c.beginPath();
    for (let xx = bx - r; xx <= bx + r; xx += 2) {
      const q = yy + Math.sin(xx * (0.5 / Math.max(1, r * 0.12)) + hash1(seed + k) * 6) * gap * 0.32;
      xx === bx - r ? c.moveTo(xx, q) : c.lineTo(xx, q);
    }
    c.stroke();
  }
  c.restore();
  dome(); c.strokeStyle = S.ink; c.lineWidth = 2; c.stroke();
}
/** Branching (staghorn) coral: square-ended limbs forking upwards, pale growing tips; it sways with the surge. */
function branchCoral(c: Ctx2D, x: number, y: number, len: number, ang: number, depth: number, wd: number, sway: number, S: Style, seed: number) {
  if (depth <= 0 || len < 2.5) return;
  const a = ang + sway, x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
  c.strokeStyle = S.ink; c.lineWidth = wd; c.lineCap = 'butt'; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
  if (depth === 1) { c.fillStyle = rgba(CREAM, 0.9); c.fillRect(x2 - wd * 0.5, y2 - wd * 0.5, wd, wd); return; }
  const j = hash1(seed) - 0.5;
  branchCoral(c, x2, y2, len * (0.74 + 0.1 * j), ang - 0.48 - 0.15 * j, depth - 1, wd * 0.74, sway * 1.25, S, seed * 2 + 1);
  branchCoral(c, x2, y2, len * (0.7 - 0.1 * j), ang + 0.44 + 0.12 * j, depth - 1, wd * 0.74, sway * 1.25, S, seed * 2 + 2);
}
/** Sea fan: a flat net on a short stalk, ribs fanning out and cross-threads between them; it bends with the surge. */
function seaFan(c: Ctx2D, x: number, y: number, r: number, sway: number, S: Style) {
  c.save(); c.translate(x, y); c.rotate(sway);
  const N = 9, rim: [number, number][] = [];
  for (let i = 0; i <= N; i++) { const a = -1.0 + (i / N) * 2.0; rim.push([Math.sin(a) * r, -Math.cos(a) * r * 0.95 - r * 0.12]); }
  poly(c, [[0, -r * 0.12], ...rim], rgba(S.on, 0.2));
  c.strokeStyle = S.ink; c.lineWidth = 1.1; c.lineCap = 'butt'; c.beginPath();
  for (const [px, py] of rim) { c.moveTo(0, -r * 0.12); c.lineTo(px, py); }
  for (const k of [0.38, 0.62, 0.84]) rim.forEach(([px, py], i) => { const qx = px * k, qy = -r * 0.12 + (py + r * 0.12) * k; i ? c.lineTo(qx, qy) : c.moveTo(qx, qy); });
  c.stroke();
  c.lineWidth = 2; c.beginPath(); rim.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -r * 0.14); c.stroke();
  c.restore();
}
/** Tube sponges: a cluster of upright tubes, square-cut, their open mouths showing. */
function sponges(c: Ctx2D, x: number, y: number, hh: number, S: Style) {
  const tubes: [number, number, number][] = [[-0.55, 0.62, -0.08], [0, 1, 0.02], [0.5, 0.78, 0.1]];
  for (const [dx, k, lean] of tubes) {
    const tw = hh * 0.22, th = hh * k, bx = x + dx * hh * 0.5;
    c.save(); c.translate(bx, y); c.rotate(lean);
    c.fillStyle = S.ink; c.fillRect(-tw / 2, -th, tw, th);
    c.fillStyle = rgba(S.fd, 0.9); c.fillRect(-tw / 2 + 2, -th + 2, tw - 4, Math.max(2, tw * 0.28));
    c.strokeStyle = rgba(S.fd, 0.6); c.lineWidth = 1; c.beginPath(); c.moveTo(-tw * 0.15, -th + tw * 0.6); c.lineTo(-tw * 0.15, -th * 0.15); c.stroke();
    c.restore();
  }
}
/** Sea grass on the sand: a few blades leaning with the surge. */
function grass(c: Ctx2D, x: number, y: number, hh: number, sway: number, S: Style) {
  c.strokeStyle = S.ink; c.lineWidth = 1.6; c.lineCap = 'butt'; c.beginPath();
  for (let i = 0; i < 5; i++) { const bx = x + (i - 2) * 3, l = hh * (0.6 + 0.4 * hash1(i + x)); c.moveTo(bx, y); c.quadraticCurveTo(bx + sway * l * 0.6, y - l * 0.6, bx + sway * l * 1.4 + (i - 2) * 1.5, y - l); }
  c.stroke();
}
/** A reef fish side on, nose along `dir` (1 right, -1 left): body, forked tail, fin, eye and a bar cut out of the field colour. */
function fish(c: Ctx2D, fx: number, fy: number, L: number, dir: 1 | -1, ph: number, S: Style, col = S.ink) {
  c.save(); c.translate(fx, fy); c.scale(dir, 1);
  const b = L * 0.2, tw = Math.sin(ph) * L * 0.07;
  c.fillStyle = col; c.beginPath();
  c.moveTo(L * 0.5, 0); c.quadraticCurveTo(L * 0.18, -b * 1.5, -L * 0.22, -b * 0.35); c.lineTo(-L * 0.5, -b * 1.1 + tw); c.lineTo(-L * 0.4, tw); c.lineTo(-L * 0.5, b * 1.1 + tw); c.lineTo(-L * 0.22, b * 0.35);
  c.quadraticCurveTo(L * 0.18, b * 1.4, L * 0.5, 0); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(L * 0.12, -b * 0.95); c.lineTo(-L * 0.12, -b * 1.35); c.lineTo(-L * 0.18, -b * 0.6); c.closePath(); c.fill(); // dorsal fin
  c.fillStyle = rgba(S.fd, 0.95); c.fillRect(L * 0.3, -b * 0.42, Math.max(1.5, L * 0.07), Math.max(1.5, L * 0.07));
  if (L > 12) { c.strokeStyle = rgba(S.fd, 0.75); c.lineWidth = Math.max(1, L * 0.04); c.beginPath(); c.moveTo(L * 0.16, -b * 0.85); c.lineTo(L * 0.16, b * 0.8); c.stroke(); }
  c.restore();
}

/** The reef: sand along the bottom, a hard faceted rock over it (its top line `top`), the corals on it, a few fish. */
function reefBed(c: Ctx2D, A: Box, pts: [number, number][], ys: number, k: number, sway: number, S: Style, list: [number, 'brain' | 'branch' | 'fan' | 'sponge' | 'grass', number][]) {
  const { x, y, w, h } = A;
  const top = (xx: number) => { for (let i = 1; i < pts.length; i++) if (xx <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * ((xx - x0) / Math.max(1e-6, x1 - x0)); } return pts[pts.length - 1][1]; };
  // Sand, with grain and a few ripple marks.
  c.fillStyle = rgba(S.T.sand); c.fillRect(x, ys, w, y + h - ys);
  for (let i = 0; i < w * 0.5; i++) { c.fillStyle = rgba(S.on, 0.12 + 0.14 * hash1(i + 7)); c.fillRect(Math.round(x + hash1(i + 11) * w), Math.round(ys + 2 + hash1(i + 29) * (y + h - ys - 3)), 1.5, 1.5); }
  c.fillStyle = S.ink; c.fillRect(x, ys, w, 1.5);
  // The rock: one hard silhouette with faceted edges, built of old coral heads (crisp blocks cut in the field colour).
  poly(c, [[x, ys], ...pts, [x + w, ys]], rgba(S.on, 0.42));
  c.save(); poly(c, [[x, ys], ...pts, [x + w, ys]]); c.clip();
  const bh = 15 * k, bwd = 26 * k, rTop = Math.min(...pts.map((p) => p[1]));
  c.strokeStyle = rgba(S.fd, 0.4); c.lineWidth = 1.2; c.beginPath();
  for (let j = 0, yy = ys; yy > rTop - bh; j++, yy -= bh) {
    for (let i = -1, xx = x - (j % 2) * bwd * 0.5; xx < x + w; i++, xx += bwd) {
      const q = hash1(i * 31 + j * 7), y0 = yy - bh * (0.15 + 0.2 * q), x0 = xx + bwd * 0.12, x1 = xx + bwd * (0.88 - 0.12 * q);
      c.moveTo(x0, yy - 1); c.lineTo(x0, y0 + bh * 0.25); c.lineTo(x0 + bwd * 0.2, y0); c.lineTo(x1 - bwd * 0.15, y0); c.lineTo(x1, y0 + bh * 0.3); c.lineTo(x1, yy - 1);
    }
  }
  c.stroke(); c.restore();
  c.strokeStyle = S.ink; c.lineWidth = 2; c.lineJoin = 'miter'; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
  for (const [f, kind, s] of list) {
    const xx = x + f * w, yy = top(xx) + 1, r = s * k;
    if (kind === 'brain') brainCoral(c, xx, yy, r, S, Math.round(f * 100));
    else if (kind === 'branch') branchCoral(c, xx, yy, r * 0.42, 0, 4, Math.max(2.5, r * 0.12), sway * 0.5, S, Math.round(f * 50) + 1);
    else if (kind === 'fan') seaFan(c, xx, yy, r, sway * 0.6, S);
    else if (kind === 'sponge') sponges(c, xx, yy, r, S);
    else grass(c, xx, yy, r, sway, S);
  }
  return top;
}

/** A closed, smooth outline through `pts` (quadratic curves between their midpoints): bodies, limbs, a hard fill. */
function blob(c: Ctx2D, pts: [number, number][], fill?: string, line?: string, wd = 1) {
  const n = pts.length, m = (i: number): [number, number] => [(pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2];
  c.beginPath(); const s = m(n - 1); c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const e = m(i); c.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (line) { c.strokeStyle = line; c.lineWidth = wd; c.lineJoin = 'miter'; c.stroke(); }
}

/** Points of the swimmer's figure, in body lengths: the torso and a leg (from the hip), the fins' foot pocket and blade. */
const TORSO: [number, number][] = [[-0.06, -0.034], [-0.1, -0.05], [-0.15, -0.06], [-0.22, -0.056], [-0.29, -0.046], [-0.34, -0.048], [-0.39, -0.06], [-0.44, -0.05], [-0.455, -0.01], [-0.44, 0.04], [-0.38, 0.048], [-0.3, 0.054], [-0.22, 0.066], [-0.15, 0.066], [-0.1, 0.055], [-0.065, 0.03]];
const LEG: [number, number][] = [[0.02, -0.058], [-0.05, -0.05], [-0.1, -0.04], [-0.145, -0.032], [-0.19, -0.04], [-0.24, -0.036], [-0.3, -0.022], [-0.322, -0.018], [-0.326, 0.01], [-0.3, 0.014], [-0.22, 0.022], [-0.15, 0.03], [-0.1, 0.038], [-0.04, 0.048], [0.02, 0.05]];

/**
 * A swimmer side on, face down and facing right: a smooth silhouette in hard ink, the details cut out of it in the
 * field colour. The eye (behind the mask) is at (ox, oy) and the body is `u` long from the crown to the heels' fin
 * tips (SPEAR's long blades reach about a tenth further). `kick` runs -1..1: a flutter kick from the hips, the knees
 * easing on the down-stroke and the blades bending against it. SNORKEL wears a mask and a snorkel standing out of the
 * water; DIVE a tank on the back with its harness, a weight belt and a regulator; SPEAR (breath-hold, no tank) a
 * hood, a weight belt, long freediving blades and a speargun held out in front. Returns the gun's butt (where the
 * float line is tied) or the hip.
 */
function swimmer(c: Ctx2D, ox: number, oy: number, u: number, kick: number, kit: WaterKit, S: Style): [number, number] {
  const ink = S.ink, cut = rgba(S.fd);
  const P = (px: number, py: number): [number, number] => [ox + px * u, oy + py * u];
  const finL = kit === 'spear' ? 0.3 : 0.2;
  const limb = (pts: [number, number][], wds: number[], fill: string, edge?: string) => {
    const L: [number, number][] = [], R: [number, number][] = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
      const nx = -dy / n, ny = dx / n, hw = (wds[i] * u) / 2;
      L.push([p[0] + nx * hw, p[1] + ny * hw]); R.push([p[0] - nx * hw, p[1] - ny * hw]);
    });
    blob(c, [...L, ...R.reverse()], fill);
    if (edge) { c.strokeStyle = edge; c.lineWidth = 1.2; c.beginPath(); L.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke(); }
  };
  const leg = (sd: number, fill: string) => {
    // Hip angle: the legs sink a touch and swing with the kick; past the knee the shin bends up on the down-stroke.
    const k = kick * sd, th = -0.05 + (kit === 'snorkel' ? 0.08 : 0.13) * k, bend = 0.06 + 0.14 * Math.max(0, k);
    const [hx, hy] = P(-0.42, 0.0), ct = Math.cos(th), st = Math.sin(th), cb = Math.cos(bend), sb = Math.sin(bend);
    const tf = (px: number, py: number): [number, number] => {
      let qx = px, qy = py;
      if (px < -0.145) { const rx = px + 0.145, ry = py; qx = -0.145 + rx * cb - ry * sb; qy = rx * sb + ry * cb; }
      return [hx + (qx * ct - qy * st) * u, hy + (qx * st + qy * ct) * u];
    };
    blob(c, LEG.map(([px, py]) => tf(px, py)), fill);
    // The fin: a foot pocket over the foot, then the blade, bent against the stroke, two rails cut along it.
    const fb = -0.16 * k, cf = Math.cos(fb), sf = Math.sin(fb);
    const fp = (px: number, py: number) => { const rx = px + 0.36, ry = py; return px < -0.36 ? tf(-0.36 + rx * cf - ry * sf, rx * sf + ry * cf) : tf(px, py); };
    poly(c, [fp(-0.295, -0.026), fp(-0.36, -0.028), fp(-0.36 - finL, -0.036), fp(-0.36 - finL, 0.008), fp(-0.36, 0.022), fp(-0.3, 0.024)], fill);
    if (fill === ink) {
      c.strokeStyle = cut; c.lineWidth = 1; c.beginPath();
      { const a = fp(-0.375, -0.004), b = fp(-0.35 - finL, -0.014); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      const a = fp(-0.36, -0.028), b = fp(-0.36, 0.022); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
      c.stroke();
    }
  };
  leg(-1, rgba(S.on, 0.5)); // the far leg, a shade back
  blob(c, TORSO.map(([px, py]) => P(px, py)), ink);
  leg(1, ink);
  // Head.
  c.fillStyle = ink; c.beginPath(); c.ellipse(ox - 0.032 * u, oy - 0.006 * u, 0.058 * u, 0.054 * u, 0, 0, TAU); c.fill();
  c.strokeStyle = cut; c.lineWidth = 1.2; c.lineCap = 'butt';
  // DIVE and SPEAR wear a weight belt with its buckle.
  if (kit !== 'snorkel') {
    c.lineWidth = Math.max(2, 0.014 * u); c.beginPath(); c.moveTo(...P(-0.392, -0.058)); c.lineTo(...P(-0.39, 0.05)); c.stroke();
    c.fillStyle = rgba(CREAM, 0.95); c.fillRect(...P(-0.402, 0.036), 0.022 * u, 0.018 * u);
  }
  // The near arm: along the body (SNORKEL), folded under the chest (DIVE), reaching forward to the gun (SPEAR).
  if (kit === 'spear') limb([P(-0.1, 0.012), P(-0.01, 0.08), P(0.1, 0.13)], [0.046, 0.034, 0.03], ink, cut);
  else if (kit === 'dive') limb([P(-0.11, 0.008), P(-0.22, 0.058), P(-0.34, 0.06)], [0.046, 0.034, 0.03], ink, cut);
  else limb([P(-0.11, 0.008), P(-0.24, 0.048), P(-0.37, 0.046)], [0.046, 0.034, 0.028], ink, cut);
  // Mask: an ink frame round a lens of field colour with a glint; the strap round the head.
  const [mxa, mya] = P(0.0, -0.03);
  c.fillStyle = ink; c.fillRect(mxa, mya, 0.034 * u, 0.05 * u);
  c.fillStyle = cut; c.fillRect(mxa + 0.004 * u, mya + 0.008 * u, 0.024 * u, 0.034 * u);
  c.strokeStyle = rgba(CREAM, 0.95); c.lineWidth = 1.4; c.beginPath(); c.moveTo(mxa + 0.008 * u, mya + 0.03 * u); c.lineTo(mxa + 0.022 * u, mya + 0.013 * u); c.stroke();
  c.strokeStyle = cut; c.lineWidth = 1.4; c.beginPath(); c.moveTo(...P(0.0, -0.016)); c.lineTo(...P(-0.078, -0.03)); c.stroke();
  if (kit === 'snorkel') {
    // The snorkel: mouthpiece, a J bend up the side of the head, the tube standing clear of the water with a pale tip.
    const tw = Math.max(3, 0.02 * u);
    c.strokeStyle = ink; c.lineWidth = tw; c.lineJoin = 'miter'; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(...P(0.02, 0.034)); c.lineTo(...P(-0.02, 0.036)); c.lineTo(...P(-0.048, -0.03)); c.lineTo(...P(-0.054, -0.2)); c.stroke();
    c.strokeStyle = rgba(CREAM, 0.95); c.beginPath(); c.moveTo(...P(-0.053, -0.17)); c.lineTo(...P(-0.054, -0.2)); c.stroke();
    c.strokeStyle = cut; c.lineWidth = 1.2; c.beginPath(); c.moveTo(...P(-0.044, -0.03)); c.lineTo(...P(-0.03, -0.024)); c.stroke();
  }
  if (kit === 'dive') {
    // The tank on the back, valve forward, crossed by the harness; the hose over the shoulder to the regulator.
    const [tx0, ty0] = P(-0.37, -0.122), tl = 0.27 * u, th = 0.066 * u;
    c.fillStyle = ink; c.fillRect(tx0, ty0, tl, th);
    c.fillRect(tx0 + tl, ty0 + th * 0.25, 0.02 * u, th * 0.4); // valve
    c.fillRect(tx0 + tl + 0.014 * u, ty0 + th * 0.05, 0.014 * u, th * 0.7); // first stage
    c.strokeStyle = cut; c.lineWidth = 1.2; c.beginPath();
    c.moveTo(tx0 + 2, ty0 + th * 0.3); c.lineTo(tx0 + tl - 2, ty0 + th * 0.3); // highlight along the cylinder
    for (const f of [0.28, 0.66]) { c.moveTo(tx0 + tl * f, ty0); c.lineTo(tx0 + tl * f, ty0 + th + 0.03 * u); }
    c.stroke();
    c.strokeStyle = ink; c.lineWidth = Math.max(1.8, 0.012 * u); c.beginPath();
    c.moveTo(tx0 + tl + 0.028 * u, ty0 + th * 0.4); c.bezierCurveTo(...P(-0.03, -0.02), ...P(-0.06, 0.09), ...P(0.02, 0.034)); c.stroke();
    c.fillStyle = ink; c.fillRect(...P(0.016, 0.018), 0.03 * u, 0.03 * u); // second stage
    c.fillStyle = cut; c.fillRect(...P(0.026, 0.026), 0.012 * u, 0.012 * u);
  }
  if (kit === 'spear') {
    // The speargun: grip in the hand, a long barrel, the shaft along its top to a hard point, the band stretched back.
    const [hx, hy] = P(0.1, 0.13), L = 0.5 * u, bh = Math.max(3, 0.02 * u), tip = hx + L + 0.06 * u;
    c.fillStyle = ink; c.fillRect(hx - 0.05 * u, hy - bh / 2, L + 0.05 * u, bh);
    poly(c, [[hx - 0.012 * u, hy], [hx + 0.012 * u, hy], [hx + 0.006 * u, hy + 0.05 * u], [hx - 0.018 * u, hy + 0.05 * u]], ink); // grip
    c.fillRect(hx + L - 0.03 * u, hy - bh / 2 - 2.5, 0.022 * u, bh + 5); // muzzle
    c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx, hy - bh / 2 - 1.5); c.lineTo(tip, hy - bh / 2 - 1.5); c.stroke();
    poly(c, [[tip, hy - bh / 2 - 4.5], [tip + 0.05 * u, hy - bh / 2 - 1.5], [tip, hy - bh / 2 + 1.5]], ink);
    c.strokeStyle = rgba(CREAM, 0.95); c.lineWidth = 2; c.beginPath(); c.moveTo(hx + L - 0.02 * u, hy - bh / 2 - 2.5); c.lineTo(hx + L * 0.45, hy - bh / 2 - 1.5); c.stroke();
    return [hx - 0.05 * u, hy];
  }
  return P(-0.4, 0);
}

/** Stepped murk past the visibility: flat bands of the field colour, thicker with each step, so what lies past it fades out. */
function murk(c: Ctx2D, x0: number, x1: number, y0: number, y1: number, vis: number, mpx: number, fd: RGB) {
  const steps: [number, number][] = [[vis * 0.75, 0.18], [vis * 0.88, 0.34], [vis, 0.52], [vis * 1.15, 0.68], [vis * 1.32, 0.8]];
  for (const [d, a] of steps) { const xx = Math.round(x0 + d * mpx); if (xx >= x1) break; c.fillStyle = rgba(fd, a); c.fillRect(xx, y0, x1 - xx, y1 - y0); }
}

/** The surface: a crisp line whose chop follows the wind (flat, light, choppy, rough), whitecaps when it is rough. */
function surface(c: Ctx2D, x0: number, x1: number, sy: number, tt: number, kt: number | null, S: Style) {
  const lv = kt === null ? 0 : chopLv(kt), k = kt === null ? 'light' : chopFor(kt);
  const amp = k === 'flat' ? 1 : k === 'light' ? 2 : k === 'choppy' ? 3.2 : 4.4, lam = k === 'flat' || k === 'light' ? 34 : 22;
  const at = (xx: number) => { const ph = (xx / lam) * TAU - tt * 2.4; return sy - (lv ? amp * (1 - 2 * Math.abs(Math.sin(ph / 2))) : amp * Math.sin(ph)) + Math.sin(xx * 0.13 + tt * 1.7) * 0.6; };
  c.strokeStyle = S.ink; c.lineWidth = 2.2; c.lineJoin = 'miter'; c.lineCap = 'butt'; c.beginPath();
  for (let xx = x0; xx <= x1; xx += 2) (xx === x0 ? c.moveTo(xx, at(xx)) : c.lineTo(xx, at(xx)));
  c.stroke();
  if (lv === 2) {
    c.fillStyle = rgba(CREAM, 0.95);
    for (let i = 0; x0 + (i + 0.5) * lam < x1; i++) { const cx = x0 + (i + ((tt * 2.4) / TAU) % 1) * lam; if (hash1(i) > 0.5 && cx < x1 - 6) c.fillRect(Math.round(cx - 4), Math.round(at(cx) - 3), 8, 2.5); }
  }
  return at;
}

/** Visibility ahead of the eye: a ruler in metres from the mask, solid as far as you can see and fading past it. */
function sightRuler(c: Ctx2D, mx: number, ey: number, x1: number, hm: number, hspan: number, vis: number | null, fs: number, S: Style, above = false) {
  if (vis === null) return; // no reading: no ruler, rather than one that claims a distance
  const step = hspan <= 8 ? 1 : hspan <= 16 ? 2 : 5, v = vis;
  c.lineCap = 'butt';
  c.strokeStyle = S.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(mx, ey); c.lineTo(Math.min(x1, mx + v * hm), ey); c.stroke();
  if (mx + v * hm > x1) poly(c, [[x1 + 2, ey], [x1 - 7, ey - 4.5], [x1 - 7, ey + 4.5]], S.ink);
  c.strokeStyle = rgba(S.on, 0.45); c.lineWidth = 1.5; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(mx + v * hm, ey); c.lineTo(x1, ey); c.stroke(); c.setLineDash([]);
  for (let m = step; mx + m * hm <= x1 + 0.5; m += step) {
    const xx = mx + m * hm, seen = m <= v + 1e-6;
    c.strokeStyle = seen ? S.ink : rgba(S.on, 0.4); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(xx, ey - 4); c.lineTo(xx, ey + 4); c.stroke();
    // The number on the visibility line itself would be cut by it, and its tag says it.
    if (vis !== null && Math.abs(xx - (mx + v * hm)) < 8) continue;
    c.fillStyle = seen ? S.ink : rgba(S.on, 0.4); txt(c, `${m}`, xx, ey + (above ? -11 : 11) * fs, 'center', 7.5 * fs, 700);
  }
}

/**
 * The words over the surface: the visibility at its own line (the line runs down from it to the reef) and the chop.
 * The visibility goes first, beside its line; the chop takes the right end of the row, or the left end when the
 * visibility is there, or `row2`. Nothing lands on anything in `taken` (the SPEAR float) or on each other.
 */
function topTags(c: Ctx2D, a: WaterA, wx: number, row: number, row2: number, x0: number, x1: number, fs: number, S: Style, taken: Box[], chop: boolean, at: (x: number) => number, top: (x: number) => number) {
  const ink = S.ink, cut = rgba(S.fd);
  let visB: Box | null = null, chopB: Box | null = null;
  if (a.visM !== null) {
    const m = tagSize(c, a.vis, 10 * fs, x1 - x0);
    let px = clamp(wx - 1, x0, x1 - m.w);
    for (const cx of [wx - 1, wx + 1 - m.w, wx - m.w / 2]) {
      const b = { x: clamp(cx, x0, x1 - m.w), y: row - m.h / 2, w: m.w, h: m.h };
      if (!taken.some((q) => hits(b, q))) { px = b.x; break; }
    }
    visB = tag(c, a.vis, px, row, 'left', 10 * fs, ink, cut, false, x1 - x0);
    taken.push(visB);
    c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(wx, visB.y + visB.h); c.lineTo(wx, at(wx) - 1); c.stroke();
    if (wx < x1 - 4) { c.setLineDash([5, 3]); c.lineWidth = 2; c.beginPath(); c.moveTo(wx, at(wx) + 3); c.lineTo(wx, top(wx)); c.stroke(); c.setLineDash([]); }
  }
  if (chop && a.chop && a.windKt !== null) {
    const sz = 9 * fs, mw = (x1 - x0) * 0.6, m = tagSize(c, a.chop, sz, mw), cw = m.w + m.h;
    const cands: [number, number][] = [[x1 - cw, row], [x0, row], [x1 - cw, row2]];
    const [cx, cy] = cands.find(([px, py]) => !taken.some((q) => hits({ x: px, y: py - m.h / 2, w: cw, h: m.h }, q))) ?? cands[2];
    chopB = keyTag(c, a.chop, cx, cy, 'left', sz, ink, cut, bandCol(S, chopLv(a.windKt)), mw);
  }
  return { visB, chopB };
}

/**
 * SNORKEL: a section from the surface to the reef. The snorkeller floats face down at the surface, fins kicking; ahead of
 * the mask a ruler in metres and a cone of sight run out to the visibility, where a line drops to the reef and the water
 * past it fades to murk. On the left a dimension line gives the water over the reef at this tide (the reef sits lower
 * the more water there is), and a double arrow swings with the surge at that depth. The reef: sand, a faceted rock,
 * brain coral, staghorn, a sea fan, tube sponges, sea grass and a few fish. The surface chops with the wind.
 */
function drawSnorkel(c: Ctx2D, A: Box, tt0: number, a: WaterA, S: Style) {
  const { x, y, w, h } = A, tt = S.reduced ? 3.2 : tt0, F = waterFrame(A, 'snorkel', a), { fs, sy, u, mx, hm, hspan } = F;
  const ink = S.ink, cut = rgba(S.fd), vis = a.visM;
  const ys = y + h - 14 * fs, deep = clamp((a.waterM ?? 1.5) / 2, 0, 1), col = (ys - 26 * fs - sy) * lerp(0.6, 1, deep), cy = sy + col;
  const swing = S.reduced ? 0 : Math.sin((TAU * tt) / 8), sg = clamp(a.surgeMs / 0.3, 0.3, 2);
  const kick = S.reduced ? 0.4 : Math.sin(tt * 3.4), bob = S.reduced ? 0 : Math.sin(tt * 1.3) * 1.2, ey = F.ey + bob;
  const k = u / 168, dx = x + 10 * fs;

  // --- Words on the left (laid out first, so the corals under them stay low enough to keep clear).
  const size = 9.5 * fs, ty1 = sy + col * 0.3, ty2 = sy + col * 0.6, tagH = Math.round(size * 1.9);
  const surgeS = `${a.surge} · ${a.surgeV}`;
  const tw = Math.max(a.waterM === null ? 0 : tagSize(c, a.overReef, size, w - 30).w + tagH, tagSize(c, surgeS, size, w - 30).w + tagH);
  const labR = dx + 8 + tw, room = cy - (ty2 + tagH / 2) - 6;

  // --- The water column and the reef.
  c.fillStyle = rgba(S.on, 0.06); c.fillRect(x, sy, w, ys - sy);
  const pts: [number, number][] = [];
  for (let xx = x, i = 0; xx < x + w + 1; xx += 16 * fs, i++) {
    const f = (xx - x) / w, big = -col * 0.16 * Math.exp(-sq((f - 0.8) / 0.1)) + col * 0.06 * Math.exp(-sq((f - 0.56) / 0.06));
    pts.push([Math.min(xx, x + w), Math.min(ys - 4, xx < dx + 10 ? cy : cy + big + (hash1(i + 40) - 0.5) * 7 * fs)]);
  }
  if (pts[pts.length - 1][0] < x + w) pts.push([x + w, pts[pts.length - 1][1]]);
  const sway = (S.reduced ? 0 : swing) * 0.12 * sg;
  type Coral = 'brain' | 'branch' | 'fan' | 'sponge' | 'grass';
  const tallness: Record<Coral, number> = { brain: 0.75, branch: 1.15, fan: 1.1, sponge: 1, grass: 1 };
  const list = ([[0.1, 'brain', 14], [0.2, 'branch', 30], [0.3, 'sponge', 24], [0.4, 'fan', 34], [0.5, 'brain', 18], [0.58, 'grass', 14], [0.67, 'branch', 34], [0.78, 'fan', 40], [0.87, 'sponge', 28], [0.96, 'brain', 15]] as [number, Coral, number][])
    .map(([f, kind, r]): [number, Coral, number] => [f, kind, x + f * w - r * k < labR ? Math.min(r, room / (tallness[kind] * k)) : r])
    .filter((q) => q[2] >= 6);
  const top = reefBed(c, A, pts, ys, k, sway, S, list);

  // --- Fish: a small school mid-water ahead, a parrotfish by the coral head; they drift and turn their tails.
  const fx0 = mx + (x + w - mx) * 0.45 + (S.reduced ? 0 : Math.sin(tt * 0.21) * 16), fy0 = sy + col * 0.42;
  for (let i = 0; i < 5; i++) fish(c, fx0 + (hash1(i + 1) - 0.5) * 60 * k, fy0 + (hash1(i + 9) - 0.5) * 24 * k, 11 * k, -1, tt * 6 + i, S);
  { const px = x + w * 0.66 + (S.reduced ? 0 : Math.sin(tt * 0.15) * 10); fish(c, px, top(px) - 22 * k, 24 * k, 1, tt * 4, S); }

  // --- What you can see: a cone from the mask to the visibility, the murk past it, the visibility line down to the reef.
  const ex = mx + 0.02 * u;
  let wx = x + w;
  if (vis !== null) {
    wx = Math.min(x + w - 4, ex + vis * hm);
    const half = Math.min(col * 0.42, (wx - ex) * 0.22);
    c.save(); c.beginPath(); c.rect(x, sy + 2, w, ys - sy); c.clip();
    poly(c, [[ex, ey], [wx, ey - half], [wx, ey + half]], rgba(CREAM, 0.14));
    c.strokeStyle = rgba(S.on, 0.5); c.lineWidth = 1; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(ex, ey); c.lineTo(wx, ey - half); c.moveTo(ex, ey); c.lineTo(wx, ey + half); c.stroke(); c.setLineDash([]);
    c.restore();
    murk(c, ex, x + w + 40, sy + 3, ys, vis, hm, S.fd);
  }
  sightRuler(c, ex, ey, x + w - 4, hm, hspan, vis, fs, S);
  const at = surface(c, x, x + w, sy, tt, a.windKt, S);
  swimmer(c, mx, ey, u, kick, 'snorkel', S);

  // --- Words over the surface: the visibility at its line, the chop.
  const { visB, chopB } = topTags(c, a, wx, y + 10 * fs, y + 32 * fs, x, x + w, fs, S, [], true, at, top);

  // --- Water over the reef: a dimension line from the surface to the rock, its depth in a keyed tag.
  let wB: Box | null = null;
  if (a.waterM !== null) {
    const y0 = at(dx) + 2, y1 = top(dx) - 1;
    c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(dx - 6, y1); c.lineTo(dx + 6, y1); c.moveTo(dx - 6, y0 - 2); c.lineTo(dx + 6, y0 - 2); c.stroke();
    dimLine(c, dx, y0, dx, y1, 7 * fs, 1.8, ink);
    wB = keyTag(c, a.overReef, dx + 8, ty1, 'left', size, ink, cut, bandCol(S, reefLv(a.waterM)), w - 30);
  }
  // --- Surge at this depth: a double arrow swinging as far, and as hard, as the water moves.
  const hl = (12 + 22 * clamp(a.surgeMs / 0.6, 0, 1)) * fs, sx = dx + 8 + hl + 6 + swing * hl * 0.35, sy2 = ty2 - 17 * fs;
  dimLine(c, sx - hl, sy2, sx + hl, sy2, 8 * fs, 2.6, ink);
  const sB = keyTag(c, surgeS, dx + 8, ty2, 'left', size, ink, cut, bandCol(S, surgeLv(a)), w - 30);

  // --- Tap targets, most specific first.
  if (visB) S.hot.push({ ...visB, k: 'snorkel.vis' });
  if (chopB) S.hot.push({ ...chopB, k: 'snorkel.chop' });
  if (wB) S.hot.push({ ...wB, k: 'snorkel.water' });
  S.hot.push({ ...sB, k: 'snorkel.surge' });
  S.hot.push({ x: dx + 8, y: sy2 - 10, w: 2 * hl + 14, h: 20, k: 'snorkel.surge' });
  if (a.waterM !== null) S.hot.push({ x: dx - 10, y: sy + 4, w: 20, h: top(dx) - sy - 4, k: 'snorkel.water' });
  if (vis !== null) S.hot.push({ x: ex, y: ey - 14, w: Math.max(24, wx - ex + 10), h: Math.max(28, top(wx) - ey + 14), k: 'snorkel.vis' });
  S.hot.push({ x, y: sy - 10, w, h: 20, k: 'snorkel.chop' });
  const rt = Math.min(...pts.map((p) => p[1])) - 34 * k;
  S.hot.push({ x, y: rt, w, h: y + h - rt, k: 'snorkel.reef' });
}

/**
 * DIVE and SPEAR: a depth column read like an instrument. On the left a solid depth scale with the metres in tags, the
 * activity depth lit and carried across to the swimmer by a dashed line. DIVE: a diver with a tank, bubbles rising and
 * swelling towards the surface. SPEAR: a breath-hold freediver, a speargun out in front, its line up to a float with
 * the dive flag; a striped band on the ruler is the 3 to 5 m a shot needs. Ahead of the mask the ruler runs out to
 * the visibility and the reef past it fades to murk. Under the swimmer a double arrow swings with the surge, as far
 * and as hard as the water moves, and the swimmer and the reef's soft corals swing with it.
 */
function drawDive(c: Ctx2D, A: Box, tt0: number, a: WaterA, S: Style, kit: 'dive' | 'spear' = 'dive') {
  const { x, y, w, h } = A, tt = S.reduced ? 3.2 : tt0, F = waterFrame(A, kit, a), { fs, sy, u, mp, span, bx, bw, hspan, hm } = F;
  const ink = S.ink, cut = rgba(S.fd), vis = a.visM, K = kit;
  const sg = clamp(a.surgeMs / 0.3, 0.3, 2), swing = S.reduced ? 0 : Math.sin((TAU * tt) / 8);
  const hl = (14 + 26 * clamp(a.surgeMs / 0.6, 0, 1)) * fs;
  const mx = F.mx + swing * hl * 0.22, ey = F.ey + (S.reduced ? 0 : Math.sin(tt * 0.9) * 1.5), k = u / 140;
  const dY = (m: number) => sy + m * mp, ys = dY(span - 0.5);

  // --- Water: a shade deeper every 5 m.
  for (let m = 0; m < span; m += 5) { c.fillStyle = rgba(S.on, 0.03 + 0.025 * (m / 5)); c.fillRect(bx + bw, dY(m), x + w - bx - bw, Math.min(5, span - m) * mp); }
  // --- The bottom: sand, and a reef rising ahead of the swimmer.
  const reefTop = a.depthM + 2.8, pts: [number, number][] = [], m0 = 0.6;
  for (let xx = bx + bw, i = 0; xx < x + w + 1; xx += 16 * fs, i++) {
    const f = (xx - x) / w, rise = clamp((f - m0) / 0.13, 0, 1) * clamp((1.04 - f) / 0.08, 0.3, 1);
    pts.push([Math.min(xx, x + w), Math.min(ys - 3, dY(lerp(span - 0.9, reefTop, rise)) + (hash1(i + 60) - 0.5) * 8 * fs)]);
  }
  if (pts[pts.length - 1][0] < x + w) pts.push([x + w, pts[pts.length - 1][1]]);
  const sway = swing * 0.12 * sg;
  // On the sand under the surge tag the corals stay low enough to keep clear of it.
  const room = dY(span - 0.9) - (F.ey + 49 * fs + 9.5 * fs * 0.95) - 6, RB = { x: bx + bw, y, w: x + w - bx - bw, h };
  const tallness: Record<string, number> = { brain: 0.75, branch: 1.15, fan: 1.1, sponge: 1, grass: 1 };
  const corals = ([[0.05, 'grass', 12], [0.15, 'brain', 13], [0.27, 'branch', 26], [0.4, 'fan', 28], [0.5, 'brain', 11], [0.58, 'grass', 10],
    [0.75, 'sponge', 28], [0.81, 'brain', 17], [0.88, 'fan', 36], [0.96, 'branch', 30]] as [number, 'brain' | 'branch' | 'fan' | 'sponge' | 'grass', number][])
    .map(([f, kind, r]): [number, 'brain' | 'branch' | 'fan' | 'sponge' | 'grass', number] => [f, kind, RB.x + f * RB.w < x + w * (m0 + 0.06) ? Math.min(r, room / (tallness[kind] * k)) : r])
    .filter((q) => q[2] >= 6);
  const top = reefBed(c, RB, pts, ys, k, sway, S, corals);

  // --- Fish about the reef; for SPEAR a snapper on the line ahead, 4 m off, the shot it is lining up.
  const fx0 = x + w * 0.84 + (S.reduced ? 0 : Math.sin(tt * 0.2) * 14), fy0 = dY(reefTop) - (K === 'spear' ? 24 : 46) * k;
  for (let i = 0; i < 6; i++) fish(c, fx0 + (hash1(i + 3) - 0.5) * 56 * k, fy0 + (hash1(i + 13) - 0.5) * 26 * k, 10 * k, -1, tt * 6 + i, S);
  const ex = mx + 0.02 * u;
  if (K !== 'spear') { const gx = x + w * 0.7; fish(c, gx, top(gx) - 44 * k, 26 * k, 1, tt * 3, S); }

  // --- What you can see: murk past the visibility, the line where it ends.
  let wx = x + w;
  if (vis !== null) { wx = Math.min(x + w - 4, F.mx + 0.02 * u + vis * hm); murk(c, F.mx + 0.02 * u, x + w + 40, sy + 3, ys, vis, hm, S.fd); }
  if (K === 'spear') {
    // The shot: 3 to 5 m ahead, striped on the ruler.
    const s0 = F.mx + 0.02 * u + 3 * hm, s1 = Math.min(x + w - 4, F.mx + 0.02 * u + 5 * hm);
    c.save(); c.beginPath(); c.rect(s0, F.ey - 5, s1 - s0, 10); c.fillStyle = rgba(S.on, 0.18); c.fill(); c.clip();
    c.strokeStyle = S.ink; c.lineWidth = 1; c.beginPath(); for (let xx = s0 - 12; xx < s1 + 12; xx += 4) { c.moveTo(xx, F.ey + 5); c.lineTo(xx + 10, F.ey - 5); } c.stroke(); c.restore();
  }
  sightRuler(c, F.mx + 0.02 * u, F.ey, x + w - 4, hm, hspan, vis, fs, S);
  if (K === 'spear') {
    // The target: a snapper 4 m ahead, in the middle of the shot band, just above the line. Drawn over the murk: clear
    // when the water lets you see that far, faded when it does not (you cannot see it well enough to shoot).
    const tx = Math.min(x + w - 30 * k, F.mx + 0.02 * u + 4 * hm) + (S.reduced ? 0 : Math.sin(tt * 0.5) * 3), ty = F.ey - 0.17 * u;
    c.save(); c.globalAlpha = vis === null || vis >= 4 ? 1 : 0.35;
    fish(c, tx, ty, 24 * k, -1, tt * 3.5, S); c.restore();
    S.hot.push({ x: tx - 18 * k, y: ty - 12 * k, w: 36 * k, h: 24 * k, k: 'spear.fish' });
  }

  // --- The surface, the depth scale, the line across at the swimmer's depth.
  const at = surface(c, bx + bw, x + w, sy, tt, a.windKt, S);
  c.fillStyle = ink; c.fillRect(bx, sy - 4, bw, span * mp + 4);
  c.strokeStyle = cut; c.lineWidth = 1.2; c.beginPath();
  for (let m = 1; m < span; m++) { const yy = Math.round(dY(m)) + 0.5, l = m % 2 ? bw * 0.45 : bw; c.moveTo(bx + bw - l, yy); c.lineTo(bx + bw, yy); }
  c.stroke();
  const tagS = 8 * fs;
  for (let m = 0; m <= span; m += 2) {
    const here = m === a.depthM;
    tag(c, String(m), bx - 3, dY(m), 'right', tagS, here ? rgba(CREAM) : ink, here ? rgba(DARK) : cut);
  }
  // Pointer and dashed line to the swimmer's depth.
  poly(c, [[bx + bw, F.ey], [bx + bw + 7 * fs, F.ey - 5 * fs], [bx + bw + 7 * fs, F.ey + 5 * fs]], ink);
  c.strokeStyle = ink; c.lineWidth = 1.5; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(bx + bw + 8 * fs, F.ey); c.lineTo(mx - u - 2, F.ey); c.stroke(); c.setLineDash([]);
  const atB = tag(c, a.at, bx + bw + 6 * fs, F.ey - 26 * fs, 'left', 9.5 * fs, ink, cut);

  // --- Bubbles from the regulator, swelling as they rise (less pressure) and wobbling; a freediver breathes out only at the top.
  if (K === 'dive') {
    for (let i = 0; i < 12; i++) {
      const q = S.reduced ? (i + 0.5) / 12 : (tt * 0.3 + i / 12 + hash1(i) * 0.04) % 1, by = ey + 0.03 * u - q * (ey + 0.03 * u - sy - 6);
      const bxp = ex + 0.01 * u + Math.sin(q * 11 + i * 2.1) * (2 + q * 4) + q * 6, r = (1.4 + q * 3.6) * (0.75 + 0.5 * hash1(i + 5)) * fs;
      c.strokeStyle = rgba(CREAM, 0.95 - q * 0.45); c.lineWidth = 1.4; c.beginPath(); c.arc(bxp, by, r, 0, TAU); c.stroke();
    }
  }
  // --- The swimmer, and for SPEAR the float line up to the float and its flag.
  const kick = S.reduced ? 0.4 : Math.sin(tt * (K === 'spear' ? 1.8 : 2.4));
  const butt = swimmer(c, mx, ey, u, kick, K, S);
  let floatB: Box | null = null;
  if (K === 'spear') {
    const fx = F.mx - 0.2 * u + swing * hl * 0.1, fy = at(fx), fl = 30 * fs, fh = 9 * fs;
    c.strokeStyle = ink; c.lineWidth = 1.3; c.beginPath(); c.moveTo(butt[0], butt[1]); c.quadraticCurveTo(butt[0] - 0.12 * u, (butt[1] + fy) / 2, fx - fl * 0.3, fy + fh * 0.4); c.stroke();
    // The float: a hard torpedo with a band; the pole and the diver-down flag, red with a white diagonal, flying.
    poly(c, [[fx - fl / 2, fy - fh * 0.2], [fx - fl / 2 + fh * 0.4, fy - fh * 0.6], [fx + fl / 2 - fh * 0.4, fy - fh * 0.6], [fx + fl / 2, fy - fh * 0.2], [fx + fl / 2, fy + fh * 0.2], [fx + fl / 2 - fh * 0.4, fy + fh * 0.5], [fx - fl / 2 + fh * 0.4, fy + fh * 0.5], [fx - fl / 2, fy + fh * 0.2]], rgba(CREAM, 0.97), ink, 1.6);
    c.fillStyle = ink; c.fillRect(fx - 2, fy - fh * 0.6, 4, fh * 1.1);
    const ph = fy - fh * 0.6, pt = ph - 26 * fs, fw = 20 * fs, fhh = 13 * fs, fl2 = S.reduced ? 0 : Math.sin(tt * 5) * 1.6;
    c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, ph); c.lineTo(fx, pt); c.stroke();
    const flag: [number, number][] = [[fx + 1, pt], [fx + 1 + fw * 0.5, pt + fl2 * 0.5], [fx + 1 + fw, pt + fl2], [fx + 1 + fw, pt + fhh + fl2], [fx + 1 + fw * 0.5, pt + fhh + fl2 * 0.5], [fx + 1, pt + fhh]];
    poly(c, flag, rgba(S.T.lv0));
    c.save(); poly(c, flag); c.clip();
    poly(c, [[fx + 1, pt - 1], [fx + 1 + fw * 0.26, pt - 1], [fx + 1 + fw + 1, pt + fhh + fl2 - fhh * 0.3], [fx + 1 + fw + 1, pt + fhh + fl2 + 1], [fx + 1 + fw * 0.74, pt + fhh + fl2 + 1], [fx, pt + fhh * 0.3]], rgba(CREAM, 0.97));
    c.restore();
    poly(c, flag, undefined, ink, 1.5);
    floatB = { x: fx - fl / 2 - 4, y: pt - 4, w: Math.max(fl, fw + fl / 2) + 8, h: fy + fh - pt + 6 };
  }

  // --- Words over the surface: the visibility at its line, the chop for DIVE (SPEAR's float stands there instead).
  const { visB, chopB } = topTags(c, a, wx, y + 10 * fs, sy + 16 * fs, bx + bw + 4, x + w, fs, S, floatB ? [floatB] : [], K === 'dive', at, top);

  // --- Surge: a double arrow under the swimmer, swinging with the water; its band keyed in the tag.
  const scx = F.mx - 0.45 * u, sax = scx + swing * hl * 0.4, say = F.ey + 30 * fs;
  dimLine(c, sax - hl, say, sax + hl, say, 9 * fs, 2.8, ink);
  const surgeS = `${a.surge} · ${a.surgeV}`;
  const sm = tagSize(c, surgeS, 9.5 * fs, w * 0.66), sw = sm.w + sm.h;
  const sB = keyTag(c, surgeS, clamp(scx - sw / 2, bx + bw + 8 * fs, x + w - sw), say + 19 * fs, 'left', 9.5 * fs, ink, cut, bandCol(S, surgeLv(a)), w * 0.66);

  // --- Tap targets, most specific first.
  const P = kit;
  if (visB) S.hot.push({ ...visB, k: `${P}.vis` });
  if (chopB) S.hot.push({ ...chopB, k: `${P}.chop` });
  if (floatB) S.hot.push({ ...floatB, k: `${P}.float` });
  S.hot.push({ ...atB, k: `${P}.depth` });
  S.hot.push({ ...sB, k: `${P}.surge` });
  S.hot.push({ x: sax - hl - 4, y: say - 10, w: 2 * hl + 8, h: 20, k: `${P}.surge` });
  S.hot.push({ x: F.mx - u * (K === 'spear' ? 1.08 : 0.98), y: F.ey - 0.13 * u, w: u * (K === 'spear' ? 1.8 : 1.04), h: 0.3 * u, k: `${P}.diver` });
  S.hot.push({ x: x, y: sy - 8, w: bx + bw + 6 - x, h: span * mp + 16, k: `${P}.depth` });
  if (vis !== null) S.hot.push({ x: F.mx, y: F.ey - 14, w: Math.max(24, wx - F.mx + 10), h: 28, k: `${P}.vis` });
  if (vis !== null) S.hot.push({ x: wx - 10, y: sy, w: 20, h: top(wx) - sy, k: `${P}.vis` });
  if (chopB) S.hot.push({ x: bx + bw, y: sy - 8, w: x + w - bx - bw, h: 16, k: `${P}.chop` });
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
