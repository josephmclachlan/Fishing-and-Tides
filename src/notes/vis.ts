/**
 * FIELD NOTES visual blocks: the page shows first and says little. Step flows with pictograms, drawings with numbered
 * marks, tiles, big numbers, tap-to-call cards, bar charts and side-by-side comparisons. Pure string builders, so they
 * are tested without a DOM. Every caption still goes through the citation numbering (`tx`), so superscripts stay in
 * reading order across text and pictures. Styles in notes.css (prefix `nt-`).
 */
import type { L } from '../ciguatera/content';
import type { NtTab } from './route';
import { pict, type PictId } from './icons';
import { WATER_FIGS } from './art/water';
import { SURF_FIGS } from './art/surf';
import { AID_FIGS } from './art/aid';
import { RIGS_FIGS } from './art/rigs';
import { MISC_FIGS } from './art/misc';
import { animalSvg, type AnimalId } from './art/animals';

type Lang = 'en' | 'es';
/** How a tile or cell reads: good, take care, do not, not confirmed, or plain information. */
export type Tone = 'go' | 'warn' | 'stop' | 'unk' | 'info';

/** Every drawing, by id. Each tab group keeps its own in art/<group>.ts. */
export const FIGS = { ...WATER_FIGS, ...SURF_FIGS, ...AID_FIGS, ...RIGS_FIGS, ...MISC_FIGS };
export type FigId = keyof typeof FIGS;

export type VBlock =
  /** Numbered steps, each a pictogram and a short line. `alert` draws it as the emergency card. */
  | { k: 'flow'; h?: L; alert?: boolean; steps: { ico: PictId; h: L; t?: L; tone?: Tone }[] }
  /** A grid of pictogram tiles. */
  | { k: 'tiles'; h?: L; items: { ico: PictId; h: L; t?: L; tone?: Tone }[] }
  /** A drawing with its numbered marks; `tones` colours each mark's badge; `alt` is the one line under it. */
  | { k: 'fig'; fig: FigId; label: L; marks: L[]; tones?: Tone[]; alt?: L }
  /** Big numbers or short phrases with one line each. */
  | { k: 'stats'; items: { n: L; t: L }[] }
  /** Tap-to-call cards. */
  | { k: 'calls'; items: { n: string; tel?: string; h: L; t?: L }[] }
  /** Linear bars from 0 to `max`, labelled in `unit`. */
  | { k: 'hbars'; h: L; ico?: PictId; max: number; unit: string; rows: { label: L; v: number }[]; note?: L }
  /** Two or more places side by side, row by row. */
  | { k: 'compare'; cols: L[]; rows: { ico: PictId; h: L; cells: { tone: Tone; t: L }[] }[] }
  /** A card that opens another tab. */
  | { k: 'go'; tab: NtTab; ico: PictId; h: L; t: L }
  /** Illustrated cards: a drawing or pictogram, a title, one line and up to a few short points (rigs, release steps, recipes). */
  | { k: 'cards'; h?: L; items: { fig?: FigId; ico?: PictId; tag?: L; h: L; t?: L; list?: L[]; tone?: Tone }[] }
  /**
   * A recipe: a drawing, the dish, one line on what it is, how many it serves, the ingredients as short chips, and
   * numbered steps, each with an optional time or temperature pill (`at`).
   */
  | { k: 'recipe'; fig?: FigId; tag?: L; h: L; t?: L; serves?: L; ings: L[]; steps: { t: L; at?: L }[]; tone?: Tone }
  /** Two columns: what to do and what not to do. */
  | { k: 'dodont'; h?: L; do: L[]; dont: L[] }
  /**
   * A heat grid: one row per thing, one cell per column (months), each cell a level 0 to 3 (none, low, good, best).
   * `hue` picks the colour ramp: fish (green), closed (red), nest (blue), rain (blue-grey). `key` names each level used.
   */
  /** A first aid incident: a big heading with its animal, that the index at the top of the tab jumps to (`nt-inc-<id>`). */
  | { k: 'inc'; id: string; an: AnimalId; t: L }
  /** The index of incidents: one big tappable chip each, with its animal. */
  | { k: 'index'; h: L; items: { id: string; an: AnimalId; t: L }[] }
  /** Animal pictures with their names, so a reader can match what hurt them. */
  | { k: 'animals'; items: { an: AnimalId; h: L; t?: L }[] }
  | { k: 'heat'; h?: L; cols: L[]; rows: { h: L; v: number[]; hue?: 'fish' | 'closed' | 'nest' | 'rain' }[]; key: { v: number; hue?: 'fish' | 'closed' | 'nest' | 'rain'; t: L }[]; note?: L };

export type Tx = (l: L) => string;

