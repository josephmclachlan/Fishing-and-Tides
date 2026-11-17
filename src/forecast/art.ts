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
import { arrow, brackets, chevron, clamp, D2R, dimLine, DISP, ease, keyTag, MONO, lerp, moonPath, overlaps, rgba, sq, tag, tagSize, TAU, txt, type Ctx2D, type Hot, type RGB, type Tokens } from './kit';
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

/**
 * SURF, side on (PLAN 13.1): the sea on the left rolls in toward a beach on the right, where a 1.7 m adult stands
 * beside a shortboard on the same metres-to-pixels scale. The waves come in sets on the reading's period (one crest
 * passes every `period` s, so a long-period swell rolls in slowly and evenly) and break as they reach the beach: a
 * swell hump steepens, the lip pitches forward over a hollow face, then falls into whitewater that runs up to the
 * sand. Each wave's face is inside the reading's range, the set's biggest at the top of it; the range is a band
 * across the picture with its numbers as a tag. Body marks run from the figure's knee, waist, chest and head across
 * the waves to tags on the left, solid where today's bigger waves reach. A ruler under the water spans one crest gap
 * and says the period; a small compass shows where the swell comes from against the beach.
 */
function drawSurf(c: Ctx2D, A: Box, tt0: number, s: NonNullable<HeroParams['surf']>, S: Style) {
  const { x, y, w, h } = A, tt = S.reduced ? 3.1 : tt0, fs = clamp(Math.min(w, 760) / 380, 1, 1.3);
  const ink = S.ink, fdc = rgba(S.fd), cream = (al: number) => rgba(CREAM, al);
  const headH = Math.round(36 * fs), footH = Math.round(30 * fs);
  const maxM = Math.max(2.05, s.hi * 1.12);
  const base = y + h - footH, mpx = (base - (y + headH + 6)) / maxM, u = BODY_M.head * mpx;
  c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 6;

  // --- Layout: guide tags on the left (one width), the figure and board on the right, the sea between.
  const guides = s.guides.filter(([m]) => m <= maxM);
  let dm = Infinity;
  for (let i = 1; i < guides.length; i++) dm = Math.min(dm, Math.abs(guides[i][0] - guides[i - 1][0]) * mpx);
  const gsz = Math.min(9 * fs, (dm - 4) / 1.9), gMax = w * 0.24;
  const gw = Math.max(...guides.map(([, n]) => tagSize(c, n, gsz, gMax).w), 30);
  const bw = BOARD_M.wid * mpx, bcx = x + w - 2 - bw / 2, pcx = bcx - bw / 2 - 0.05 * u;
  const lx = x + gw + 10, rx = pcx - 0.17 * u - 4; // the sea from lx to the waterline at rx

  // --- The waves: a set rolling in on the period, each breaking as it nears the beach.
  const cw = rx - lx, lam = clamp(cw * 0.44, 80, 240), v = lam / Math.max(4, s.period), P = tt * v;
  // A set: each wave a different size inside the range, the biggest at the top of it, the next ones never alike.
  const SET = [0.15, 1, 0.45, 0.8, 0, 0.6];
  const n0w = Math.ceil((P - cw - lam * 0.5) / lam), n1w = Math.floor((P + lam * 0.6) / lam);
  const crests: number[] = [];
  c.save(); c.beginPath(); c.rect(lx + 7, y, rx - lx - 7, base - y + 1); c.clip();
  for (let n = n1w; n >= n0w; n--) {
    const xc = lx + P - n * lam, k = (xc - lx) / cw;
    const Hm = s.lo + (s.hi - s.lo) * SET[((n % 6) + 6) % 6], H = Math.max(3, Hm * mpx);
    // Stages as the crest nears the beach: swell, steepening, the lip pitching, the collapse, the whitewater running in.
    const st = ease(0.05, 0.42, k), sl = ease(0.38, 0.6, k), br = ease(0.58, 0.72, k), bo = ease(0.66, 1, k);
    if (k < 0.6) crests.push(xc);
    const Lb = lam * 0.5, Lf = lam * 0.42 * (1 - 0.5 * st), Hh = H * (0.8 + 0.2 * ease(0, 0.4, k)) * (1 - 0.5 * br);
    const L2 = (p: number, q: number) => p + (q - p) * sl;
    const C: [number, number] = [xc + Lf * 0.15 * sl, base - Hh];
    const T: [number, number] = [L2(C[0], xc + Lf * 1.2), L2(C[1], base - Hh * 0.12)], O: [number, number] = [L2(C[0], xc + Lf * 1.12), L2(C[1], base - Hh * 1.04)];
    const I: [number, number] = [L2(C[0], xc + Lf), L2(C[1], base - Hh * 0.72)], U: [number, number] = [L2(C[0], xc + Lf * 0.32), L2(C[1], base - Hh * 0.8)];
    const c1: [number, number] = [L2(lerp(xc + Lf * 0.35, xc + Lf * 0.04, st), xc + Lf * 0.06), L2(lerp(base - Hh, base - Hh * 0.55, st), base - Hh * 0.45)];
    const c2x = L2(lerp(xc + Lf * 0.5, xc + Lf * 0.2, st), xc + Lf * 0.14), toe = xc + Lf * L2(1, 1.3);
    const shape = (close: boolean) => {
      c.beginPath(); c.moveTo(xc - Lb, base);
      c.bezierCurveTo(xc - Lb * 0.5, base, xc - Lb * 0.35, C[1], C[0], C[1]);
      c.quadraticCurveTo(O[0], O[1], T[0], T[1]);
      c.quadraticCurveTo(I[0], I[1], U[0], U[1]);
      c.bezierCurveTo(c1[0], c1[1], c2x, base, toe, base);
      if (close) c.closePath();
    };
    if (br < 1) {
      const al0 = c.globalAlpha;
      c.globalAlpha = al0 * (1 - br * 0.75);
      shape(true); c.fillStyle = rgba(S.on, 0.16); c.fill();
      c.save(); shape(true); c.clip();
      c.strokeStyle = rgba(S.on, 0.62); c.lineWidth = 1; c.beginPath();
      for (let yy = base - 2; yy > base - Hh * 1.2; yy -= 3.2) { c.moveTo(xc - Lb, Math.round(yy) + 0.5); c.lineTo(xc + lam, Math.round(yy) + 0.5); }
      c.stroke(); c.restore();
      shape(false); c.strokeStyle = ink; c.lineWidth = 2.2; c.stroke();
      // The lip, heavier where it throws.
      if (sl > 0.02) { c.lineWidth = 3.4; c.beginPath(); c.moveTo(C[0], C[1]); c.quadraticCurveTo(O[0], O[1], T[0], T[1]); c.stroke(); }
      c.globalAlpha = al0;
    }
    if (br > 0 && k < 1.12) {
      // The lip lands and bursts into foam; the whitewater runs on, a steep front and a long back, lower as it goes.
      const fx1 = xc + Lf * 1.4 + bo * lam * 0.25, fx0 = fx1 - Lf * 1.6 - bo * lam * 0.25, Hf = H * 0.62 * (1 - bo * 0.75) * Math.min(1, br * 1.4);
      const al = 1 - ease(0.95, 1.1, k);
      const top = (xx: number) => {
        const q = (xx - fx0) / (fx1 - fx0), f = q <= 0.78 ? Math.pow(Math.sin((Math.PI / 2) * (q / 0.78)), 1.2) : Math.pow(Math.max(0, Math.cos((Math.PI / 2) * ((q - 0.78) / 0.22))), 0.6);
        return base - Hf * f * (0.86 + 0.14 * hash1(n * 7 + Math.round(xx - xc)));
      };
      c.fillStyle = cream(0.95 * al); c.beginPath(); c.moveTo(fx0, base);
      for (let xx = fx0; xx <= fx1; xx += 3) c.lineTo(xx, top(xx));
      c.lineTo(fx1, base); c.closePath(); c.fill();
      c.strokeStyle = rgba(S.on, al); c.lineWidth = 1.5; c.beginPath();
      for (let xx = fx0; xx <= fx1; xx += 3) (xx === fx0 ? c.moveTo(xx, top(xx)) : c.lineTo(xx, top(xx)));
      c.stroke();
      for (let i = 0; i < 10; i++) {
        const px = fx0 + hash1(n * 3 + i) * (fx1 - fx0), py = top(px) - 2 - hash1(n * 5 + i) * Hf * 0.4 * (1 - bo);
        c.fillStyle = cream(0.85 * al * (1 - bo)); c.fillRect(Math.round(px), Math.round(py), 2 + (i % 2), 2 + (i % 2));
      }
      for (let i = 0; i < 14; i++) {
        const px = fx0 - hash1(n * 5 + i) * lam * 0.45 * bo, ph = 1 + hash1(n * 11 + i) * 3;
        c.fillStyle = cream(0.6 * al * bo); c.fillRect(Math.round(px), Math.round(base - ph - 1), 2, 2);
      }
    }
  }
  // The waves come in from beyond the picture: fade them in over the sea's first few metres.
  const fade = c.createLinearGradient(lx + 7, 0, lx + 40, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = fade; c.fillRect(lx + 7, y, 34, base - y + 1); c.globalCompositeOperation = 'source-over';
  c.restore();
  // --- The face range: a band across the sea over the waves, a bracket at its left end.
  const yHi = base - s.hi * mpx, yLo = base - s.lo * mpx;
  c.fillStyle = rgba(S.on, 0.1); c.fillRect(lx, yHi, rx - lx, Math.max(2, yLo - yHi));
  c.strokeStyle = rgba(S.on, 0.6); c.lineWidth = 1; c.setLineDash([6, 4]);
  c.beginPath(); c.moveTo(lx, Math.round(yHi) + 0.5); c.lineTo(rx, Math.round(yHi) + 0.5); c.moveTo(lx, Math.round(yLo) + 0.5); c.lineTo(rx, Math.round(yLo) + 0.5); c.stroke(); c.setLineDash([]);
  // The water line and the beach under the figure.
  c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, base + 1); c.lineTo(rx, base + 1); c.stroke();
  c.fillStyle = rgba(S.T.sand); c.beginPath(); c.moveTo(rx - 14, base + 9); c.lineTo(rx + 6, base); c.lineTo(x + w, base); c.lineTo(x + w, base + 9); c.closePath(); c.fill();
  c.fillStyle = rgba(S.on, 0.35);
  for (let i = 0; i < 40; i++) c.fillRect(Math.round(rx + hash1(i + 3) * (x + w - rx)), Math.round(base + 2 + hash1(i + 9) * 6), 1.5, 1.5);
  c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.moveTo(rx - 14, base + 9); c.lineTo(rx + 6, base); c.lineTo(x + w, base); c.stroke();

  // --- Body marks: from the figure across the waves to their tags; solid where the bigger waves reach.
  const gTags: Box[] = [];
  for (const [m, n] of guides) {
    const yy = Math.round(base - m * mpx) + 0.5, reach = m <= s.hi + 1e-9;
    c.strokeStyle = reach ? rgba(S.on, 0.85) : rgba(S.on, 0.5); c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(x + gw + 2, yy); c.lineTo(m >= BODY_M.head ? pcx : pcx - 0.15 * u, yy); c.stroke(); c.setLineDash([]);
    gTags.push(tag(c, n, x, yy, 'left', gsz, ink, reach ? fdc : ink, !reach, gMax));
  }
  // The range's bracket at the sea's left end.
  c.fillStyle = ink; c.fillRect(lx, yHi, 5, Math.max(2, yLo - yHi)); c.fillRect(lx, yHi, 10, 2); c.fillRect(lx, yLo - 2, 10, 2);

  // --- The figure and the board, to scale.
  drawPerson(c, pcx, base, mpx, tt, S, base + footH * 0.55, x + w);

  // --- The period: crest marks riding along the water line, a ruler one crest gap long.
  c.fillStyle = ink;
  for (const xc of crests) if (xc > lx + 8 && xc < rx - 4) { c.beginPath(); c.moveTo(xc, base + 3); c.lineTo(xc - 4, base + 9); c.lineTo(xc + 4, base + 9); c.closePath(); c.fill(); }
  const ry = Math.round(base + footH * 0.62) + 0.5, r0 = lx + 8, r1 = Math.min(r0 + lam, rx - 4);
  const ps = tagSize(c, s.everyK, 9 * fs, r1 - r0 - 8 > 60 ? r1 - r0 - 8 : Infinity);
  const inside = ps.w <= r1 - r0 - 10;
  c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath();
  c.moveTo(r0, ry - 5); c.lineTo(r0, ry + 5); c.moveTo(r1, ry - 5); c.lineTo(r1, ry + 5);
  if (inside) { const m0 = (r0 + r1) / 2 - ps.w / 2 - 3, m1 = (r0 + r1) / 2 + ps.w / 2 + 3; c.moveTo(r0, ry); c.lineTo(m0, ry); c.moveTo(m1, ry); c.lineTo(r1, ry); }
  else { c.moveTo(r0, ry); c.lineTo(r1, ry); }
  c.stroke();
  for (const [ax, dir] of [[r0, 1], [r1, -1]] as const) { c.beginPath(); c.moveTo(ax + 1 * dir, ry); c.lineTo(ax + 7 * dir, ry - 3.5); c.lineTo(ax + 7 * dir, ry + 3.5); c.closePath(); c.fill(); }
  const pt = inside ? tag(c, s.everyK, (r0 + r1) / 2, ry, 'center', 9 * fs, ink, fdc, false, r1 - r0 - 8) : tag(c, s.everyK, r1 + 6, ry, 'left', 9 * fs, ink, fdc, false, rx - r1 - 8);

  // --- Header: the face range as the lead tag; the swell's direction against the beach on a small compass.
  const cb = Math.round(32 * fs), cbx = x + w - cb, cby = y + 1, ccx = cbx + cb / 2, ccy = cby + cb / 2, cr = cb / 2;
  c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(cbx + 0.75, cby + 0.75, cb - 1.5, cb - 1.5);
  c.fillStyle = ink; c.beginPath(); c.moveTo(ccx, cby - 3); c.lineTo(ccx - 3, cby + 2); c.lineTo(ccx + 3, cby + 2); c.closePath(); c.fill(); // north
  const pol = (r: number, d: number): [number, number] => [ccx + Math.sin(d * D2R) * r, ccy - Math.cos(d * D2R) * r];
  if (s.facing !== null) {
    // The land behind the beach: sand filling the box past the shore line, square to the way the beach faces.
    const b = pol(cr * 0.45, s.facing + 180), ex = Math.cos(s.facing * D2R) * cb, ey = Math.sin(s.facing * D2R) * cb, bx = -Math.sin(s.facing * D2R) * cb, by = Math.cos(s.facing * D2R) * cb;
    c.save(); c.beginPath(); c.rect(cbx + 1.5, cby + 1.5, cb - 3, cb - 3); c.clip();
    c.fillStyle = rgba(S.T.sand); c.beginPath(); c.moveTo(b[0] - ex, b[1] - ey); c.lineTo(b[0] + ex, b[1] + ey); c.lineTo(b[0] + ex + bx, b[1] + ey + by); c.lineTo(b[0] - ex + bx, b[1] - ey + by); c.closePath(); c.fill();
    c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.moveTo(b[0] - ex, b[1] - ey); c.lineTo(b[0] + ex, b[1] + ey); c.stroke();
    c.restore();
  }
  {
    const a0 = pol(cr * 0.95, s.dir), a1 = pol(s.facing === null ? cr * 0.4 : cr * 0.05, s.dir + 180);
    c.strokeStyle = ink; c.lineWidth = 2.4; c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]); c.stroke();
    arrow(c, a1[0], a1[1], s.dir + 180, 6, ink);
  }
  const ft = tag(c, s.fromK, cbx - 6, ccy, 'right', 9 * fs, ink, ink, true, w * 0.42);
  const rt = tag(c, s.rangeK, x, ccy, 'left', 11 * fs, ink, fdc, false, ft.x - x - 8);
  // A leader from the range tag down to its bracket.
  c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(lx + 2.5, rt.y + rt.h); c.lineTo(lx + 2.5, yHi); c.stroke();

  // --- Tap targets, most specific first.
  S.hot.push({ x: cbx - 4 - (cbx - ft.x), y: cby - 4, w: x + w - ft.x + 8, h: cb + 8, k: 'surf.dir' });
  S.hot.push({ x: Math.min(r0, pt.x) - 4, y: ry - 12, w: Math.max(r1, pt.x + pt.w) - Math.min(r0, pt.x) + 8, h: 24, k: 'surf.period' });
  S.hot.push({ x: rt.x, y: rt.y, w: rt.w, h: rt.h, k: 'surf.range' });
  S.hot.push({ x: rx + 2, y: base - u - 6, w: x + w - rx - 2, h: u + 10, k: 'surf.body' });
  for (const g of gTags) S.hot.push({ x: g.x, y: g.y - 3, w: g.w, h: g.h + 6, k: 'surf.body' });
  S.hot.push({ x: lx, y: Math.min(yHi, base - 0.4 * mpx) - 8, w: rx - lx, h: base - Math.min(yHi, base - 0.4 * mpx) + 10, k: 'surf.range' });
}

