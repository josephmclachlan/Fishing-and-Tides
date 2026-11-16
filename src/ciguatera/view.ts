/** CIGUATERA page HTML (PLAN 7.101): pure string builders over content.ts, so they are tested without a DOM. */
import { sizesHtml } from './sizes';
import { GRADE_WORDS, SECTIONS, SOURCES, type Block, type Grade, type L, type Risk, type Section } from './content';
import { ciguateraHash, type CgTab } from './route';
import { visHtml, type VBlock } from '../notes/vis';
import { notesHash } from '../notes/route';
import { animalSvg } from '../notes/art/animals';

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

/**
 * Evidence strength as pips out of 4, in neutral ink (graphics review C-5): green, amber and red keep their page-wide
 * meaning of do, take care and do not. Only advice the evidence contradicts is red.
 */
export const GRADE_PIPS: Record<Grade, number> = { strong: 4, weak: 3, case: 2, expert: 1, none: 0, against: 0 };
const pips = (n: number) => `<span class="cig-pips" aria-hidden="true">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(4 - n)}</span>`;

const RISK_CLS: Record<Risk, string> = { never: 'r0', high: 'r1', care: 'r2', low: 'rn', none: 'rx' };
const TICKS = [1, 10, 100, 1000, 10000];
const EVIDENCE: L = { en: 'Evidence', es: 'Evidencia' };

/**
 * The text blocks, shared with the field notes page (notes/view.ts). `t` renders a line with its citation markers;
 * `mark` renders a lone source marker.
 */
