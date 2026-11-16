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
import { citeTab } from './cite';
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
export function ciguaSizeHtml(c: NonNullable<Species['eat']>['ciguaSize'], lang: Lang): string {
  if (!c || !txt(c.advice, lang)) return '';
  const lim = [c.maxCm ? `${c.maxCm} cm` : '', c.maxKg ? `${c.maxKg} kg` : ''].filter(Boolean).join(' · ');
  const head = lim ? `<p class="gd-csz"><b>${esc(t('gd.csz.keep', { lim }))}</b> <span class="gd-b">${esc(t(`gd.csz.${c.basis}` as Key))}</span></p>` : `<p class="gd-csz"><span class="gd-b">${esc(t(`gd.csz.${c.basis}` as Key))}</span></p>`;
  return block(t('gd.h.ciguaSize'), head + paras(txt(c.advice, lang)), 'gd-warn');
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
}

/** Taking it is banned on this coast: protected by law, marked illegal, or not to be eaten because it is protected. */
const bannedHere = (e: { edible?: string; illegal?: boolean; protectedCR?: boolean }) => !!(e.protectedCR || e.illegal || e.edible === 'protected');

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
  // Critically endangered and banned here: one plain "Illegal" badge in place of "Protected" and "CR" (Joseph 2026-11-16).
  const crBan = e.iucn === 'CR' && bannedHere(e);
  if (crBan) out.push(`<span class="gd-b iucn i-CR" title="${esc(t('gd.flag.illegalCR'))}">${icon(ICONS.shield)}${esc(t('gd.flag.illegalShort'))}</span>`);
  else if (!isFood(e) && e.edible === 'protected') out.push(`<span class="gd-b prot">${icon(ICONS.shield)}${esc(t('gd.flag.protected'))}</span>`);
  else if (!isFood(e) && e.illegal) out.push(`<span class="gd-b prot">${icon(ICONS.shield)}${esc(t('gd.flag.illegal'))}</span>`);
  if (!crBan && (e.iucn === 'CR' || e.iucn === 'EN' || e.iucn === 'VU'))
    out.push(`<span class="gd-b iucn i-${e.iucn}" title="${esc(tx(IUCN_WORDS[e.iucn], lang))}">${e.iucn === 'CR' ? esc(tx(IUCN_WORDS.CR, lang)) : e.iucn}</span>`);
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

/** A one-line "also recorded" species: Latin name, any common name and why it is only a record. */
export function recHtml(e: Entry, o: ListOpts): string {
  const name = latinOnly(e) ? '' : nameOf(e, o.lang);
  const note = txt(e.note, o.lang);
  return `<li><a class="gd-rec" href="${esc(o.href(e.id))}" data-id="${esc(e.id)}"><i>${esc(e.sci)}</i>${name ? `<span>${esc(name)}</span>` : ''}${note ? `<small>${esc(note)}</small>` : ''}</a></li>`;
}