/** The page's off-white (foam, boards, hulls, the figure's shorts): light on every level colour, in both themes. */
const CREAM: RGB = [255, 246, 232];
/** Text on a cream tag: dark in both themes. */
const DARK: RGB = [12, 22, 28];
/** Typical shortboard, m: the figure is drawn at BODY_M.head on the same scale, so the board reads true beside it. */
export const BOARD_M = { len: 1.85, wid: 0.5 } as const;

/**
 * A standing adult seen from the front, feet on the 0 m line and the crown at BODY_M.head (1.7 m) on the wave scale
 * (`mpx` px a metre), with a shortboard of BOARD_M standing on its tail to the right, one hand on its rail. Drawn in hard
 * filled shapes: ink body, cream board shorts and board. It breathes a little (still under reduced motion). The caption
 * goes under the feet at `labelY`, kept left of `right`.
 */
export function drawPerson(c: Ctx2D, cx: number, base: number, mpx: number, tt: number, S: Style, labelY = base + 14, right = Infinity) {
  const u = BODY_M.head * mpx;
  if (!(u > 8) || !Number.isFinite(cx)) return;
  const br = S.reduced ? 0 : Math.sin(tt * 1.5), ink = S.ink;
  c.save();
  c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 6;
  // The board on its tail: pointed nose, wide point a little behind the middle, a squash tail.
  const L = BOARD_M.len * mpx, bw = BOARD_M.wid * mpx, bcx = cx + bw / 2 + 0.05 * u, bt = base - 1;
  const board = () => {
    c.beginPath(); c.moveTo(bcx, bt - L);
    c.bezierCurveTo(bcx + bw * 0.3, bt - L * 0.95, bcx + bw * 0.5, bt - L * 0.72, bcx + bw * 0.5, bt - L * 0.46);
    c.bezierCurveTo(bcx + bw * 0.5, bt - L * 0.2, bcx + bw * 0.38, bt - L * 0.05, bcx + bw * 0.2, bt);
    c.lineTo(bcx - bw * 0.2, bt);
    c.bezierCurveTo(bcx - bw * 0.38, bt - L * 0.05, bcx - bw * 0.5, bt - L * 0.2, bcx - bw * 0.5, bt - L * 0.46);
    c.bezierCurveTo(bcx - bw * 0.5, bt - L * 0.72, bcx - bw * 0.3, bt - L * 0.95, bcx, bt - L);
    c.closePath();
  };
  board(); c.fillStyle = rgba(CREAM, 0.97); c.fill();
  c.save(); board(); c.clip();
  c.fillStyle = ink; c.fillRect(bcx - bw, bt - L * 0.74, bw * 2, Math.max(2, L * 0.035)); c.fillRect(bcx - bw, bt - L * 0.69, bw * 2, Math.max(1.5, L * 0.012)); // nose stripes
  c.strokeStyle = rgba(S.on, 0.75); c.lineWidth = 1; c.beginPath();
  for (let yy = bt - L * 0.24; yy < bt - 2; yy += 3) { c.moveTo(bcx - bw * 0.36, Math.round(yy) + 0.5); c.lineTo(bcx + bw * 0.36, Math.round(yy) + 0.5); } // the tail pad
  c.stroke();
  c.strokeStyle = rgba(S.on, 0.7); c.beginPath(); c.moveTo(bcx + 0.5, bt - L + 3); c.lineTo(bcx + 0.5, bt - L * 0.25); c.stroke(); // stringer
  c.restore();
  board(); c.strokeStyle = ink; c.lineWidth = 2; c.stroke();

  // The figure, front on. Heights as shares of the 1.7 m crown.
  const Y = (k: number) => base - k * u, X = (k: number) => cx + k * u;
  const sh = Y(0.815) - 0.003 * u * br;
  c.fillStyle = ink;
  const poly = (pts: [number, number][]) => { c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill(); };
  for (const sd of [-1, 1]) {
    // Leg: thigh, knee, ankle; a foot turned a little out.
    poly([[X(sd * 0.012), Y(0.47)], [X(sd * 0.098), Y(0.47)], [X(sd * 0.078), Y(0.27)], [X(sd * 0.062), Y(0.045)], [X(sd * 0.03), Y(0.045)], [X(sd * 0.022), Y(0.27)]]);
    poly([[X(sd * 0.026), Y(0.05)], [X(sd * 0.066), Y(0.05)], [X(sd * 0.09), base], [X(sd * 0.02), base]]);
  }
  // Torso: shoulders, chest, waist, hips.
  poly([[X(-0.035), sh - 0.022 * u], [X(0.035), sh - 0.022 * u], [X(0.128), sh], [X(0.128), sh + 0.03 * u], [X(0.108), Y(0.7)], [X(0.086), Y(0.58)], [X(0.098), Y(0.5)], [X(-0.098), Y(0.5)], [X(-0.086), Y(0.58)], [X(-0.108), Y(0.7)], [X(-0.128), sh + 0.03 * u], [X(-0.128), sh]]);
  c.fillRect(X(-0.026), Y(0.865), 0.052 * u, Y(0.8) - Y(0.865)); // neck
  c.beginPath(); c.arc(cx, Y(1 - 0.068), 0.068 * u, 0, TAU); c.fill(); // head
  // Arms: the left hanging, the right reaching to the board's rail.
  c.strokeStyle = ink; c.lineWidth = 0.046 * u;
  c.beginPath(); c.moveTo(X(-0.112), sh + 0.02 * u); c.lineTo(X(-0.15), Y(0.63)); c.lineTo(X(-0.142), Y(0.46)); c.stroke();
  const railX = bcx - bw * 0.5 + 1;
  c.beginPath(); c.moveTo(X(0.112), sh + 0.02 * u); c.lineTo(X(0.16), Y(0.64)); c.lineTo(railX, Y(0.52)); c.stroke();
  c.fillRect(X(-0.164), Y(0.47), 0.044 * u, 0.06 * u); // hand
  // Board shorts: cream, a dark waistband, split between the legs.
  c.fillStyle = rgba(CREAM, 0.97);
  poly([[X(-0.1), Y(0.555)], [X(0.1), Y(0.555)], [X(0.108), Y(0.39)], [X(0.014), Y(0.39)], [X(0), Y(0.45)], [X(-0.014), Y(0.39)], [X(-0.108), Y(0.39)]]);
  c.fillStyle = ink; c.fillRect(X(-0.1), Y(0.555), 0.2 * u, Math.max(2, 0.018 * u));
  c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath();
  c.moveTo(X(-0.1), Y(0.555)); c.lineTo(X(-0.108), Y(0.39)); c.lineTo(X(-0.014), Y(0.39)); c.lineTo(X(0), Y(0.45)); c.lineTo(X(0.014), Y(0.39)); c.lineTo(X(0.108), Y(0.39)); c.lineTo(X(0.1), Y(0.555)); c.stroke();
  c.fillStyle = rgba(S.on, 0.85); c.fillRect(X(0.05), Y(0.53), 0.04 * u, 0.1 * u); // a side panel
  // The caption under the feet.
  c.font = `700 ${(8.5 * 1.12).toFixed(1)}px ${MONO}`;
  const lw = c.measureText(t('fc.g.person').toUpperCase()).width;
  c.fillStyle = ink; txt(c, t('fc.g.person'), Math.min(cx + bw * 0.25, right - lw / 2 - 1), labelY, 'center', 8.5, 700);
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

/**
 * FISH (PLAN 13.1): three instruments. The moon as a lunar bezel, like the SAIL rose: a solid band with the 29 days
 * knocked out, NEW and FULL as tags on it, the band thicker over the big-tide days around them (lit share 15% or less,
 * 85% or more, as the moon tile's spring/neap words), today's day a cream marker on it and the lit shape inside. Today's
 * tide hour by hour as a crisp chart: the best window a hatched block with its times, NOW a square on the curve with a
 * small arrow rising or falling, the next turn marked and written above. Under them a fish finder: an ink screen
 * scrolling as the boat moves, the seabed a bright band, fish as the classic arches, as many as the bite share.
 */
function drawFish(c: Ctx2D, A: Box, tt0: number, a: NonNullable<HeroParams['fish']>, S: Style) {
  const { x, y, w, h } = A, tt = S.reduced ? 3 : tt0, fs = clamp(Math.min(w, 760) / 380, 1, 1.3);
  const ink = S.ink, fdc = rgba(S.fd), cream = (al: number) => rgba(CREAM, al);
  const topH = Math.round(h * 0.52);
  c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 6;

  // --- The moon on its bezel.
  const litSz = 9 * fs, litH = Math.round(litSz * 1.9);
  const Ro = Math.max(34, Math.min((topH - litH - 18) / 2, w * 0.19)), bw = Math.max(12, Ro * 0.2), Ri = Ro - bw, Rm = Ri - Math.max(4, Ro * 0.08);
  const cx = x + Ro + 6, cy = y + Ro + 6;
  const angOf = (d: number) => -Math.PI / 2 + (d / 29.53) * TAU;
  c.fillStyle = ink; c.beginPath(); c.arc(cx, cy, Ro, 0, TAU); c.arc(cx, cy, Ri, 0, TAU, true); c.fill();
  // The big-tide days: the band thicker outside, around new and full moon (lit 15% or less, 85% or more).
  const sp = (Math.acos(0.7) / TAU) * 29.53;
  for (const d of [0, 29.53 / 2]) { c.beginPath(); c.arc(cx, cy, Ro + 5, angOf(d - sp), angOf(d + sp)); c.arc(cx, cy, Ro - 1, angOf(d + sp), angOf(d - sp), true); c.closePath(); c.fill(); }
  c.strokeStyle = fdc;
  for (let d = 0; d < 30; d++) {
    const an = angOf(d), major = d === 0 || d === 7 || d === 15 || d === 22, l = bw * (major ? 0.62 : 0.34);
    c.lineWidth = major ? 2.2 : 1.2;
    c.beginPath(); c.moveTo(cx + Math.cos(an) * (Ro - 2), cy + Math.sin(an) * (Ro - 2)); c.lineTo(cx + Math.cos(an) * (Ro - 2 - l), cy + Math.sin(an) * (Ro - 2 - l)); c.stroke();
  }
  const nt = tag(c, a.newK ?? 'NEW', cx, cy - Ri - bw / 2, 'center', 7 * fs, fdc, ink, false, Ro * 1.1);
  const ft = tag(c, a.fullK ?? 'FULL', cx, cy + Ri + bw / 2, 'center', 7 * fs, fdc, ink, false, Ro * 1.1);
  void nt; void ft;
  // The disc: the dark side, the lit side and a few craters.
  c.fillStyle = rgba(S.on, 0.28); c.beginPath(); c.arc(cx, cy, Rm, 0, TAU); c.fill();
  if (a.illum > 0.01) {
    c.fillStyle = rgba(S.T.moon); moonPath(c, cx, cy, Rm, a.illum, a.waxing); c.fill();
    c.save(); moonPath(c, cx, cy, Rm, a.illum, a.waxing); c.clip();
    [[0.35, -0.25, 0.2], [-0.1, 0.3, 0.15], [0.15, 0.55, 0.1], [0.5, 0.25, 0.11], [-0.35, -0.4, 0.12]].forEach(([q, r, s]) => { c.fillStyle = rgba(S.fd, 0.22); c.beginPath(); c.arc(cx + q * Rm, cy + r * Rm, s * Rm, 0, TAU); c.fill(); });
    c.restore();
  }
  c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, Rm, 0, TAU); c.stroke();
  // Today's marker on the band: a cream square turned to the centre.
  {
    const an = angOf(a.age), mr = Ri + bw / 2, ms = bw + 5;
    c.save(); c.translate(cx + Math.cos(an) * mr, cy + Math.sin(an) * mr); c.rotate(an);
    c.fillStyle = cream(1); c.fillRect(-ms / 2, -ms / 2, ms, ms); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(-ms / 2 + 1, -ms / 2 + 1, ms - 2, ms - 2);
    c.fillStyle = ink; c.beginPath(); c.moveTo(-ms / 2 - 1, -4); c.lineTo(-ms / 2 - 6, 0); c.lineTo(-ms / 2 - 1, 4); c.closePath(); c.fill();
    c.restore();
  }
  const lt = tag(c, a.litK, x, cy + Ro + 8 + litH / 2, 'left', litSz, ink, fdc, false, 2 * Ro + 30);

  // --- Today's tide.
  const tx0 = Math.round(cx + Ro + 18 * fs), tx1 = x + w - 2, tv = a.tide.filter(fin);
  let tideBox: Box | null = null, bestBox: Box | null = null, nowBox: Box | null = null;
  if (tv.length >= 2 && tx1 - tx0 > 80) {
    c.fillStyle = ink; txt(c, a.tideK, tx0, y + 7 * fs, 'left', 10 * fs, 800);
    const n = a.tide.length - 1;
    const lane = y + 22 * fs; // the second title line: the next turn
    if (a.turn) {
      c.font = `700 ${(9 * fs * 1.12).toFixed(1)}px ${MONO}`;
      const tw = c.measureText(a.turn.label.toUpperCase()).width, sz = tw + 14 > tx1 - tx0 ? 9 * fs * Math.max(0.7, (tx1 - tx0 - 14) / tw) : 9 * fs;
      c.fillStyle = ink; c.beginPath();
      if (a.turn.high) { c.moveTo(tx0, lane + 4); c.lineTo(tx0 + 4, lane - 3); c.lineTo(tx0 + 8, lane + 4); } else { c.moveTo(tx0, lane - 3); c.lineTo(tx0 + 4, lane + 4); c.lineTo(tx0 + 8, lane - 3); }
      c.closePath(); c.fill();
      c.fillStyle = S.soft; txt(c, a.turn.label, tx0 + 13, lane, 'left', sz, 700);
    }
    const bl = lane + 20 * fs, cy0 = bl + 12 * fs, cy1 = y + topH - 22 * fs; // best-tag lane, curve area, axis
    const lo = Math.min(...tv), hi = Math.max(...tv), mid = (lo + hi) / 2, half = Math.max(0.03, (hi - lo) / 2);
    const at = (hr: number) => { const i = clamp(Math.floor(hr), 0, n - 1), k = hr - i, p = a.tide[i], q = a.tide[i + 1]; return fin(p) && fin(q) ? p + (q - p) * k : mid; };
    const hx = (hr: number) => tx0 + (clamp(hr, 0, 24) / 24) * (tx1 - tx0), hy = (hr: number) => (cy0 + cy1) / 2 - ((at(hr) - mid) / half) * ((cy1 - cy0) / 2 - 4);
    tideBox = { x: tx0, y: y, w: tx1 - tx0, h: cy1 + 18 * fs - y };
    if (a.best) {
      const b0 = clamp(a.best[0], 0, 24), b1 = clamp(a.best[1], 0, 24), bx0 = Math.round(hx(b0)), bx1 = Math.max(bx0 + 4, Math.round(hx(b1)));
      c.fillStyle = rgba(S.on, 0.14); c.fillRect(bx0, bl - 9 * fs, bx1 - bx0, cy1 - bl + 9 * fs);
      c.save(); c.beginPath(); c.rect(bx0, bl - 9 * fs, bx1 - bx0, cy1 - bl + 9 * fs); c.clip();
      c.strokeStyle = rgba(S.on, 0.6); c.lineWidth = 1; c.beginPath();
      for (let k = -(cy1 - bl) - 20; k < bx1 - bx0 + 20; k += 5) { c.moveTo(bx0 + k, cy1); c.lineTo(bx0 + k + (cy1 - bl) + 10, bl - 10 * fs); }
      c.stroke(); c.restore();
      c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(bx0 + 0.75, bl - 9 * fs + 0.75, bx1 - bx0 - 1.5, cy1 - bl + 9 * fs - 1.5);
      const s = a.bestT ? `${a.bestK} ${a.bestT}` : a.bestK, bs = tagSize(c, s, 8.5 * fs, tx1 - tx0);
      const bxc = clamp((bx0 + bx1) / 2, tx0 + bs.w / 2, tx1 - bs.w / 2);
      bestBox = tag(c, s, bxc, bl, 'center', 8.5 * fs, ink, fdc, false, tx1 - tx0);
    }
    // The water under the curve, the curve, the axis with its hours.
    c.fillStyle = rgba(S.on, 0.16); c.beginPath(); c.moveTo(hx(0), cy1);
    for (let hr = 0; hr <= n; hr += 0.25) c.lineTo(hx(hr), hy(hr));
    c.lineTo(hx(n), cy1); c.closePath(); c.fill();
    c.strokeStyle = ink; c.lineWidth = 2.5; c.beginPath();
    for (let hr = 0; hr <= n; hr += 0.25) (hr ? c.lineTo(hx(hr), hy(hr)) : c.moveTo(hx(hr), hy(hr)));
    c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(tx0, Math.round(cy1) + 0.5); c.lineTo(tx1, Math.round(cy1) + 0.5);
    for (let hr = 0; hr <= 24; hr += 3) { c.moveTo(Math.round(hx(hr)) + 0.5, cy1); c.lineTo(Math.round(hx(hr)) + 0.5, cy1 + (hr % 6 ? 3 : 5)); }
    c.stroke();
    // The next turn on the curve.
    if (a.turn && a.turn.h >= 0 && a.turn.h <= n) {
      const px = hx(a.turn.h), py = hy(a.turn.h) + (a.turn.high ? -7 : 7);
      c.fillStyle = ink; c.beginPath();
      if (a.turn.high) { c.moveTo(px - 4, py - 4); c.lineTo(px + 4, py - 4); c.lineTo(px, py + 2); } else { c.moveTo(px - 4, py + 4); c.lineTo(px + 4, py + 4); c.lineTo(px, py - 2); }
      c.closePath(); c.fill();
    }
    // Now: a dashed line, a square on the curve, a small arrow rising or falling, its tag under the axis.
    const nh = clamp(a.nowH, 0, n), nx = Math.round(hx(nh)) + 0.5, ny = hy(nh);
    c.strokeStyle = ink; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(nx, cy0 - 4); c.lineTo(nx, cy1); c.stroke(); c.setLineDash([]);
    c.fillStyle = cream(1); c.fillRect(nx - 5.5, ny - 5.5, 11, 11); c.strokeStyle = ink; c.lineWidth = 2.5; c.strokeRect(nx - 4.25, ny - 4.25, 8.5, 8.5);
    const rising = a.turn ? a.turn.high : at(nh + 0.5) >= at(nh);
    {
      const ph = S.reduced ? 0.5 : (tt / 1.6) % 1, ax = nx + (nx > tx1 - 20 ? -14 : 14), dy = rising ? -1 : 1;
      for (let i = 0; i < 2; i++) {
        const k = (ph + i * 0.5) % 1;
        c.strokeStyle = rgba(S.on, Math.min(1, k * 4, (1 - k) * 3)); chevron(c, ax, ny + dy * (k * 12 - 4), dy < 0 ? -Math.PI / 2 : Math.PI / 2, 6, 2.2);
      }
    }
    const ns = tagSize(c, a.nowK, 8 * fs), nxc = clamp(nx, tx0 + ns.w / 2, tx1 - ns.w / 2), nty = cy1 + 11 * fs;
    nowBox = tag(c, a.nowK, nxc, nty, 'center', 8 * fs, ink, fdc);
    [0, 6, 12, 18, 24].forEach((hr) => {
      const al: CanvasTextAlign = hr === 0 ? 'left' : hr === 24 ? 'right' : 'center', lx = hx(hr);
      c.font = `600 ${(8 * fs * 1.12).toFixed(1)}px ${MONO}`;
      const lw = c.measureText('00').width, l0 = al === 'left' ? lx : al === 'right' ? lx - lw : lx - lw / 2;
      if (overlaps({ x: l0, y: nty - 5, w: lw, h: 10 }, nowBox!, 3)) return;
      c.fillStyle = S.soft; txt(c, String(hr).padStart(2, '0'), lx, nty, al, 8 * fs, 600);
    });
    nowBox = { x: Math.min(nowBox.x, nx - 8), y: Math.min(ny - 8, nowBox.y), w: Math.max(nowBox.x + nowBox.w, nx + 8) - Math.min(nowBox.x, nx - 8), h: nowBox.y + nowBox.h - Math.min(ny - 8, nowBox.y) };
  }

  // --- The fish finder: an ink screen scrolling right to left, the seabed, fish as arches.
  const et = tag(c, a.echo, x, y + topH + 9 * fs, 'left', 9.5 * fs, ink, fdc, false, w);
  const sy0 = Math.round(et.y + et.h + 5), sy1 = Math.round(y + h - 1);
  if (sy1 - sy0 < 40) return;
  c.fillStyle = ink; c.fillRect(x, sy0, w, sy1 - sy0);
  const cs = Math.round(3 * fs), pad = 4, scaleW = 14, gx0 = x + pad, gx1 = x + w - pad - scaleW;
  const cols = Math.floor((gx1 - gx0) / cs) + 1, rows = Math.floor((sy1 - sy0 - 2 * pad) / cs);
  const off = tt * 4, base0 = Math.floor(off), frac = off - base0;
  const dens = 0.12 + 0.78 * clamp(a.share, 0, 1), SLOT = 15;
  const L1: number[] = [], L2: number[] = [], L3: number[] = [];
  const put = (i: number, j: number, lv: number) => { if (j < 0 || j >= rows) return; (lv === 3 ? L3 : lv === 2 ? L2 : L1).push(i, j); };
  for (let i = 0; i <= cols; i++) {
    const wi = base0 + i;
    // Seabed: a rolling bottom, the first return bright, the ground under it grainy and fading.
    const bd = Math.round(rows * (0.78 + 0.07 * Math.sin(wi * 0.045) + 0.04 * Math.sin(wi * 0.13 + 1)));
    put(i, bd, 3); put(i, bd + 1, 3); put(i, bd + 2, 2); put(i, bd + 3, 2);
    for (let j = bd + 4; j < rows; j++) { const r = hash1(wi * 131 + j * 7); if (r < 0.75 - (j - bd) * 0.06) put(i, j, r < 0.25 ? 2 : 1); }
    // Surface clutter.
    if (hash1(wi * 17) < 0.55) put(i, 0, 1);
    if (hash1(wi * 29 + 3) < 0.25) put(i, 1, 1);
    // A fish in this column's slot: an arch, brightest at its middle.
    const sl = Math.floor(wi / SLOT);
    if (hash1(sl * 3.17 + 0.5) < dens) {
      const fc = sl * SLOT + 3 + Math.floor(hash1(sl * 7.7) * (SLOT - 9)), aw = 3 + Math.floor(hash1(sl * 1.93) * 3);
      const fr = Math.round(rows * (0.2 + 0.45 * hash1(sl * 5.31)));
      const dx = (wi - fc) / aw;
      if (Math.abs(dx) <= 1 && fr < bd - 5) { const r = fr + Math.round(dx * dx * 2.4); put(i, r, Math.abs(dx) < 0.55 ? 3 : 2); put(i, r + 1, 2); }
    }
    // Faint plankton specks in mid-water.
    if (hash1(wi * 53 + 11) < 0.18) put(i, 3 + Math.floor(hash1(wi * 71) * (bd - 6)), 1);
  }
  c.save(); c.beginPath(); c.rect(gx0, sy0 + pad, gx1 - gx0, rows * cs); c.clip();
  ([[L1, rgba(S.fd, 0.35)], [L2, rgba(S.fd, 0.85)], [L3, cream(1)]] as const).forEach(([L, col]) => {
    c.fillStyle = col; c.beginPath();
    for (let k = 0; k < L.length; k += 2) c.rect(Math.round(gx0 + (L[k] - frac) * cs), sy0 + pad + L[k + 1] * cs, cs, cs);
    c.fill();
  });
  c.restore();
  // The depth scale down the right edge, and the newest sounding at the right of the picture.
  c.strokeStyle = rgba(S.fd, 0.7); c.lineWidth = 1; c.beginPath();
  c.moveTo(gx1 + 4.5, sy0 + pad); c.lineTo(gx1 + 4.5, sy1 - pad);
  for (let k = 0; k <= 4; k++) { const yy = Math.round(sy0 + pad + (k / 4) * rows * cs) + 0.5; c.moveTo(gx1 + 4, yy); c.lineTo(gx1 + 10, yy); }
  c.stroke();

  // --- Tap targets, most specific first.
  if (nowBox) S.hot.push({ ...nowBox, k: 'fish.now' });
  if (bestBox) S.hot.push({ ...bestBox, k: 'fish.best' });
  S.hot.push({ x: x, y: y, w: 2 * Ro + 12, h: lt.y + lt.h - y, k: 'fish.moon' });
  if (tideBox) S.hot.push({ ...tideBox, k: 'fish.tide' });
  S.hot.push({ x: x, y: et.y, w: w, h: sy1 - et.y, k: 'fish.echo' });
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

/** Points along a polyline at arc length `d` (clamped), with the direction there. */
function along(pts: [number, number][], d: number): [number, number, number] {
  let rest = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
    if (rest <= L || i === pts.length - 1) { const k = L ? Math.min(1, rest / L) : 0; return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, Math.atan2(y1 - y0, x1 - x0)]; }
    rest -= L;
  }
  return [pts[0][0], pts[0][1], 0];
}
const polyLen = (pts: [number, number][]) => pts.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/** Chevrons marching along a path at `v` px/s, `gap` px apart, fading in and out at its ends. */
function march(c: Ctx2D, pts: [number, number][], tt: number, v: number, gap: number, s: number, wd: number, col: RGB, alpha: number) {
  const L = polyLen(pts);
  if (L < 4) return;
  const off = (tt * v) % gap;
  for (let d = off; d < L; d += gap) {
    const [x, y, a] = along(pts, d), u = d / L, f = Math.min(1, u * 5, (1 - u) * 5);
    c.strokeStyle = rgba(col, alpha * f);
    chevron(c, x, y, a, s, wd);
  }
}

