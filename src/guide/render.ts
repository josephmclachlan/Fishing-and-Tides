/**
 * SPECIES GUIDE markup (PLAN 7.91): the list (mode tabs, group strip, filters, sections of cards) and a species'
 * page (photos, names, key numbers and its tabs). Pure string builders over the index rows and species files, so
 * the markup is tested without a browser; page.ts puts it on screen and handles the clicks. Every text from the
 * data is escaped here.
 */
import { t, type Key } from '../i18n';
import { UI } from '../icons/ui';
import { artFor, artSvg, GROUP_ART } from './art';
import { fishKindFor } from '../fishing/guide-link';
import { citePage } from './cite';
import { runPath, RUN_TOKENS } from '../brand';
import { cleanHtml, dispatchLinkHtml, hasDispatch } from './clean';
import {
  FLAGS, GROUP_BYS, hurtsToTouch, isFood, latinOnly, nameOf, poisonToEat, riskToEat, SIZE_BANDS, SORTS, TOUCH_KINDS, touchLevel,
  type GdFilter, type GroupBy, type Section,
} from './filter';
import { GD_MODES, type GdMode, type GdTab } from './route';
import {
  EDIBLE_WORDS, ENCOUNTER_WORDS, ENCOUNTERS, GROUP_WORDS, GROUPS, HABITAT_WORDS, HABITATS, IUCN_WORDS, KIND_WORDS, LEVEL_WORDS, METHOD_WORDS,
  METHODS, RISK_WORDS, SEEN, SEEN_WORDS, SUB_WORDS, TIME_WORDS, TIMES, tx, VARIANT_WORDS,
  type Entry, type Group, type Lang, type Photo, type Species, type Txt,
} from './types';
import { bandText, depthLines, pips, sizeMain, sizeMax, timesText, weightText } from './view';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const icon = (body: string, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${body}</svg>`;

/** A link from a ciguatera warning to the CIGUATERA page (PLAN 7.101). */
/** Ciguatera size advice for this species: the limit to keep, whether it is published or an estimate, and why. */
export function ciguaSizeHtml(c: NonNullable<Species['eat']>['ciguaSize'], lang: Lang, fold = false): string {
  if (!c || !txt(c.advice, lang)) return '';
  const lim = [c.maxCm ? `${c.maxCm} cm` : '', c.maxKg ? `${c.maxKg} kg` : ''].filter(Boolean).join(' · ');
  const head = lim ? `<p class="gd-csz"><b>${esc(t('gd.csz.keep', { lim }))}</b> <span class="gd-b">${esc(t(`gd.csz.${c.basis}` as Key))}</span></p>` : `<p class="gd-csz"><span class="gd-b">${esc(t(`gd.csz.${c.basis}` as Key))}</span></p>`;
  // On the species page the reason waits under "Why this size"; the size itself always shows.
  return block(t('gd.h.ciguaSize'), head + (fold ? foldHtml(t('gd.ciguaWhy'), paras(txt(c.advice, lang))) : paras(txt(c.advice, lang))), 'gd-warn');
}

const ciguateraLink = (risks: readonly string[]): string =>
  risks.includes('ciguatera') ? `<p><a class="cig-link" href="#ciguatera">${esc(t('gd.ciguateraLink'))}</a></p>` : '';

export const ICONS = {
  all: '<rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/>',
  edible: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.5 1.5-3.5 4-3.5 8h3.5"/>',
  danger: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 17.5v.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  back: '<path d="M15 4l-8 8 8 8"/>',
  next: '<path d="M9 4l8 8-8 8"/>',
  out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  identify: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5M8.5 11h5M11 8.5v5"/>',
  /** Protected by law (the symbol set's shield, src/icons/glyphs.ts). */
  shield: '<path d="M12 2.8l7.5 2.7v6c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9v-6z"/>',
  /** Shelves: rows of photos. */
  shelf: '<rect x="3" y="4" width="5" height="6"/><rect x="10" y="4" width="5" height="6"/><path d="M17 4h4v6h-4"/><rect x="3" y="14" width="5" height="6"/><rect x="10" y="14" width="5" height="6"/><path d="M17 14h4v6h-4"/>',
  list: '<rect x="3" y="4" width="5" height="4"/><rect x="3" y="10" width="5" height="4"/><rect x="3" y="16" width="5" height="4"/><path d="M11 6h10M11 12h10M11 18h10"/>',
  tick: '<path d="M4 12.5l5 5L20 6.5"/>',
  /** Flip: a card on top of another. */
  cards: '<rect x="7" y="3" width="13" height="16"/><path d="M4 7v14h12"/>',
  /** Not checked locally yet (the symbol set's question mark). */
  check: '<path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6"/><path d="M12 17.2v.6"/>',
} as const;

/** Paragraphs from a text with blank lines between them. */
const paras = (s: string, cls = '') => s.split(/\n\s*\n/).map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p.trim())}</p>`).join('');
const txt = (v: Txt | undefined, lang: Lang) => tx(v, lang).trim();

// ------------------------------------------------------------------ the list

export interface ListOpts {
  /** Show the key marks on the card (the identify results). */
  marks?: boolean;
  /** Saved by the reader (a star on the card). */
  fav?: (id: string) => boolean;
  lang: Lang;
  /** Base URL of the site (Vite's BASE_URL), for bundled thumbnails. */
  base: string;
  /** The link to a species from this list. */
  href: (id: string) => string;
  /** Draw each section as a shelf of photo tiles that scrolls sideways (the Atlas, PLAN 14.2). */
  shelf?: boolean;
}

/** Taking it is banned on this coast: protected by law, marked illegal, or not to be eaten because it is protected. */
const bannedHere = (e: { edible?: string; illegal?: boolean; protectedCR?: boolean }) => !!(e.protectedCR || e.illegal || e.edible === 'protected');

const THREAT = new Set(['CR', 'EN', 'VU']);
/** "Illegal", with the threat rating after it in words when it has one ("Illegal - endangered"). */
const illegalWords = (iucn: string | undefined, lang: Lang) =>
  iucn && THREAT.has(iucn) ? `${t('gd.flag.illegalShort')} - ${tx(IUCN_WORDS[iucn as 'CR'], lang).toLowerCase()}` : t('gd.flag.illegalShort');