const TONE_ICO: Record<Tone, string> = {
  go: '<path d="M6 12.5l4 4 8-9"/>',
  warn: '<path d="M12 6v8"/><circle cx="12" cy="18" r="1.4"/>',
  stop: '<path d="M7 7l10 10M17 7L7 17"/>',
  unk: '<path d="M9.4 9a2.7 2.7 0 1 1 3.7 2.5c-.7.3-1.1.9-1.1 1.6v.5"/><circle cx="12" cy="17.5" r="1.3"/>',
  info: '<path d="M12 11v7"/><circle cx="12" cy="7" r="1.4"/>',
};
const TONE_WORD: Record<Tone, L> = {
  go: { en: 'Yes', es: 'Sí' },
  warn: { en: 'Take care', es: 'Cuidado' },
  stop: { en: 'No', es: 'No' },
  unk: { en: 'Not confirmed', es: 'No confirmado' },
  info: { en: 'Information', es: 'Información' },
};
const chip = (tone: Tone, lang: Lang) => `<svg class="nt-chip nt-${tone}" viewBox="0 0 24 24" role="img" aria-label="${TONE_WORD[tone][lang]}">${TONE_ICO[tone]}</svg>`;

/** Phone numbers in a caption become tap-to-call links. Runs on escaped text, outside any tag. */
export function telify(html: string): string {
  return html
    .replace(/\+506 (\d{4})-(\d{4})/g, (m, a, b) => `<a class="nt-tel" href="tel:+506${a}${b}">${m}</a>`)
    .replace(/\+1 919 684 9111/g, (m) => `<a class="nt-tel" href="tel:+19196849111">${m}</a>`)
    .replace(/(?<![\d-])800-4686-9422/g, (m) => `<a class="nt-tel" href="tel:80046869422">${m}</a>`);
}

const head = (h: L | undefined, tx: Tx) => (h ? `<h3 class="nt-h">${tx(h)}</h3>` : '');