export function textBlock(b: Block, lang: Lang, t: (l: L) => string, mark: (key: string) => string): string {
  switch (b.k) {
    case 'p':
      return `<p>${t(b.t)}</p>`;
    case 'h':
      return `<h3 class="cig-h fc-mono">${t(b.t)}</h3>`;
    case 'ul':
      return `<ul class="cig-ul">${b.items.map((i) => `<li>${t(i)}</li>`).join('')}</ul>`;
    case 'warn':
      return `<section class="cig-box cig-warn"><h4 class="fc-mono">${t(b.h)}</h4><p>${t(b.t)}</p></section>`;
    case 'aid':
      return `<section class="cig-box cig-aid"><h4 class="fc-mono">${t(b.h)}</h4><p>${t(b.t)}</p></section>`;
    case 'table':
      return `<div class="cig-tw"><table class="cig-t"><thead><tr>${b.head.map((h) => `<th scope="col" class="fc-mono">${t(h)}</th>`).join('')}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((cell, i) => (i === 0 ? `<th scope="row">${t(cell)}</th>` : `<td>${t(cell)}</td>`)).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
    case 'graded':
      return `<ul class="cig-gr">${b.rows
        .map((r) => {
          const n = GRADE_PIPS[r.grade];
          const label = `${GRADE_WORDS[r.grade][lang]}${r.grade === 'against' ? '' : `, ${n} / 4`}`;
          return `<li class="cig-g${r.grade === 'against' ? ' cig-bad' : ''}"><span class="cig-chip fc-mono" aria-label="${esc(label)}">${t(GRADE_WORDS[r.grade])}${r.grade === 'against' ? '' : pips(n)}</span><b>${t(r.item)}</b><span>${t(r.note)}</span></li>`;
        })
        .join('')}</ul>`;
    case 'bars': {
      const head = lang === 'es' ? 'Cada paso a la derecha es 10 veces más' : 'Each step to the right is 10 times more';
      const rows = b.rows
        .map((r) => {
          if (r.none) return `<li class="cig-ghost"><span class="cig-bl">${t(r.label)}</span><span class="cig-bt"></span><b class="fc-mono">${t(r.none)}</b></li>`;
          const lo = barPct(r.lo), hi = r.hi ? barPct(r.hi) : lo;
          const val = r.hi ? `${fmt(r.lo)} ${lang === 'es' ? 'a' : 'to'} ${fmt(r.hi)}` : fmt(r.lo);
          const rng = r.hi ? `<i class="cig-rng" style="left:${lo.toFixed(1)}%;width:${(hi - lo).toFixed(1)}%"></i>` : '';
          return `<li><span class="cig-bl">${t(r.label)}${r.note ? ` <em>${t(r.note)}</em>` : ''}</span><span class="cig-bt"><i style="width:${lo.toFixed(1)}%"></i>${rng}</span><b class="fc-mono">${esc(val)}</b></li>`;
        })
        .join('');
      const ticks = TICKS.map((v) => `<span style="left:${barPct(v)}%">${fmt(v)}</span>`).join('');
      return `<p class="cig-bhead fc-mono">${esc(head)}${b.cite ? mark(b.cite) : ''}</p><ul class="cig-bars">${rows}<li class="cig-ax" aria-hidden="true"><span></span><span class="cig-axt">${ticks}</span><span></span></li></ul>`;
    }
    case 'range': {
      const rows = b.rows
        .map((r) => `<li${r.stop ? ' class="cig-stop"' : ''}><span class="cig-bl">${t(r.label)}</span><span class="cig-bt cig-pc"><i style="left:${r.lo}%;width:${r.hi - r.lo}%"></i></span><b class="fc-mono">${r.lo}–${r.hi}</b></li>`)
        .join('');
      const ticks = [0, 25, 50, 75, 100].map((v) => `<span style="left:${v}%">${v}</span>`).join('');
      return `<ul class="cig-bars cig-range">${rows}<li class="cig-ax" aria-hidden="true"><span></span><span class="cig-axt">${ticks}</span><span></span></li></ul><p class="cig-key">${t(b.key)}${b.cite ? mark(b.cite) : ''}</p>`;
    }
    case 'risk':
      return `<ul class="cig-risk">${b.rows
        .map(
          (r) =>
            `<li class="${RISK_CLS[r.lvl]}${r.an ? '' : ' cig-noan'}">${r.an ? animalSvg(r.an) : ''}<div><span class="cig-rchip fc-mono">${t(r.word)}</span><b>${t(r.fish)}</b>${r.note ? `<span class="cig-rnote">${t(r.note)}</span>` : ''}<details><summary class="fc-mono">${esc(EVIDENCE[lang])}</summary><p>${t(r.ev)}</p></details></div></li>`,
        )
        .join('')}</ul>`;
    case 'sizes':
      return sizesHtml(b.kinds, lang) + (b.cite ? mark(b.cite) : '');
  }
}

const TEXT_KINDS = new Set(['p', 'h', 'ul', 'warn', 'aid', 'table', 'graded', 'bars', 'range', 'risk', 'sizes']);
export const isText = (b: Block | VBlock): b is Block => TEXT_KINDS.has(b.k);

function block(b: Block | VBlock, lang: Lang, c: Cites): string {
  const t = (l: L) => tx(l, lang, c);
  if (!isText(b)) return visHtml(b, lang, t, (tab) => notesHash(tab));
  return textBlock(b, lang, t, (k) => cited(`{${k}}`, c));
}

/** On every tab but its own: feeling sick? The emergency signs and a link to what to do (graphics review C-2). */
export function sosHtml(lang: Lang): string {
  const h = lang === 'es' ? '¿Se siente mal después de comer pescado?' : 'Feeling sick after eating fish?';
  const p =
    lang === 'es'
      ? 'Pulso lento, desmayo o vómitos que no paran: vaya a la clínica ya o llame al 911.'
      : 'Slow pulse, fainting, or vomiting that will not stop: go to the clinic now or call 911.';
  return `<a class="cig-sos" href="${ciguateraHash('ifill')}"><strong>${esc(h)}</strong> <span>${esc(p)}</span><svg class="cig-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`;
}

/** The section's sources in the order they were first cited, each with its number and whether it was read in full. */
export function sourcesHtml(lang: Lang, c: Cites): string {
  if (!c.order.length) return '';
  const head = lang === 'es' ? 'FUENTES' : 'SOURCES';
  return `<h3 class="cig-h fc-mono">${head}</h3><ol class="cig-src">${c.order
    .map((k, i) => {
      const s = SOURCES[k];
      return `<li id="cig-src-${i + 1}" value="${i + 1}">${s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t)}<br><span class="cig-w">${esc(s.what[lang])}</span></li>`;
    })
    .join('')}</ol>`;
}

export const sectionOf = (tab: CgTab): Section => SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0];

/** One section, its markers numbered from 1 and its sources listed in that order. */
export function sectionHtml(tab: CgTab, lang: Lang): string {
  const s = sectionOf(tab);
  const c: Cites = { order: [] };
  const body = s.blocks.map((b) => block(b, lang, c)).join('');
  return `${tab === 'ifill' ? '' : sosHtml(lang)}<h2 class="cig-title">${tx(s.title, lang, c)}</h2><p class="cig-lede">${tx(s.lede, lang, c)}</p>${body}${sourcesHtml(lang, c)}`;
}

export function tabsHtml(active: CgTab, lang: Lang, href: (t: CgTab) => string): string {
  return SECTIONS.map((s) => `<a role="tab" class="cig-tab" href="${esc(href(s.id))}" data-tab="${s.id}" aria-selected="${s.id === active}"${s.id === active ? '' : ' tabindex="-1"'}>${esc(s.title[lang])}</a>`).join('');
}