/** Up to three badges, the most important first: hurts, poisonous, food, threatened, introduced. */
export function badges(e: Entry, lang: Lang, max = 3): string {
  const out: string[] = [];
  if (e.danger && hurtsToTouch(e)) {
    const k = e.danger.kinds.find((x) => TOUCH_KINDS.includes(x))!;
    const lv = touchLevel(e);
    out.push(`<span class="gd-b dz l${lv}" title="${esc(tx(LEVEL_WORDS[lv], lang))}">${icon(ICONS.danger)}${esc(tx(KIND_WORDS[k], lang))}</span>`);
  }
  if (poisonToEat(e)) out.push(`<span class="gd-b dz l3">${icon(ICONS.edible)}${esc(tx(EDIBLE_WORDS.toxic, lang))}</span>`);
  if (isFood(e)) {
    const risk = riskToEat(e) ? e.risks!.find((r) => r !== 'spines') : undefined;
    // The word always shows (Joseph: "edible with care" must be visible in the list), the quality pips after it.
    out.push(`<span class="gd-b eat ed-${e.edible}">${icon(ICONS.edible)}${esc(tx(EDIBLE_WORDS[e.edible!], lang))}${e.quality ? `<span class="gd-pips" aria-label="${e.quality}/5">${pips(e.quality)}</span>` : ''}</span>`);
    if (risk) out.push(`<span class="gd-b risk">${icon(ICONS.edible)}${esc(tx(RISK_WORDS[risk], lang))}</span>`);
  }
  // Joseph 2026-11-16: every species banned here reads "Illegal"; threat ratings in words, never letters.
  const ban = bannedHere(e);
  if (ban) out.push(`<span class="gd-b iucn i-CR" title="${esc(illegalWords(e.iucn, lang))}">${icon(ICONS.shield)}${esc(t('gd.flag.illegalShort'))}</span>`);
  else if (e.iucn === 'CR' || e.iucn === 'EN' || e.iucn === 'VU') out.push(`<span class="gd-b iucn i-${e.iucn}">${esc(tx(IUCN_WORDS[e.iucn], lang))}</span>`);
  if (e.origin === 'invasive' || e.origin === 'introduced') out.push(`<span class="gd-b introd">${esc(t('gd.flag.introduced'))}</span>`);
  if (e.rec && e.rec !== 'here') out.unshift(`<span class="gd-b rec">${esc(t(e.rec === 'near' ? 'gd.rec.near' : 'gd.rec.none'))}</span>`);
  return out.length ? `<span class="gd-badges">${out.slice(0, max).join('')}</span>` : '';
}

/** Other names worth showing under the title: more names in the reader's language, then local names. */
/** SHOW ON MAP for a species the fish map has a zone for (snook, jacks, snappers, mackerel, small groupers, barracuda, lionfish). */
const showMapButton = (s: Pick<Species, 'sci'>): string => {
  const kind = fishKindFor(s.sci);
  return kind ? `<p><button type="button" class="fc-ctl gd-showmap" data-showmap="${kind}">${esc(t('gd.showMap'))}</button></p>` : '';
};

export function altNames(e: Pick<Entry, 'en' | 'es' | 'local' | 'sci'>, lang: Lang, n = 3): string[] {
  const first = nameOf(e, lang);
  const more = lang === 'es' ? e.es : e.en;
  return [...new Set([...more, ...(e.local ?? [])])].filter((x) => x && x !== first).slice(0, n);
}

export function cardHtml(e: Entry, o: ListOpts): string {
  const { lang } = o;
  const latin = latinOnly(e);
  const alt = altNames(e, lang);
  const size = sizeMain(e.size);
  const facts = [size !== '--' ? size : '', e.depth ? bandText(e.depth[0], e.depth[1], lang) : '', e.seen ? tx(SEEN_WORDS[e.seen], lang) : ''].filter(Boolean);
  const thumb = e.thumb
    ? `<img src="${esc(o.base + e.thumb)}" alt="" loading="lazy" decoding="async" width="240" height="180">`
    : artSvg(artFor(e.group, e.sub));
  return `<a class="gd-card g-${e.group}" href="${esc(o.href(e.id))}" data-id="${esc(e.id)}">
    <span class="gd-thumb${e.thumb ? ' gd-ph' : ''}">${thumb}</span>
    <span class="gd-ct">
      <b class="gd-name${latin ? ' sci' : ''}">${o.fav?.(e.id) ? `<span class="gd-star" aria-label="${esc(t('gd.mode.saved'))}">${UI.star}</span>` : ''}${esc(nameOf(e, lang))}</b>${latin ? '' : `<i class="gd-sci">${esc(e.sci)}</i>`}
      ${alt.length ? `<span class="gd-alt">${esc(alt.join(' · '))}</span>` : ''}
      ${o.marks && e.look?.marks ? `<span class="gd-marks">${esc(txt(e.look.marks, lang))}</span>` : ''}
      ${facts.length ? `<span class="gd-facts fc-mono">${esc(facts.join(' · '))}</span>` : ''}
      ${badges(e, lang)}
    </span></a>`;
}

/**
 * Colour-coded marks on a photo tile, read at a glance (Joseph 2026-11-17): green to eat, amber to eat with care, red
 * or amber when it hurts by its danger level, red when poisonous or illegal to take. Each has its words for a screen reader.
 */
export function tileTags(e: Entry, lang: Lang): string {
  const out: string[] = [];
  const tag = (cls: string, ic: string, words: string) => `<i class="gd-tg ${cls}" title="${esc(words)}" role="img" aria-label="${esc(words)}">${icon(ic)}</i>`;
  if (e.danger && hurtsToTouch(e)) {
    const k = e.danger.kinds.find((x) => TOUCH_KINDS.includes(x))!;
    out.push(tag(`dz l${touchLevel(e)}`, ICONS.danger, tx(KIND_WORDS[k], lang)));
  }
  if (poisonToEat(e)) out.push(tag('dz l3', ICONS.edible, tx(EDIBLE_WORDS.toxic, lang)));
  if (bannedHere(e)) out.push(tag('ban', ICONS.shield, t('gd.flag.illegalShort')));
  else if (isFood(e)) {
    const risk = riskToEat(e) ? e.risks!.find((r) => r !== 'spines') : undefined;
    out.push(tag(risk ? 'eat care' : 'eat', ICONS.edible, risk ? `${tx(EDIBLE_WORDS[e.edible!], lang)}: ${tx(RISK_WORDS[risk], lang)}` : tx(EDIBLE_WORDS[e.edible!], lang)));
  }
  return out.length ? `<span class="gd-tgs">${out.join('')}</span>` : '';
}

/** One species as a photo tile on a shelf: the photo with its colour marks, the name, and size and how common here. */
export function tileHtml(e: Entry, o: ListOpts): string {
  const { lang } = o;
  const latin = latinOnly(e);
  const size = sizeMain(e.size);
  const facts = [size !== '--' ? size : '', e.seen ? tx(SEEN_WORDS[e.seen], lang) : ''].filter(Boolean).join(' · ');
  const thumb = e.thumb
    ? `<img src="${esc(o.base + e.thumb)}" alt="" loading="lazy" decoding="async" width="240" height="180">`
    : artSvg(artFor(e.group, e.sub));
  return `<a class="gd-st g-${e.group}" href="${esc(o.href(e.id))}" data-id="${esc(e.id)}"><span class="gd-st-im${e.thumb ? ' gd-ph' : ''}">${thumb}${tileTags(e, lang)}</span><b class="${latin ? 'sci' : ''}">${o.fav?.(e.id) ? `<span class="gd-star" aria-label="${esc(t('gd.mode.saved'))}">${UI.star}</span>` : ''}${esc(nameOf(e, lang))}</b>${facts ? `<small class="fc-mono">${esc(facts)}</small>` : ''}</a>`;
}

/** What the colours on the tiles mean, over the shelves. */
export function tileKeyHtml(): string {
  const k = (cls: string, ic: string, w: string) => `<span><i class="gd-tg ${cls}">${icon(ic)}</i>${esc(w)}</span>`;
  return `<p class="gd-tkey fc-mono">${k('eat', ICONS.edible, t('gd.key.eat'))}${k('eat care', ICONS.edible, t('gd.key.care'))}${k('dz l1', ICONS.danger, t('gd.key.hurts'))}${k('dz l3', ICONS.danger, t('gd.key.bad'))}${k('ban', ICONS.shield, t('gd.flag.illegalShort'))}</p>`;
}

