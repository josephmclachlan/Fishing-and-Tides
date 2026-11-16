/** CIGUATERA page HTML (PLAN 7.99): pure string builders over content.ts, so they are tested without a DOM. */
import { GRADE_WORDS, SECTIONS, SOURCES, type Block, type Grade, type L, type Section } from './content';
import type { CgTab } from './route';

type Lang = 'en' | 'es';
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const tx = (l: L, lang: Lang): string => esc(l[lang]);

/** Bar width on a log scale from 1 to 10,000, as a percentage with a visible minimum. */
export const barPct = (v: number): number => Math.max(3, Math.min(100, (Math.log10(Math.max(v, 1)) / 4) * 100));
const fmt = (v: number): string => (v >= 100 ? Math.round(v).toLocaleString('en-US') : String(v));

const GRADE_LEVEL: Record<Grade, number> = { strong: 4, weak: 2, case: 2, expert: 3, none: 1, against: 0 };

function block(b: Block, lang: Lang): string {
  switch (b.k) {
    case 'p':
      return `<p>${tx(b.t, lang)}</p>`;
    case 'h':
      return `<h3 class="cig-h fc-mono">${tx(b.t, lang)}</h3>`;
    case 'ul':
      return `<ul class="cig-ul">${b.items.map((i) => `<li>${tx(i, lang)}</li>`).join('')}</ul>`;
    case 'warn':
      return `<section class="cig-box cig-warn"><h4 class="fc-mono">${tx(b.h, lang)}</h4><p>${tx(b.t, lang)}</p></section>`;
    case 'aid':
      return `<section class="cig-box cig-aid"><h4 class="fc-mono">${tx(b.h, lang)}</h4><p>${tx(b.t, lang)}</p></section>`;
    case 'table':
      return `<div class="cig-tw"><table class="cig-t"><thead><tr>${b.head.map((h) => `<th scope="col" class="fc-mono">${tx(h, lang)}</th>`).join('')}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${tx(c, lang)}</th>` : `<td>${tx(c, lang)}</td>`)).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
    case 'graded':
      return `<ul class="cig-gr">${b.rows
        .map((r) => `<li class="cig-g l${GRADE_LEVEL[r.grade]}"><span class="cig-chip fc-mono">${tx(GRADE_WORDS[r.grade], lang)}</span><b>${tx(r.item, lang)}</b><span>${tx(r.note, lang)}</span></li>`)
        .join('')}</ul>`;
    case 'bars':
      return `<ul class="cig-bars">${b.rows
        .map((r) => {
          const val = r.hi ? `${fmt(r.lo)} to ${fmt(r.hi)}` : fmt(r.lo);
          return `<li><span class="cig-bl">${tx(r.label, lang)}${r.note ? ` <em>${tx(r.note, lang)}</em>` : ''}</span><span class="cig-bt"><i style="width:${barPct(r.hi ?? r.lo).toFixed(1)}%"></i></span><b class="fc-mono">${esc(val)}</b></li>`;
        })
        .join('')}</ul><p class="cig-axis fc-mono">${esc(lang === 'es' ? 'ESCALA LOGARÍTMICA, 1 A 10.000' : 'LOG SCALE, 1 TO 10,000')}</p>`;
  }
}

export function sourcesHtml(lang: Lang): string {
  return `<ol class="cig-src">${SOURCES.map((s) => `<li>${s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t)} <span class="cig-p fc-mono" title="${esc(s.p === 'P' ? (lang === 'es' ? 'Leída completa' : 'Read in full') : lang === 'es' ? 'Solo resumen' : 'Summary only')}">${s.p}</span><br><span class="cig-w">${tx(s.what, lang)}</span></li>`).join('')}</ol>`;
}

export const sectionOf = (tab: CgTab): Section => SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0];

export function sectionHtml(tab: CgTab, lang: Lang): string {
  const s = sectionOf(tab);
  return `<h2 class="cig-title">${tx(s.title, lang)}</h2><p class="cig-lede">${tx(s.lede, lang)}</p>${s.id === 'sources' ? sourcesHtml(lang) : s.blocks.map((b) => block(b, lang)).join('')}`;
}

export function tabsHtml(active: CgTab, lang: Lang, href: (t: CgTab) => string): string {
  return SECTIONS.map((s) => `<a role="tab" class="cig-tab" href="${esc(href(s.id))}" data-tab="${s.id}" aria-selected="${s.id === active}"${s.id === active ? '' : ' tabindex="-1"'}>${tx(s.title, lang)}</a>`).join('');
}
