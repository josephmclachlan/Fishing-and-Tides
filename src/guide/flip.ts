/**
 * FLIP (PLAN 14.4, the guide rethink's option C inside the Atlas): any shelf, group or search result as big photo cards
 * to swipe through, one species at a time. Each card shows the photo, the name in the page's display type, its
 * colour-coded badges, size, depth and how common it is here, and its key marks; the full page is one tap away.
 */
import { t } from '../i18n';
import { artFor, artSvg } from './art';
import { stripCites } from './cite';
import { latinOnly, nameOf } from './filter';
import { badges, esc, icon, ICONS, tileTags, type ListOpts } from './render';
import { SEEN_WORDS, tx, type Entry } from './types';
import { bandText, sizeMain } from './view';

/** One card. */
export function flipCardHtml(e: Entry, o: ListOpts, i: number, n: number): string {
  const { lang } = o;
  const latin = latinOnly(e);
  const size = sizeMain(e.size);
  const facts = [size !== '--' ? size : '', e.depth ? bandText(e.depth[0], e.depth[1], lang) : '', e.seen ? tx(SEEN_WORDS[e.seen], lang) : ''].filter(Boolean);
  const marks = stripCites(tx(e.look?.marks, lang)).trim();
  const href = esc(o.href(e.id));
  const img = e.thumb
    ? `<img src="${esc(o.base + e.thumb)}" alt="" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async" width="480" height="360">`
    : artSvg(artFor(e.group, e.sub));
  return `<article class="gd-fc g-${e.group}" data-id="${esc(e.id)}" aria-roledescription="${esc(t('gd.flip.card'))}" aria-label="${esc(`${i + 1} / ${n}: ${nameOf(e, lang)}`)}">
    <a class="gd-fc-im${e.thumb ? ' gd-ph' : ''}" href="${href}" tabindex="-1">${img}${tileTags(e, lang)}</a>
    <div class="gd-fc-t">
      <h3${latin ? ' class="sci"' : ''}>${esc(nameOf(e, lang))}</h3>${latin ? '' : `<i class="gd-sci">${esc(e.sci)}</i>`}
      ${facts.length ? `<p class="gd-fc-f fc-mono">${esc(facts.join(' · '))}</p>` : ''}
      ${badges(e, lang, 4)}
      ${marks ? `<p class="gd-fc-m">${esc(marks)}</p>` : ''}
      <a class="fc-ctl gd-fc-open" href="${href}"><span>${esc(t('gd.flip.open'))}</span>${icon(ICONS.next)}</a>
    </div>
  </article>`;
}

/** The deck: every card of a list, side by side, one screen wide each. */
export function flipDeckHtml(list: readonly Entry[], o: ListOpts): string {
  return list.map((e, i) => flipCardHtml(e, o, i, list.length)).join('');
}