/** A one-line "also recorded" species: Latin name, any common name and why it is only a record. */
export function recHtml(e: Entry, o: ListOpts): string {
  const name = latinOnly(e) ? '' : nameOf(e, o.lang);
  const note = txt(e.note, o.lang);
  return `<li><a class="gd-rec" href="${esc(o.href(e.id))}" data-id="${esc(e.id)}"><i>${esc(e.sci)}</i>${name ? `<span>${esc(name)}</span>` : ''}${note ? `<small>${esc(note)}</small>` : ''}</a></li>`;
}

/** The button that opens a Flip deck (PLAN 14.4): on a shelf (`at` = its first species) or over the whole list. */
export const flipButton = (at: string | null) =>
  `<button type="button" class="gd-flipb" ${at ? `data-flip-at="${esc(at)}"` : 'data-flip-all'}>${icon(ICONS.cards)}<span>${esc(t(at ? 'gd.flip' : 'gd.flip.all'))}</span></button>`;

export function sectionHead(s: Section, n: number, flipAt?: string): string {
  return `<header class="gd-sec-h${s.level ? ` lv${s.level}` : ''}"><h3${s.latin ? ' class="sci"' : ''}>${esc(s.title)}</h3><span class="gd-n fc-mono">${n}</span>${flipAt && n > 1 ? flipButton(flipAt) : ''}${
    s.sub ? `<p class="gd-sec-sub${s.subLatin ? ' sci' : ''}">${esc(s.sub)}</p>` : ''
  }</header>`;
}

export function groupBanner(g: Group, n: number, lang: Lang): string {
  return `<div class="gd-gb g-${g}">${artSvg(GROUP_ART[g], 'gd-gb-art')}<h2>${esc(tx(GROUP_WORDS[g].name, lang))}</h2><span class="gd-n fc-mono">${n}</span></div>`;
}

/** The list as a flat run of rows, so it can be drawn a chunk at a time and each chunk appended. */
export type Row =
  | { k: 'banner'; g: Group; n: number }
  | { k: 'head'; s: Section; n: number }
  | { k: 'card'; e: Entry }
  | { k: 'rechead'; n: number }
  | { k: 'rec'; e: Entry };

export function rowsFor(secs: readonly Section[], banners: boolean): Row[] {
  const rows: Row[] = [];
  const perGroup = new Map<Group, number>();
  if (banners) for (const s of secs) if (s.group) perGroup.set(s.group, (perGroup.get(s.group) ?? 0) + s.items.length);
  let g: Group | null = null;
  for (const s of secs) {
    if (banners && s.group && s.group !== g) rows.push({ k: 'banner', g: s.group, n: perGroup.get(s.group) ?? 0 });
    g = s.group;
    if (s.title) rows.push({ k: 'head', s, n: s.items.length });
    const full = s.items.filter((e) => e.tier === 'full'), recs = s.items.filter((e) => e.tier === 'list');
    for (const e of full) rows.push({ k: 'card', e });
    if (recs.length) {
      rows.push({ k: 'rechead', n: recs.length });
      for (const e of recs) rows.push({ k: 'rec', e });
    }
  }
  return rows;
}

/** How many species rows a run of rows holds (the chunk size counts these). */
/** Species shown: one that sits under several headings (the danger list groups by how it hurts) counts once. */
export const itemCount = (rows: readonly Row[]) => new Set(rows.flatMap((r) => (r.k === 'card' || r.k === 'rec' ? [r.e.id] : []))).size;

/** The first species after a heading, before the next heading (a shelf's Flip button names its shelf by it). */
const firstCard = (rows: readonly Row[], i: number): string | undefined => {
  for (let j = i + 1; j < rows.length; j++) {
    const r = rows[j];
    if (r.k === 'card') return r.e.id;
    if (r.k === 'head' || r.k === 'banner') return undefined;
  }
  return undefined;
};

/** An arrow that moves a shelf along by a screen (desktop; phones swipe). */
const shelfArrow = (dir: -1 | 1) =>
  `<button type="button" class="gd-sa ${dir < 0 ? 'l' : 'r'}" data-shelf-go="${dir}" tabindex="-1" aria-label="${esc(t(dir < 0 ? 'gd.shelf.back' : 'gd.shelf.more'))}">${icon(dir < 0 ? ICONS.back : ICONS.next)}</button>`;

/** Markup for a run of rows: cards gathered in a grid, records in a list, each run opened and closed here. */
export function rowsHtml(rows: readonly Row[], o: ListOpts): string {
  let html = '', open: 'cards' | 'recs' | null = null;
  const close = () => {
    if (open === 'cards') html += o.shelf ? '</div></div>' : '</div>';
    else if (open === 'recs') html += '</ul>';
    open = null;
  };
  rows.forEach((r, i) => {
    if (r.k === 'card') {
      if (open !== 'cards') close(), (html += o.shelf ? `<div class="gd-shelf" data-at="start">${shelfArrow(-1)}${shelfArrow(1)}<div class="gd-lane">` : '<div class="gd-cards">'), (open = 'cards');
      html += o.shelf ? tileHtml(r.e, o) : cardHtml(r.e, o);
    } else if (r.k === 'rec') {
      if (open !== 'recs') close(), (html += '<ul class="gd-recs">'), (open = 'recs');
      html += recHtml(r.e, o);
    } else {
      close();
      html +=
        r.k === 'banner' ? groupBanner(r.g, r.n, o.lang)
        : r.k === 'head' ? sectionHead(r.s, r.n, o.shelf ? firstCard(rows, i) : undefined)
        : `<p class="gd-rec-h fc-mono">${esc(t('gd.alsoRec'))} · ${r.n}</p>`;
    }
  });
  close();
  return html;
}

// ------------------------------------------------------------------ the controls

const MODE_ICON: Record<GdMode, string> = { all: ICONS.all, identify: ICONS.identify, edible: ICONS.edible, danger: ICONS.danger, saved: ICONS.star };

export function modesHtml(mode: GdMode, counts: Record<GdMode, number>): string {
  // Identify has its own wide bar on the home (Joseph 2026-11-17), so the row holds the lists only.
  return GD_MODES.filter((m) => m !== 'identify').map(
    (m) => `<button type="button" role="tab" class="gd-mode" data-mode="${m}" aria-selected="${m === mode}" tabindex="${m === mode ? 0 : -1}" aria-controls="gd-list">${icon(MODE_ICON[m])}<span>${esc(t(`gd.mode.${m}` as Key))}</span><sup class="fc-mono">${counts[m]}</sup></button>`,
  ).join('') + '<span class="gd-mode-bar" aria-hidden="true"></span>';
}

export function groupsHtml(group: Group | null, counts: Record<Group, number>, lang: Lang): string {
  const total = GROUPS.reduce((n, g) => n + counts[g], 0);
  const chip = (g: Group | null, label: string, n: number, art: string) =>
    `<button type="button" class="gd-g${g ? ` g-${g}` : ' g-all'}" data-group="${g ?? ''}" aria-pressed="${g === group}"${n ? '' : ' data-empty'}>${art}<span>${esc(label)}</span><b class="fc-mono">${n}</b></button>`;
  return chip(null, t('gd.allGroups'), total, icon(ICONS.all, 'gd-g-ico')) + GROUPS.map((g) => chip(g, tx(GROUP_WORDS[g].short, lang), counts[g], artSvg(GROUP_ART[g], 'gd-g-art'))).join('');
}

