/**
 * FORECAST page (PLAN 7.52): a clean full-screen page beside the map for one spot and one activity, built
 * for reading at a glance rather than for the HUD. It has its own look (forecast.css: light and dark mode,
 * not the map themes, per Joseph) and its own link, `#forecast/<spot>/<activity>`, so it can be bookmarked.
 * It is the app's main page (PLAN 7.65): the bare address opens it, and the map is a page under it at `#map`;
 * the phone's back button moves between the two.
 *
 * Top to bottom: the activity switch, the spots (each tinted with its rating now), the hero (a picture drawn
 * from the reading beside the one number that matters, its rating and why), then the next 7 days as bubbles
 * (WATCH's best window per day at this spot, the best day ringed). Tapping a day moves the hero to its window.
 * Every number comes from src/forecast/model.ts, which reads the scores the map already uses.
 */
import { t, type Key } from '../i18n';
import { localDayStart } from '../physics/astro';
import { REGION, SPOTS, SPOT_RENAMES } from '../region';
import { localClock } from '../tide-chart';
import { compassName } from '../spot-charts';
import type { Spot } from '../metrics/forecast';
import type { Plan, PlanDay } from '../metrics/plan';
import { heroArt } from './art';
import { ratingStrip, rowSvg, rowsFor, skyKind, skyRow, timeAxis, SKY_ICON, type ChartGeom } from './charts';
import { miniIcon, skyIcon, tileIcon, tipBand, type TileKind } from './tiles';
import {
  FC_ACTIVITIES, beaufort, chopFor, dayUvPeaks, dayWeather, daysAt, hourWeather, waterAt, surfSize as surfSizeOf, uvLevel, driftFor, isFcActivity, landing, MAP_HASH, parseRoute, readAt, routeHash, spotsForActivity, chooseSpot, timeline,
  type DayWeather, type FcActivity, type FcDeps, type FcRead, type Level, type TimelineHour,
} from './model';
import './forecast.css';

const H = 3.6e6, DAY = 864e5;
const ACT_KEY = 'ft.fcActivity';
const SPOT_KEY = 'ft.fcSpot';
const SCHEME_KEY = 'ft.fcScheme';

