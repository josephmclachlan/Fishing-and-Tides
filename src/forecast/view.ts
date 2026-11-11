/**
 * What the FORECAST page shows, as text and numbers (PLAN 7.69). Pure: no DOM, no timers. page.ts renders these
 * views and render.ts turns them into markup, so every number on the page is formatted in one place and tested
 * against the model (view.test.ts, render.test.ts). Times are Costa Rica local (REGION.tzOffsetH, UTC-6).
 *
 * Rounding, everywhere on the page: metres to 0.1 (surge and tide to 0.01), knots, °C feels and scores to whole
 * numbers, water temperature to 0.1 °C, percentages to whole numbers. Directions are compass points (W in the
 * active language).
 */
import { t, type Key } from '../i18n';
import { localDayStart, moonPhase } from '../physics/astro';
import { tideState } from '../physics/tide';
import { REGION } from '../region';
import { localClock } from '../tide-chart';
import { compassName } from '../spot-charts';
import type { Spot } from '../metrics/forecast';
import type { Plan, PlanDay } from '../metrics/plan';
import { tipBand } from './tiles';
import { skyKind, type RowSpec, type SkyKind } from './charts';
import {
  beaufort, chopFor, dayWeather, driftFor, surfSize as surfSizeOf, uvLevel, waterAt,
  type DayWeather, type FcActivity, type FcDeps, type FcRead, type Level, type TimelineHour, type WxSky,
} from './model';

const H = 3.6e6, DAY = 864e5;
const TZ = REGION.tzOffsetH;
const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

export const n1 = (x: number) => x.toFixed(1);
export const n0 = (x: number) => Math.round(x).toString();
/** Signed metres to 0.01 with a real minus: "+0.18", "−0.09". */
export const signed2 = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
/** "PLAYA COCLES" → "Playa Cocles"; "LIMÓN" → "Limón". */
export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
/** HUD caps to a sentence: "MOVING TIDE" → "Moving tide". */
export const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
/** Compass point for degrees FROM, with W in the active language; '' without a direction. */
export const cmp = (deg: number | null | undefined) => (fin(deg) ? compassName(deg).replace(/W/g, t('hemi.W')) : '');
/** Local hour of the day, 0..23. */
export const hourOf = (ms: number) => new Date(ms + TZ * H).getUTCHours();
/** "06" on the hour, "06:30" otherwise (window tiles). */
export const clockShort = (ms: number) => (new Date(ms + TZ * H).getUTCMinutes() ? localClock(ms) : String(hourOf(ms)).padStart(2, '0'));
const dash = '--';

/** Headline value as [text, unit] for the hero, the spot cards, the days and the best time. */
export function headline(r: FcRead): { value: string; unit: string } {
  if (r.score === null) return { value: dash, unit: '' };
  switch (r.activity) {
    case 'surf': {
      const [lo, hi] = r.surf!.range;
      return { value: hi < 0.15 ? '0' : lo === hi ? n1(lo) : `${n1(lo)}–${n1(hi)}`, unit: 'm' };
    }
    case 'fish':
    case 'swim':
      return { value: n0(r.score), unit: '/100' };
    case 'snorkel':
    case 'dive': {
      const v = r.water!.visM;
      return v === null ? { value: dash, unit: '' } : { value: v >= 10 ? n0(v) : n1(v), unit: 'm' };
    }
    case 'sail': {
      const k = r.sail!.windKt;
      return k === null ? { value: dash, unit: '' } : { value: n0(k), unit: 'kt' };
    }
  }
}

/** A headline with its unit: "1.2 m", "13 kt", but "72/100". */
export const withUnit = (hl: { value: string; unit: string }) => (hl.unit ? `${hl.value}${hl.unit.startsWith('/') ? '' : ' '}${hl.unit}` : hl.value);

/** The rating word: the surf band for SURF, the level word for the rest. */
export const levelWord = (r: FcRead) => (r.level === null ? (r.swim && !r.swim.daylight ? t('swim.r.dark') : t('fc.nodata')) : r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key));

/** "Today", "Tomorrow", "Thu 12" for day `d` of the plan starting at local midnight `dayMs`. */
export function dayLabel(dayMs: number, d: number): string {
  if (d === 0) return t('fc.today');
  if (d === 1) return t('fc.tomorrow');
  const x = new Date(dayMs + 12 * H + TZ * H);
  return `${sentence(t(`day.${x.getUTCDay()}` as Key))} ${x.getUTCDate()}`;
}
/** "Thu 12" for any hour. */
export const dayDate = (ms: number) => {
  const d = new Date(ms + TZ * H);
  return `${sentence(t(`day.${d.getUTCDay()}` as Key))} ${d.getUTCDate()}`;
};

