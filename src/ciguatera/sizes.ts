/**
 * The size to keep, fish by fish (content.ts block 'sizes'), for the #ciguatera page and the field notes: one bar per
 * species on an 80 cm scale, from fishing/cigua.ts (the species guide's research), so every page shows the same numbers.
 */
import { ciguaSpecies } from '../fishing/cigua';

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

export function sizesHtml(kinds: readonly string[], lang: 'en' | 'es'): string {
  const seen = new Set<string>();
  const rows = kinds.flatMap((k) => ciguaSpecies(k)).filter((s) => (s.size.cm || s.size.basis === 'never') && !seen.has(s.sci) && !!seen.add(s.sci));
  return `<ul class="cig-bars cig-sizes">${rows
    .map((s) => {
      const name = `${esc(lang === 'es' ? s.es : s.en)} <em>${esc(s.sci)}</em>`;
      if (s.size.basis === 'never') return `<li><span class="cig-bl">${name}</span><span class="cig-bt"></span><b class="fc-mono">${lang === 'es' ? 'NO COMER' : 'DO NOT EAT'}</b></li>`;
      const est = s.size.basis === 'estimate' ? ` <em>${lang === 'es' ? 'estimación' : 'estimate'}</em>` : '';
      return `<li><span class="cig-bl">${name}${est}</span><span class="cig-bt"><i style="width:${Math.min(100, (s.size.cm! / 80) * 100).toFixed(1)}%"></i></span><b class="fc-mono">${s.size.cm} cm</b></li>`;
    })
    .join('')}</ul><p class="cig-axis fc-mono">${lang === 'es' ? 'GUARDE MENOS DE · ESCALA 0 A 80 CM' : 'KEEP UNDER · SCALE 0 TO 80 CM'}</p>`;
}