type Store = Pick<Storage, 'getItem' | 'setItem'> | undefined;
const get = (s: Store, k: string) => {
  try {
    return s?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const put = (s: Store, k: string, v: string) => {
  try {
    s?.setItem(k, v);
  } catch {
    /* private mode: lasts until reload */
  }
};

/** "PLAYA COCLES" → "Playa Cocles"; "LIMÓN" → "Limón". */
export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
/** HUD caps to a sentence: "MOVING TIDE" → "Moving tide". */
export const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
const cmp = (deg: number | null | undefined) => (typeof deg === 'number' && Number.isFinite(deg) ? compassName(deg).replace(/W/g, t('hemi.W')) : '');
const n1 = (x: number) => x.toFixed(1);
const n0 = (x: number) => Math.round(x).toString();

const ICONS: Record<FcActivity, string> = {
  fish: '<path d="M3 12c3-4 9-5 13-1l4-3v8l-4-3c-4 4-10 3-13-1z"/><circle cx="8" cy="11" r="1"/>',
  surf: '<path d="M2 17c3 0 4-2 6-2s3 2 6 2 4-2 6-2"/><path d="M4 13c1-5 6-8 11-6-3 1-4 3-3 6"/>',
  snorkel: '<rect x="3" y="8" width="13" height="7" rx="3.5"/><path d="M19 4v10a3 3 0 0 1-3 3h-2"/>',
  dive: '<rect x="9" y="3" width="6" height="15" rx="3"/><path d="M12 18v3M9 7h6"/>',
  sail: '<path d="M12 3v14M12 4l7 12h-7M11 6l-6 10h6"/><path d="M3 19h18l-2 2H5z"/>',
  swim: '<circle cx="16" cy="6" r="2.2"/><path d="M4 12l5-3 3 3 4-2"/><path d="M2 17c2 0 3-1.5 5-1.5S10 17 12 17s3-1.5 5-1.5 3 1.5 5 1.5"/>',
};
const icon = (a: FcActivity) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[a]}</svg>`;

export interface ForecastDeps extends FcDeps {
  storage: Store;
  /** The active language and a switch to the other one (reloads; the hash keeps the page open). */
  lang: () => 'en' | 'es';
  setLang: (l: 'en' | 'es') => void;
  /** Where the map is, for the first spot when none is remembered. */
  center: () => [number, number];
}

/** Headline value as [text, unit] for the hero and the day bubbles. */
export function headline(r: FcRead): { value: string; unit: string } {
  if (r.score === null) return { value: '--', unit: '' };
  switch (r.activity) {
    case 'surf': {
      const [lo, hi] = r.surf!.range;
      return { value: hi < 0.15 ? '0' : lo === hi ? n1(lo) : `${n1(lo)}–${n1(hi)}`, unit: t('unit.m').toLowerCase() };
    }
    case 'fish':
    case 'swim':
      return { value: n0(r.score), unit: '/100' };
    case 'snorkel':
    case 'dive': {
      const v = r.water!.visM;
      return v === null ? { value: '--', unit: '' } : { value: v >= 10 ? n0(v) : n1(v), unit: t('unit.m').toLowerCase() };
    }
    case 'sail': {
      const k = r.sail!.windKt;
      return k === null ? { value: '--', unit: '' } : { value: n0(k), unit: 'kt' };
    }
  }
}

/** The reasons line: what holds the score back (or that nothing does). */
function reasons(r: FcRead): string[] {
  if (r.score === null) return [];
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
  if (r.swim) {
    const w = r.swim;
    const why = w.reasons.length ? w.reasons.slice(0, 3).map((k) => t(`swim.r.${k}` as Key)) : [t('fc.reason.none')];
    // The rip risk itself is on the line above; these are what hold the day back.
    return why;
  }
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

/** One picture tile: what it shows, its value, the picture's input and the tip it opens to. */
export interface TileSpec {
  kind: TileKind;
  k: string;
  v: string;
  val: number | null;
  tip: string | null;
  lv?: Level | null;
  opt?: Parameters<typeof tileIcon>[2];
}

const tipOf = (kind: Parameters<typeof tipBand>[0], v: number | null, vars?: Record<string, string>) => {
  const b = tipBand(kind, v);
  return b === null ? null : t(`tip.${kind}.${b}` as Key, vars);
};

/** The picture tiles under the hero: each activity's own conditions, safety first. */
function stats(r: FcRead, plan: Plan | null, selDay: number): TileSpec[] {
  const dash = '--';
  const win = plan?.days[selDay];
  const winText = win ? t('fc.window', { from: localClock(win.startMs), to: localClock(win.endMs) }) : t('fc.noWindow');
  const hourOf = (ms: number) => new Date(ms + REGION.tzOffsetH * H).getUTCHours();
  const clock = (k: string): TileSpec => ({
    kind: 'clock', k, v: winText, val: null,
    tip: win ? t('tip.clock', { from: localClock(win.startMs) }) : null,
    opt: win ? { from: hourOf(win.startMs), to: hourOf(win.endMs) } : {},
  });
  const uvTile = (uv: number | null): TileSpec => ({
    kind: 'uv', k: t('fc.uv'), v: uv === null ? dash : `${n0(uv)} · ${t(`fc.uvw.${uvLevel(uv)}` as Key)}`, val: uv, tip: tipOf('uv', uv), lv: uv === null ? null : uvLevel(uv),
  });
  const entry = (m: number, rip: 'LOW' | 'MOD' | 'HIGH' | null): TileSpec => ({
    kind: 'breaker', k: t('fc.entry'), v: `${n1(m)} m${rip ? ` · ${t('fc.rip')} ${sentence(t(`dive.rip.${rip}` as Key)).toLowerCase()}` : ''}`, val: m,
    tip: rip === 'HIGH' ? t('tip.rip.HIGH') : tipOf('breaker', m),
  });
  const water = (c: number | null, k = t('fc.water')): TileSpec => ({ kind: 'water', k, v: c === null ? dash : `${n1(c)} °C`, val: c, tip: tipOf('water', c) });
  const current = (kt: number | null): TileSpec => ({
    kind: 'current', k: t('fc.current'), v: kt === null ? dash : `${t(`fc.drift.${driftFor(kt)}` as Key)} · ${n1(kt)} kt`, val: kt, tip: tipOf('current', kt),
  });
  if (r.surf) {
    const s = r.surf;
    return [
      { kind: 'swell', k: t('fc.swell'), v: `${n1(s.hs)} m · ${n0(s.tp)} s · ${cmp(s.dir)}`, val: s.hs, tip: tipOf('swell', s.hs) },
      { kind: 'wind', k: t('fc.wind'), v: s.windKt === null ? dash : `${n0(s.windKt)} kt ${cmp(s.windFromDeg)} · ${t(`fc.wind.${s.windKind}` as Key)}`, val: s.windKt, tip: t(`tip.surfwind.${s.windKind}` as Key) },
      clock(t('fc.bestWindow')),
    ];
  }
  if (r.fish) {
    const f = r.fish;
    return [
      { kind: 'fish', k: t('fc.catch'), v: f.species.map((id) => titleCase(t(`fish.${id}` as Key))).join(' · '), val: null, tip: t('tip.fish') },
      { kind: 'moon', k: t('fc.moon'), v: `${sentence(t(`astro.moon.${f.moonPhase}` as Key))} · ${n0(f.moonIllum * 100)}%`, val: f.moonIllum, tip: tipOf('moon', f.moonIllum), opt: { waxing: f.moonPhase <= 4 } },
      { kind: 'tide', k: t('fc.tide'), v: t(f.tideRising ? 'fc.tide.rising' : 'fc.tide.falling'), val: f.tideLevel, tip: t(f.tideRising ? 'tip.tide.up' : 'tip.tide.down'), opt: { rising: f.tideRising } },
    ];
  }
  if (r.water && r.activity === 'snorkel') {
    // Snorkelling happens at the surface over a shallow reef: getting in, chop, drift, how much water, sun, stingers.
    const w = r.water;
    return [
      entry(w.breakerM, w.rip),
      { kind: 'chop', k: t('fc.chop'), v: w.windKt === null ? dash : `${t(`fc.chop.${chopFor(w.windKt)}` as Key)} · ${n0(w.windKt)} kt`, val: w.windKt, tip: tipOf('chop', w.windKt) },
      current(w.currentKt),
      { kind: 'reef', k: t('fc.overReef'), v: w.waterM === null ? dash : `${n1(w.waterM)} m`, val: w.waterM, tip: tipOf('reef', w.waterM) },
      uvTile(w.uv),
      { kind: 'stingers', k: t('fc.stingers'), v: w.stingers === null ? dash : sentence(t(w.stingers ? 'snk.stingers.maybe' : 'snk.stingers.low')), val: w.stingers === null ? null : w.stingers ? 1 : 0, tip: w.stingers === null ? null : tipOf('stingers', w.stingers ? 1 : 0) },
    ];
  }
  if (r.water) {
    // Diving is about the bottom: surge at depth, drift, temperature for the suit.
    const w = r.water;
    return [
      { kind: 'surge', k: t('fc.surge', { d: w.depthM }), v: `${t(`fc.surge.${w.surge}` as Key)} · ${w.surgeMs.toFixed(2)} m/s`, val: w.surgeMs, tip: t(`tip.surge.${w.surge}` as Key) },
      current(w.currentKt),
      water(w.sstC, t('fc.sst')),
      // A shore dive starts by swimming out through the break; the week's best time is in its own callout above.
      entry(w.breakerM, w.rip),
    ];
  }
  if (r.swim) {
    // A beach day: safety in the water first, then the sun, the heat and the water.
    const w = r.swim;
    const ripLv = { LOW: 3, MOD: 2, HIGH: 0 } as const;
    return [
      { kind: 'rip', k: t('fc.ripRisk'), v: t(`fc.ripw.${w.rip}` as Key), val: w.ripScore, tip: t(`tip.rip.${w.rip}` as Key), lv: ripLv[w.rip] },
      { kind: 'breaker', k: t('fc.shorebreak'), v: `${n1(w.breakerM)} m · ${t(`fc.size.${surfSizeOf(w.breakerM)}` as Key).toLowerCase()}`, val: w.breakerM, tip: tipOf('breaker', w.breakerM) },
      uvTile(w.uv),
      { kind: 'feels', k: t('fc.feels'), v: w.feelsC === null ? dash : `${n0(w.feelsC)} °C${w.airC === null ? '' : ` · ${t('fc.airIs', { c: n0(w.airC) })}`}`, val: w.feelsC, tip: tipOf('feels', w.feelsC) },
      water(w.sstC),
      { kind: 'wind', k: t('fc.wind'), v: w.windKt === null ? dash : `${n0(w.windKt)} kt`, val: w.windKt, tip: tipOf('wind', w.windKt) },
    ];
  }
  if (r.sail) {
    const s = r.sail;
    return [
      { kind: 'gust', k: t('fc.gust'), v: s.gustKt === null ? dash : `${n0(s.gustKt)} kt`, val: s.gustKt, tip: tipOf('gust', s.gustKt) },
      { kind: 'boat', k: t('fc.comfort'), v: r.score === null ? dash : `${n0(r.score)}/100`, val: r.score, tip: tipOf('boat', r.score) },
      { kind: 'swell', k: t('fc.swell'), v: s.swellM === null ? dash : `${n1(s.swellM)} m`, val: s.swellM, tip: tipOf('swell', s.swellM) },
    ];
  }
  return [];
}

const SKY_WORD: Record<NonNullable<DayWeather['sky']>, Key> = {
  sun: 'fc.sky.sun', partly: 'fc.sky.partly', cloud: 'fc.sky.cloud', showers: 'fc.sky.showers', rain: 'fc.sky.rain', storm: 'fc.sky.storm',
};
/** The weather tip: when the rain comes, or what the sun asks for. */
function weatherTip(w: DayWeather): string | null {
  const at = (ms: number | null) => (ms === null ? '' : localClock(ms));
  let tip: string | null = null;
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
/** The weather tile: the day's sky as a picture, high and low, real feel, then rain, humidity, water, UV and wind. */
function weatherTile(w: DayWeather, sstC: number | null, dayName: string, open: boolean, id: string): string {
  const dash = '--';
  const deg = (c: number | null) => (c === null ? dash : `${n0(c)}°`);
  const facts = [
    ['rain', t('fc.rainChance'), w.rainPct === null ? dash : `${n0(w.rainPct)}%${w.rainMm === null ? '' : ` · ${n1(w.rainMm)} mm`}`],
    ['humid', t('fc.humidity'), w.humidityPct === null ? dash : `${n0(w.humidityPct)}%`],
    ['water', t('fc.water'), sstC === null ? dash : `${n1(sstC)} °C`],
    ['uv', t('fc.uvPeakShort'), w.uvMax === null ? dash : `${n0(w.uvMax)} · ${t(`fc.uvw.${uvLevel(w.uvMax)}` as Key)}`],
    ['wind', t('fc.windPeak'), w.windKt === null ? dash : `${n0(w.windKt)} kt${w.gustKt === null ? '' : ` · ${t('fc.gust').toLowerCase()} ${n0(w.gustKt)}`}`],
  ] as const;
  const tip = weatherTip(w);
  return `<div class="fc-tile fc-wx fc-wx-${w.sky ?? 'none'}" role="button" tabindex="0" data-tile="${id}" aria-expanded="${open}"${tip ? '' : ' data-notip=""'}>
    <span class="fc-wx-ico">${skyIcon(w.sky)}</span>
    <span class="fc-wx-main">
      <span class="fc-tile-k">${t('fc.weather')} · ${dayName}</span>
      <span class="fc-wx-word">${w.sky ? t(SKY_WORD[w.sky]) : t('fc.nodata')}</span>
      <span class="fc-wx-temp"><b>${deg(w.hiC)}</b><span>${deg(w.loC)}</span></span>
      <span class="fc-wx-feels">${miniIcon('feels')}${t('fc.feels')} ${deg(w.feelsMaxC)}</span>
    </span>
    <ul class="fc-wx-facts">${facts.map(([ic, k, v]) => `<li>${miniIcon(ic)}<span>${k}</span><b>${v}</b></li>`).join('')}</ul>
    ${tip ? `<span class="fc-tile-tip"><span>${tip}</span></span>` : ''}</div>`;
}

/** Animate a number in `el` from what it shows to `to` (ranges "a–b" animate both ends). Instant under reduced motion. */
function countUp(el: HTMLElement, to: string) {
  const from = el.dataset.v ?? '';
  el.dataset.v = to;
  const nums = (s: string) => s.split('–').map(Number);
  const a = nums(from), b = nums(to);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || a.length !== b.length || [...a, ...b].some((x) => !Number.isFinite(x))) {
    el.textContent = to;
    return;
  }
  const dec = to.includes('.') ? 1 : 0;
  const t0 = performance.now(), dur = 550;
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - (1 - k) ** 3;
    el.textContent = k >= 1 ? to : a.map((x, i) => (x + (b[i] - x) * e).toFixed(dec)).join('–');
    if (k < 1 && el.dataset.v === to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const bar = (level: Level | null) =>
  `<span class="fc-bar" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i class="${level !== null && i <= level ? `on l${level}` : ''}" style="--i:${i}"></i>`).join('')}</span>`;

export function mountForecastPage(deps: ForecastDeps) {
  const { storage } = deps;
  const el = document.createElement('div');
  el.className = 'fc';
  el.id = 'forecast';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'fc-name');
  el.innerHTML = `
    <div class="fc-wrap">
      <header class="fc-head">
        <button type="button" class="fc-back" id="fc-back" title="${t('fc.backTitle')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>${t('fc.back')}</span></button>
        <div class="fc-titles"><h1 id="fc-name">--</h1><p id="fc-sub">--</p><p class="fc-swap" id="fc-swap" hidden></p></div>
        <div class="fc-tools">
          <button type="button" class="fc-tool" id="fc-lang" title="${t('fc.lang')}">${deps.lang() === 'es' ? 'EN' : 'ES'}</button>
          <button type="button" class="fc-tool" id="fc-scheme" aria-label="${t('fc.scheme')}" title="${t('fc.scheme')}"></button>
        </div>
      </header>
      <nav class="fc-acts" role="tablist" aria-label="${t('fc.actGroup')}">
        ${FC_ACTIVITIES.map((a) => `<button type="button" role="tab" class="fc-act" data-act="${a}">${icon(a)}<span>${t(`fc.act.${a}` as Key)}</span></button>`).join('')}
        <span class="fc-act-ink" aria-hidden="true"></span>
      </nav>
      <div class="fc-spots" id="fc-spots" role="listbox" aria-label="${t('fc.spots')}"></div>
      <section class="fc-hero" id="fc-hero" aria-live="polite">
        <div class="fc-art-box"><div class="fc-art-in" id="fc-art"></div>
          <div class="fc-compass" id="fc-compass" hidden aria-hidden="true">
            <svg viewBox="-40 -40 80 80"><circle class="fc-cp-ring" r="34"/>
              <path class="fc-cp-shore" d="M-30.5,-15 A34,34 0 0 1 30.5,-15"/>
              <path class="fc-cp-ticks" d="M0,-34v6M34,0h-5M0,34v-5M-34,0h5"/><text class="fc-cp-n" y="-18" text-anchor="middle">N</text>
              <g class="fc-cp-swell"><path d="M0,-24 L7,-6 L2.5,-8 L2.5,22 L-2.5,22 L-2.5,-8 L-7,-6 Z"/></g>
              <g class="fc-cp-wind"><path d="M0,-28 L4.5,-17 L1.2,-18.5 L1.2,16 L-1.2,16 L-1.2,-18.5 L-4.5,-17 Z"/></g>
              <circle class="fc-cp-hub" r="3"/></svg>
            <ul class="fc-cp-key"><li class="fc-cp-k-swell" id="fc-cp-swell"></li><li class="fc-cp-k-wind" id="fc-cp-wind"></li></ul>
          </div>
        </div>
        <div class="fc-hero-data">
          <div class="fc-k" id="fc-k">--</div>
          <div class="fc-big"><span class="fc-num" id="fc-num">--</span><span class="fc-unit" id="fc-unit"></span></div>
          <div class="fc-size" id="fc-size"></div>
          <div class="fc-rate" id="fc-rate"></div>
          <button type="button" class="fc-best-time" id="fc-best-time" hidden></button>
          <ul class="fc-why" id="fc-why"></ul>
        </div>
      </section>
      <section class="fc-card fc-cond-card">
        <div class="fc-card-head"><h2>${t('fc.conditions')}</h2><span class="fc-cond-when" id="fc-cond-when"></span></div>
        <div class="fc-tiles" id="fc-tiles"></div>
      </section>
      <section class="fc-card fc-days-card">
        <div class="fc-card-head"><h2>${t('fc.days')}</h2><button type="button" class="fc-now" id="fc-now" hidden>${t('fc.now')}</button></div>
        <div class="fc-days" id="fc-days"></div>
      </section>
      <section class="fc-card fc-hours-card">
        <div class="fc-card-head"><h2>${t('fc.hours')}</h2></div>
        <ul class="fc-readout" id="fc-readout" aria-live="polite"></ul>
        <div class="fc-tl" id="fc-tl"><div class="fc-tl-in" id="fc-tl-in"></div><div class="fc-nowline" id="fc-nowline" hidden><span>${t('fc.now')}</span></div><div class="fc-cursor" id="fc-cursor" hidden></div></div>
        <p class="fc-tl-hint">${t('fc.hoursHint')}</p>
      </section>
      <p class="fc-note">${t('fc.note')}</p>
    </div>`;
  document.body.appendChild(el);
  const $ = (id: string) => el.querySelector<HTMLElement>('#' + id)!;
  /** Replace a block's markup only when it changed, so the periodic redraw does not replay its animations. */
  const html = (id: string, markup: string) => {
    const e = $(id);
    if (e.dataset.html === markup) return false;
    e.innerHTML = markup;
    e.dataset.html = markup;
    return true;
  };
  /** Restart a one-shot CSS animation class on an element. */
  const replay = (e: Element, cls: string) => {
    e.classList.remove(cls);
    void (e as HTMLElement).offsetWidth;
    e.classList.add(cls);
  };
  const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // --- light / dark: the OS setting until the user picks one here
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const scheme = () => (get(storage, SCHEME_KEY) as 'light' | 'dark' | null) ?? (media?.matches ? 'dark' : 'light');
  const applyScheme = () => {
    const s = scheme();
    el.dataset.scheme = s;
    $('fc-scheme').innerHTML =
      s === 'dark'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
    $('fc-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (!el.hidden) themeMeta();
  };
  media?.addEventListener?.('change', applyScheme);
  $('fc-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  $('fc-lang').addEventListener('click', () => deps.setLang(deps.lang() === 'es' ? 'en' : 'es'));

  // The browser bar follows the page while it is open, the map's theme otherwise.
  const meta = document.querySelector('meta[name="theme-color"]');
  const mapMeta = meta?.getAttribute('content') ?? null;
  const themeMeta = () => meta?.setAttribute('content', getComputedStyle(el).getPropertyValue('--fc-bg').trim() || '#ffffff');

  // --- state
  let act: FcActivity = (() => {
    const v = get(storage, ACT_KEY);
    return isFcActivity(v) ? v : 'surf';
  })();
  // A spot saved under an old name (SPOT_RENAMES) opens under its new one.
  let spotName: string = ((n) => SPOT_RENAMES[n] ?? n)(get(storage, SPOT_KEY) ?? '');
  /** The hour the hero shows; null = now. */
  let sel: number | null = null;
  let plan: Plan | null = null;
  let planKey = '';
  /** We pushed the history entry, so closing can step back instead of adding one. */
  let pushed = false;
  let shownSpot = '';
  let tl: TimelineHour[] = [];
  let tlKey = '';
  let geom: ChartGeom = { px: 6, tzOffsetH: REGION.tzOffsetH };
  /** The spot and activity the timeline was last scrolled to "now" for. */
  let scrolledFor = '';
  let openedAt = 0;
  let artFor = '';
  /** What the hero shows, for the tiles under it; and which tiles are open (kept across redraws). */
  let heroRead: FcRead | null = null;
  let heroDay = 0;
  const openTiles = new Set<string>();

  const spots = () => spotsForActivity(act, SPOTS);
  /** The spot shown, and the one asked for when it has no forecast for this activity (`chooseSpot`). */
  const spot = (): Spot => chooseSpot(spotName, act, SPOTS).spot;
  const swapped = () => chooseSpot(spotName, act, SPOTS).asked;
  const nowHour = () => Math.floor(Date.now() / H) * H;
  const when = () => sel ?? nowHour();

  const dayLabel = (dayMs: number, d: number) => {
    if (d === 0) return t('fc.today');
    if (d === 1) return t('fc.tomorrow');
    const x = new Date(dayMs + 12 * H + REGION.tzOffsetH * H);
    return `${sentence(t(`day.${x.getUTCDay()}` as Key))} ${x.getUTCDate()}`;
  };

  const renderActs = () => {
    let on: HTMLElement | null = null;
    el.querySelectorAll<HTMLElement>('.fc-act').forEach((b) => {
      const yes = b.dataset.act === act;
      b.classList.toggle('on', yes);
      b.setAttribute('aria-selected', String(yes));
      if (yes) on = b;
    });
    // The sliding highlight under the active activity.
    const ink = el.querySelector<HTMLElement>('.fc-act-ink')!;
    const b = on as HTMLElement | null;
    if (b) {
      ink.style.width = `${b.offsetWidth}px`;
      ink.style.transform = `translateX(${b.offsetLeft}px)`;
    }
  };

  /** Each spot's next 12 hours as levels, for the mini forecast cards; kept for the hour, rebuilt while empty. */
  const strips = new Map<string, (Level | null)[]>();
  const stripOf = (sp: Spot, now: number) => {
    const k = `${act}|${now}|${sp.name}`;
    let v = strips.get(k);
    if (!v || v.every((x) => x === null)) {
      if (strips.size > 120) strips.clear();
      v = Array.from({ length: 12 }, (_, i) => readAt(deps, act, sp, now + i * H).level);
      strips.set(k, v);
    }
    return v;
  };
  const levelWord = (r: FcRead) => (r.level === null ? t('fc.nodata') : r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key));

  /** A spot card's weather now: the sky, the air and the chance of rain. */
  const spotWx = (s: Spot, ms: number) => {
    const w = hourWeather(deps.env, s, ms);
    const k = skyKind(w);
    if (!k && w.airC === null) return '';
    return `<span class="fc-spot-wx">${k ? `<svg class="fc-spot-sky fc-i fc-i-${k}" viewBox="-9 -9 18 19" aria-hidden="true">${SKY_ICON[k]}</svg>` : ''}${w.airC === null ? '' : `<b>${n0(w.airC)}°</b>`}${w.rainPct === null ? '' : `<span class="fc-spot-rain">${miniIcon('rain')}${n0(w.rainPct)}%</span>`}</span>`;
  };
  /** The spots as mini forecasts: name, the headline now, its rating, and the next 12 hours as a strip. Thumb-scroll, tap to switch. */
  const renderSpots = () => {
    const now = nowHour();
    const cur = spot().name;
    html('fc-spots', spots()
      .map((s) => {
        const r = readAt(deps, act, s, now);
        const hl = headline(r);
        const strip = stripOf(s, now).map((l) => `<i class="${l === null ? 'l-none' : `l${l}`}"></i>`).join('');
        return `<button type="button" role="option" class="fc-spot ${r.level === null ? 'l-none' : `l${r.level}`}${s.name === cur ? ' on' : ''}" data-spot="${s.name}" aria-selected="${s.name === cur}">
          <span class="fc-spot-name">${titleCase(s.name)}</span>
          <span class="fc-spot-big"><b>${hl.value}</b><small>${hl.unit}</small></span>
          <span class="fc-spot-word">${levelWord(r)}</span>
          ${spotWx(s, now)}
          <span class="fc-spot-strip" aria-hidden="true">${strip}</span>
          <span class="fc-spot-cap" aria-hidden="true"><span>${t('fc.now')}</span><span>${t('fc.plus12')}</span></span>
          <span class="fc-spot-ico" aria-hidden="true">${icon(act)}</span></button>`;
      })
      .join(''));
    if (cur !== shownSpot) (shownSpot = cur), $('fc-spots').querySelector<HTMLElement>('.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  /** Turn a compass needle the short way round, so 350° → 10° swings 20°, not 340°. */
  const turn = (sel: string, deg: number | null) => {
    const g = $('fc-compass').querySelector<SVGElement>(sel)!;
    if (deg === null || !Number.isFinite(deg)) return void g.classList.add('off');
    const prev = Number(g.dataset.r);
    const next = Number.isFinite(prev) ? prev + ((((deg - prev) % 360) + 540) % 360) - 180 : deg;
    g.dataset.r = String(next);
    g.classList.remove('off');
    g.style.transform = `rotate(${next}deg)`;
  };
  /** SURF: swell and wind on a dial with the beach's land side; SAIL: the wind. Arrows point where they travel. */
  const renderCompass = (r: FcRead) => {
    const c = r.surf ? { swell: r.surf.dir, wind: r.surf.windFromDeg, shore: r.surf.facing } : r.sail ? { swell: null, wind: r.sail.fromDeg, shore: null } : null;
    $('fc-compass').hidden = !c || r.score === null;
    if (!c) return;
    turn('.fc-cp-swell', c.swell === null ? null : c.swell + 180);
    turn('.fc-cp-wind', c.wind === null ? null : c.wind + 180);
    turn('.fc-cp-shore', c.shore === null ? null : c.shore + 180);
    $('fc-cp-swell').textContent = c.swell === null ? '' : `${t('fc.swell')} ${cmp(c.swell)}`;
    $('fc-cp-wind').textContent = c.wind === null ? '' : `${t('fc.wind')} ${cmp(c.wind)}`;
  };
  /** The week's best window as one tappable line, hidden while the hero already shows it. */
  const renderBestTime = (sp: Spot) => {
    const b = $('fc-best-time') as HTMLButtonElement;
    const p = plan;
    if (!p || p.none === 'nodata' || p.none === 'nospot') return void (b.hidden = true);
    // No window good enough to call it a best day: still point at the least bad one, as "best chance".
    const chance = p.days.reduce<PlanDay | null>((acc, x) => (x && x.value !== null && (!acc || x.value > acc.value!) ? x : acc), null);
    const d = p.bestDay === null ? chance : p.days[p.bestDay];
    const k = t(p.bestDay === null ? 'fc.bestChance' : 'fc.bestTime');
    if (!d) {
      b.hidden = false;
      b.disabled = true;
      b.className = 'fc-best-time none';
      html('fc-best-time', `<span class="fc-bt-k">${t('fc.bestTime')}</span><b>${t('fc.noGood')}</b>`);
      return;
    }
    const ms = when();
    b.hidden = sel !== null && ms >= d.startMs && ms < d.endMs;
    b.disabled = false;
    b.dataset.ms = String(d.startMs);
    const r = readAt(deps, act, sp, d.startMs);
    const hl = headline(r);
    b.className = `fc-best-time${r.level === null ? '' : ` l${r.level}`}${p.bestDay === null ? ' chance' : ''}`;
    html('fc-best-time', `<span class="fc-bt-k">${k}</span><b>${dayLabel(d.dayMs, d.day)} · ${t('fc.window', { from: localClock(d.startMs), to: localClock(d.endMs) })}</b><span class="fc-bt-v">${hl.value}${hl.unit ? ` ${hl.unit}` : ''}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`);
  };

  const renderHero = () => {
    const sp = spot();
    const ms = when();
    const r = readAt(deps, act, sp, ms);
    $('fc-name').textContent = titleCase(sp.name);
    const asked = swapped();
    $('fc-swap').hidden = !asked;
    $('fc-swap').textContent = asked ? t('fc.swapped', { asked: titleCase(asked), act: t(`fc.act.${act}` as Key).toLowerCase(), shown: titleCase(sp.name) }) : '';
    const d = new Date(ms + REGION.tzOffsetH * H);
    const day = sel === null ? t('fc.now') : `${sentence(t(`day.${d.getUTCDay()}` as Key))} ${d.getUTCDate()}`;
    $('fc-sub').textContent = `${sentence(t('fc.sub', { act: t(`fc.act.${act}` as Key).toLowerCase() }))} · ${t('fc.at', { day, time: localClock(ms) })}`;
    const hl = headline(r);
    $('fc-k').textContent = t(`fc.metric.${act}` as Key);
    countUp($('fc-num'), hl.value);
    $('fc-unit').textContent = hl.unit;
    const dayIdx = plan ? Math.max(0, Math.min(plan.days.length - 1, Math.floor((localDayStart(ms, REGION.tzOffsetH) - plan.startMs) / DAY))) : 0;
    const win = plan?.days[dayIdx];
    $('fc-size').textContent = r.swim ? `${t('fc.ripRisk')} ${t(`fc.ripw.${r.swim.rip}` as Key).toLowerCase()} · ${t('fc.shorebreak').toLowerCase()} ${n1(r.swim.breakerM)} m` : r.fish ? (win ? `${t('fc.bestWindow')} ${t('fc.window', { from: localClock(win.startMs), to: localClock(win.endMs) })}` : '') : r.surf ? t(`fc.size.${r.surf.size}` as Key) : r.water && act === 'snorkel' ? `${t('fc.entry')} ${n1(r.water.breakerM)} m${r.water.windKt === null ? '' : ` · ${t(`fc.chop.${chopFor(r.water.windKt)}` as Key).toLowerCase()}`}` : r.water ? `${t('fc.depthAt', { d: r.water.depthM })}${r.water.currentKt === null ? '' : ` · ${t('fc.current').toLowerCase()} ${t(`fc.drift.${driftFor(r.water.currentKt)}` as Key).toLowerCase()}`}` : r.sail && r.sail.windKt !== null ? `${t(`fc.bft.${beaufort(r.sail.windKt)}` as Key)} · ${t('fc.force', { n: beaufort(r.sail.windKt) })}` : '';
    html('fc-rate', r.level === null
      ? `<span class="fc-word">${t('fc.nodata')}</span>`
      : `<span class="fc-word l${r.level}">${r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key)}</span>${bar(r.level)}${r.surf ? `<span class="fc-of">${n1(r.score!)}/10</span>` : ''}`);
    html('fc-why', reasons(r).map((x) => `<li>${x}</li>`).join(''));
    heroRead = r;
    heroDay = dayIdx;
    const artLabel =
      act === 'surf' ? t('fc.art.surf', { m: r.surf ? n1(r.surf.hb) : '--' })
      : act === 'fish' ? t('fc.art.fish')
      : act === 'swim' ? t('fc.art.swim', { flag: r.swim ? t(`fc.flag.${r.swim.rip}` as Key) : '--' })
      : act === 'sail' ? t('fc.art.sail', { kt: r.sail?.windKt === null || !r.sail ? '--' : n0(r.sail.windKt) })
      : t('fc.art.water', { m: r.water?.visM ? n1(r.water.visM) : '--' });
    const artKey = `${act}|${sp.name}`;
    // A new hour at the same spot cross-fades the picture; a new spot or activity has its own entrance.
    if (html('fc-art', heroArt(r, artLabel, { knee: t('fc.g.knee'), waist: t('fc.g.waist'), head: t('fc.g.head') })) && artFor === artKey) replay($('fc-art'), 'fc-fade');
    artFor = artKey;
    renderCompass(r);
    renderBestTime(sp);
    $('fc-hero').dataset.level = r.level === null ? '' : String(r.level);
    // Shimmer placeholders while the feeds load (first 20 s); after that a plain "no data".
    el.classList.toggle('fc-loading', r.level === null && Date.now() - openedAt < 20_000);
    $('fc-now').hidden = sel === null;
  };

  const renderDays = () => {
    const sp = spot();
    const key = `${act}|${sp.name}|${nowHour()}`;
    if (key !== planKey || plan?.none === 'nodata') {
      plan = daysAt(deps, act, sp, Date.now(), 7);
      // The bubbles rise in one after another when the spot or activity changes, not on every redraw.
      if (planKey.split('|').slice(0, 2).join('|') !== key.split('|').slice(0, 2).join('|')) {
        $('fc-days').classList.add('in');
        window.setTimeout(() => $('fc-days').classList.remove('in'), 900);
      }
      planKey = key;
    }
    const p = plan!;
    const uvs = dayUvPeaks(deps.env, sp, p.startMs, p.days.length);
    const selDay = Math.floor((localDayStart(when(), REGION.tzOffsetH) - p.startMs) / DAY);
    html('fc-days', p.days
      .map((d, i) => {
        const dayMs = p.startMs + i * DAY;
        const r = d ? readAt(deps, act, sp, d.startMs) : null;
        const hl = r ? headline(r) : { value: '--', unit: '' };
        const lvl = r?.level ?? null;
        const best = p.bestDay === i;
        return `<button type="button" class="fc-day${best ? ' best' : ''}${i === selDay && sel !== null ? ' on' : ''}" data-day="${i}" style="--i:${i}">
          <span class="fc-day-name">${dayLabel(dayMs, i)}</span>
          <span class="fc-bubble ${lvl === null ? 'l-none' : `l${lvl}`}"><b>${hl.value}</b><small>${hl.unit}</small></span>
          <span class="fc-day-win">${d ? `${localClock(d.startMs)}` : '—'}</span>
          ${uvs[i] === null ? '' : `<span class="fc-day-uv l${uvLevel(uvs[i]!)}" title="${t('fc.uvPeak')}: ${t(`fc.uvw.${uvLevel(uvs[i]!)}` as Key)}">UV ${n0(uvs[i]!)}</span>`}
          ${best ? `<span class="fc-best">${t('fc.bestDay')}</span>` : ''}</button>`;
      })
      .join(''));
  };

  /** The hour-by-hour charts: built when the spot, activity, hour or width changes, or while data is missing. */
  const renderTimeline = () => {
    const sp = spot();
    const width = $('fc-tl').clientWidth || 340;
    const px = Math.max(6, Math.floor((width / (7 * 24)) * 10) / 10);
    const key = `${act}|${sp.name}|${nowHour()}|${px}`;
    // Feeds arrive one by one after start-up: rebuild while any row is still empty.
    const missing = tlPartial();
    if (key !== tlKey || missing) {
      const start = plan?.startMs ?? localDayStart(Date.now(), REGION.tzOffsetH);
      tl = timeline(deps, act, sp, start);
      tlKey = key;
      geom = { px, tzOffsetH: REGION.tzOffsetH };
      const wins = (plan?.days ?? []).flatMap((d) => (d ? [{ startMs: d.startMs, endMs: d.endMs }] : []));
      const rows = rowsFor(act)
        .map((r, i, all) => `${r.wx && !all[i - 1]?.wx ? `<div class="fc-row fc-row-group"><div class="fc-row-k">${t('fc.row.wxgroup')}</div></div>` : ''}<div class="fc-row"><div class="fc-row-k">${t(`fc.row.${r.id}` as Key)} <span>${t(`fc.unit.${r.id}` as Key)}</span>${tl.some((h) => r.value(h) !== null) ? '' : ` <em>${t('fc.noRow')}</em>`}</div>${rowSvg(r, tl, geom, wins)}</div>`)
        .join('');
      html('fc-tl-in', `${timeAxis(tl, geom, (ms, i) => dayLabel(ms, i))}<div class="fc-row fc-row-sky">${skyRow(tl, geom)}</div><div class="fc-row fc-row-rating"><div class="fc-row-k">${t('fc.row.rating')}</div>${ratingStrip(tl, geom)}</div>${rows}`);
    }
    const ni = tlIndex(nowHour());
    const nl = $('fc-nowline');
    // While the hero shows now, the cursor is the now line; the dashed marker appears once another hour is picked.
    nl.hidden = sel === null || ni < 0 || ni >= tl.length;
    nl.style.transform = `translateX(${(ni + 0.5) * geom.px}px)`;
    // Open (or switch) with the present in view, not last midnight.
    const sk = `${act}|${sp.name}`;
    if (sk !== scrolledFor && ni >= 0) {
      scrolledFor = sk;
      // From midnight while now still sits in the first part of the view (the day's name stays readable), else just before now.
      const tlw = $('fc-tl').clientWidth || 340;
      $('fc-tl').scrollLeft = ni * geom.px < tlw * 0.6 ? 0 : Math.max(0, ni * geom.px - 48);
    }
    placeCursor(when());
  };
  const tlPartial = () =>
    !tl.length || tl.every((h) => h.read.level === null) || tl.every((h) => h.windKt === null) || tl.every((h) => h.rainMmH === null && h.cloudPct === null);
  const tlIndex = (ms: number) => (tl.length ? Math.round((ms - tl[0].ms) / H) : -1);
  /** Move the cursor line and the readout to an hour (no rebuild: cheap enough for a mouse move). */
  const placeCursor = (ms: number) => {
    const i = tlIndex(ms);
    const c = $('fc-cursor');
    if (i < 0 || i >= tl.length) return void (c.hidden = true);
    c.hidden = false;
    c.classList.toggle('is-now', ms === nowHour());
    $('fc-nowline').hidden = sel === null || tlIndex(nowHour()) < 0;
    c.style.transform = `translateX(${(i + 0.5) * geom.px}px)`;
    const h = tl[i];
    const d = new Date(h.ms + REGION.tzOffsetH * H);
    const r = h.read;
    const hl = headline(r);
    const items = [
      `<li class="fc-ro-when">${sentence(t(`day.${d.getUTCDay()}` as Key))} ${d.getUTCDate()} · ${localClock(h.ms)}</li>`,
      `<li><span class="fc-dot ${r.level === null ? '' : `l${r.level}`}"></span>${t(`fc.metric.${act}` as Key)} <b>${hl.value}${hl.unit ? ` ${hl.unit}` : ''}</b>${r.level === null ? '' : ` · ${r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key)}`}</li>`,
      h.windKt === null || act === 'sail' ? '' : `<li>${t('fc.wind')} <b>${n0(h.windKt)} kt ${cmp(h.windFromDeg)}</b>${h.gustKt === null ? '' : ` · ${t('fc.gust').toLowerCase()} ${n0(h.gustKt)}`}</li>`,
      `<li>${t('fc.tide')} <b>${h.tideM.toFixed(2)} m</b></li>`,
      h.rainMmH !== null && h.rainMmH >= 0.1 ? `<li>${t('fc.row.rain')} <b>${n1(h.rainMmH)} mm/h</b></li>` : '',
      h.airC === null ? '' : `<li>${t('fc.air')} <b>${n0(h.airC)} °C</b>${h.feelsC === null ? '' : ` · ${t('fc.feels').toLowerCase()} ${n0(h.feelsC)}`}</li>`,
      h.rainPct === null ? '' : `<li>${t('fc.row.rainpct')} <b>${n0(h.rainPct)}%</b></li>`,
      h.humidityPct === null ? '' : `<li>${t('fc.humidity')} <b>${n0(h.humidityPct)}%</b></li>`,
      h.uv === null || h.uv < 0.5 ? '' : `<li><span class="fc-dot l${uvLevel(h.uv)}"></span>UV <b>${n0(h.uv)}</b> · ${t(`fc.uvw.${uvLevel(h.uv)}` as Key)}</li>`,
    ];
    html('fc-readout', items.join(''));
  };

  /** The weather tile (the selected day at this spot, a traditional forecast) and the activity's picture tiles. */
  const renderConditions = () => {
    const r = heroRead;
    if (!r) return;
    const sp = spot();
    const ms = when();
    const d0 = localDayStart(ms, REGION.tzOffsetH);
    const i0 = tlIndex(d0);
    const dayHours = i0 >= 0 ? tl.slice(i0, i0 + 24) : [];
    const wx = dayWeather(dayHours);
    const sst = waterAt(deps.env, sp, d0);
    const d = new Date(ms + REGION.tzOffsetH * H);
    const today = d0 === localDayStart(Date.now(), REGION.tzOffsetH);
    const dayName = today ? t('fc.today') : `${sentence(t(`day.${d.getUTCDay()}` as Key))} ${d.getUTCDate()}`;
    $('fc-cond-when').textContent = `${dayName} · ${localClock(ms)}`;
    const tiles = stats(r, plan, heroDay);
    const tileHtml = (x: TileSpec, i: number) => {
      const id = `${act}:${x.kind}:${i}`;
      const open = openTiles.has(id);
      return `<div class="fc-tile${x.lv === null || x.lv === undefined ? '' : ` l${x.lv}`}" role="button" tabindex="0" data-tile="${id}" aria-expanded="${open}"${x.tip ? '' : ' data-notip=""'}>
        <span class="fc-tile-ico">${tileIcon(x.kind, x.val, { ...x.opt, lv: x.lv })}</span>
        <span class="fc-tile-k">${x.k}</span>
        <span class="fc-tile-v">${x.v}</span>
        ${x.tip ? `<span class="fc-tile-tip"><span>${x.tip}</span></span>` : ''}</div>`;
    };
    const wid = `${act}:wx`;
    html('fc-tiles', `${weatherTile(wx, sst, dayName, openTiles.has(wid), wid)}${tiles.map(tileHtml).join('')}`);
    $('fc-tiles').dataset.n = String(tiles.length);
  };
  const render = () => {
    if (el.hidden) return;
    renderActs();
    renderDays();
    renderSpots();
    renderHero();
    renderTimeline();
    renderConditions();
  };

  // --- events
  const setAct = (a: FcActivity) => {
    if (a === act) return;
    act = a;
    put(storage, ACT_KEY, act);
    sel = null;
    replay(el, 'fc-switch');
    syncHash();
    render();
  };
  const stepAct = (dir: 1 | -1) => setAct(FC_ACTIVITIES[(FC_ACTIVITIES.indexOf(act) + dir + FC_ACTIVITIES.length) % FC_ACTIVITIES.length]);
  el.querySelector('.fc-acts')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (b) setAct(b.dataset.act as FcActivity);
  });
  // Arrow keys move along the tabs, as in any tab list.
  el.querySelector('.fc-acts')!.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
    e.preventDefault();
    stepAct(k === 'ArrowRight' ? 1 : -1);
    el.querySelector<HTMLElement>(`.fc-act[data-act="${act}"]`)?.focus();
  });
  // A sideways swipe across the hero picture switches activity on a phone.
  let swipe: { x: number; y: number; id: number } | null = null;
  $('fc-hero').addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  $('fc-hero').addEventListener('pointerup', (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 45) stepAct(dx < 0 ? 1 : -1);
  });
  $('fc-hero').addEventListener('pointercancel', () => (swipe = null));
  $('fc-best-time').addEventListener('click', () => {
    const ms = Number($('fc-best-time').dataset.ms);
    if (!Number.isFinite(ms) || !plan) return;
    sel = ms;
    renderDays();
    renderHero();
    const i = tlIndex(ms);
    if (i >= 0) $('fc-tl').scrollTo({ left: Math.max(0, i * geom.px - 48), behavior: reduceMotion() ? 'auto' : 'smooth' });
    placeCursor(ms);
    replay($('fc-hero'), 'fc-flash');
  });
  $('fc-spots').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-spot]');
    if (!b) return;
    spotName = b.dataset.spot!;
    put(storage, SPOT_KEY, spotName);
    syncHash();
    render();
  });
  $('fc-days').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-day]');
    if (!b || !plan) return;
    const i = Number(b.dataset.day);
    const d = plan.days[i];
    const start = d?.startMs ?? plan.startMs + i * DAY + 12 * H;
    sel = i === 0 && !d ? null : start;
    renderDays();
    renderHero();
    $('fc-tl').scrollTo({ left: Math.max(0, i * 24 * geom.px - 24), behavior: reduceMotion() ? 'auto' : 'smooth' });
    placeCursor(when());
  });
  // Timeline: a tap (or click) picks the hour for the hero; a mouse hovering previews it in the readout.
  const hourAt = (e: MouseEvent) => {
    const r = $('fc-tl-in').getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left) / geom.px);
    return i >= 0 && i < tl.length ? tl[i].ms : null;
  };
  // Tiles open on tap or Enter (hover opens them on a mouse); the open set survives redraws.
  const toggleTile = (e: Event) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('[data-tile]');
    if (!tile) return;
    const id = tile.dataset.tile!;
    const open = !openTiles.has(id);
    if (open) openTiles.add(id);
    else openTiles.delete(id);
    tile.setAttribute('aria-expanded', String(open));
    // Keep the cached markup in step, so the next redraw does not undo the toggle.
    delete $('fc-tiles').dataset.html;
  };
  $('fc-tiles').addEventListener('click', toggleTile);
  $('fc-tiles').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTile(e);
    }
  });
  $('fc-tl').addEventListener('click', (e) => {
    const ms = hourAt(e);
    if (ms === null) return;
    sel = ms;
    renderDays();
    renderHero();
    placeCursor(ms);
  });
  $('fc-tl').addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const ms = hourAt(e);
    if (ms !== null) placeCursor(ms);
  });
  $('fc-tl').addEventListener('pointerleave', () => placeCursor(when()));
  $('fc-now').addEventListener('click', () => ((sel = null), renderDays(), renderHero(), placeCursor(when())));
  $('fc-back').addEventListener('click', () => close());
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') (e.stopPropagation(), close());
  });

  // --- routing: #forecast/<spot>/<activity>
  const syncHash = () => {
    const h = routeHash(spot().name, act);
    if (location.hash !== h) history.replaceState(history.state, '', h);
  };
  let timer = 0;
  // The main page: cover the map from the start, so it does not flash up before the first render.
  let booting = landing(location.hash) === 'forecast';
  if (booting) (el.hidden = false), document.body.classList.add('fc-open');
  const show = () => {
    if (!el.hidden && !booting) return;
    booting = false;
    el.hidden = false;
    document.body.classList.add('fc-open');
    openedAt = Date.now();
    scrolledFor = '';
    applyScheme();
    themeMeta();
    render();
    // Feeds load after start-up and age by the hour: redraw while open, every 3 s until the hero has data.
    const tick = () => {
      render();
      const waiting = !$('fc-hero').dataset.level || (tlPartial() && Date.now() - openedAt < 60_000);
      timer = window.setTimeout(tick, waiting ? 3000 : 60_000);
    };
    timer = window.setTimeout(tick, 3000);
  };
  const hide = () => {
    if (el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('fc-open');
    window.clearTimeout(timer);
    // The map's way back reads where the forecast was (PLAN 7.66).
    window.dispatchEvent(new CustomEvent('fc-hide'));
    if (mapMeta !== null) meta?.setAttribute('content', mapMeta);
  };
  const fromHash = () => {
    // The forecast is the main page: the bare address opens it; #map (or an old map link) shows the map.
    if (landing(location.hash) === 'map') return hide();
    const r = parseRoute(location.hash, SPOTS) ?? { spot: null, activity: null };
    if (r.activity) act = r.activity;
    if (r.spot) spotName = r.spot;
    if (el.hidden) show();
    else render();
    syncHash();
  };
  window.addEventListener('hashchange', fromHash);

  /** Open on a spot and activity (defaults: the remembered ones, or the spot nearest the map). */
  const open = (opts: { spot?: string; activity?: FcActivity } = {}) => {
    if (opts.activity) act = opts.activity;
    if (opts.spot) spotName = opts.spot;
    sel = null;
    if (landing(location.hash) === 'map') {
      history.pushState({ fc: 1 }, '', routeHash(spot().name, act));
      pushed = true;
    }
    show();
    syncHash();
  };
  /** Go to the map. Back from the map returns here: to the page that pushed the forecast, or by its own entry. */
  const close = () => {
    if (pushed && history.state?.fc) {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      history.pushState({ map: 1 }, '', location.pathname + location.search + MAP_HASH);
      hide();
    }
  };
  window.addEventListener('resize', () => !el.hidden && (renderActs(), renderTimeline()));

  // After start-up: the deps read feeds and panels main.ts declares further down.
  window.setTimeout(fromHash, 0);
  /** Where the forecast is, for the map's way back to it (PLAN 7.66). */
  const where = () => ({ spot: spot().name, activity: act });
  return { open, close, isOpen: () => !el.hidden, refresh: render, where };
}
