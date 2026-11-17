/**
 * IDENTIFY markup (PLAN 7.92): one question at a time, the answers so far as a row of steps to jump back to,
 * and the likely species as cards with photos once enough is answered. identify.ts does the ranking.
 */
import { t, type Key } from '../i18n';
import { artSvg, GROUP_ART } from './art';
import { nameOf, SIZE_BANDS } from './filter';
import { fits, groupsOf, identify, shapesOf, stepsFor, subsOf, type IdAnswers, type IdStep } from './identify';
import { stripCites } from './cite';
import { patternPic, shapePic, wherePic } from './id-pics';
import { cardHtml, esc, expandHtml, icon, ICONS, type ListOpts } from './render';
import { COLOR_WORDS, COLORS, FEATURE_WORDS, FEATURES, GROUP_WORDS, SHAPE_WORDS, PATTERN_WORDS, PATTERNS, POSITION_WORDS, POSITIONS, SUB_WORDS, tx, type Entry, type Lang, type Species } from './types';

/** How many results to show. */
export const ID_MAX = 60;

const STEP_KEY: Record<IdStep, Key> = {
  group: 'gd.id.s.group', sub: 'gd.id.s.sub', size: 'gd.id.s.size', shape: 'gd.id.s.shape', look: 'gd.id.s.look', where: 'gd.id.s.where', results: 'gd.id.s.results',
};

/** What a step's answer says, for the row of steps. */
function answerText(s: IdStep, a: IdAnswers, lang: Lang): string {
  switch (s) {
    case 'group': return a.group ? tx(GROUP_WORDS[a.group].short, lang) : '';
    case 'sub': return a.sub ? tx(SUB_WORDS[a.sub], lang) : '';
    case 'size': return a.size ? t(`gd.size.${a.size}` as Key) : '';
    case 'shape': return a.shape.map((x) => tx(SHAPE_WORDS[x], lang)).join(', ');
    case 'look': return [...a.colors.map((c) => tx(COLOR_WORDS[c], lang)), ...a.pattern.map((p) => tx(PATTERN_WORDS[p], lang)), ...a.features.map((x) => tx(FEATURE_WORDS[x], lang))].join(', ');
    case 'where': return [...a.position.map((p) => tx(POSITION_WORDS[p], lang)), a.night ? t('gd.id.night') : ''].filter(Boolean).join(', ');
    default: return '';
  }
}

/** The features worth offering: those of the species that still fit the kind and group. */
function featuresOf(list: readonly Entry[], a: IdAnswers) {
  const has = new Set<string>();
  for (const e of list)
    if ((!a.group || e.group === a.group) && (a.kind !== 'plant' || e.group === 'plants-algae') && (a.kind !== 'animal' || e.group !== 'plants-algae'))
      for (const x of e.look?.features ?? []) has.add(x);
  return FEATURES.filter((x) => has.has(x) || a.features.includes(x));
}

