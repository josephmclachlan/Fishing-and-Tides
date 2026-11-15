/**
 * IDENTIFY markup (PLAN 7.92): one question at a time, the answers so far as a row of steps to jump back to,
 * and the likely species as cards with photos once enough is answered. identify.ts does the ranking.
 */
import { t, type Key } from '../i18n';
import { artSvg, GROUP_ART } from './art';
import { SIZE_BANDS } from './filter';
import { fits, groupsOf, identify, shapesOf, stepsFor, subsOf, type IdAnswers, type IdStep } from './identify';
import { cardHtml, esc, icon, ICONS, type ListOpts } from './render';
import { COLOR_WORDS, COLORS, FEATURE_WORDS, FEATURES, GROUP_WORDS, SHAPE_WORDS, PATTERN_WORDS, PATTERNS, POSITION_WORDS, POSITIONS, SUB_WORDS, tx, type Entry, type Lang } from './types';

/** How many results to show. */
export const ID_MAX = 60;

const STEP_KEY: Record<IdStep, Key> = {
  kind: 'gd.id.s.kind', group: 'gd.id.s.group', sub: 'gd.id.s.sub', size: 'gd.id.s.size', shape: 'gd.id.s.shape', look: 'gd.id.s.look', where: 'gd.id.s.where', results: 'gd.id.s.results',
};

/** What a step's answer says, for the row of steps. */
function answerText(s: IdStep, a: IdAnswers, lang: Lang): string {
  switch (s) {
    case 'kind': return a.kind ? t(a.kind === 'plant' ? 'gd.id.plant' : 'gd.id.animal') : '';
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
    case 'kind':
      return `<div class="gd-id-tiles two">${tile('kind', 'animal', t('gd.id.animal'), a.kind === 'animal', artSvg('fish', 'gd-id-art') , t('gd.id.animalSub'))}${tile('kind', 'plant', t('gd.id.plant'), a.kind === 'plant', artSvg('seaweed', 'gd-id-art'), t('gd.id.plantSub'))}</div>`;
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
      return `<div class="gd-chips">${shapesOf(list, a).map((v) => chip('shape', v, tx(SHAPE_WORDS[v], lang), a.shape.includes(v))).join('')}</div>`;
    case 'look':
      return `<p class="fc-mono gd-id-k">${esc(t('gd.id.colors'))}</p><div class="gd-chips gd-sw">${COLORS.map((c) =>
        chip('colors', c, tx(COLOR_WORDS[c], lang), a.colors.includes(c), `<i class="sw-${c}"></i>`),
      ).join('')}</div><p class="fc-mono gd-id-k">${esc(t('gd.id.marks'))}</p><div class="gd-chips">${PATTERNS.map((p) =>
        chip('pattern', p, tx(PATTERN_WORDS[p], lang), a.pattern.includes(p)),
      ).join('')}</div><p class="fc-mono gd-id-k">${esc(t('gd.id.features'))}</p><div class="gd-chips">${featuresOf(list, a).map((x) =>
        chip('features', x, tx(FEATURE_WORDS[x], lang), a.features.includes(x)),
      ).join('')}</div>`;
    case 'where':
      return `<div class="gd-chips">${POSITIONS.map((p) => chip('position', p, tx(POSITION_WORDS[p], lang), a.position.includes(p))).join('')}</div>
        <p class="fc-mono gd-id-k">${esc(t('gd.id.when'))}</p><div class="gd-chips">${chip('night', '1', t('gd.id.night'), !!a.night)}</div>`;
    default:
      return '';
  }
}

/** The whole identify view for one step. Returns the markup and the ids of the results in order (for the arrows). */
export function idHtml(list: readonly Entry[], a: IdAnswers, step: IdStep, o: ListOpts): { html: string; order: string[] } {
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
        <div class="gd-id-nav"><button type="button" class="fc-ctl" data-step="${steps[i - 1] ?? 'kind'}">${icon(ICONS.back)}<span>${esc(t('gd.id.back'))}</span></button><button type="button" class="fc-ctl" data-id-reset>${esc(t('gd.id.again'))}</button></div></div>
        ${strong.length ? `<h4 class="fc-mono gd-id-k">${esc(t('gd.id.best'))}</h4>${cards(strong)}` : `<p class="gd-empty">${esc(t('gd.none'))}</p>`}
        ${rest.length ? `<h4 class="fc-mono gd-id-k">${esc(t('gd.id.maybe'))}</h4>${cards(rest)}` : ''}
      </section></div>`,
    };
  }
  const single = cur === 'kind' || cur === 'group' || cur === 'sub' || cur === 'size';
  const next = steps[i + 1] ?? 'results';
  return {
    order: [],
    html: `<div class="gd-id">${head}<section class="gd-id-q"><h3>${esc(t(`gd.id.q.${cur}` as Key))}</h3><p>${esc(t(`gd.id.h.${cur}` as Key))}</p>
      ${question(cur, list, a, lang)}
      <div class="gd-id-nav">
        ${i > 0 ? `<button type="button" class="fc-ctl" data-step="${steps[i - 1]}">${icon(ICONS.back)}<span>${esc(t('gd.id.back'))}</span></button>` : ''}
        ${single ? `<button type="button" class="fc-ctl" data-step="${next}">${esc(t('gd.id.skip'))}</button>` : `<button type="button" class="fc-ctl" data-step="${next}">${esc(t('gd.id.next'))}</button>`}
        <button type="button" class="fc-ctl gd-id-go" data-step="results">${esc(t('gd.id.see', { n: found.length }))}</button>
      </div></section></div>`,
  };
}