/** The reasons chips: what holds the score back (or that nothing does). */
export function reasons(r: FcRead): string[] {
  if (r.score === null) return r.swim && !r.swim.daylight ? [t('swim.r.dark')] : [];
  if (r.surf) {
    const out: string[] = [];
    out.push(`${t('fc.wind')} ${t(`fc.wind.${r.surf.windKind}` as Key)}`);
    out.push(`${n0(r.surf.tp)} s · ${cmp(r.surf.dir)}`);
    if (r.surf.tideKind !== 'none') out.push(`${t('fc.tide')} ${t(`fc.tide.${r.surf.tideKind}` as Key)}`);
    return out;
  }
  if (r.fish) return r.fish.reasons.slice(0, 3).map((k) => sentence(t(`bite.r.${k}` as Key)));
  if (r.water) {
    const why = r.water.reasons.length ? r.water.reasons.slice(0, 3).map((k) => sentence(t(`dive.r.${k}` as Key))) : [t('fc.reason.none')];
    return r.water.access ? [sentence(t(`snk.access.${r.water.access}` as Key)), ...why] : why;
  }
  if (r.swim) return r.swim.reasons.length ? r.swim.reasons.slice(0, 3).map((k) => t(`swim.r.${k}` as Key)) : [t('fc.reason.none')];
  if (r.sail) {
    const s = r.sail, out: string[] = [];
    if (s.squall !== null && s.squall >= 1) out.push(`${t('fc.squall')}: ${t(`fc.squall.${Math.min(2, Math.round(s.squall))}` as Key).toLowerCase()}`);
    if (s.gustKt !== null && s.gustKt >= 18) out.push(t('fc.reason.gust', { kt: n0(s.gustKt) }));
    if (s.windKt !== null && s.windKt < 5) out.push(t('fc.reason.light'));
    if (s.windKt !== null && s.windKt >= 20) out.push(t('fc.reason.wind'));
    return out.length ? out : [t('fc.reason.none')];
  }
  return [];
}

/** Context every view reads: where, what, which hour, the week's plan and the page's hour-by-hour timeline. */
export interface ViewCtx {
  deps: FcDeps;
  spot: Spot;
  act: FcActivity;
  /** The hour the hero shows. */
  ms: number;
  /** The current hour. */
  nowMs: number;
  plan: Plan | null;
  /** The page's timeline (timeline() from the plan's first midnight). */
  tl: readonly TimelineHour[];
}
const tlAt = (tl: readonly TimelineHour[], ms: number) => {
  if (!tl.length) return null;
  const i = Math.round((ms - tl[0].ms) / H);
  return i >= 0 && i < tl.length ? tl[i] : null;
};
/** The plan's day index for an hour (clamped into the week), 0 without a plan. */
export const planDayOf = (plan: Plan | null, ms: number) =>
  plan ? Math.max(0, Math.min(plan.days.length - 1, Math.floor((localDayStart(ms, TZ) - plan.startMs) / DAY))) : 0;
/** The 24 timeline hours of the local day containing `ms`. */
export function dayHoursOf(tl: readonly TimelineHour[], ms: number): TimelineHour[] {
  if (!tl.length) return [];
  const i0 = Math.round((localDayStart(ms, TZ) - tl[0].ms) / H);
  return i0 >= 0 ? tl.slice(i0, i0 + 24) : [];
}

/** The hero's words line under the number. */
export function heroWords(r: FcRead, ctx: Pick<ViewCtx, 'plan' | 'ms'>): string {
  if (r.score === null && !r.sail) return '';
  const win = ctx.plan?.days[planDayOf(ctx.plan, ctx.ms)];
  if (r.swim) return `${t('fc.ripRisk')} ${t(`fc.ripw.${r.swim.rip}` as Key).toLowerCase()} · ${t('fc.shorebreak').toLowerCase()} ${n1(r.swim.breakerM)} m`;
  if (r.fish) return win ? `${t('fc.bestWindow')} ${t('fc.window', { from: localClock(win.startMs), to: localClock(win.endMs) })}` : '';
  if (r.surf) return t(`fc.size.${r.surf.size}` as Key);
  if (r.water && r.activity === 'snorkel') return `${t('fc.entry')} ${n1(r.water.breakerM)} m${r.water.windKt === null ? '' : ` · ${t(`fc.chop.${chopFor(r.water.windKt)}` as Key).toLowerCase()}`}`;
  if (r.water) return `${t('fc.depthAt', { d: r.water.depthM })}${r.water.currentKt === null ? '' : ` · ${t('fc.current').toLowerCase()} ${t(`fc.drift.${driftFor(r.water.currentKt)}` as Key).toLowerCase()}`}`;
  if (r.sail && r.sail.windKt !== null) return `${t(`fc.bft.${beaufort(r.sail.windKt)}` as Key)} · ${t('fc.force', { n: beaufort(r.sail.windKt) })}`;
  return '';
}