/**
 * SWIM: a beach from above, read in one look. Sea at the top, sand at the bottom. Waves break white over the sandbars
 * either side; in the gap between them the water is deeper and darker and does not break: the rip. Chevrons show the
 * water running along the shore into the gap, out through it and fanning out past the waves, where a cloud of sandy
 * water spreads. A swimmer shows the way out: carried out, sideways along the beach out of the current, then in with
 * the waves. The rip's width, speed and plume grow with the risk. Square tags carry the words; every part is a tap
 * target that opens its plain-words box.
 */
function drawSwim(c: Ctx2D, A: Box, tt0: number, a: NonNullable<HeroParams['swim']>, S: Style, Y: number) {
  const { x, y, w, h } = A, tt = S.reduced ? 4.2 : tt0, cx = x + w * 0.56, fs = clamp(Math.min(w, 760) / 380, 1, 1.3);
  const rk = a.rip === 'HIGH' ? 1 : a.rip === 'MOD' ? 0.7 : 0.42;
  const gap = w * (a.rip === 'HIGH' ? 0.085 : a.rip === 'MOD' ? 0.068 : 0.05), top = y + h * 0.1;
  const barTop = y + h * 0.24, barBot = Y - h * 0.1; // the sandbars, where the waves break
  const ink = S.ink, cream = (al: number) => rgba(CREAM, al), riskC = S.T[a.rip === 'HIGH' ? 'lv0' : a.rip === 'MOD' ? 'lv2' : 'lv3'];
  const shore = (xx: number) => Y + Math.sin(xx * 0.035 + 1.3) * 2 - Math.exp(-sq((xx - cx) / (gap * 1.6))) * 5;
  // Channel half-width at height yy: narrow neck at the shore, a little wider out by the bar.
  const half = (yy: number) => (yy >= barTop ? gap * (1 - 0.12 * clamp((Y - yy) / (Y - barTop), 0, 1)) : gap * (0.88 - 0.3 * clamp((barTop - yy) / (barTop - top), 0, 1)));

  // --- The sandbars: shallow, a paler stipple either side of the channel.
  c.save();
  for (let i = 0; i < 520; i++) {
    const u = hash1(i), v = hash1(i + 999), xx = x + u * w, yy = barTop + v * (barBot - barTop);
    if (Math.abs(xx - cx) < half(yy) + 6) continue;
    c.fillStyle = cream(0.16 + 0.18 * hash1(i + 77)); c.fillRect(Math.round(xx), Math.round(yy), 2, 2);
  }
  c.restore();
  // --- The channel: deeper water, darker, hatched, from the shore out past the bar.
  c.save();
  c.beginPath(); c.moveTo(cx - half(Y), Y);
  for (let yy = Y; yy >= top; yy -= 6) c.lineTo(cx - half(yy), yy);
  for (let yy = top; yy <= Y; yy += 6) c.lineTo(cx + half(yy), yy);
  c.closePath();
  c.fillStyle = rgba(S.on, 0.12 + 0.08 * rk); c.fill(); c.clip();
  c.strokeStyle = rgba(S.on, 0.16); c.lineWidth = 1; c.beginPath();
  for (let k = -h; k < w + h; k += 6) { c.moveTo(x + k, Y); c.lineTo(x + k + (Y - top), top); }
  c.stroke(); c.restore();
  c.strokeStyle = rgba(S.on, 0.55); c.lineWidth = 1; c.setLineDash([4, 3]);
  for (const sd of [-1, 1]) { c.beginPath(); for (let yy = Y - 4; yy >= top + 6; yy -= 6) { const xx = cx + sd * half(yy); yy === Y - 4 ? c.moveTo(xx, yy) : c.lineTo(xx, yy); } c.stroke(); }
  c.setLineDash([]);

  // --- The rip head: a mushroom of sandy water past the waves, breathing out.
  const hy = top + 4, br = S.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(tt * 0.7), sand = S.T.sand;
  const pw = w * (0.08 + 0.06 * rk) * (0.94 + 0.1 * br), ph = h * (0.07 + 0.03 * rk) * (0.94 + 0.1 * br);
  const plume = () => {
    c.beginPath(); c.moveTo(cx - half(top + 10), top + 12);
    c.bezierCurveTo(cx - pw * 0.7, top + 10, cx - pw * 1.25, hy + ph * 0.5, cx - pw, hy - ph * 0.15);
    c.bezierCurveTo(cx - pw * 0.8, hy - ph, cx + pw * 0.8, hy - ph, cx + pw, hy - ph * 0.15);
    c.bezierCurveTo(cx + pw * 1.25, hy + ph * 0.5, cx + pw * 0.7, top + 10, cx + half(top + 10), top + 12);
    c.closePath();
  };
  plume(); c.fillStyle = rgba(sand, 0.55); c.fill();
  c.save(); plume(); c.clip();
  for (let i = 0; i < 160; i++) { c.fillStyle = rgba(CREAM, 0.15 + 0.3 * hash1(i + 3)); c.fillRect(Math.round(cx - pw * 1.3 + hash1(i + 400) * pw * 2.6), Math.round(hy - ph + hash1(i + 800) * (top + 14 - hy + ph)), 2, 2); }
  c.restore();
  plume(); c.strokeStyle = rgba(S.on, 0.7); c.lineWidth = 1.2; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);

  // --- Breaking waves over the bars: white bands rolling in, a sharp front, a ragged foam back; across the channel
  // only the unbroken swell line, because the deeper water lets the wave through without breaking.
  for (let i = 0; i < 4; i++) {
    const k = (tt / 10 + i / 4) % 1, yy = barTop + k * (barBot - barTop), al = Math.min(1, k * 5, (1 - k) * 5);
    const bh = 3 + k * 5;
    for (const [x0, x1] of [[x, cx - half(yy) - 3], [cx + half(yy) + 3, x + w]] as const) {
      if (x1 - x0 < 4) continue;
      c.fillStyle = cream(0.92 * al); c.fillRect(x0, yy - bh, x1 - x0, bh);
      // Whitewater left behind the break: grains of foam, thinning out to sea.
      for (let j = 0; j < (x1 - x0) * 0.5; j++) { const fx = x0 + hash1(j * 7 + i * 131) * (x1 - x0), fd = Math.pow(hash1(j * 13 + i * 71), 1.8) * (10 + 10 * k); c.fillStyle = cream(0.6 * al * (1 - fd / 20)); c.fillRect(Math.round(fx), Math.round(yy - bh - fd - 2), 2, 2); }
      c.fillStyle = rgba(S.on, 0.55 * al); c.fillRect(x0, yy, x1 - x0, 1.5);
    }
    c.strokeStyle = rgba(S.on, 0.3 * al); c.lineWidth = 1; c.beginPath(); c.moveTo(cx - half(yy), yy); c.lineTo(cx + half(yy), yy); c.stroke();
  }

  // --- The beach: sand with grain, the wet strip, the shore break washing up and back.
  c.fillStyle = rgba(sand); c.beginPath(); c.moveTo(x, y + h);
  for (let xx = x; xx <= x + w; xx += 4) c.lineTo(xx, shore(xx));
  c.lineTo(x + w, y + h); c.closePath(); c.fill();
  c.save(); c.clip();
  c.fillStyle = rgba(S.on, 0.16); c.fillRect(x, Y - 6, w, 12);
  for (let i = 0; i < 380; i++) { c.fillStyle = rgba(S.on, 0.1 + 0.12 * hash1(i + 5)); c.fillRect(Math.round(x + hash1(i + 11) * w), Math.round(Y + hash1(i + 23) * (y + h - Y)), 1.5, 1.5); }
  c.restore();
  const wash = S.reduced ? 0 : Math.sin(tt * 1.1) * 3;
  c.strokeStyle = cream(0.95); c.lineWidth = 3; c.lineCap = 'butt'; c.beginPath();
  for (let xx = x; xx <= x + w; xx += 4) { const yy = shore(xx) - 3 + wash * (0.6 + 0.4 * Math.sin(xx * 0.05)); xx === x ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
  c.stroke();
  c.strokeStyle = ink; c.lineWidth = 2; c.beginPath();
  for (let xx = x; xx <= x + w; xx += 4) (xx === x ? c.moveTo(xx, shore(xx)) : c.lineTo(xx, shore(xx)));
  c.stroke();

  // --- The current: feeders along the shore into the gap, out through the neck, fanning out at the head.
  const v = 26 + 34 * rk, sz = 5 + 2 * rk, fy = Y - 12;
  const paths: [number, number][][] = [
    [[x + 8, fy], [cx - half(fy) - 6, fy]], [[x + w - 8, fy], [cx + half(fy) + 6, fy]],
    [[cx, Y - 6], [cx, top + 14]],
    [[cx - 4, top + 10], [cx - pw * 0.7, hy - ph * 0.35], [cx - pw * 1.15, hy + ph * 0.25]], [[cx + 4, top + 10], [cx + pw * 0.7, hy - ph * 0.35], [cx + pw * 1.15, hy + ph * 0.25]],
  ];
  paths.forEach((pp, i) => march(c, pp, tt, i === 2 ? v * 1.5 : v, i === 2 ? 15 : 20, i === 2 ? sz + 2 : sz, i === 2 ? 3 : 2.2, S.on, i === 2 ? 1 : 0.75));

  // --- The way out: carried out, sideways along the beach, back in with the waves.
  const side = 1, ox = cx, oy = Y - (Y - barTop) * 0.25, py = barTop + (barBot - barTop) * 0.45;
  const exX = cx + side * (half(py) + w * 0.13), inX = exX + side * w * 0.04;
  const way: [number, number][] = [[ox, oy], [ox, py], [exX, py], [inX, Y - 10]];
  c.strokeStyle = cream(0.95); c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); way.forEach(([px, qy], i) => (i ? c.lineTo(px, qy) : c.moveTo(px, qy))); c.stroke(); c.setLineDash([]);
  c.fillStyle = cream(0.95); { const ang = Math.atan2(Y - 10 - py, inX - exX); c.save(); c.translate(inX, Y - 10); c.rotate(ang); c.beginPath(); c.moveTo(4, 0); c.lineTo(-7, -5); c.lineTo(-7, 5); c.closePath(); c.fill(); c.restore(); }
  const LW = polyLen(way), cyc = 11, u = S.reduced ? 0.55 : ((tt % cyc) / cyc);
  // Slow while carried out, quick across, steady in.
  const d = LW * (u < 0.3 ? (u / 0.3) * 0.3 : u < 0.7 ? 0.3 + ((u - 0.3) / 0.4) * 0.45 : 0.75 + ((u - 0.7) / 0.3) * 0.25);
  const [sxp, syp] = along(way, d), stroke = S.reduced ? 0.5 : Math.sin(tt * 6);
  // The swimmer from above: a ring of white water, arms reaching in turn, the head.
  c.strokeStyle = cream(0.7); c.lineWidth = 1.5; c.strokeRect(sxp - 11, syp - 7, 22, 16);
  c.strokeStyle = ink; c.lineWidth = 3; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(sxp - 3, syp + 1); c.lineTo(sxp - 9, syp - 5 - 5 * stroke); c.moveTo(sxp + 3, syp + 1); c.lineTo(sxp + 9, syp - 5 + 5 * stroke); c.stroke();
  c.fillStyle = cream(1); c.beginPath(); c.arc(sxp, syp + 1, 4.6, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
  const sw = tag(c, a.sideK, exX + 4, py - 15, 'right', 9 * fs, cream(0.95), rgba(DARK));

  // --- Words: the rip's own tag in its colour, the shore break, the beach's call.
  const rt = tag(c, a.ripK, cx - half(barTop + 30) - 10, barTop + 30, 'right', 10.5 * fs, ink, rgba(S.fd), false, cx - half(barTop + 30) - 10 - (x + 14));
  c.fillStyle = rgba(riskC); c.fillRect(rt.x - 12, rt.y, 12, rt.h); c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(rt.x - 12 + 0.75, rt.y + 0.75, 10.5, rt.h - 1.5);
  c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(rt.x + rt.w, rt.y + rt.h / 2); c.lineTo(cx - 3, rt.y + rt.h / 2); c.stroke();
  const st = tag(c, a.shore, x, Y - 30, 'left', 9.5 * fs, ink, ink, true);
  const fx0 = x + 4, fyy = Y + (y + h - Y) * 0.58;
  const ft = tag(c, a.flag, fx0 + 22, fyy, 'left', 9.5 * fs, ink, rgba(S.fd), false, x + w - fx0 - 22);
  c.fillStyle = rgba(riskC); c.fillRect(fx0, ft.y, ft.h, ft.h); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(fx0 + 1, ft.y + 1, ft.h - 2, ft.h - 2);

  // --- The sun with its UV ring: one hard block per index point, up to 11.
  let uvBox: Box | null = null;
  if (a.uv !== null) {
    const sr = Math.min(w, h) * 0.06, sx = x + w - sr - 18, sy = y + sr + 14;
    c.fillStyle = ink; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
    c.lineCap = 'butt';
    for (let i = 0; i < 11; i++) {
      const a0 = -Math.PI / 2 + (i / 11) * TAU + 0.07, a1 = a0 + TAU / 11 - 0.14;
      c.strokeStyle = i < Math.round(a.uv) ? ink : rgba(S.on, 0.22); c.lineWidth = 6; c.beginPath(); c.arc(sx, sy, sr + 9, a0, a1); c.stroke();
    }
    tag(c, a.uvK, sx - sr - 18, sy, 'right', 10 * fs, ink, rgba(S.fd));
    uvBox = { x: sx - sr - 14, y: sy - sr - 14, w: 2 * sr + 28, h: 2 * sr + 28 };
  }

  // --- Tap targets, most specific first.
  S.hot.push({ x: sw.x, y: sw.y, w: sw.w, h: sw.h, k: 'swim.out' });
  S.hot.push({ x: Math.min(ox, exX) - 14, y: py - 14, w: Math.abs(exX - ox) + 28, h: Y - py + 4, k: 'swim.out' });
  S.hot.push({ x: rt.x - 12, y: rt.y, w: rt.w + 12, h: rt.h, k: 'swim.rip' });
  S.hot.push({ x: ft.x - 22, y: ft.y, w: ft.w + 22, h: ft.h, k: 'swim.flag' });
  S.hot.push({ x: st.x, y: st.y, w: st.w, h: st.h, k: 'swim.shore' });
  if (uvBox) S.hot.push({ ...uvBox, k: 'swim.uv' });
  S.hot.push({ x: cx - half(top) - 6, y: top - 10, w: 2 * half(top) + 12, h: Y - top + 10, k: 'swim.rip' });
  S.hot.push({ x: x, y: Y - 10, w: w, h: 20, k: 'swim.shore' });
  S.hot.push({ x: x, y: barTop - 12, w: w, h: barBot - barTop + 12, k: 'swim.waves' });
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
  if (K === 'spear') fish(c, F.mx + 0.02 * u + 4 * hm + (S.reduced ? 0 : Math.sin(tt * 0.5) * 3), F.ey - 0.075 * u, 24 * k, 1, tt * 3.5, S);
  else { const gx = x + w * 0.7; fish(c, gx, top(gx) - 44 * k, 26 * k, 1, tt * 3, S); }

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