const chipRow = <T extends string>(key: string, label: string, values: readonly T[], on: readonly T[], word: (v: T) => string) =>
  `<div class="gd-frow" role="group" aria-label="${esc(label)}"><p class="fc-mono">${esc(label)}</p><div class="gd-chips">${values
    .map((v) => `<button type="button" class="cp-chip gd-chip${on.includes(v) ? ' on' : ''}" data-f="${key}" data-v="${v}" aria-pressed="${on.includes(v)}">${esc(word(v))}</button>`)
    .join('')}</div></div>`;

/** Shelves of photos (the Atlas) or the list with every badge, side by side. */
export const layHtml = (lay: 'shelf' | 'list') =>
  `<div class="gd-lay" role="group" aria-label="${esc(t('gd.lay'))}">${(['shelf', 'list'] as const)
    .map((k) => `<button type="button" data-lay="${k}" aria-pressed="${k === lay}">${icon(k === 'shelf' ? ICONS.shelf : ICONS.list)}<span>${esc(t(`gd.lay.${k}`))}</span></button>`)
    .join('')}</div>`;

/** One tap for what is common on this coast (Abundant and Common), with the other filters. */
export const commonHtml = (on: boolean) =>
  `<button type="button" class="gd-qf" id="gd-common" aria-pressed="${on}">${icon(ICONS.tick)}<span>${esc(t('gd.common'))}</span></button>`;

/** The expanded-species switch, beside the search (Joseph 2026-11-15). */
export const expandHtml = (on: boolean) =>
  `<label class="gd-switch gd-exp" title="${esc(t('gd.exp.title'))}"><input type="checkbox" data-f="expanded"${on ? ' checked' : ''}><span>${esc(t('gd.exp'))}</span></label>`;

export function filtersHtml(f: GdFilter, lang: Lang): string {
  return [
    chipRow('encounter', t('gd.f.encounter'), ENCOUNTERS, f.encounter, (v) => tx(ENCOUNTER_WORDS[v], lang)),
    chipRow('habitats', t('gd.f.habitat'), HABITATS, f.habitats, (v) => tx(HABITAT_WORDS[v], lang)),
    chipRow('seen', t('gd.f.seen'), SEEN.filter((s) => s !== 'records'), f.seen, (v) => tx(SEEN_WORDS[v], lang)),
    chipRow('times', t('gd.f.time'), TIMES, f.times, (v) => tx(TIME_WORDS[v], lang)),
    chipRow('sizes', t('gd.f.size'), SIZE_BANDS, f.sizes, (v) => t(`gd.size.${v}` as Key)),
    chipRow('methods', t('gd.f.method'), METHODS, f.methods, (v) => tx(METHOD_WORDS[v], lang)),
    chipRow('flags', t('gd.f.flags'), FLAGS, f.flags, (v) => t(`gd.flag.${v}` as Key)),
    `<label class="gd-switch"><input type="checkbox" data-f="records"${f.records ? ' checked' : ''}><span>${esc(t('gd.records'))}</span></label>`,
    `<button type="button" class="fc-ctl gd-clear" data-clear>${esc(t('gd.clear'))}</button>`,
  ].join('');
}

/** The sort and grouping pickers (the danger list adds grouping by how it hurts). */
export function pickersHtml(f: GdFilter, mode: GdMode): string {
  const sel = (key: string, label: string, opts: readonly string[], v: string, word: (o: string) => string) =>
    `<label class="gd-pick"><span class="fc-mono">${esc(label)}</span><select data-pick="${key}">${opts
      .map((o) => `<option value="${o}"${o === v ? ' selected' : ''}>${esc(word(o))}</option>`)
      .join('')}</select></label>`;
  const bys = GROUP_BYS.filter((b) => b !== 'risk' || mode === 'danger');
  return (
    sel('sort', t('gd.sort'), SORTS, f.sort, (o) => t(`gd.sort.${o}` as Key)) +
    sel('by', t('gd.by'), bys, bys.includes(f.by) ? f.by : 'sub', (o) => t(`gd.by.${o as GroupBy}` as Key))
  );
}

/** What the danger list and the edible list open with. */
export function sosHtml(): string {
  return `<aside class="gd-sos" aria-label="${esc(t('gd.sos.title'))}"><h3>${icon(ICONS.danger)}${esc(t('gd.sos.title'))}</h3>
    <p><b>${esc(t('gd.sos.call'))}</b></p><p>${esc(t('gd.sos.poison'))}</p><p>${esc(t('gd.sos.hospital'))}</p></aside>`;
}
export function introHtml(mode: GdMode): string {
  if (mode === 'danger') return `<div class="gd-intro">${sosHtml()}<p class="gd-intro-t">${esc(t('gd.danger.intro'))}</p></div>`;
  if (mode === 'edible')
    return `<div class="gd-intro"><aside class="gd-eat"><h3>${icon(ICONS.edible)}${esc(t('gd.eat.title'))}</h3><ul>${(['cigua', 'scombroid', 'shellfish', 'rules'] as const)
      .map((k) => `<li>${esc(t(`gd.eat.${k}`))}</li>`)
      .join('')}</ul><p><a class="cig-link" href="#ciguatera">${esc(t('gd.ciguateraLink'))}</a></p></aside></div>`;
  return '';
}

// ------------------------------------------------------------------ a species

/** Whether a food block says anything beyond its rules, i.e. how to catch, prepare or eat it. */
const hasEatInfo = (e: NonNullable<Species['eat']>) =>
  !!(e.taste || e.methods?.length || e.bait || e.lures || e.tackle || e.howTo || e.spear || e.clean || e.cook);

/** Taking it is banned (or the species is protected). */
export const isIllegal = (s: Pick<Species, 'edible' | 'eat'>) => !!s.eat?.illegal || s.edible === 'protected';

/** The banner over the catch and clean tabs of a species that is banned, or not normally eaten: emergency use only. */
export function emergencyHtml(s: Pick<Species, 'edible' | 'eat'>): string {
  if (isIllegal(s)) return `<section class="gd-blk gd-illegal" role="note"><h4 class="fc-mono">${esc(t('gd.illegal.title'))}</h4><p>${esc(t('gd.illegal.text'))}</p></section>`;
  if (s.edible && s.edible !== 'yes' && s.edible !== 'caution') return `<section class="gd-blk gd-warn" role="note"><h4 class="fc-mono">${esc(t('gd.notFood.title'))}</h4><p>${esc(t('gd.notFood.text'))}</p></section>`;
  return '';
}

export function tabsFor(s: Species): GdTab[] {
  const out: GdTab[] = ['about'];
  if (s.idTips || s.variants?.length || s.lookalikes?.length || s.look?.marks) out.push('id');
  if (s.about || s.facts?.length || s.diet || s.predators || s.behaviour || s.reproduction || s.lifespan) out.push('life');
  // Shown for every species with food notes, not only the edible list: a banned or risky one carries a banner (emergencyHtml).
  if (s.eat && (isFood(s) || hasEatInfo(s.eat))) out.push('catch');
  if (s.eat?.clean || s.eat?.cleanNotes) out.push('clean');
  if (s.danger || s.eat?.risks?.length || s.edible === 'toxic' || s.edible === 'caution' || s.edible === 'protected' || s.edibleNote) out.push('safety');
  if (s.sources?.length || s.check || s.photos?.length || s.evidence?.length) out.push('sources');
  return out;
}