export interface HeroView {
  label: string;
  value: string;
  unit: string;
  words: string;
  level: Level | null;
  word: string;
  /** The score on its own scale where the headline is not already it: "6.8/10" (surf), "72/100" (snorkel, dive, sail). */
  score: string | null;
  /** The rating bar: 0..10 segments filled (the score's share of its scale × 10). */
  segs: number;
  reasons: string[];
}
export function heroView(r: FcRead, ctx: Pick<ViewCtx, 'plan' | 'ms'>): HeroView {
  const hl = headline(r);
  const score = r.score === null ? null : r.activity === 'surf' ? `${n1(r.score)}/10` : r.activity === 'fish' || r.activity === 'swim' ? null : `${n0(r.score)}/100`;
  return {
    label: t(`fc.metric.${r.activity}` as Key), value: hl.value, unit: hl.unit, words: heroWords(r, ctx),
    level: r.level, word: levelWord(r), score, segs: r.share === null ? 0 : Math.max(0, Math.min(10, r.share * 10)), reasons: reasons(r),
  };
}

export interface BestTimeView {
  kind: 'best' | 'chance' | 'none' | 'hidden';
  label: string;
  when: string;
  value: string;
  level: Level | null;
  /** The window's start, to move the hero there. */
  startMs: number | null;
}
/**
 * The week's best window as one line: WATCH's best day, or with no day good enough the least bad one as
 * "best chance". Hidden while the hero already shows that window, or without data.
 */
export function bestTimeView(plan: Plan | null, read: (ms: number) => FcRead, heroMs: number, sel: boolean): BestTimeView {
  const hidden: BestTimeView = { kind: 'hidden', label: '', when: '', value: '', level: null, startMs: null };
  if (!plan || plan.none === 'nodata' || plan.none === 'nospot') return hidden;
  const chance = plan.days.reduce<PlanDay | null>((acc, x) => (x && x.value !== null && (!acc || x.value > acc.value!) ? x : acc), null);
  const d = plan.bestDay === null ? chance : plan.days[plan.bestDay];
  if (!d) return { kind: 'none', label: t('fc.bestTime'), when: t('fc.noGood'), value: '', level: null, startMs: null };
  if (sel && heroMs >= d.startMs && heroMs < d.endMs) return hidden;
  const r = read(d.startMs);
  const hl = headline(r);
  return {
    kind: plan.bestDay === null ? 'chance' : 'best', label: t(plan.bestDay === null ? 'fc.bestChance' : 'fc.bestTime'),
    when: `${dayLabel(d.dayMs, d.day)} · ${t('fc.window', { from: localClock(d.startMs), to: localClock(d.endMs) })}`,
    value: withUnit(hl), level: r.level, startMs: d.startMs,
  };
}

// --- Tiles ---------------------------------------------------------------------------------------------------------

export type TileKind =
  | 'weather' | 'swell' | 'wind' | 'tide' | 'window' | 'water' | 'uv' | 'rain' | 'catch' | 'moon' | 'rip' | 'breaker'
  | 'feels' | 'chop' | 'current' | 'reef' | 'stingers' | 'surge' | 'gust' | 'boat' | 'squall' | 'sea';

/** The numbers a tile's picture is drawn from (each kind reads its own). */
export interface TileViz {
  v?: number | null;
  deg?: number | null;
  period?: number | null;
  sky?: WxSky | null;
  rainPct?: number | null;
  from?: number;
  to?: number;
  waxing?: boolean;
  /** Series for the day, local hours 0..23 (tide heights, gusts and mean wind). */
  series?: (number | null)[];
  mean?: (number | null)[];
  /** Local hour of "now" in the series (fractional), and of the next turn of the tide. */
  at?: number;
  turnAt?: number | null;
  turnHigh?: boolean;
  /** How many things to draw (fish species, jellies). */
  count?: number;
}
export interface TileView {
  kind: TileKind;
  k: string;
  v: string;
  /** A smaller part after the value: "/24°". */
  small?: string;
  sub: string[];
  tip: string | null;
  lv: Level | null;
  viz: TileViz;
}

