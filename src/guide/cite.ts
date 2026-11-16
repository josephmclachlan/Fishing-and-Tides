/**
 * CITATIONS in the species guide (Joseph 2026-11-16): no source is ever named in brackets in the text, only a
 * superscript number, and the numbers run 1, 2, 3 in the order they first appear on each tab, with the tab's own
 * source list under it in the same order.
 *
 * The research text writes sources in brackets ("... in some places (FishBase)", "Cortés (2019)", "(Ley 8436 art. 9)").
 * `citeText` (run by `npm run data:guide`) swaps each such bracket for a marker `[^k]`, where k is the source's place in
 * the species' `sources` (1-based); a bracket that names something not in the list is added to it, marked `x` so the
 * Sources tab does not list it twice. `citeTab` (render time) numbers a tab's markers in order and adds its list.
 */

export interface Src {
  t: string;
  u?: string;
  /** Added from a bracket in the text, not in the research's own list. */
  x?: boolean;
}

/** Words that make a bracket a source: databases, agencies, laws, documents, author-and-year. */
const SRC_WORD =
  /\b(FishBase|SeaLifeBase|AlgaeBase|WoRMS|FAO|IUCN|iNaturalist|GBIF|OBIS|CDC|NOAA|FDA|EPA|ANSES|INCOPESCA|SINAC|MINAE|MAG|AJDIP|Ley|Decreto|Reglamento|ICCAT|Wikipedia|brochure|folleto|report|informe|census|censo|et al)\b|https?:\/\/|\b[\w-]+\.(org|com|gov|edu|net)\b/i;
const AUTHOR_YEAR = /\p{Lu}[\p{L}'’-]+(?: et al\.?| (?:&|and|y) \p{Lu}[\p{L}'’-]+)?,? (?:1[89]|20)\d\d[a-z]?\b/u;
const YEAR = /^(?:1[89]|20)\d\d[a-z]?$/;
const PHONE = /^\+?\d[\d\s-]{6,}$/;
const RANGE = /\b(?:1[89]|20)\d\d\s*(?:to|a|-|–)\s*(?:1[89]|20)\d\d\b/;
const STOP = new Set(['the', 'and', 'for', 'with', 'del', 'los', 'las', 'una', 'que', 'por', 'para', 'from', 'text', 'park']);

/** Whether a bracket's content names a source (and not a phone number, a measure or a list of places). */
export function isCitation(inner: string): boolean {
  const s = inner.trim();
  if (!s || s.length > 140 || PHONE.test(s) || /^CHECK\b/.test(s)) return false;
  if (YEAR.test(s)) return true;
  if (SRC_WORD.test(s)) return true;
  return AUTHOR_YEAR.test(s) && !RANGE.test(s) && (s.match(/,/g)?.length ?? 0) <= 2;
}

const tokens = (s: string) =>
  (s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w));

/** The listed source a bracket names, if any: the one sharing the most words with it. */
function matchSource(inner: string, list: readonly Src[]): { i: number; all: boolean } | null {
  const w = tokens(inner);
  if (!w.length) return null;
  let best = -1, hits = 0;
  list.forEach((x, i) => {
    if (x.x) return;
    const tt = new Set(tokens(x.t + ' ' + (x.u ?? '')));
    const h = w.filter((k) => tt.has(k)).length;
    if (h > hits) (best = i), (hits = h);
  });
  return best < 0 ? null : { i: best, all: hits === w.length };
}

/**
 * One text with its source brackets turned into markers. `list` is the species' sources and grows when a bracket names
 * something new (a law article, a document not in the list). Brackets that are not sources stay as they are.
 */
export function citeText(text: string, list: Src[]): string {
  if (!text.includes('(')) return text;
  return text.replace(/\s?\(([^()]{1,140})\)/g, (all, inner: string) => {
    const parts = inner.split(/;\s*/);
    if (!parts.every(isCitation)) return all;
    const marks = parts.map((p) => {
      const m = matchSource(p, list);
      // A bare name or year that matches a listed source cites it; anything more (an article, a page) gets its own line.
      if (m && (m.all || YEAR.test(p.trim()))) return m.i + 1;
      const t = m ? `${p.trim()}: ${list[m.i].t}` : p.trim();
      let k = list.findIndex((x) => x.t === t);
      if (k < 0) k = list.push({ t, u: m ? list[m.i].u : undefined, x: true }) - 1;
      return k + 1;
    });
    return marks.map((k) => `[^${k}]`).join('');
  });
}

/** Text with the markers taken out, for places that show no sources (list cards, search). */
export const stripCites = (s: string) => s.replace(/\[\^\d+\]/g, '');

const escH = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * A rendered tab with its markers numbered 1, 2, 3 in the order they first appear, and the tab's sources listed under
 * it in that order. Markers next to each other share one superscript ("¹,³").
 */
export function citeTab(html: string, list: readonly Src[] | undefined, title: string): string {
  if (!html.includes('[^')) return html;
  const order: number[] = [];
  const out = html
    .replace(/\[\^(\d+)\]/g, (_, k: string) => {
      const i = Number(k) - 1;
      if (!list?.[i]) return '';
      let n = order.indexOf(i);
      if (n < 0) n = order.push(i) - 1;
      return `<sup class="gd-cite">${n + 1}</sup>`;
    })
    // Markers side by side share one superscript, lowest number first.
    .replace(/(?:<sup class="gd-cite">\d+<\/sup>){2,}/g, (run) =>
      `<sup class="gd-cite">${[...new Set(run.match(/\d+/g)!.map(Number))].sort((x, y) => x - y).join(',')}</sup>`,
    );
  if (!order.length || !list) return out;
  const items = order
    .map((i) => list[i])
    .map((x) => `<li>${x.u ? `<a href="${escH(x.u)}" target="_blank" rel="noopener">${escH(x.t)}</a>` : escH(x.t)}</li>`)
    .join('');
  return `${out}<section class="gd-blk gd-fn"><h4 class="fc-mono">${escH(title)}</h4><ol>${items}</ol></section>`;
}