export function sectionHead(s: Section, n: number): string {
  return `<header class="gd-sec-h${s.level ? ` lv${s.level}` : ''}"><h3${s.latin ? ' class="sci"' : ''}>${esc(s.title)}</h3><span class="gd-n fc-mono">${n}</span>${
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

/** Markup for a run of rows: cards gathered in a grid, records in a list, each run opened and closed here. */
export function rowsHtml(rows: readonly Row[], o: ListOpts): string {
  let html = '', open: 'cards' | 'recs' | null = null;
  const close = () => {
    if (open === 'cards') html += '</div>';
    else if (open === 'recs') html += '</ul>';
    open = null;
  };
  for (const r of rows) {
    if (r.k === 'card') {
      if (open !== 'cards') close(), (html += '<div class="gd-cards">'), (open = 'cards');
      html += cardHtml(r.e, o);
    } else if (r.k === 'rec') {
      if (open !== 'recs') close(), (html += '<ul class="gd-recs">'), (open = 'recs');
      html += recHtml(r.e, o);
    } else {
      close();
      html +=
        r.k === 'banner' ? groupBanner(r.g, r.n, o.lang)
        : r.k === 'head' ? sectionHead(r.s, r.n)
        : `<p class="gd-rec-h fc-mono">${esc(t('gd.alsoRec'))} · ${r.n}</p>`;
    }
  }
  close();
  return html;
}

// ------------------------------------------------------------------ the controls

const MODE_ICON: Record<GdMode, string> = { all: ICONS.all, identify: ICONS.identify, edible: ICONS.edible, danger: ICONS.danger, saved: ICONS.star };

export function modesHtml(mode: GdMode, counts: Record<GdMode, number>): string {
  return GD_MODES.map(
    (m) => `<button type="button" role="tab" class="gd-mode" data-mode="${m}" aria-selected="${m === mode}" tabindex="${m === mode ? 0 : -1}" aria-controls="gd-list">${icon(MODE_ICON[m])}<span>${esc(t(`gd.mode.${m}` as Key))}</span><sup class="fc-mono">${m === 'identify' ? '' : counts[m]}</sup></button>`,
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
  if (s.diet || s.predators || s.behaviour || s.reproduction || s.lifespan) out.push('life');
  // Shown for every species with food notes, not only the edible list: a banned or risky one carries a banner (emergencyHtml).
  if (s.eat && (isFood(s) || hasEatInfo(s.eat))) out.push('catch');
  if (s.eat?.clean || s.eat?.cleanNotes) out.push('clean');
  if (s.danger || s.eat?.risks?.length || s.edible === 'toxic' || s.edible === 'caution' || s.edible === 'protected' || s.edibleNote) out.push('safety');
  if (s.sources?.length || s.check || s.photos?.length || s.evidence?.length) out.push('sources');
  return out;
}

export interface DetailOpts {
  lang: Lang;
  tab: GdTab;
  base: string;
  /** Position in the current list, for the arrows. */
  pos?: { i: number; n: number; prev?: string; next?: string };
  /** The link to another species (look-alikes), or null when it is not in the guide. */
  link: (sci: string) => string | null;
  /** The link to one of this species' tabs. */
  tabHref: (tab: GdTab) => string;
  /** Whether the reader has saved it. */
  fav?: boolean;
}

function credit(p: Photo): string {
  return `<a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(t('gd.d.photoBy', { by: p.by, lic: p.lic }))}</a>`;
}

function gallery(s: Species, lang: Lang): string {
  const ph = s.photos ?? [];
  if (!ph.length)
    return `<div class="gd-gal none g-${s.group}">${artSvg(artFor(s.group, s.sub), 'gd-gal-art')}<p class="fc-mono">${esc(t('gd.d.noPhoto'))}</p></div>`;
  return `<div class="gd-gal${ph.length > 1 ? ' many' : ''}" role="group" aria-label="${esc(t('gd.d.photos'))}">${ph
    .map(
      (p) => `<figure><img src="${esc(p.src)}"${p.big ? ` srcset="${esc(p.src)} 500w, ${esc(p.big)} 1024w" sizes="(min-width: 960px) 720px, 100vw"` : ''} alt="${esc(`${nameOf({ en: s.names?.en ?? [], es: s.names?.es ?? [], sci: s.sci }, lang)}${p.v ? ` · ${tx(VARIANT_WORDS[p.v], lang)}` : ''}`)}" loading="lazy" decoding="async"${p.w && p.h ? ` width="${p.w}" height="${p.h}"` : ''}>
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

function statusBadges(s: Species, lang: Lang): string {
  const out: string[] = [];
  if (s.tier === 'list') out.push(`<span class="gd-b rec">${esc(t('gd.recordsOnly'))}</span>`);
  if (s.rec && s.rec !== 'here') out.push(`<span class="gd-b rec" title="${esc(s.recWhy ?? '')}">${esc(t(s.rec === 'near' ? 'gd.rec.near' : 'gd.rec.none'))}</span>`);
  if (s.danger) out.push(`<span class="gd-b dz l${s.danger.level}">${icon(ICONS.danger)}${esc(tx(LEVEL_WORDS[s.danger.level], lang))}</span>`);
  const st = s.status;
  const crBan = st?.iucn === 'CR' && bannedHere({ edible: s.edible, illegal: s.eat?.illegal, protectedCR: st.protectedCR });
  // "Illegal - critically endangered" already says "do not take".
  if (s.edible && !(crBan && s.edible === 'protected')) out.push(`<span class="gd-b ed-${s.edible}">${s.edible === 'yes' || s.edible === 'caution' || s.edible === 'toxic' ? icon(ICONS.edible) : s.edible === 'protected' ? icon(ICONS.shield) : ''}${esc(tx(EDIBLE_WORDS[s.edible], lang))}</span>`);
  if (crBan) out.push(`<span class="gd-b iucn i-CR">${icon(ICONS.shield)}${esc(t('gd.flag.illegalCR'))}</span>`);
  else if (st?.iucn && st.iucn !== 'NE') out.push(`<span class="gd-b iucn i-${st.iucn}">${st.iucn} · ${esc(tx(IUCN_WORDS[st.iucn], lang))}</span>`);
  if (st?.protectedCR && !crBan) out.push(`<span class="gd-b prot">${icon(ICONS.shield)}${esc(t('gd.flag.protectedHere'))}</span>`);
  if (st?.cites) out.push(`<span class="gd-b prot">${icon(ICONS.shield)}CITES ${esc(st.cites)}</span>`);
  if (st?.origin === 'invasive' || st?.origin === 'introduced') out.push(`<span class="gd-b introd">${esc(t('gd.flag.introduced'))}</span>`);
  if (s.check) out.push(`<span class="gd-b chk" title="${esc(t('gd.checkTitle'))}">${icon(ICONS.check)}${esc(t('gd.check'))}</span>`);
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

function tabBody(s: Species, tab: GdTab, o: DetailOpts): string {
  const { lang } = o;
  const e = s.eat;
  switch (tab) {
    case 'about':
      return (
        (txt(s.about, lang) ? paras(txt(s.about, lang), 'gd-lede') : '') +
        factsHtml(s, lang) +
        block(t('gd.h.where'), pText(s.where, lang)) +
        block(t('gd.h.season'), pText(s.season, lang)) +
        block(t('gd.k.habitat'), chips((s.habitats ?? []).map((h) => tx(HABITAT_WORDS[h], lang)))) +
        block(t('gd.k.meet'), chips((s.encounter ?? []).map((h) => tx(ENCOUNTER_WORDS[h], lang)))) +
        (s.tier === 'list' && txt(s.note, lang) ? block(t('gd.recordsOnly'), pText(s.note, lang)) : '')
      );
    case 'id':
      return (
        block(t('gd.h.marks'), s.look?.marks && !s.look.guessed ? `<p class="gd-lede">${esc(txt(s.look.marks, lang))}</p>` : '') +
        block(t('gd.h.idTips'), pText(s.idTips, lang)) +
        block(t('gd.h.variants'), s.variants?.length ? `<dl class="gd-dl">${s.variants.map((v) => `<dt>${esc(tx(VARIANT_WORDS[v.key], lang))}</dt><dd>${esc(txt(v.text, lang))}</dd>`).join('')}</dl>` : '') +
        block(
          t('gd.h.lookalikes'),
          s.lookalikes?.length
            ? `<ul class="gd-look">${s.lookalikes
                .map((l) => {
                  const href = o.link(l.sci);
                  return `<li>${href ? `<a href="${esc(href)}"><i>${esc(l.sci)}</i></a>` : `<i>${esc(l.sci)}</i>`}<span>${esc(txt(l.tip, lang))}</span></li>`;
                })
                .join('')}</ul>`
            : '',
        )
      );
    case 'life':
      return (
        block(t('gd.h.diet'), pText(s.diet, lang)) +
        block(t('gd.h.predators'), pText(s.predators, lang)) +
        block(t('gd.h.behaviour'), pText(s.behaviour, lang)) +
        block(t('gd.h.repro'), pText(s.reproduction, lang)) +
        block(t('gd.h.lifespan'), pText(s.lifespan, lang))
      );
    case 'catch': {
      if (!e) return `<p>${esc(t('gd.noCatch'))}</p>`;
      const q = e.quality ? `<p class="gd-q"><span class="gd-pips" aria-label="${e.quality}/5">${pips(e.quality)}</span></p>` : '';
      return (
        emergencyHtml(s) +
        block(t('gd.h.taste'), q + pText(e.taste, lang)) +
        block(t('gd.h.rules'), txt(e.rules, lang) ? paras(txt(e.rules, lang)) + (e.rulesCheck ? `<p>${checkMark()} ${esc(t('gd.checkTitle'))}</p>` : '') : '', 'gd-rules') +
        (releaseNote(s) ? `<p class="gd-release">${icon(ICONS.shield)}${esc(t(releaseNote(s)!))}</p>` : '') +
        block(t('gd.h.methods'), chips((e.methods ?? []).map((m) => tx(METHOD_WORDS[m], lang)))) +
        `<dl class="gd-dl gd-fish">${(
          [
            ['gd.h.bait', e.bait], ['gd.h.lures', e.lures], ['gd.h.tackle', e.tackle], ['gd.h.when', e.when], ['gd.h.whereFish', e.where], ['gd.h.howTo', e.howTo], ['gd.h.spear', e.spear],
          ] as [Key, Txt | undefined][]
        )
          .filter(([, v]) => txt(v, lang))
          .map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(txt(v, lang))}</dd>`)
          .join('')}</dl>` +
        (hasDispatch(s.group) ? dispatchLinkHtml(lang) : '') +
        ciguaSizeHtml(e.ciguaSize, lang) +
        (e.risks?.length ? block(t('gd.h.eatRisk'), chips(e.risks.map((r) => tx(RISK_WORDS[r], lang))) + pText(e.riskNote, lang) + ciguateraLink(e.risks), 'gd-warn') : '')
      );
    }
    case 'clean':
      return emergencyHtml(s) + cleanHtml(e?.clean, lang, e?.cleanNotes, s.group) + block(t('gd.h.cook'), pText(e?.cook, lang));
    case 'safety': {
      const d = s.danger;
      return (
        (d
          ? `<section class="gd-blk gd-dz lv${d.level}"><h4 class="fc-mono">${esc(t('gd.h.danger'))} · ${esc(tx(LEVEL_WORDS[d.level], lang))}</h4>${chips(d.kinds.map((k) => tx(KIND_WORDS[k], lang)))}${pText(d.what, lang)}</section>` +
            block(t('gd.h.firstAid'), pText(d.firstAid, lang), 'gd-aid')
          : '') +
        (e?.risks?.length ? block(t('gd.h.eatRisk'), chips(e.risks.map((r) => tx(RISK_WORDS[r], lang))) + pText(e.riskNote, lang) + ciguateraLink(e.risks), 'gd-warn') : '') +
        ciguaSizeHtml(e?.ciguaSize, lang) +
        block(t('gd.h.edible'), (s.edible ? `<p><b>${esc(tx(EDIBLE_WORDS[s.edible], lang))}</b></p>` : '') + pText(s.edibleNote, lang)) +
        (d || s.edible === 'toxic' || e?.risks?.length ? sosHtml() : '')
      );
    }
    case 'sources':
      return (
        block(t('gd.h.local'), s.recWhy ? `<p>${esc(s.recWhy)}${s.recCheck ? checkMark() : ''}</p>` : '') +
        block(t('gd.h.check'), pText(s.check, lang), 'gd-chk') +
        block(t('gd.h.evidence'), s.evidence?.length ? `<ul class="gd-ev">${s.evidence.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '') +
        block(
          t('gd.h.sources'),
          s.sources?.length
            ? `<ul class="gd-src">${s.sources.filter((x) => !x.x).map((x) => `<li>${x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t)}</li>`).join('')}</ul>`
            : '',
        ) +
        block(
          t('gd.h.credits'),
          s.photos?.length
            ? `<ul class="gd-cred">${s.photos.map((p) => `<li>${p.v ? `${esc(tx(VARIANT_WORDS[p.v], lang))}: ` : ''}${credit(p)} · ${p.from === 'inaturalist' ? 'iNaturalist' : 'Wikimedia Commons'}</li>`).join('')}</ul>`
            : '',
        )
      );
  }
}

/** The species page: photos, names, badges, key numbers, then the chosen tab. */
export function detailHtml(s: Species, o: DetailOpts): string {
  const { lang } = o;
  const names = { en: s.names?.en ?? [], es: s.names?.es ?? [], local: s.names?.local ?? [], sci: s.sci };
  const latin = latinOnly(names);
  const tabs = tabsFor(s);
  const tab = tabs.includes(o.tab) ? o.tab : 'about';
  const other = lang === 'es' ? names.en : names.es;
  // One "also called" line: the other names in this language and the local ones, without repeating the title or, in Spanish, English names.
  const first = nameOf(names, lang);
  const alsoCalled = [...new Set([...(lang === 'es' ? names.es : names.en), ...names.local])].filter((n) => n && n !== first && !(lang === 'es' && names.en.includes(n))).slice(0, 8);
  const sub = tx(SUB_WORDS[s.sub], lang);
  const fam = [txt(s.familyName, lang), s.taxon?.family, s.taxon?.order].filter(Boolean);
  const pos = o.pos;
  return `<div class="gd-d-top">
      <button type="button" class="fc-ctl gd-d-close" data-close title="${esc(t('gd.d.closeTitle'))}">${icon(ICONS.back)}<span>${esc(t('gd.d.close'))}</span></button>
      <button type="button" class="fc-ctl gd-fav" data-fav aria-pressed="${!!o.fav}" title="${esc(t('gd.fav.title'))}">${icon(ICONS.star)}<span>${esc(t(o.fav ? 'gd.fav.on' : 'gd.fav.off'))}</span></button>
      ${pos ? `<span class="gd-d-pos fc-mono">${esc(t('gd.d.of', { i: pos.i + 1, n: pos.n }))}</span>
      <button type="button" class="fc-ctl fc-sq" data-go="${esc(pos.prev ?? '')}" aria-label="${esc(t('gd.d.prev'))}"${pos.prev ? '' : ' disabled'}>${icon(ICONS.back)}</button>
      <button type="button" class="fc-ctl fc-sq" data-go="${esc(pos.next ?? '')}" aria-label="${esc(t('gd.d.next'))}"${pos.next ? '' : ' disabled'}>${icon(ICONS.next)}</button>` : ''}
    </div>
    ${gallery(s, lang)}
    <header class="gd-d-head g-${s.group}">
      <p class="gd-d-kind fc-mono">${esc(tx(GROUP_WORDS[s.group].short, lang))}${sub ? ` · ${esc(sub)}` : ''}</p>
      <h2 id="gd-d-title"${latin ? ' class="sci"' : ''}>${esc(nameOf(names, lang))}</h2>
      ${latin ? '' : `<p class="gd-d-sci"><i>${esc(s.sci)}</i>${s.author ? ` <span>${esc(s.author)}</span>` : ''}</p>`}
      ${alsoCalled.length ? `<p class="gd-d-names"><span class="fc-mono">${esc(t('gd.d.local'))}</span> ${esc(alsoCalled.join(' · '))}</p>` : ''}
      ${other.length ? `<p class="gd-d-names"><span class="fc-mono">${esc(t('gd.d.otherNames'))}</span> ${esc(other.join(' · '))}</p>` : ''}
      ${fam.length ? `<p class="gd-d-fam">${esc(fam.join(' · '))}</p>` : ''}
      ${statusBadges(s, lang)}
      ${showMapButton(s)}
    </header>
    ${factTiles(s, lang)}
    <nav class="gd-d-tabs" role="tablist" aria-label="${esc(t('gd.d.tabs'))}">${tabs
      .map((k) => `<a role="tab" class="gd-d-tab" href="${esc(o.tabHref(k))}" data-tab="${k}" aria-selected="${k === tab}"${k === tab ? '' : ' tabindex="-1"'}>${esc(t(`gd.tab.${k}` as Key))}</a>`)
      .join('')}</nav>
    <div class="gd-d-body" role="tabpanel" data-tab="${tab}">${citeTab(tabBody(s, tab, o), s.sources, t('gd.h.tabSources'))}</div>
    <div class="gd-d-lang fc-mono"><span>${esc(t('gd.d.lang'))}</span><div class="fc-lang" role="group" aria-label="${esc(t('fc.langGroup'))}"><button type="button" data-setlang="en" aria-pressed="${lang === 'en'}">EN</button><button type="button" data-setlang="es" aria-pressed="${lang === 'es'}">ES</button></div></div>`;
}
