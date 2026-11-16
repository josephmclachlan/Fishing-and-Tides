/**
 * The ciguatera warning as HTML for the fish panel (fishing-hud.ts): the tier's sentence, then a small chart of the
 * size to keep for each species of the kind (one bar per fish, its length in cm), from fishing/cigua.ts. The same
 * numbers are on each species' guide page and on the #ciguatera page.
 */
import { activeLang, t, type Key } from '../i18n';
import { ciguaSpecies, isRed, type CiguaSpecies, type CiguaTier } from './cigua';

const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
/** Bars are drawn against this length, so a 40 cm limit reads the same in every chart. */
const SCALE_CM = 80;

const row = (s: CiguaSpecies) => {
  const name = esc((activeLang() === 'es' ? s.es : s.en).toUpperCase());
  const z = s.size;
  if (z.basis === 'never') return `<div class="cz-row"><span class="cz-name">${name}</span><span class="lbl red cz-v">${t('fish.cig.dont')}</span></div>`;
  if (!z.cm) return `<div class="cz-row"><span class="cz-name">${name}</span><span class="lbl cz-v">${t('fish.cig.none')}</span></div>`;
  const w = Math.min(100, Math.round((z.cm / SCALE_CM) * 100));
  const est = z.basis === 'estimate' ? ` <span class="lbl note">${t('fish.cig.est')}</span>` : '';
  return `<div class="cz-row"><span class="cz-name">${name}</span><span class="cz-bar"><i style="width:${w}%"></i></span><span class="seg sm cz-v">${z.cm} cm${est}</span></div>`;
};

/** The warning and size chart for one kind, or '' when it has no ciguatera tier. */
export function ciguaNoteHtml(kind: string, tier: CiguaTier | undefined): string {
  if (!tier) return '';
  const text = kind === 'lionfish' ? t('fish.cig.lionfish') : t(`fish.cig.${tier}` as Key);
  const rows = tier === 'never' ? [] : ciguaSpecies(kind);
  const chart = rows.some((s) => s.size.cm || s.size.basis === 'never')
    ? `<div class="cz-chart"><div class="lbl cz-head">${t('fish.cig.keep')}</div>${rows.map(row).join('')}</div>`
    : '';
  return `<div class="cz ${isRed(tier) ? 'cz-red' : ''}"><span class="lbl ${isRed(tier) ? 'red' : ''}">${text}</span> <a class="cig-link" href="#ciguatera">${t('fish.ciguateraMore')}</a>${chart}</div>`;
}

/**
 * The boat fish of the mode that carry ciguatera, as one chart (the map circles them when BOAT is in reach): a line, then
 * each species with its size to keep, or none known.
 */
export function ciguaBoatHtml(kinds: readonly string[]): string {
  const rows = kinds.flatMap((k) => ciguaSpecies(k));
  if (!rows.length) return '';
  return `<div class="cz"><span class="lbl">${t('fish.cig.boatHead')}</span> <a class="cig-link" href="#ciguatera">${t('fish.ciguateraMore')}</a><div class="cz-chart"><div class="lbl cz-head">${t('fish.cig.keep')}</div>${rows.map(row).join('')}</div></div>`;
}
