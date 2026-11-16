/** CIGUATERA page HTML (PLAN 7.101): pure string builders over content.ts, so they are tested without a DOM. */
import { GRADE_WORDS, SECTIONS, SOURCES, type Block, type Grade, type L, type Section } from './content';
import type { CgTab } from './route';

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
export function cited(text: string, cites: Cites): string {
  return esc(text).replace(MARK, (run) => {
    const keys = [...run.matchAll(/\{([a-z0-9]+)\}/g)].map((m) => m[1]).filter((k) => k in SOURCES);
    const nums = keys.map((k) => {
      let i = cites.order.indexOf(k);
      if (i < 0) i = cites.order.push(k) - 1;
      return i + 1;
    });
    const uniq = [...new Set(nums)];
    return uniq.length ? `<sup class="cig-sup">${uniq.map((n) => `<a href="#cig-src-${n}" aria-label="source ${n}">${n}</a>`).join(',')}</sup>` : '';
  });
}
const tx = (l: L, lang: Lang, c: Cites): string => cited(l[lang], c);

/** Bar width on a log scale from 1 to 10,000, as a percentage with a visible minimum. */
export const barPct = (v: number): number => Math.max(3, Math.min(100, (Math.log10(Math.max(v, 1)) / 4) * 100));
const fmt = (v: number): string => (v >= 100 ? Math.round(v).toLocaleString('en-US') : String(v));

const GRADE_LEVEL: Record<Grade, number> = { strong: 4, weak: 2, case: 2, expert: 3, none: 1, against: 0 };

function block(b: Block, lang: Lang, c: Cites): string {
  switch (b.k) {
    case 'p':
      return `<p>${tx(b.t, lang, c)}</p>`;
    case 'h':
      return `<h3 class="cig-h fc-mono">${tx(b.t, lang, c)}</h3>`;
    case 'ul':
      return `<ul class="cig-ul">${b.items.map((i) => `<li>${tx(i, lang, c)}</li>`).join('')}</ul>`;
    case 'warn':
      return `<section class="cig-box cig-warn"><h4 class="fc-mono">${tx(b.h, lang, c)}</h4><p>${tx(b.t, lang, c)}</p></section>`;
    case 'aid':
      return `<section class="cig-box cig-aid"><h4 class="fc-mono">${tx(b.h, lang, c)}</h4><p>${tx(b.t, lang, c)}</p></section>`;
    case 'table':
      return `<div class="cig-tw"><table class="cig-t"><thead><tr>${b.head.map((h) => `<th scope="col" class="fc-mono">${tx(h, lang, c)}</th>`).join('')}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((cell, i) => (i === 0 ? `<th scope="row">${tx(cell, lang, c)}</th>` : `<td>${tx(cell, lang, c)}</td>`)).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
    case 'graded':
      return `<ul class="cig-gr">${b.rows
        .map((r) => `<li class="cig-g l${GRADE_LEVEL[r.grade]}"><span class="cig-chip fc-mono">${tx(GRADE_WORDS[r.grade], lang, c)}</span><b>${tx(r.item, lang, c)}</b><span>${tx(r.note, lang, c)}</span></li>`)
        .join('')}</ul>`;
    case 'bars':
      return `<ul class="cig-bars">${b.rows
        .map((r) => {
          const val = r.hi ? `${fmt(r.lo)} to ${fmt(r.hi)}` : fmt(r.lo);
          return `<li><span class="cig-bl">${tx(r.label, lang, c)}${r.note ? ` <em>${tx(r.note, lang, c)}</em>` : ''}</span><span class="cig-bt"><i style="width:${barPct(r.hi ?? r.lo).toFixed(1)}%"></i></span><b class="fc-mono">${esc(val)}</b></li>`;
        })
        .join('')}</ul><p class="cig-axis fc-mono">${esc(lang === 'es' ? 'ESCALA LOGARÍTMICA, 1 A 10.000' : 'LOG SCALE, 1 TO 10,000')}${b.cite ? cited(`{${b.cite}}`, c) : ''}</p>`;
  }
}

/** The section's sources in the order they were first cited, each with its number and whether it was read in full. */
export function sourcesHtml(lang: Lang, c: Cites): string {
  if (!c.order.length) return '';
  const head = lang === 'es' ? 'FUENTES' : 'SOURCES';
  const key = lang === 'es' ? 'P: leída completa. S: solo resumen, verifique antes de citar.' : 'P: read in full. S: read only as a summary, check before quoting.';
  return `<h3 class="cig-h fc-mono">${head}</h3><ol class="cig-src">${c.order
    .map((k, i) => {
      const s = SOURCES[k];
      return `<li id="cig-src-${i + 1}" value="${i + 1}">${s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t)} <span class="cig-p fc-mono" title="${esc(s.p === 'P' ? (lang === 'es' ? 'Leída completa' : 'Read in full') : lang === 'es' ? 'Solo resumen' : 'Summary only')}">${s.p}</span><br><span class="cig-w">${esc(s.what[lang])}</span></li>`;
    })
    .join('')}</ol><p class="cig-axis fc-mono">${esc(key)}</p>`;
}

export const sectionOf = (tab: CgTab): Section => SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0];

/** One section, its markers numbered from 1 and its sources listed in that order. */
export function sectionHtml(tab: CgTab, lang: Lang): string {
  const s = sectionOf(tab);
  const c: Cites = { order: [] };
  const body = s.blocks.map((b) => block(b, lang, c)).join('');
  return `<h2 class="cig-title">${tx(s.title, lang, c)}</h2><p class="cig-lede">${tx(s.lede, lang, c)}</p>${body}${sourcesHtml(lang, c)}`;
}

export function tabsHtml(active: CgTab, lang: Lang, href: (t: CgTab) => string): string {
  return SECTIONS.map((s) => `<a role="tab" class="cig-tab" href="${esc(href(s.id))}" data-tab="${s.id}" aria-selected="${s.id === active}"${s.id === active ? '' : ' tabindex="-1"'}>${esc(s.title[lang])}</a>`).join('');
}