const tile = (field: string, v: string, label: string, on: boolean, art = '', sub = '', cls = '') =>
  `<button type="button" class="gd-id-t${cls ? ` ${cls}` : ''}" data-a="${field}" data-v="${esc(v)}" aria-pressed="${on}">${art}<span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
const chip = (field: string, v: string, label: string, on: boolean, pre = '') =>
  `<button type="button" class="gd-chip${on ? ' on' : ''}" data-a="${field}" data-v="${esc(v)}" aria-pressed="${on}">${pre}${esc(label)}</button>`;

function question(s: IdStep, list: readonly Entry[], a: IdAnswers, lang: Lang): string {
  const n = (b: IdAnswers) => fits(identify(list, b)).length;
  switch (s) {
    case 'group':
      return `<div class="gd-id-tiles">${groupsOf(a.kind)
        .map((g) => tile('group', g, tx(GROUP_WORDS[g].short, lang), a.group === g, artSvg(GROUP_ART[g], 'gd-id-art'), String(n({ ...a, group: g, sub: undefined })), `g-${g}`))
        .join('')}</div>`;
    case 'sub': {
      const g = a.kind === 'plant' ? 'plants-algae' : a.group;
      return `<div class="gd-chips">${subsOf(list, g).map((v) => chip('sub', v, tx(SUB_WORDS[v], lang), a.sub === v)).join('')}</div>`;
    }
    case 'size':
      return `<div class="gd-id-tiles sizes">${SIZE_BANDS.map((b, i) =>
        tile('size', b, t(`gd.size.${b}` as Key), a.size === b, `<i class="gd-id-sz" style="--i:${i}"></i>`, t(`gd.id.like.${b}` as Key)),
      ).join('')}</div>`;
    case 'shape':
      // Picture answers (Joseph 2026-11-17): the outline first, its words under it.
      return `<div class="gd-id-tiles pics${a.group ? ` g-${a.group}` : ''}">${shapesOf(list, a)
        .map((v) => tile('shape', v, tx(SHAPE_WORDS[v], lang), a.shape.includes(v), shapePic(v)))
        .join('')}</div>`;
    case 'look':
      return `<p class="fc-mono gd-id-k">${esc(t('gd.id.colors'))}</p><div class="gd-chips gd-sw">${COLORS.map((c) =>
        chip('colors', c, tx(COLOR_WORDS[c], lang), a.colors.includes(c), `<i class="sw-${c}"></i>`),
      ).join('')}</div><p class="fc-mono gd-id-k">${esc(t('gd.id.marks'))}</p><div class="gd-id-tiles pics sm">${PATTERNS.map((p) =>
        tile('pattern', p, tx(PATTERN_WORDS[p], lang), a.pattern.includes(p), patternPic(p)),
      ).join('')}</div><p class="fc-mono gd-id-k">${esc(t('gd.id.features'))}</p><div class="gd-chips">${featuresOf(list, a).map((x) =>
        chip('features', x, tx(FEATURE_WORDS[x], lang), a.features.includes(x)),
      ).join('')}</div>`;
    case 'where':
      return `<div class="gd-id-tiles pics sm">${POSITIONS.map((p) => tile('position', p, tx(POSITION_WORDS[p], lang), a.position.includes(p), wherePic(p))).join('')}</div>
        <p class="fc-mono gd-id-k">${esc(t('gd.id.when'))}</p><div class="gd-chips">${chip('night', '1', t('gd.id.night'), !!a.night)}</div>`;
    default:
      return '';
  }
}

/**
 * What could fit so far, as photos, under every question (Joseph 2026-11-17: photos from the first tap, not only at
 * the end). Tapping one opens it.
 */
function liveHtml(found: readonly Entry[], o: ListOpts, max = 8): string {
  const withPic = found.filter((e) => e.thumb).slice(0, max);
  if (!withPic.length) return '';
  return `<div class="gd-id-live"><p class="fc-mono gd-id-k">${esc(t('gd.id.live', { n: found.length }))}</p><div class="gd-id-th">${withPic
    .map((e) => `<a class="gd-id-tl g-${e.group}" href="${esc(o.href(e.id))}" title="${esc(nameOf(e, o.lang))}"><img src="${esc(o.base + e.thumb)}" alt="${esc(nameOf(e, o.lang))}" loading="lazy" decoding="async" width="120" height="90"><span>${esc(nameOf(e, o.lang))}</span></a>`)
    .join('')}</div></div>`;
}

/** The whole identify view for one step. Returns the markup and the ids of the results in order (for the arrows). */
export function idHtml(list: readonly Entry[], a: IdAnswers, step: IdStep, o: ListOpts, expanded = false): { html: string; order: string[] } {
  const { lang } = o;
  const steps = stepsFor(list, a);
  const cur = steps.includes(step) ? step : steps[0];
  const i = steps.indexOf(cur);
  const ranked = identify(list, a);
  const found = fits(ranked);
  const row = steps
    .map((s, k) => {
      const ans = answerText(s, a, lang);
      return `<li><button type="button" data-step="${s}"${s === cur ? ' aria-current="step"' : ''}${ans ? ' class="done"' : ''}><b class="fc-mono">${k + 1}</b><span>${esc(t(STEP_KEY[s]))}</span>${ans ? `<small>${esc(ans)}</small>` : ''}</button></li>`;
    })
    .join('');
  const head = `<ol class="gd-id-steps">${row}</ol>`;
  if (cur === 'results') {
    const top = (found.length ? found : ranked).slice(0, ID_MAX);
    const best = top.length ? top[0].score : 0;
    const strong = top.filter((r) => r.score >= best - 2);
    const rest = top.slice(strong.length);
    const cards = (rs: typeof top) => `<div class="gd-cards">${rs.map((r) => cardHtml(r.e, { ...o, marks: true })).join('')}</div>`;
    return {
      order: top.map((r) => r.e.id),
      html: `<div class="gd-id">${head}<section class="gd-id-res">
        <div class="gd-id-q"><h3>${esc(t('gd.id.results', { n: found.length }))}</h3><p>${esc(t('gd.id.resultsHint'))}</p>
        <div class="gd-id-nav"><button type="button" class="fc-ctl" data-step="${steps[i - 1] ?? 'group'}">${icon(ICONS.back)}<span>${esc(t('gd.id.back'))}</span></button><button type="button" class="fc-ctl" data-id-reset>${esc(t('gd.id.again'))}</button></div></div>
        ${strong.length ? `<h4 class="fc-mono gd-id-k">${esc(t('gd.id.best'))}</h4>${cards(strong.slice(0, 1))}<div class="gd-id-check" id="gd-id-check" data-top="${esc(top[0].e.id)}"></div>${strong.length > 1 ? cards(strong.slice(1)) : ''}` : `<p class="gd-empty">${esc(t('gd.none'))}</p>`}
        ${rest.length ? `<h4 class="fc-mono gd-id-k">${esc(t('gd.id.maybe'))}</h4>${cards(rest)}` : ''}
        <div class="gd-id-exp"><p>${esc(t(expanded ? 'gd.id.expOn' : 'gd.id.expOff'))}</p>${expandHtml(expanded)}</div>
      </section></div>`,
    };
  }
  const single = cur === 'group' || cur === 'sub' || cur === 'size';
  const next = steps[i + 1] ?? 'results';
  return {
    order: [],
    html: `<div class="gd-id">${head}<section class="gd-id-q"><h3>${esc(t(`gd.id.q.${cur}` as Key))}</h3><p>${esc(t(`gd.id.h.${cur}` as Key))}</p>
      ${question(cur, list, a, lang)}
      ${liveHtml(found.map((r) => r.e), o)}
      <div class="gd-id-nav">
        ${i > 0 ? `<button type="button" class="fc-ctl" data-step="${steps[i - 1]}">${icon(ICONS.back)}<span>${esc(t('gd.id.back'))}</span></button>` : ''}
        ${single ? `<button type="button" class="fc-ctl" data-step="${next}">${esc(t('gd.id.skip'))}</button>` : `<button type="button" class="fc-ctl" data-step="${next}">${esc(t('gd.id.next'))}</button>`}
        <button type="button" class="fc-ctl gd-id-go" data-step="results">${esc(t('gd.id.see', { n: found.length }))}</button>
      </div></section></div>`,
  };
}

/**
 * The last step (PLAN 14.3): before trusting the best match, check it side by side with what it is mistaken for. The
 * look-alikes the research names come first, each with how to tell them apart; with none, the runner-up, each with its
 * key marks. Photos side by side, so the difference is seen, not read.
 */
export function idCheckHtml(
  top: Entry,
  s: Pick<Species, 'lookalikes'> | null,
  o: ListOpts,
  peer: (sci: string) => Entry | undefined,
  runnerUp?: Entry,
): string {
  const { lang } = o;
  const fig = (e: Entry | undefined, name: string) => {
    const img = e?.thumb ? `<img src="${esc(o.base + e.thumb)}" alt="" loading="lazy" decoding="async" width="240" height="180">` : `<span class="gd-la-na">${artSvg(GROUP_ART[e?.group ?? top.group], 'gd-gal-art')}</span>`;
    const inner = `${img}<figcaption>${esc(name)}</figcaption>`;
    return `<figure class="g-${e?.group ?? top.group}">${e ? `<a href="${esc(o.href(e.id))}">${inner}</a>` : inner}</figure>`;
  };
  const marks = (e: Entry) => stripCites(tx(e.look?.marks, lang)).trim();
  const pairs: string[] = [];
  for (const l of s?.lookalikes?.slice(0, 2) ?? []) {
    const it = peer(l.sci);
    const tip = stripCites(tx(l.tip, lang)).trim();
    pairs.push(`<li><div class="gd-la-pair">${fig(top, nameOf(top, lang))}${fig(it, it ? nameOf(it, lang) : l.sci)}</div>${tip ? `<p>${esc(tip)}</p>` : ''}</li>`);
  }
  if (!pairs.length && runnerUp) {
    const a = marks(top), b = marks(runnerUp);
    pairs.push(`<li><div class="gd-la-pair">${fig(top, nameOf(top, lang))}${fig(runnerUp, nameOf(runnerUp, lang))}</div>${a || b ? `<dl class="gd-id-cmp">${a ? `<dt>${esc(nameOf(top, lang))}</dt><dd>${esc(a)}</dd>` : ''}${b ? `<dt>${esc(nameOf(runnerUp, lang))}</dt><dd>${esc(b)}</dd>` : ''}</dl>` : ''}</li>`);
  }
  if (!pairs.length) return '';
  return `<section class="gd-id-chk"><h4 class="gd-id-chk-h">${icon(ICONS.identify)}<span>${esc(t(s?.lookalikes?.length ? 'gd.id.check' : 'gd.id.checkTwo', { name: nameOf(top, lang) }))}</span></h4><ul class="gd-la">${pairs.join('')}</ul></section>`;
}
