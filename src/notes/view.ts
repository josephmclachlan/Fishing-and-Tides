/** FIELD NOTES page HTML: pure string builders over content.ts and sections/*.ts, so they are tested without a DOM. */
import { isText, textBlock } from '../ciguatera/view';
import type { L, Source } from '../ciguatera/content';
import { ALL_NOTES, SECTIONS, type NBlock, type Section } from './content';
import { visHtml } from './vis';
import { notesHash, tabsFor, type NtAct, type NtTab } from './route';

type Lang = 'en' | 'es';
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/**
 * Citations: a source is named in the text only as `{key}` markers. They become superscript numbers, 1, 2, 3 in order of
 * first appearance on the section, and the section ends with its sources in the same order. Never a name in brackets.
 */
export interface Cites {
  order: string[];
}
const MARK = /(?:\{[a-z0-9]+\})+/g;
export function cited(text: string, cites: Cites, sources: Record<string, Source>): string {
  return esc(text).replace(MARK, (run) => {
    const keys = [...run.matchAll(/\{([a-z0-9]+)\}/g)].map((m) => m[1]).filter((k) => k in sources);
    const nums = keys.map((k) => {
      let i = cites.order.indexOf(k);
      if (i < 0) i = cites.order.push(k) - 1;
      return i + 1;
    });
    const uniq = [...new Set(nums)].sort((a, b) => a - b);
    return uniq.length ? `<sup class="cig-sup">${uniq.map((n) => `<a href="#cig-src-${n}" aria-label="source ${n}">${n}</a>`).join(',')}</sup>` : '';
  });
}
const tx = (l: L, lang: Lang, c: Cites, s: Record<string, Source>): string => cited(l[lang], c, s);

function block(b: NBlock, lang: Lang, c: Cites, S: Record<string, Source>, href: (t: NtTab) => string = notesHash): string {
  const t = (l: L) => tx(l, lang, c, S);
  if (!isText(b)) return visHtml(b, lang, t, href);
  return textBlock(b, lang, t, (k) => cited(`{${k}}`, c, S));
}

/** The section's sources in the order they were first cited, each with its number and whether it was read in full. */
export function sourcesHtml(lang: Lang, c: Cites, SOURCES: Record<string, Source>): string {
  if (!c.order.length) return '';
  const head = lang === 'es' ? 'FUENTES' : 'SOURCES';
  return `<h3 class="cig-h fc-mono">${head}</h3><ol class="cig-src">${c.order
    .map((k, i) => {
      const s = SOURCES[k];
      return `<li id="cig-src-${i + 1}" value="${i + 1}">${s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t)}<br><span class="cig-w">${esc(s.what[lang])}</span></li>`;
    })
    .join('')}</ol>`;
}

export const sectionOf = (tab: NtTab): Section => SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0];

/** One section, its markers numbered from 1 and its sources listed in that order. */
/** `act`: keep links to other tabs inside that activity's field notes when the tab is one of its own. */
export function sectionHtml(tab: NtTab, lang: Lang, act?: NtAct): string {
  const href = (t: NtTab) => notesHash(t, act && tabsFor(act).includes(t) ? act : undefined);
  const s = sectionOf(tab);
  const c: Cites = { order: [] };
  const body = s.blocks.map((b) => block(b, lang, c, s.sources, href)).join('');
  return `<h2 class="cig-title">${esc(s.title[lang])}</h2><p class="cig-lede">${tx(s.lede, lang, c, s.sources)}</p>${body}${sourcesHtml(lang, c, s.sources)}`;
}

export function tabsHtml(active: NtTab, lang: Lang, href: (t: NtTab) => string, act?: NtAct): string {
  const tabs = tabsFor(act).map((id) => sectionOf(id));
  const all = act ? `<a class="cig-tab nt-all" href="${esc(notesHash())}">${esc(ALL_NOTES[lang])} →</a>` : '';
  return tabs.map((s) => `<a role="tab" class="cig-tab" href="${esc(href(s.id))}" data-tab="${s.id}" aria-selected="${s.id === active}"${s.id === active ? '' : ' tabindex="-1"'}>${esc(s.title[lang])}</a>`).join('') + all;
}