export interface DetailOpts {
  lang: Lang;
  /** The section the page was opened at (page.ts scrolls to it). */
  tab?: GdTab;
  base: string;
  /** Position in the current list, for the arrows. */
  pos?: { i: number; n: number; prev?: string; next?: string };
  /** The link to another species (look-alikes), or null when it is not in the guide. */
  link: (sci: string) => string | null;
  /** The link to one of this species' sections. */
  tabHref: (tab: GdTab) => string;
  /** A look-alike's name in the reader's language and its bundled thumbnail, when it is in the guide. */
  peer?: (sci: string) => { name: string; thumb?: string } | null;
  /** Whether the reader has saved it. */
  fav?: boolean;
}

function credit(p: Photo): string {
  return `<a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(t('gd.d.photoBy', { by: p.by, lic: p.lic }))}</a>`;
}

/**
 * Photo hosts that send CORS headers. Asking for them with crossorigin makes the response readable, so the service worker
 * caches only a real 200 and never keeps a failed load (an opaque error) that would leave the photo broken for months.
 */
const CORS_HOST = /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|(upload|thumb)\.wikimedia\.org)\//;
/** The large photo's width: Wikimedia names it in the URL ("960px-"), iNaturalist "large" is 1024 on its long side. */
const bigWidth = (u: string) => Number(/\/(\d+)px-/.exec(u)?.[1]) || 1024;

function gallery(s: Species, lang: Lang): string {
  const ph = s.photos ?? [];
  if (!ph.length)
    return `<div class="gd-gal none g-${s.group}">${artSvg(artFor(s.group, s.sub), 'gd-gal-art')}<p class="fc-mono">${esc(t('gd.d.noPhoto'))}</p></div>`;
  return `<div class="gd-gal${ph.length > 1 ? ' many' : ''}" role="group" aria-label="${esc(t('gd.d.photos'))}">${ph
    .map(
      (p) => `<figure><img src="${esc(p.src)}"${CORS_HOST.test(p.src) ? ' crossorigin="anonymous"' : ''}${p.big ? ` srcset="${esc(p.src)} 500w, ${esc(p.big)} ${bigWidth(p.big)}w" sizes="(min-width: 960px) 720px, 100vw"` : ''} alt="${esc(`${nameOf({ en: s.names?.en ?? [], es: s.names?.es ?? [], sci: s.sci }, lang)}${p.v ? ` · ${tx(VARIANT_WORDS[p.v], lang)}` : ''}`)}" loading="lazy" decoding="async"${p.w && p.h ? ` width="${p.w}" height="${p.h}"` : ''}>
        <figcaption>${p.v ? `<b class="fc-mono">${esc(tx(VARIANT_WORDS[p.v], lang))}</b>` : ''}${credit(p)}</figcaption></figure>`,
    )
    .join('')}</div>`;
}