const tipOf = (kind: Parameters<typeof tipBand>[0], v: number | null, vars?: Record<string, string>) => {
  const b = tipBand(kind, v);
  return b === null ? null : t(`tip.${kind}.${b}` as Key, vars);
};
const SKY_WORD: Record<WxSky, Key> = { sun: 'fc.sky.sun', partly: 'fc.sky.partly', cloud: 'fc.sky.cloud', showers: 'fc.sky.showers', rain: 'fc.sky.rain', storm: 'fc.sky.storm' };

/** The weather tip: when the rain comes, or what the sun asks for; plus a heat warning. */
export function weatherTip(w: DayWeather): string | null {
  const at = (ms: number | null) => (ms === null ? '' : localClock(ms));
  let tip: string;
  switch (w.sky) {
    case 'storm': tip = t('tip.wx.storm', { h: at(w.wettestMs ?? w.rainPeakMs) }); break;
    case 'rain': tip = t('tip.wx.rain', { mm: n0(w.rainMm ?? 0), h: at(w.wettestMs) }); break;
    case 'showers': tip = t('tip.wx.showers', { h: at(w.rainPeakMs ?? w.wettestMs) }); break;
    case 'cloud': tip = t('tip.wx.cloud'); break;
    case 'sun': case 'partly': tip = w.uvMax !== null && w.uvMax >= 7.5 ? t('tip.wx.sunUv', { uv: n0(w.uvMax) }) : t('tip.wx.sun'); break;
    default: return null;
  }
  const heat = w.feelsMaxC !== null && w.feelsMaxC >= 32 ? ` ${t(w.feelsMaxC >= 39 ? 'tip.feels.danger' : 'tip.feels.hot')}` : '';
  return tip + heat;
}

/** The tide now at a spot: signed height, rising or falling, and the next high or low water (local time). */
export function tideNow(env: FcDeps['env'], ms: number): { h: number; rising: boolean; next: { t: number; h: number; type: 'high' | 'low' } } {
  const s = tideState(env.tide, ms);
  return { h: s.h, rising: s.rising, next: s.next };
}

/**
 * The moon's age in days since new moon, from its elongation from the sun: the mean synodic month is 29.53 days,
 * so age = elongation / 360° × 29.53 (Meeus, Astronomical Algorithms, ch. 49). Rounded to a whole day for display.
 */
export const SYNODIC_DAYS = 29.530589;
export const moonAgeDays = (elongationDeg: number) => (((elongationDeg % 360) + 360) % 360) / 360 * SYNODIC_DAYS;