export function visHtml(b: VBlock, lang: Lang, tx0: Tx, href: (t: NtTab) => string): string {
  const tx: Tx = (l) => telify(tx0(l));
  switch (b.k) {
    case 'flow':
      return `<section class="nt-flow${b.alert ? ' nt-alert' : ''}">${head(b.h, tx)}<ol>${b.steps
        .map((s, i) => `<li class="nt-${s.tone ?? 'info'}"><b class="nt-n">${i + 1}</b>${pict(s.ico)}<h4>${tx(s.h)}</h4>${s.t ? `<p>${tx(s.t)}</p>` : ''}</li>`)
        .join('')}</ol></section>`;
    case 'tiles':
      return `${head(b.h, tx)}<ul class="nt-tiles">${b.items
        .map((s) => `<li class="nt-${s.tone ?? 'info'}">${pict(s.ico)}<div><h4>${tx(s.h)}</h4>${s.t ? `<p>${tx(s.t)}</p>` : ''}</div></li>`)
        .join('')}</ul>`;
    case 'fig': {
      const f = FIGS[b.fig];
      const marks = b.marks.map((m, i) => `<li class="nt-${b.tones?.[i] ?? 'info'}"><b>${i + 1}</b><span>${tx(m)}</span></li>`).join('');
      return `<figure class="nt-fig"><svg class="nt-art nt-art-${b.fig}" viewBox="${f.vb}" role="img" aria-label="${tx0(b.label).replace(/<[^>]+>/g, '')}">${f.art(lang)}</svg><figcaption><ol class="nt-marks">${marks}</ol>${b.alt ? `<p class="nt-alt">${tx(b.alt)}</p>` : ''}</figcaption></figure>`;
    }
    case 'stats':
      return `<ul class="nt-stats">${b.items.map((s) => `<li><b class="nt-big">${tx(s.n)}</b><p>${tx(s.t)}</p></li>`).join('')}</ul>`;
    case 'calls':
      return `<ul class="nt-calls">${b.items
        .map((c) => {
          const inner = `${pict('phone')}<b class="nt-big">${c.n}</b><span><strong>${tx(c.h)}</strong>${c.t ? ` ${tx(c.t)}` : ''}</span>`;
          return `<li>${c.tel ? `<a href="tel:${c.tel}">${inner}</a>` : `<div>${inner.replace(pict('phone'), pict('hospital'))}</div>`}</li>`;
        })
        .join('')}</ul>`;
    case 'hbars':
      return `<section class="nt-hb"><h3 class="nt-h">${b.ico ? pict(b.ico) : ''}<span>${tx(b.h)}</span></h3><ul>${b.rows
        .map((r) => `<li><span class="nt-hbl">${tx(r.label)}</span><span class="nt-hbt"><i style="width:${((r.v / b.max) * 100).toFixed(1)}%"><b>${r.v} ${b.unit}</b></i></span></li>`)
        .join('')}</ul>${b.note ? `<p class="nt-alt">${tx(b.note)}</p>` : ''}</section>`;
    case 'compare': {
      const cols = b.cols.map((c) => `<th scope="col">${tx(c)}</th>`).join('');
      const rows = b.rows
        .map((r) => `<tr><th scope="row" colspan="${b.cols.length}"><div class="nt-rh">${pict(r.ico)}<span>${tx(r.h)}</span></div></th></tr><tr class="nt-cr">${r.cells.map((c) => `<td class="nt-${c.tone}"><div>${c.tone === 'info' ? '' : chip(c.tone, lang)}<span>${tx(c.t)}</span></div></td>`).join('')}</tr>`)
        .join('');
      return `<div class="nt-cmp-w"><table class="nt-cmp"><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case 'go':
      return `<a class="nt-go" href="${href(b.tab)}">${pict(b.ico)}<span><strong>${tx(b.h)}</strong><span>${tx(b.t)}</span></span><svg class="nt-i nt-arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`;
    case 'cards':
      return `${head(b.h, tx)}<div class="nt-cards">${b.items
        .map((c) => {
          const f = c.fig ? FIGS[c.fig] : undefined;
          const art = f ? `<svg class="nt-art nt-art-${c.fig}" viewBox="${f.vb}" role="img" aria-label="${tx0(c.h).replace(/<[^>]+>/g, '')}">${f.art(lang)}</svg>` : '';
          return `<article class="nt-card nt-${c.tone ?? 'info'}">${art}<div class="nt-card-b">${c.tag ? `<p class="nt-tag">${tx(c.tag)}</p>` : ''}<h4>${c.ico ? pict(c.ico) : ''}<span>${tx(c.h)}</span></h4>${c.t ? `<p>${tx(c.t)}</p>` : ''}${c.list?.length ? `<ul>${c.list.map((x) => `<li>${tx(x)}</li>`).join('')}</ul>` : ''}</div></article>`;
        })
        .join('')}</div>`;
    case 'recipe': {
      const f = b.fig ? FIGS[b.fig] : undefined;
      const art = f ? `<svg class="nt-art nt-art-${b.fig}" viewBox="${f.vb}" role="img" aria-label="${tx0(b.h).replace(/<[^>]+>/g, '')}">${f.art(lang)}</svg>` : '';
      const ings = `<ul class="nt-ings" aria-label="${lang === 'es' ? 'Ingredientes' : 'Ingredients'}">${b.ings.map((x) => `<li>${tx(x)}</li>`).join('')}</ul>`;
      const steps = `<ol class="nt-rsteps">${b.steps.map((st, i) => `<li><b class="nt-n">${i + 1}</b><span>${tx(st.t)}</span>${st.at ? `<em>${tx(st.at)}</em>` : ''}</li>`).join('')}</ol>`;
      return `<article class="nt-card nt-recipe nt-${b.tone ?? 'info'}">${art}<div class="nt-card-b">${b.tag ? `<p class="nt-tag">${tx(b.tag)}</p>` : ''}<h4><span>${tx(b.h)}</span>${b.serves ? `<small>${tx(b.serves)}</small>` : ''}</h4>${b.t ? `<p>${tx(b.t)}</p>` : ''}${ings}${steps}</div></article>`;
    }
    case 'dodont': {
      const col = (cls: string, word: L, items: L[]) => `<div class="nt-dd-${cls}"><h4>${chip(cls === 'do' ? 'go' : 'stop', lang)}<span>${word[lang]}</span></h4><ul>${items.map((x) => `<li>${tx(x)}</li>`).join('')}</ul></div>`;
      return `${head(b.h, tx)}<div class="nt-dd">${col('do', { en: 'Do', es: 'Haga' }, b.do)}${col('dont', { en: 'Do not', es: 'No haga' }, b.dont)}</div>`;
    }
    case 'inc':
      return `<h3 class="nt-inc" id="nt-inc-${b.id}">${animalSvg(b.an)}<span>${tx(b.t)}</span></h3>`;
    case 'index':
      return `<nav class="nt-idx"><h3>${tx(b.h)}</h3><ul>${b.items.map((i) => `<li><a href="#nt-inc-${i.id}">${animalSvg(i.an)}<span>${tx(i.t)}</span></a></li>`).join('')}</ul></nav>`;
    case 'animals':
      return `<ul class="nt-anim">${b.items.map((i) => `<li>${animalSvg(i.an)}<h4>${tx(i.h)}</h4>${i.t ? `<p>${tx(i.t)}</p>` : ''}</li>`).join('')}</ul>`;
    case 'heat': {
      const cols = b.cols.map((c) => `<span class="nt-hc">${tx(c)}</span>`).join('');
      const rows = b.rows
        .map((r) => `<div class="nt-hr"><span class="nt-hl">${tx(r.h)}</span>${r.v.map((v, i) => `<i class="nt-hv h${Math.max(0, Math.min(3, v))} nt-hue-${r.hue ?? 'fish'}" title="${b.cols[i]?.[lang] ?? ''}"></i>`).join('')}</div>`)
        .join('');
      const key = b.key.map((k) => `<li><i class="nt-hv h${k.v} nt-hue-${k.hue ?? 'fish'}"></i>${tx(k.t)}</li>`).join('');
      return `${head(b.h, tx)}<div class="nt-heat-w"><div class="nt-heat" style="--n:${b.cols.length}"><div class="nt-hr nt-hhead"><span class="nt-hl"></span>${cols}</div>${rows}</div></div><ul class="nt-hkey">${key}</ul>${b.note ? `<p class="nt-alt">${tx(b.note)}</p>` : ''}`;
    }
  }
}