function factTiles(s: Species, lang: Lang): string {
  const tiles: [string, string, string?][] = [];
  const size = sizeMain(s.size);
  if (size !== '--') tiles.push([t('gd.k.size'), size, sizeMax(s.size, lang)]);
  const w = weightText(s.weight, lang);
  if (w) tiles.push([t('gd.k.weight'), w]);
  const d = depthLines(s.depth, lang);
  if (s.depth) tiles.push([t('gd.k.depth'), d.main, d.range]);
  if (s.seen) tiles.push([t('gd.k.often'), tx(SEEN_WORDS[s.seen], lang)]);
  const seenAt = timesText(s.seenAt, lang), feeds = timesText(s.feedsAt, lang);
  if (seenAt) tiles.push([t('gd.k.seen'), seenAt]);
  if (feeds) tiles.push([t('gd.k.feeds'), feeds]);
  return `<div class="gd-facts-t">${tiles
    .map(([k, v, sub]) => `<div class="gd-tile"><p class="fc-mono">${esc(k)}</p><b>${esc(v)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`)
    .join('')}</div>`;
}

/**
 * The species' badges. `top` is the set under its name: the four answers already say whether it is food, whether it
 * hurts, whether it is illegal and whether it is recorded here, so only the rest show there (the Sources section shows
 * them all).
 */
function statusBadges(s: Species, lang: Lang, top = false): string {
  const out: string[] = [];
  if (s.tier === 'list') out.push(`<span class="gd-b rec">${esc(t('gd.recordsOnly'))}</span>`);
  if (!top && s.rec && s.rec !== 'here') out.push(`<span class="gd-b rec" title="${esc(s.recWhy ?? '')}">${esc(t(s.rec === 'near' ? 'gd.rec.near' : 'gd.rec.none'))}</span>`);
  if (!top && s.danger) out.push(`<span class="gd-b dz l${s.danger.level}">${icon(ICONS.danger)}${esc(tx(LEVEL_WORDS[s.danger.level], lang))}</span>`);
  const st = s.status;
  const ban = bannedHere({ edible: s.edible, illegal: s.eat?.illegal, protectedCR: st?.protectedCR });
  // "Illegal" already says "do not take" (Joseph 2026-11-16: one word for the law, ratings in words).
  if (!top && s.edible && !(ban && s.edible === 'protected')) out.push(`<span class="gd-b ed-${s.edible}">${s.edible === 'yes' || s.edible === 'caution' || s.edible === 'toxic' ? icon(ICONS.edible) : s.edible === 'protected' ? icon(ICONS.shield) : ''}${esc(tx(EDIBLE_WORDS[s.edible], lang))}</span>`);
  if (ban && !top) out.push(`<span class="gd-b iucn i-CR">${icon(ICONS.shield)}${esc(illegalWords(st?.iucn, lang))}</span>`);
  if (st?.iucn && st.iucn !== 'NE' && !(ban && THREAT.has(st.iucn) && !top)) out.push(`<span class="gd-b iucn i-${st.iucn}">${esc(tx(IUCN_WORDS[st.iucn], lang))}</span>`);
  if (st?.cites) out.push(`<span class="gd-b prot">${icon(ICONS.shield)}CITES ${esc(st.cites)}</span>`);
  if (st?.origin === 'invasive' || st?.origin === 'introduced') out.push(`<span class="gd-b introd">${esc(t('gd.flag.introduced'))}</span>`);
  // No "Not confirmed" here: it read as if the species itself were unconfirmed (snook). It sits beside the line
  // that needs checking instead (Joseph 2026-11-16).
  return out.length ? `<div class="gd-badges">${out.join('')}</div>` : '';
}

const block = (title: string, body: string, cls = '') => (body ? `<section class="gd-blk${cls ? ` ${cls}` : ''}"><h4 class="fc-mono">${esc(title)}</h4>${body}</section>` : '');
const pText = (v: Txt | undefined, lang: Lang) => (txt(v, lang) ? paras(txt(v, lang)) : '');
const chips = (words: string[]) => (words.length ? `<div class="gd-tags">${words.map((w) => `<span>${esc(w)}</span>`).join('')}</div>` : '');
/** Fun facts, Joseph 2026-11-16: the name first, then the surprising things, on a card of their own. */
function factsHtml(s: Species, lang: Lang): string {
  if (!s.facts?.length) return '';
  return `<section class="gd-blk gd-fun"><h4 class="fc-mono">${esc(t('gd.h.facts'))}</h4><ul>${s.facts
    .map((f) => `<li class="${f.kind}">${f.kind === 'name' ? `<b>${esc(t('gd.h.factName'))}</b> ` : ''}${esc(txt(f.text, lang))}</li>`)
    .join('')}</ul></section>`;
}

/** Eaten here but endangered worldwide, with no ban found (Joseph 2026-11-16): ask for a live release. Banned ones have their own banner. */
const releaseNote = (s: Species): Key | undefined =>
  (s.edible === 'yes' || s.edible === 'caution') && !s.eat?.illegal && (s.status?.iucn === 'CR' || s.status?.iucn === 'EN')
    ? s.status.iucn === 'CR' ? 'gd.release.CR' : 'gd.release.EN'
    : undefined;
const checkMark = () => ` <span class="gd-b chk" title="${esc(t('gd.checkTitle'))}">${icon(ICONS.check)}${esc(t('gd.check'))}</span>`;

// ------------------------------------------------------------------ one page per species (Joseph 2026-11-17, option E)

/**
 * The page's sections, in reading order. The keys are the old tab keys, so `#guide/<view>/<id>/<tab>` links still work:
 * they open the page at that section. Look first (it answers "what is it?"), then where, life, catch, clean, safety
 * and sources.
 */
export const SECTION_ORDER: readonly GdTab[] = ['id', 'about', 'life', 'catch', 'clean', 'safety', 'sources'];

const SEC_ICONS: Record<GdTab, string> = {
  id: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  about: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  life: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l8-8"/>',
  catch: '<path d="M16 3v11a4.5 4.5 0 0 1-9 0v-2"/><path d="M7 12l-2.5 2.5"/><circle cx="16" cy="3" r="1"/>',
  clean: '<path d="M3 17l11-11 4 4-11 11H3z"/><path d="M14 6l2-2 4 4-2 2"/>',
  safety: '<path d="M12 2.8l7.5 2.7v6c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9v-6z"/><path d="M12 8v5M12 15.5v.5"/>',
  sources: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
};

/**
 * A text cut after its first sentence when it is long: the first sentence shows, the rest waits under "More"
 * (Joseph 2026-11-16: never walls of text; 2026-11-17: keep every word of the research). A sentence ends at . ! or ?
 * (and any source markers after it) followed by a capital, a number or the end, so "e.g. three" does not end one.
 */
export function splitLead(text: string, max = 26): [string, string] {
  const s = text.trim();
  if (s.split(/\s+/).length <= max) return [s, ''];
  const first = s.split(/\n\s*\n/)[0];
  const m = /^[\s\S]*?[.!?](?:\[\^\d+\])*(?=\s+[\p{Lu}\d"“¿¡(]|$)/u.exec(first);
  const lead = (m ? m[0] : first).trim();
  const rest = s.slice(s.indexOf(lead) + lead.length).trim();
  // Not worth a button for a few words.
  return rest.split(/\s+/).length < 6 ? [s, ''] : [lead, rest];
}

/** A long text as its first sentence, with the rest under "More". */
function lead(v: Txt | string | undefined, lang: Lang, cls = '', more = t('gd.fold')): string {
  const s = typeof v === 'string' ? v.trim() : txt(v, lang);
  if (!s) return '';
  const [a, b] = splitLead(s);
  return `<p${cls ? ` class="${cls}"` : ''}>${esc(a).replace(/\n\s*\n/g, '</p><p>')}</p>${b ? foldHtml(more, paras(b)) : ''}`;
}
const foldHtml = (label: string, body: string, cls = '') => `<details class="gd-fold${cls ? ` ${cls}` : ''}"><summary>${esc(label)}</summary><div>${body}</div></details>`;

/** How common: N of the SurCast mark's 8 runs lit (Abundant 8 down to No recent sightings 1). */
const SEEN_RUNS: Record<string, number> = { common: 8, frequent: 6, occasional: 4, rare: 2, records: 1 };
export function seenMark(n: number): string {
  return `<svg class="gd-ens" viewBox="2 2 60 60" aria-hidden="true">${RUN_TOKENS.map((k, i) => `<path class="${i < n ? `on r-${k}` : 'off'}" d="${runPath(i)}"/>`).join('')}<circle cx="9" cy="53" r="3"/></svg>`;
}

interface Answer { k: 'eat' | 'hurts' | 'rules' | 'here'; word: string; tone: 'ok' | 'warn' | 'bad' | 'info' | 'none'; ico: string; to: GdTab }

/** The four things people ask first (Joseph 2026-11-17): can I eat it, does it hurt, what are the rules, is it here. */
export function answers(s: Species, lang: Lang, has: (k: GdTab) => boolean): Answer[] {
  const e = s.eat;
  const ban = bannedHere({ edible: s.edible, illegal: e?.illegal, protectedCR: s.status?.protectedCR });
  const pick = (...ks: GdTab[]) => ks.find(has) ?? 'about';
  const eat: Answer = ban
    ? { k: 'eat', word: t('gd.flag.illegalShort'), tone: 'bad', ico: ICONS.shield, to: pick('catch', 'safety') }
    : s.edible === 'yes' ? { k: 'eat', word: tx(EDIBLE_WORDS.yes, lang), tone: 'ok', ico: ICONS.edible, to: pick('catch', 'safety') }
    : s.edible === 'caution' ? { k: 'eat', word: t('gd.ans.care'), tone: 'warn', ico: ICONS.edible, to: pick('catch', 'safety') }
    : s.edible === 'toxic' ? { k: 'eat', word: t('gd.ans.poison'), tone: 'bad', ico: ICONS.edible, to: pick('safety', 'catch') }
    : { k: 'eat', word: s.edible === 'no' ? tx(EDIBLE_WORDS.no, lang) : t('gd.ans.unknown'), tone: 'none', ico: ICONS.edible, to: pick('catch', 'safety') };
  const kinds = (s.danger?.kinds ?? []).filter((k) => k !== 'toxic-to-eat');
  const eatOnly = !kinds.length && (s.danger?.kinds?.includes('toxic-to-eat') || s.edible === 'toxic' || !!e?.risks?.some((r) => r !== 'spines'));
  const hurts: Answer = kinds.length
    ? { k: 'hurts', word: tx(KIND_WORDS[kinds[0]], lang), tone: (s.danger?.level ?? 1) >= 2 ? 'bad' : 'warn', ico: ICONS.danger, to: pick('safety') }
    : eatOnly ? { k: 'hurts', word: t('gd.ans.ifEaten'), tone: 'warn', ico: ICONS.danger, to: pick('safety') }
    : { k: 'hurts', word: t('gd.ans.noHarm'), tone: 'ok', ico: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', to: pick('safety', 'about') };
  const rules: Answer = ban
    ? { k: 'rules', word: t('gd.flag.illegalShort'), tone: 'bad', ico: ICONS.shield, to: pick('catch', 'safety', 'sources') }
    : txt(e?.rules, lang) ? { k: 'rules', word: t(e?.rulesCheck ? 'gd.check' : 'gd.ans.seeRules'), tone: 'info', ico: ICONS.shield, to: pick('catch') }
    : { k: 'rules', word: t('gd.ans.noRules'), tone: 'none', ico: ICONS.shield, to: pick('catch', 'sources') };
  const here: Answer =
    s.rec && s.rec !== 'here'
      ? { k: 'here', word: t(s.rec === 'near' ? 'gd.rec.near' : 'gd.rec.none'), tone: 'none', ico: '', to: 'about' }
      : s.tier === 'list' || !s.seen ? { k: 'here', word: t('gd.ans.records'), tone: 'none', ico: '', to: pick('sources', 'about') }
      : { k: 'here', word: tx(SEEN_WORDS[s.seen], lang), tone: 'info', ico: '', to: 'about' };
  return [eat, hurts, rules, here];
}

function answersHtml(s: Species, o: DetailOpts, has: (k: GdTab) => boolean): string {
  const runs = s.rec && s.rec !== 'here' ? 0 : SEEN_RUNS[s.seen ?? ''] ?? 0;
  return `<nav class="gd-ans" aria-label="${esc(t('gd.ans.title'))}">${answers(s, o.lang, has)
    .map((a) => `<a class="gd-an t-${a.tone}" href="${esc(o.tabHref(a.to))}" data-jump="${a.to}"><span class="q fc-mono">${esc(t(`gd.ans.${a.k}` as Key))}</span>${a.k === 'here' ? seenMark(runs) : icon(a.ico, 'gd-an-i')}<b>${esc(a.word)}</b></a>`)
    .join('')}</nav>`;
}

/** Look-alikes as photo pairs: this species beside the one it is mixed up with, and the tip that tells them apart. */
function lookalikesHtml(s: Species, o: DetailOpts): string {
  if (!s.lookalikes?.length) return '';
  const me = s.photos?.[0]?.src;
  const myName = nameOf({ en: s.names?.en ?? [], es: s.names?.es ?? [], sci: s.sci }, o.lang);
  const fig = (src: string | undefined, name: string, cls: string, href?: string | null) => {
    const img = src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : `<span class="gd-la-na g-${s.group}">${artSvg(artFor(s.group, s.sub), 'gd-gal-art')}</span>`;
    return `<figure class="${cls}">${href ? `<a href="${esc(href)}">${img}</a>` : img}<figcaption>${esc(name)}</figcaption></figure>`;
  };
  return block(
    t('gd.h.lookalikes'),
    `<ul class="gd-la">${s.lookalikes
      .map((l) => {
        const href = o.link(l.sci);
        const peer = o.peer?.(l.sci);
        return `<li><div class="gd-la-pair">${fig(me, myName, 'me')}${fig(peer?.thumb, peer?.name ?? l.sci, 'it', href)}</div><p>${esc(txt(l.tip, o.lang))}</p></li>`;
      })
      .join('')}</ul>`,
  );
}

function sectionBody(s: Species, k: GdTab, o: DetailOpts, has: (k: GdTab) => boolean): string {
  const { lang } = o;
  const e = s.eat;
  switch (k) {
    case 'id':
      return (
        block(t('gd.h.marks'), s.look?.marks && !s.look.guessed ? `<p class="gd-lede">${esc(txt(s.look.marks, lang))}</p>` : '') +
        lookalikesHtml(s, o) +
        block(t('gd.h.idTips'), lead(s.idTips, lang)) +
        block(t('gd.h.variants'), s.variants?.length ? `<dl class="gd-dl">${s.variants.map((v) => `<dt>${esc(tx(VARIANT_WORDS[v.key], lang))}</dt><dd>${lead(v.text, lang)}</dd>`).join('')}</dl>` : '')
      );
    case 'about':
      return (
        factTiles(s, lang) +
        block(t('gd.h.where'), lead(s.where, lang)) +
        block(t('gd.h.season'), lead(s.season, lang)) +
        block(t('gd.k.habitat'), chips((s.habitats ?? []).map((h) => tx(HABITAT_WORDS[h], lang)))) +
        block(t('gd.k.meet'), chips((s.encounter ?? []).map((h) => tx(ENCOUNTER_WORDS[h], lang)))) +
        (s.tier === 'list' && txt(s.note, lang) ? block(t('gd.recordsOnly'), lead(s.note, lang)) : '')
      );
    case 'life':
      return (
        block(t('gd.h.story'), lead(s.about, lang, 'gd-lede', t('gd.readAll'))) +
        factsHtml(s, lang) +
        `<div class="gd-tiles2">${(
          [['gd.h.diet', s.diet], ['gd.h.predators', s.predators], ['gd.h.behaviour', s.behaviour], ['gd.h.repro', s.reproduction], ['gd.h.lifespan', s.lifespan]] as [Key, Txt | undefined][]
        )
          .filter(([, v]) => txt(v, lang))
          .map(([h, v]) => block(t(h), lead(v, lang), 'gd-tile2'))
          .join('')}</div>`
      );
    case 'catch': {
      if (!e) return `<p>${esc(t('gd.noCatch'))}</p>`;
      const q = e.quality ? `<p class="gd-q"><span class="gd-pips" aria-label="${e.quality}/5">${pips(e.quality)}</span></p>` : '';
      const gear = ([['gd.h.bait', e.bait], ['gd.h.lures', e.lures], ['gd.h.tackle', e.tackle], ['gd.h.when', e.when]] as [Key, Txt | undefined][]).filter(([, v]) => txt(v, lang));
      return (
        emergencyHtml(s) +
        block(t('gd.h.taste'), q + lead(e.taste, lang)) +
        block(t('gd.h.rules'), txt(e.rules, lang) ? lead(e.rules, lang, '', t('gd.allRules')) + (e.rulesCheck ? `<p>${checkMark()} ${esc(t('gd.checkTitle'))}</p>` : '') : '', 'gd-rules') +
        (releaseNote(s) ? `<p class="gd-release">${icon(ICONS.shield)}${esc(t(releaseNote(s)!))}</p>` : '') +
        block(t('gd.h.methods'), chips((e.methods ?? []).map((m) => tx(METHOD_WORDS[m], lang)))) +
        (gear.length ? `<div class="gd-tiles2">${gear.map(([h, v]) => block(t(h), lead(v, lang), 'gd-tile2')).join('')}</div>` : '') +
        block(t('gd.h.whereFish'), lead(e.where, lang)) +
        block(t('gd.h.howTo'), lead(e.howTo, lang)) +
        block(t('gd.h.spear'), lead(e.spear, lang)) +
        (hasDispatch(s.group) ? dispatchLinkHtml(lang) : '') +
        ciguaSizeHtml(e.ciguaSize, lang, true) +
        // The risks of eating it sit once, in Safety; here a pointer to them.
        (e.risks?.length && has('safety') ? `<p class="gd-note"><a href="${esc(o.tabHref('safety'))}" data-jump="safety">${esc(t('gd.seeRisks'))}</a></p>` : '')
      );
    }
    case 'clean':
      // The emergency banner shows once, over Catch when there is one.
      return (has('catch') ? '' : emergencyHtml(s)) + cleanHtml(e?.clean, lang, e?.cleanNotes, s.group) + block(t('gd.h.cook'), lead(e?.cook, lang));
    case 'safety': {
      const d = s.danger;
      return (
        (d
          ? `<section class="gd-blk gd-dz lv${d.level}"><h4 class="fc-mono">${esc(t('gd.h.danger'))} · ${esc(tx(LEVEL_WORDS[d.level], lang))}</h4>${chips(d.kinds.map((k) => tx(KIND_WORDS[k], lang)))}${lead(d.what, lang)}</section>` +
            // First aid stays whole: nobody should have to tap to read it in an emergency.
            block(t('gd.h.firstAid'), pText(d.firstAid, lang), 'gd-aid')
          : '') +
        (e?.risks?.length ? block(t('gd.h.eatRisk'), chips(e.risks.map((r) => tx(RISK_WORDS[r], lang))) + lead(e.riskNote, lang) + ciguateraLink(e.risks), 'gd-warn') : '') +
        // The catch section already shows the size to keep; here only for a species with no catch section.
        (has('catch') ? '' : ciguaSizeHtml(e?.ciguaSize, lang, true)) +
        block(t('gd.h.edible'), (s.edible ? `<p><b>${esc(tx(EDIBLE_WORDS[s.edible], lang))}</b></p>` : '') + lead(s.edibleNote, lang)) +
        (d || s.edible === 'toxic' || e?.risks?.length ? sosHtml() : '')
      );
    }
    case 'sources':
      return (
        statusBadges(s, lang, false) +
        block(t('gd.h.local'), s.recWhy ? `<p>${esc(s.recWhy)}${s.recCheck ? checkMark() : ''}</p>` : '') +
        block(t('gd.h.check'), txt(s.check, lang) ? `<p>${checkMark().trim()} ${esc(txt(s.check, lang))}</p>` : '', 'gd-chk') +
        block(t('gd.h.evidence'), s.evidence?.length ? `<ul class="gd-ev">${s.evidence.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '') +
        (s.taxon ? block(t('gd.h.tree'), `<dl class="gd-tax">${(['phylum', 'class', 'order', 'family', 'genus'] as const).filter((r) => s.taxon?.[r]).map((r) => `<dt class="fc-mono">${esc(t(`gd.rank.${r}` as Key))}</dt><dd>${esc(s.taxon![r]!)}</dd>`).join('')}</dl>`) : '') +
        `<section class="gd-blk gd-fn" id="gd-fn"><!--gd-fn--></section>` +
        block(
          t('gd.h.credits'),
          s.photos?.length
            ? `<ul class="gd-cred">${s.photos.map((p) => `<li>${p.v && tx(VARIANT_WORDS[p.v], lang) ? `${esc(tx(VARIANT_WORDS[p.v], lang))}: ` : ''}${credit(p)} · ${p.from === 'inaturalist' ? 'iNaturalist' : 'Wikimedia Commons'}</li>`).join('')}</ul>`
            : '',
        )
      );
  }
}

/**
 * The species page (Joseph 2026-11-17, option E of the guide rethink): photos and names, the four answers, then every
 * section on one scrolling page with jump chips that stay at the top. Each section starts with its picture or its
 * first sentence and keeps the rest of the research under "More"; the sources are numbered once for the whole page.
 */
export function detailHtml(s: Species, o: DetailOpts): string {
  const { lang } = o;
  const names = { en: s.names?.en ?? [], es: s.names?.es ?? [], local: s.names?.local ?? [], sci: s.sci };
  const latin = latinOnly(names);
  const has = new Set(tabsFor(s));
  const secs = SECTION_ORDER.filter((k) => has.has(k));
  const other = lang === 'es' ? names.en : names.es;
  // One "also called" line: the other names in this language and the local ones, without repeating the title or, in Spanish, English names.
  const first = nameOf(names, lang);
  const alsoCalled = [...new Set([...(lang === 'es' ? names.es : names.en), ...names.local])].filter((n) => n && n !== first && !(lang === 'es' && names.en.includes(n))).slice(0, 8);
  const sub = tx(SUB_WORDS[s.sub], lang);
  // The family once: its everyday name, else the Latin one (the full tree is in Sources).
  const fam = [txt(s.familyName, lang) || s.taxon?.family].filter(Boolean);
  const pos = o.pos;
  const body = secs
    .map((k) => {
      const inner = sectionBody(s, k, o, (x) => secs.includes(x));
      return inner ? `<section class="gd-sec s-${k}" id="gd-s-${k}" data-sec="${k}" aria-labelledby="gd-sh-${k}"><h3 class="gd-sec-h" id="gd-sh-${k}">${icon(SEC_ICONS[k])}<span>${esc(t(`gd.tab.${k}` as Key))}</span></h3>${inner}</section>` : '';
    })
    .join('');
  const page = citePage(body, s.sources, (n) => `<h4 class="fc-mono">${esc(t('gd.h.pageSources', { n }))}</h4>`).replace(
    /(<section class="gd-blk gd-fn" id="gd-fn">)(<h4[^]*?<\/h4>)(<ol id="gd-fn-list">[^]*?<\/ol>)/,
    (_, a: string, h: string, ol: string) => `${a}${h}<details class="gd-fold gd-fn-fold"><summary>${esc(t('gd.srcShow'))}</summary><div>${ol}</div></details><p class="gd-note">${esc(t('gd.srcTip'))}</p>`,
  );
  return `<div class="gd-d-top">
      <button type="button" class="fc-ctl gd-d-close" data-close title="${esc(t('gd.d.closeTitle'))}">${icon(ICONS.back)}<span>${esc(t('gd.d.close'))}</span></button>
      <button type="button" class="fc-ctl gd-fav" data-fav aria-pressed="${!!o.fav}" title="${esc(t('gd.fav.title'))}">${icon(ICONS.star)}<span>${esc(t(o.fav ? 'gd.fav.on' : 'gd.fav.off'))}</span></button>
      ${pos ? `<span class="gd-d-pos fc-mono">${esc(t('gd.d.of', { i: pos.i + 1, n: pos.n }))}</span>
      <button type="button" class="fc-ctl fc-sq" data-go="${esc(pos.prev ?? '')}" aria-label="${esc(t('gd.d.prev'))}"${pos.prev ? '' : ' disabled'}>${icon(ICONS.back)}</button>
      <button type="button" class="fc-ctl fc-sq" data-go="${esc(pos.next ?? '')}" aria-label="${esc(t('gd.d.next'))}"${pos.next ? '' : ' disabled'}>${icon(ICONS.next)}</button>` : ''}
    </div>
    ${gallery(s, lang)}
    <header class="gd-d-head g-${s.group}">
      <p class="gd-d-kind fc-mono">${esc(tx(GROUP_WORDS[s.group].short, lang))}${sub ? ` · ${esc(sub)}` : ''}${fam.length ? ` · ${esc(fam.join(' · '))}` : ''}</p>
      <h2 id="gd-d-title"${latin ? ' class="sci"' : ''}>${esc(nameOf(names, lang))}</h2>
      ${latin ? '' : `<p class="gd-d-sci"><i>${esc(s.sci)}</i>${s.author ? ` <span>${esc(s.author)}</span>` : ''}</p>`}
      ${alsoCalled.length ? `<p class="gd-d-names"><span class="fc-mono">${esc(t('gd.d.local'))}</span> ${esc(alsoCalled.join(' · '))}</p>` : ''}
      ${other.length ? `<p class="gd-d-names"><span class="fc-mono">${esc(t('gd.d.otherNames'))}</span> ${esc(other.join(' · '))}</p>` : ''}
      ${statusBadges(s, lang, true)}
      ${showMapButton(s)}
    </header>
    ${answersHtml(s, o, (k) => has.has(k))}
    <nav class="gd-d-tabs" aria-label="${esc(t('gd.d.tabs'))}">${secs
      .map((k, i) => `<a class="gd-d-tab s-${k}" href="${esc(o.tabHref(k))}" data-jump="${k}"${i === 0 ? ' aria-current="true"' : ''}>${icon(SEC_ICONS[k])}<span>${esc(t(`gd.tab.${k}` as Key))}</span></a>`)
      .join('')}</nav>
    <div class="gd-d-body">${page}</div>
    <div class="gd-d-lang fc-mono"><span>${esc(t('gd.d.lang'))}</span><div class="fc-lang" role="group" aria-label="${esc(t('fc.langGroup'))}"><button type="button" data-setlang="en" aria-pressed="${lang === 'en'}">EN</button><button type="button" data-setlang="es" aria-pressed="${lang === 'es'}">ES</button></div></div>`;
}