/** The conditions tiles under the hero: eight per activity, the weather first, then safety first. */
export function tilesFor(r: FcRead, ctx: ViewCtx): TileView[] {
  const { env } = ctx.deps;
  const ms = ctx.ms;
  const h = tlAt(ctx.tl, ms);
  const dayHours = dayHoursOf(ctx.tl, ms);
  const w = dayWeather(dayHours);
  const d0 = localDayStart(ms, TZ);
  const sst = waterAt(env, ctx.spot, d0);
  const today = d0 === localDayStart(ctx.nowMs, TZ);
  const dayName = today ? t('fc.today') : dayDate(ms);
  const dIdx = planDayOf(ctx.plan, ms);
  const win = ctx.plan?.days[dIdx] ?? null;
  const at = hourOf(ms) + new Date(ms + TZ * H).getUTCMinutes() / 60;
  // The day's strongest wind from the same source as the tile's own number (the surf, water and swim readings carry
  // their own wind; the weather rows another), so the peak is never below the hour shown.
  const peakWind = (f: (x: TimelineHour) => number | null | undefined) => {
    const vs = dayHours.map(f).filter(fin);
    const pk = vs.length ? Math.max(...vs) : null;
    return pk === null ? '' : `${t('fc.peak')} ${n0(pk)} kt${w.gustKt === null ? '' : `, ${t('fc.gust').toLowerCase()} ${n0(w.gustKt)}`}`;
  };

  const weather = (): TileView => {
    const sub1 = [w.sky ? t(SKY_WORD[w.sky]) : t('fc.nodata'), w.feelsMaxC === null ? '' : t('fc.feelsShort', { c: n0(w.feelsMaxC) })].filter(Boolean).join(' · ');
    const sub2 = [
      w.rainPct === null ? '' : `${t('fc.rainChance')} ${n0(w.rainPct)}%${w.rainMm === null ? '' : ` · ${n1(w.rainMm)} mm`}`,
      w.humidityPct === null ? '' : `${t('fc.humidity').toLowerCase()} ${n0(w.humidityPct)}%`,
    ].filter(Boolean).join(' · ');
    return {
      kind: 'weather', k: `${t('fc.weather')} · ${dayName}`, v: w.hiC === null ? dash : `${n0(w.hiC)}°`, small: w.loC === null ? undefined : `/${n0(w.loC)}°`,
      sub: [sub1, sub2].filter(Boolean), tip: weatherTip(w), lv: null, viz: { sky: w.sky, rainPct: w.rainPct },
    };
  };
  const uvTile = (uv: number | null): TileView => ({
    kind: 'uv', k: t('fc.uv'), v: uv === null ? dash : n0(uv),
    sub: [[uv === null ? '' : t(`fc.uvw.${uvLevel(uv)}` as Key), w.uvMax === null ? '' : `${t('fc.peak')} ${n0(w.uvMax)}`].filter(Boolean).join(' · ')],
    tip: tipOf('uv', uv), lv: uv === null ? null : uvLevel(uv), viz: { v: uv },
  });
  const water = (k = t('fc.water')): TileView => ({
    kind: 'water', k, v: sst === null ? dash : `${n1(sst)} °C`, sub: [sst === null ? '' : t(`fc.waterw.${tipBand('water', sst)}` as Key)], tip: tipOf('water', sst), lv: null, viz: { v: sst },
  });
  const rain = (): TileView => ({
    kind: 'rain', k: t('fc.rainChance'), v: w.rainPct === null ? dash : `${n0(w.rainPct)}%`,
    sub: [[w.rainMm === null ? '' : `${n1(w.rainMm)} mm`, w.rainPeakMs === null ? '' : t('fc.rainWhen', { t: localClock(w.rainPeakMs) })].filter(Boolean).join(' · ')],
    tip: tipOf('rainpct', w.rainPct), lv: null, viz: { v: w.rainPct },
  });
  const windTile = (kt: number | null, from: number | null, src: (x: TimelineHour) => number | null | undefined, extra = ''): TileView => ({
    kind: 'wind', k: t('fc.wind'), v: kt === null ? dash : `${n0(kt)} kt`,
    sub: [[cmp(from), extra].filter(Boolean).join(' · '), peakWind(src)].filter(Boolean), tip: tipOf('wind', kt), lv: null, viz: { v: kt, deg: from },
  });
  const tideTile = (): TileView => {
    const s = tideNow(env, ms);
    const series = dayHours.map((x) => x.tideM);
    const turn = s.next.t - d0 < DAY ? (s.next.t - d0) / H : null;
    return {
      kind: 'tide', k: t('fc.tide'), v: `${signed2(s.h)} m`,
      sub: [`${t(s.rising ? 'fc.tide.rising' : 'fc.tide.falling')} · ${t(`fc.tide.next.${s.next.type}` as Key, { t: localClock(s.next.t) })}`],
      tip: t(s.rising ? 'tip.tide.up' : 'tip.tide.down'), lv: null, viz: { series, at, turnAt: turn, turnHigh: s.next.type === 'high' },
    };
  };
  const windowTile = (): TileView => ({
    kind: 'window', k: t('fc.bestWindow'), v: win ? `${clockShort(win.startMs)}–${clockShort(win.endMs)}` : dash,
    sub: [win ? dayLabel(win.dayMs, win.day) : t('fc.noWindow')], tip: win ? t('tip.clock', { from: localClock(win.startMs) }) : null, lv: null,
    viz: win ? { from: (win.startMs - d0) / H, to: (win.endMs - d0) / H } : {},
  });
  const entry = (m: number, rip: 'LOW' | 'MOD' | 'HIGH' | null): TileView => ({
    kind: 'breaker', k: t('fc.entry'), v: `${n1(m)} m`, sub: [rip ? `${t('fc.rip')} ${t(`fc.ripw.${rip}` as Key).toLowerCase()}` : t(`fc.size.${surfSizeOf(m)}` as Key)],
    tip: rip === 'HIGH' ? t('tip.rip.HIGH') : tipOf('breaker', m), lv: null, viz: { v: m },
  });
  const current = (kt: number | null): TileView => ({
    kind: 'current', k: t('fc.current'), v: kt === null ? dash : `${n1(kt)} kt`, sub: [kt === null ? '' : t(`fc.drift.${driftFor(kt)}` as Key)], tip: tipOf('current', kt), lv: null, viz: { v: kt },
  });
  const hourWind = h ? { kt: h.windKt, from: h.windFromDeg } : { kt: null, from: null };

  if (r.surf) {
    const s = r.surf;
    return [
      weather(),
      { kind: 'swell', k: t('fc.swell'), v: `${n1(s.hs)} m`, sub: [`${n0(s.tp)} s · ${cmp(s.dir)}`], tip: tipOf('swell', s.hs), lv: null, viz: { v: s.hs, period: s.tp, deg: s.dir } },
      { ...windTile(s.windKt, s.windFromDeg, (x) => x.read.surf?.windKt, t(`fc.wind.${s.windKind}` as Key)), tip: t(`tip.surfwind.${s.windKind}` as Key) },
      tideTile(), windowTile(), water(), uvTile(h?.uv ?? null), rain(),
    ];
  }
  if (r.fish) {
    const f = r.fish;
    const names = f.species.map((id) => titleCase(t(`fish.${id}` as Key)));
    const age = moonAgeDays(moonPhase(ms).elongation);
    return [
      weather(),
      { kind: 'catch', k: t('fc.catch'), v: names[0] ?? dash, sub: [names.slice(1).join(' · ')], tip: t('tip.fish'), lv: null, viz: { count: names.length } },
      { kind: 'moon', k: t('fc.moon'), v: `${n0(f.moonIllum * 100)}%`, sub: [`${sentence(t(`astro.moon.${f.moonPhase}` as Key))} · ${t('fc.moonDay', { d: n0(age) })}`], tip: tipOf('moon', f.moonIllum), lv: null, viz: { v: f.moonIllum, waxing: f.moonPhase <= 4 } },
      tideTile(), windTile(hourWind.kt, hourWind.from, (x) => x.windKt), water(), uvTile(h?.uv ?? null), windowTile(),
    ];
  }
  if (r.water && r.activity === 'snorkel') {
    const x = r.water;
    return [
      weather(),
      entry(x.breakerM, x.rip),
      { kind: 'chop', k: t('fc.chop'), v: x.windKt === null ? dash : `${n0(x.windKt)} kt`, sub: [[x.windKt === null ? '' : t(`fc.chop.${chopFor(x.windKt)}` as Key), peakWind((y) => y.read.water?.windKt)].filter(Boolean).join(' · ')], tip: tipOf('chop', x.windKt), lv: null, viz: { v: x.windKt } },
      current(x.currentKt),
      { kind: 'reef', k: t('fc.overReef'), v: x.waterM === null ? dash : `${n1(x.waterM)} m`, sub: [x.waterM === null ? '' : t(`fc.reefw.${tipBand('reef', x.waterM)}` as Key)], tip: tipOf('reef', x.waterM), lv: null, viz: { v: x.waterM } },
      uvTile(x.uv ?? h?.uv ?? null),
      { kind: 'stingers', k: t('fc.stingers'), v: x.stingers === null ? dash : sentence(t(x.stingers ? 'fc.stingw.maybe' : 'fc.stingw.low')), sub: [t('fc.stingerGuess')], tip: x.stingers === null ? null : tipOf('stingers', x.stingers ? 1 : 0), lv: null, viz: { count: x.stingers ? 3 : x.stingers === false ? 1 : 0 } },
      water(),
    ];
  }
  if (r.water) {
    const x = r.water;
    return [
      weather(),
      { kind: 'surge', k: t('fc.surge', { d: x.depthM }), v: `${x.surgeMs.toFixed(2)} m/s`, sub: [t(`fc.surge.${x.surge}` as Key)], tip: t(`tip.surge.${x.surge}` as Key), lv: null, viz: { v: x.surgeMs } },
      current(x.currentKt),
      water(t('fc.sst')),
      entry(x.breakerM, x.rip),
      uvTile(x.uv ?? h?.uv ?? null),
      windTile(x.windKt, hourWind.from, (y) => y.read.water?.windKt),
      rain(),
    ];
  }
  if (r.swim) {
    const x = r.swim;
    const ripLv = { LOW: 3, MOD: 2, HIGH: 0 } as const;
    return [
      weather(),
      { kind: 'rip', k: t('fc.ripRisk'), v: t(`fc.ripw.${x.rip}` as Key), sub: [t(`fc.flagw.${x.rip}` as Key)], tip: t(`tip.rip.${x.rip}` as Key), lv: ripLv[x.rip], viz: { v: x.ripScore } },
      { kind: 'breaker', k: t('fc.shorebreak'), v: `${n1(x.breakerM)} m`, sub: [t(`fc.size.${surfSizeOf(x.breakerM)}` as Key)], tip: tipOf('breaker', x.breakerM), lv: null, viz: { v: x.breakerM } },
      uvTile(x.uv),
      { kind: 'feels', k: t('fc.feels'), v: x.feelsC === null ? dash : `${n0(x.feelsC)} °C`, sub: [x.airC === null ? '' : sentence(t('fc.airIs', { c: n0(x.airC) }))], tip: tipOf('feels', x.feelsC), lv: null, viz: { v: x.feelsC } },
      water(),
      windTile(x.windKt, hourWind.from, (y) => y.read.swim?.windKt),
      rain(),
    ];
  }
  if (r.sail) {
    const s = r.sail;
    const gusts = dayHours.map((x) => x.gustKt), means = dayHours.map((x) => x.windKt);
    const sq = s.squall === null ? null : Math.min(2, Math.round(s.squall));
    const sqDay = w.squall === null ? null : Math.min(2, Math.round(w.squall));
    return [
      weather(),
      windTile(s.windKt, s.fromDeg, (y) => y.read.sail?.windKt),
      { kind: 'gust', k: t('fc.gust'), v: s.gustKt === null ? dash : `${n0(s.gustKt)} kt`, sub: [s.windKt === null ? '' : t('fc.meanWind', { kt: n0(s.windKt) })], tip: tipOf('gust', s.gustKt), lv: null, viz: { v: s.gustKt, series: gusts, mean: means, at } },
      { kind: 'boat', k: t('fc.comfort'), v: r.score === null ? dash : `${n0(r.score)}/100`, sub: [r.score === null ? '' : t(`fc.boatw.${tipBand('boat', r.score)}` as Key)], tip: tipOf('boat', r.score), lv: r.level, viz: { v: r.score } },
      { kind: 'sea', k: t('fc.swell'), v: s.swellM === null ? dash : `${n1(s.swellM)} m`, sub: [s.swellM === null ? '' : t(`fc.swellw.${tipBand('swell', s.swellM)}` as Key)], tip: tipOf('swell', s.swellM), lv: null, viz: { v: s.swellM } },
      { kind: 'squall', k: t('fc.squall'), v: sq === null ? dash : t(`fc.squall.${sq}` as Key), sub: [sqDay === null ? '' : t('fc.squallDay', { w: t(`fc.squall.${sqDay}` as Key).toLowerCase() })], tip: null, lv: sq === null ? null : sq >= 2 ? 0 : sq >= 1 ? 2 : 3, viz: { v: sq } },
      uvTile(h?.uv ?? null),
      water(),
    ];
  }
  // No reading yet: the weather still shows, with the activity's tiles waiting.
  return [weather(), water(), uvTile(h?.uv ?? null), rain()];
}

