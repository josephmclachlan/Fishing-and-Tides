/**
 * FIELD NOTES visual blocks: the page shows first and says little. Step flows with pictograms, drawings with numbered
 * marks, tiles, big numbers, tap-to-call cards, bar charts and side-by-side comparisons. Pure string builders, so they
 * are tested without a DOM. Every caption still goes through the citation numbering (`tx`), so superscripts stay in
 * reading order across text and pictures. Styles in notes.css (prefix `nt-`).
 */
import type { L } from '../ciguatera/content';
import type { NtTab } from './route';
import { pict, type PictId } from './icons';
import { depthArt, ripArt, shoreArt } from './art/water';

type Lang = 'en' | 'es';
/** How a tile or cell reads: good, take care, do not, not confirmed, or plain information. */
export type Tone = 'go' | 'warn' | 'stop' | 'unk' | 'info';

export const FIGS = {
  rip: { vb: '0 0 320 236', art: ripArt },
  shore: { vb: '0 0 320 168', art: shoreArt },
  depth: { vb: '0 0 320 252', art: depthArt },
} as const;
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
  | { k: 'go'; tab: NtTab; ico: PictId; h: L; t: L };

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
  }
}
