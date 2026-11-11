/**
 * The FORECAST page's markup (PLAN 7.69, Kinetic Plus): pure functions from the views in view.ts to HTML strings,
 * so the page can be rendered and checked without a browser (render.test.ts builds every block from a fixed
 * fixture and compares the numbers in it with the model's). page.ts puts these into the DOM and draws the canvases.
 */
import { t, type Key } from '../i18n';
import type { FcActivity, Level } from './model';
import type { ChartLayout } from './charts';
import type { BestTimeView, DayView, HeroView, ReadoutView, SpotView, TileView } from './view';

/** Escape text for HTML (spot names and translated words are plain text). */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** The level class that sets a block's colour pair (`--c` fill, `--o` ink): l0..l4, or ln without a rating. */
export const lvCls = (l: Level | null | undefined) => (l === null || l === undefined ? 'ln' : `l${l}`);

/** The activity marks: geometric, on a 24 grid, square caps; the `mv` part bobs on the active tab. */
export const ICONS: Record<FcActivity, string> = {
  fish: '<path class="mv" d="M2 12c4-6 11-6 15 0-4 6-11 6-15 0z"/><path d="M17 12l5-4.5v9z"/>',
  surf: '<path class="mv" d="M2 17c4 0 5-10 12-10 3.5 0 6 2.3 6 5-2.2-1.6-6-.6-6 2.6 0 1.4 1 2.4 2.4 2.4"/><path d="M2 21h20"/>',
  swim: '<circle class="mv" cx="17" cy="6" r="2.2"/><path d="M2 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 20c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/>',
  snorkel: '<path class="mv" d="M2 9h13v6.5H10L8.5 13 7 15.5H2z"/><path d="M20 2v13a5 5 0 0 1-5 5h-2"/>',
  dive: '<path class="mv" d="M12 2v13M6.5 10l5.5 5.5 5.5-5.5"/><path d="M2 20h20"/>',
  sail: '<path class="mv" d="M11 2v15M11 3l8 14h-8z"/><path d="M8 7l-5 10h5"/><path d="M2 21c5 1.5 15 1.5 20 0"/>',
};
export const icon = (a: FcActivity) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[a]}</svg>`;
const MAP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>';
const CORAL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-9M12 15l-4-4V7M12 12l4-4V5M8 11l-3-2M16 8l3-1M6 21h12"/></svg>';
const THEME_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg>';
const GO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

/** The page's frame: header, tabs, hero, and the sections the page fills in. */
export function shellHtml(o: { acts: readonly FcActivity[]; lang: 'en' | 'es'; coral: boolean }): string {
  const tab = (a: FcActivity) =>
    `<button type="button" role="tab" class="fc-tab" data-act="${a}" aria-selected="false" tabindex="-1">${icon(a)}<span>${esc(t(`fc.act.${a}` as Key))}</span></button>`;
  return `
  <div class="fc-page">
    <header class="fc-top fc-in">
      <p class="fc-brand fc-mono">${esc(t('fc.brand'))}<span class="fc-hide-s"> · ${esc(t('fc.region'))}</span></p>
      <div class="fc-ctrls">
        <button type="button" class="fc-ctl fc-back" id="fc-back" title="${esc(t('fc.backTitle'))}">${MAP_ICON}<span>${esc(t('fc.back'))}</span></button>
        ${o.coral ? `<button type="button" class="fc-ctl fc-sq" id="fc-coral" aria-label="${esc(t('fc.coral'))}" title="${esc(t('fc.coral'))}">${CORAL_ICON}</button>` : ''}
        <div class="fc-lang" role="group" aria-label="${esc(t('fc.langGroup'))}">
          <button type="button" data-lang="en" aria-pressed="${o.lang === 'en'}">EN</button><button type="button" data-lang="es" aria-pressed="${o.lang === 'es'}">ES</button>
        </div>
        <button type="button" class="fc-ctl fc-sq fc-themeb" id="fc-scheme" aria-label="${esc(t('fc.scheme'))}" title="${esc(t('fc.scheme'))}">${THEME_ICON}</button>
      </div>
      <h1 id="fc-name">--</h1>
      <p class="fc-subline fc-mono" id="fc-sub">--</p>
      <p class="fc-swap" id="fc-swap" hidden></p>
    </header>
    <section class="fc-spotbar fc-in" aria-label="${esc(t('fc.spots'))}">
      <p class="fc-mono fc-spots-cap" id="fc-spots-cap"></p>
      <div class="fc-rail fc-bleed" id="fc-spots" role="listbox" aria-label="${esc(t('fc.spots'))}"></div>
    </section>
    <nav class="fc-tabs fc-in" id="fc-tabs" role="tablist" aria-label="${esc(t('fc.actGroup'))}">${o.acts.map(tab).join('')}<span class="fc-tab-bar" id="fc-tab-bar" aria-hidden="true"></span></nav>
    <section class="fc-hero fc-bleed" id="fc-hero" aria-labelledby="fc-k">
      <canvas id="fc-fx" aria-hidden="true"></canvas>
      <canvas id="fc-ov" aria-hidden="true"></canvas>
      <div class="fc-hero-in fc-in">
        <div class="fc-h-meta fc-mono"><span id="fc-k">--</span><span id="fc-when"></span></div>
        <div class="fc-h-art" id="fc-art" role="img" aria-label=""></div>
        <div class="fc-h-num" id="fc-numbox"><span class="fc-hn" id="fc-hn"><span id="fc-num">--</span><span class="fc-u" id="fc-unit"></span></span></div>
        <p class="fc-h-words" id="fc-words"></p>
        <div class="fc-h-rate" id="fc-rate"></div>
        <ul class="fc-chips fc-mono" id="fc-why"></ul>
        <button type="button" class="fc-best" id="fc-best" hidden></button>
      </div>
    </section>
    <section class="fc-sec fc-in" aria-labelledby="fc-cond-h">
      <div class="fc-sec-head"><h2 id="fc-cond-h">${esc(t('fc.conditions'))}</h2><p class="fc-mono" id="fc-cond-when"></p></div>
      <div class="fc-tiles" id="fc-tiles"></div>
    </section>
    <button type="button" class="fc-live fc-bleed" id="fc-radar">
      <span class="fc-lv-img" id="fc-radar-img" aria-hidden="true"></span>
      <canvas id="fc-radar-cv" aria-hidden="true"></canvas>
      <span class="fc-lv-shade" aria-hidden="true"></span>
      <span class="fc-lv-t"><span class="fc-mono fc-lv-k"><i></i>${esc(t('fc.radar'))}</span><b id="fc-radar-big"></b><span class="fc-lv-s1" id="fc-radar-sub"></span><span class="fc-lv-s2" id="fc-radar-hint"></span></span>
      <span class="fc-lv-go" aria-hidden="true">${GO_ICON}</span>
    </button>
    <section class="fc-sec fc-in" aria-labelledby="fc-days-h">
      <div class="fc-sec-head"><h2 id="fc-days-h">${esc(t('fc.days'))}</h2><p class="fc-mono"><span id="fc-days-cap"></span> <button type="button" class="fc-now" id="fc-now" hidden>${esc(t('fc.now'))}</button></p></div>
      <div class="fc-days" id="fc-days"></div>
      <div class="fc-daybase"></div>
    </section>
    <section class="fc-sec fc-in" aria-labelledby="fc-hx-h">
      <div class="fc-sec-head"><h2 id="fc-hx-h">${esc(t('fc.hours'))}</h2><p class="fc-mono">${esc(t('fc.hoursCap'))}</p></div>
      <div class="fc-hx-read" id="fc-readout" aria-live="polite"></div>
      <div class="fc-hx" id="fc-hx">
        <div class="fc-hx-lab" id="fc-hx-lab" aria-hidden="true"></div>
        <div class="fc-hx-sc" id="fc-tl" tabindex="0" role="img" aria-label="${esc(t('fc.hoursAria'))}"><div class="fc-hx-in" id="fc-tl-in"><canvas id="fc-hx-base"></canvas><canvas id="fc-hx-top"></canvas></div></div>
      </div>
      <p class="fc-hx-hint fc-mono">${esc(t('fc.hoursKey'))}</p>
    </section>
    <footer class="fc-foot fc-in"><p class="fc-note">${esc(t('fc.note'))}</p></footer>
  </div>`;
}

/** The rating line: the word, the score on its scale (where the headline is not already it), ten segments. */
export function rateHtml(h: HeroView): string {
  if (h.level === null) return `<span class="fc-rword">${esc(h.word)}</span>`;
  const segs = Array.from({ length: 10 }, (_, i) => {
    const f = Math.max(0, Math.min(1, h.segs - i));
    return `<i style="--f:${(f * 100).toFixed(0)}%"></i>`;
  }).join('');
  const score = h.score ? h.score.split('/') : null;
  return `<span class="fc-rword">${esc(h.word)}</span>${score ? `<span class="fc-rscore">${esc(score[0])}<small>/${esc(score[1])}</small></span>` : ''}<span class="fc-segs" aria-hidden="true">${segs}</span>`;
}
export const chipsHtml = (h: HeroView) => h.reasons.map((x) => `<li>${esc(x)}</li>`).join('');

/** The best-time callout: what it is, when, and the headline then. */
export function bestHtml(b: BestTimeView): string {
  if (b.kind === 'hidden') return '';
  if (b.kind === 'none') return `<span class="fc-mono">${esc(b.label)}</span><span class="fc-bw">${esc(b.when)}</span>`;
  return `<span class="fc-mono">${esc(b.label)}</span><span class="fc-bw">${esc(b.when)}</span><span class="fc-bv">${esc(b.value)}</span>`;
}

/** The spot cards: name, the headline now, its word, the weather, and the next 12 hours as a level strip. */
export function spotsHtml(list: readonly (SpotView & { id: string })[], cur: string): string {
  return list
    .map((s) => {
      const strip = s.strip.map((l) => `<i class="${lvCls(l)}" style="height:${l === null ? 12 : (l + 1) * 20}%"></i>`).join('');
      const wx = [s.airC, s.rainPct ? `${t('fc.rainChance')} ${s.rainPct}` : null].filter(Boolean).join(' · ');
      return `<button type="button" role="option" class="fc-spot ${lvCls(s.level)}" data-spot="${esc(s.id)}" aria-selected="${s.id === cur}">
        <span class="fc-s-a">
          <span class="fc-sn">${esc(s.name)}</span>
          <span class="fc-sv">${esc(s.value)}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</span>
          <span class="fc-sr fc-mono">${esc(s.word)}</span>
        </span>
        <span class="fc-s-b">
          <span class="fc-swx fc-mono">${esc(wx) || '&nbsp;'}</span>
          <span><span class="fc-strip" aria-hidden="true">${strip}</span><span class="fc-strip-l fc-mono" aria-hidden="true"><span>${esc(t('fc.now'))}</span><span>${esc(t('fc.plus12'))}</span></span></span>
        </span>
      </button>`;
    })
    .join('');
}

/** The conditions tiles: label and number, a canvas picture (drawn by tiles.ts), the facts, and a tip on tap. */
export function tilesHtml(list: readonly TileView[], open: (i: number) => boolean): string {
  return list
    .map((x, i) => {
      const o = open(i);
      return `<article class="fc-tile${x.lv === null ? '' : ` ${lvCls(x.lv)} has-lv`}" data-kind="${x.kind}" data-tile="${i}"${x.tip ? ` role="button" tabindex="0" aria-expanded="${o}"` : ''}>
        <div class="fc-t-top"><span class="fc-mono">${esc(x.k)}</span><span class="fc-mono fc-ix">${String(i + 1).padStart(2, '0')}</span></div>
        <canvas class="fc-t-viz" aria-hidden="true"></canvas>
        <div class="fc-t-val">${esc(x.v)}${x.small ? `<small>${esc(x.small)}</small>` : ''}</div>
        <p class="fc-t-sub">${x.sub.filter(Boolean).map(esc).join('<br>')}</p>
        ${x.tip ? `<div class="fc-t-tip"><p>${esc(x.tip)}</p></div>` : ''}
      </article>`;
    })
    .join('');
}

/** The next 7 days as bars, each with its best window, the UV peak and the best day tagged. */
export function daysHtml(list: readonly DayView[], bestLabel: string): string {
  return list
    .map((d) => {
      const h = d.height ? Math.max(14, d.height * 84) : 0;
      return `<button type="button" class="fc-day ${lvCls(d.level)}${d.best ? ' is-best' : ''}${d.on ? ' on' : ''}" data-day="${d.i}" style="--h:${h.toFixed(1)}%" aria-pressed="${d.on}">
        <span class="fc-dd fc-mono">${esc(d.dd)}</span><span class="fc-dn">${esc(d.dn)}</span>
        <span class="fc-ba">${d.best ? `<span class="fc-tag fc-mono">${esc(bestLabel)}</span>` : ''}<span class="fc-bar"><span class="fc-bv">${esc(d.value).replace('–', '–<wbr>')}</span></span></span>
        <span class="fc-bw fc-mono">${esc(d.window)}${d.uv ? ` <span class="fc-uvc u${d.uvLevel}">${esc(d.uv)}</span>` : ''}</span>
      </button>`;
    })
    .join('');
}

/** The hour readout: when, the rating, then every row's value (activity rows over weather rows). */
export function readoutHtml(r: ReadoutView): string {
  const cell = (c: ReadoutView['cells'][number]) =>
    `<div class="fc-rc${c.wx ? ' w' : ''}"><span>${esc(c.k)}</span><b>${esc(c.v)}${c.unit && c.v !== '--' ? `${c.unit === '%' || c.unit === '/100' ? '' : ' '}${esc(c.unit)}` : ''}${c.extra ? ` <small>${esc(c.extra)}</small>` : ''}</b></div>`;
  return `<div class="fc-rt ${lvCls(r.level)}"><span class="fc-mono">${esc(r.tag)}</span><b>${esc(r.day)}</b><strong>${esc(r.time)}</strong><span class="fc-mono fc-rl2">${esc(r.line)}</span></div>
    <div class="fc-rcs"><div class="fc-rr">${r.cells.filter((c) => !c.wx).map(cell).join('')}</div><div class="fc-rr">${r.cells.filter((c) => c.wx).map(cell).join('')}</div></div>`;
}

/** The pinned label column beside the charts: each row's name, unit and scale. */
const scaleText = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 1 ? 2 : 1));
export function chartLabelsHtml(L: ChartLayout): string {
  return L.rows
    .map((o) => {
      const at = `style="top:${o.y}px;height:${o.h}px"`;
      if (o.t === 'axis') return `<div class="fc-rl ax" ${at}><span>${esc(t('fc.hour'))}</span></div>`;
      if (o.t === 'head') return `<div class="fc-rl hd" ${at}><span>${esc(t('fc.row.wxgroup'))}</span></div>`;
      if (o.t === 'sky') return `<div class="fc-rl" ${at}><span>${esc(t('fc.sky'))}</span></div>`;
      if (o.t !== 'data') return `<div class="fc-rl rt" ${at}><span>${esc(t('fc.row.rating'))}</span></div>`;
      const id = o.spec.id;
      const unit = id === 'uv' ? '' : t(`fc.unit.${id}` as Key);
      const sc = id === 'tide' ? `±${o.hi.toFixed(2)}` : `${scaleText(o.lo)}–${scaleText(o.hi)}`;
      const none = o.vals.every((v) => v === null || !Number.isFinite(v));
      return `<div class="fc-rl" ${at}><span>${esc(t(`fc.row.${id}` as Key))}</span><em>${unit ? `${esc(unit)} · ` : ''}${esc(sc)}${none ? ` ${esc(t('fc.noRow'))}` : ''}</em></div>`;
    })
    .join('');
}