// --- Spots, days, the hour readout ---------------------------------------------------------------------------------

export interface SpotView { name: string; value: string; unit: string; word: string; level: Level | null; strip: (Level | null)[]; sky: SkyKind | null; airC: string | null; rainPct: string | null }
export function spotView(s: Spot, r: FcRead, strip: (Level | null)[], wx: { airC: number | null; rainPct: number | null; cloudPct: number | null; rainMmH: number | null; squall: number | null; day: boolean }): SpotView {
  const hl = headline(r);
  return {
    name: titleCase(s.name), value: hl.value, unit: hl.unit, word: levelWord(r), level: r.level, strip,
    sky: skyKind(wx), airC: wx.airC === null ? null : `${n0(wx.airC)}°`, rainPct: wx.rainPct === null ? null : `${n0(wx.rainPct)}%`,
  };
}

export interface DayView { i: number; dd: string; dn: string; value: string; unit: string; level: Level | null; height: number; window: string; uv: string | null; uvLevel: Level | null; best: boolean; on: boolean }
/**
 * The next 7 days as bars: each day's best window (WATCH's, plan.ts) read at its start, the bar's height by the
 * headline's own number (breaker height for surf) against the week's largest.
 */
export function daysView(plan: Plan, read: (ms: number) => FcRead, uvs: readonly (number | null)[], selDay: number, sel: boolean): DayView[] {
  const reads = plan.days.map((d) => (d ? read(d.startMs) : null));
  const num = (r: FcRead | null) => (!r || r.score === null ? null : r.surf ? r.surf.hb : r.water ? r.water.visM : r.sail ? r.sail.windKt : r.score);
  const nums = reads.map(num);
  const top = Math.max(0, ...nums.filter(fin));
  return plan.days.map((d, i) => {
    const dayMs = plan.startMs + i * DAY;
    const x = new Date(dayMs + 12 * H + TZ * H);
    const r = reads[i];
    const hl = r ? headline(r) : { value: dash, unit: '' };
    const v = nums[i];
    return {
      i, dd: i === 0 ? t('fc.today') : sentence(t(`day.${x.getUTCDay()}` as Key)), dn: String(x.getUTCDate()),
      value: hl.value, unit: hl.unit, level: r?.level ?? null, height: v === null || !top ? 0 : Math.max(0.14, v / top),
      window: d ? `${clockShort(d.startMs)}–${clockShort(d.endMs)}` : '—',
      uv: uvs[i] === null || uvs[i] === undefined ? null : `UV ${n0(uvs[i]!)}`, uvLevel: uvs[i] === null || uvs[i] === undefined ? null : uvLevel(uvs[i]!),
      best: plan.bestDay === i, on: sel && i === selDay,
    };
  });
}

/** A chart row's value as the readout and the labels show it: its decimals, the tide signed to 0.01 m. */
export function rowText(spec: Pick<RowSpec, 'id' | 'decimals'>, v: number): string {
  if (spec.id === 'tide') return signed2(v);
  return spec.decimals === 0 ? n0(v) : v.toFixed(spec.decimals);
}

const SKY_KIND_WORD: Record<SkyKind, Key> = { sun: 'fc.sky.sun', moon: 'fc.sky.clear', 'partly-sun': 'fc.sky.partly', 'partly-moon': 'fc.sky.partly', cloud: 'fc.sky.cloud', rain: 'fc.sky.showers', storm: 'fc.sky.storm' };
export interface ReadoutCell { k: string; v: string; unit: string; extra: string; wx: boolean }
export interface ReadoutView { tag: string; day: string; time: string; line: string; level: Level | null; cells: ReadoutCell[] }
/** The hour readout above the charts: when, the rating, and every row's value at that hour. */
export function readoutView(h: TimelineHour, act: FcActivity, rows: readonly RowSpec[]): ReadoutView {
  const k = skyKind(h);
  const cells = rows.map((r): ReadoutCell => {
    const v = r.value(h);
    const g = r.tick?.(h);
    return {
      k: t(`fc.row.${r.id}` as Key), v: v === null || !Number.isFinite(v) ? dash : rowText(r, v), unit: r.id === 'uv' ? '' : t(`fc.unit.${r.id}` as Key),
      extra: r.tick && fin(g) ? `G${n0(g)}` : '', wx: !!r.wx,
    };
  });
  return {
    tag: [t(h.day ? 'fc.day' : 'fc.night'), k ? t(SKY_KIND_WORD[k]) : ''].filter(Boolean).join(' · '),
    day: dayDate(h.ms), time: localClock(h.ms), line: `${t(`fc.act.${act}` as Key)} · ${levelWord(h.read)}`, level: h.read.level, cells,
  };
}

// --- The live-map card -------------------------------------------------------------------------------------------

/**
 * The map picture drawn with `background-size: cover` on a card: its scale (card px per picture px) is the larger
 * of the two ratios, and it is centred. Returns where a point of the picture (0..1 across and down) lands on the
 * card, and the card's pixels per kilometre from the picture's ground resolution (m per picture px), or null when
 * that is unknown.
 */
export function coverPlace(img: { w: number; h: number; mPerPx: number | null }, card: { w: number; h: number }, at: { x: number; y: number }) {
  const s = Math.max(card.w / Math.max(1, img.w), card.h / Math.max(1, img.h));
  const ox = (card.w - img.w * s) / 2, oy = (card.h - img.h * s) / 2;
  return {
    x: ox + at.x * img.w * s,
    y: oy + at.y * img.h * s,
    kmPx: img.mPerPx && img.mPerPx > 0 ? (1000 / img.mPerPx) * s : null,
  };
}
