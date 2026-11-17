/**
 * The big IDENTIFY button (Joseph 2026-11-17: "a SurCast coloured and themed large button for marine species
 * identification"). One look wherever it appears, the forecast page (fish, dive, spear, snorkel) and the species guide
 * home: a square panel on black glass with the SurCast runs (the eight activity colours of the logo) as its edge and
 * glow, a lens drawn in the same runs, and the label in bold Kinetic type. Styled by src/id-button.css.
 */
import { t } from './i18n';
import './id-button.css';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The logo's runs, in its order, as SVG gradient stops (the same tokens the CSS edge uses). */
const RUNS = ['snorkel', 'paddle', 'surf', 'dive', 'swim', 'fish', 'coral', 'sail'];
const stops = RUNS.map((r, i) => `<stop offset="${((i / (RUNS.length - 1)) * 100).toFixed(1)}%" style="stop-color:var(--fc-t-${r})"/>`).join('');

/** The lens with a fish in it, stroked in the runs. `gid` must be unique in the page (both buttons can be in it). */
function lens(gid: string): string {
  return `<svg class="sc-id-lens" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="44" y2="44">${stops}</linearGradient></defs>
    <g fill="none" stroke="url(#${gid})" stroke-linecap="square" stroke-linejoin="miter">
      <circle cx="20" cy="20" r="14.5" stroke-width="3"/>
      <path d="M31 31 L43.5 43.5" stroke-width="5"/>
      <path class="sc-id-fish" d="M11 20.5 C14 16.5 20 15.5 24.5 18.5 L29 15.5 L27.6 20.5 L29 25.5 L24.5 22.5 C20 25.5 14 24.5 11 20.5 Z" stroke-width="1.9"/>
      <path d="M15 19.6 h0.1" stroke-width="2.6"/>
    </g>
  </svg>`;
}

const GO = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';

/**
 * The button. `cls` and `attrs` let each page hook it up (an id, a data- attribute, which activities show it);
 * `gid` names its gradient.
 */
export function idButtonHtml(o: { cls?: string; attrs?: string; gid: string; title?: string }): string {
  return `<button type="button" class="sc-id${o.cls ? ` ${o.cls}` : ''}"${o.attrs ? ` ${o.attrs}` : ''}${o.title ? ` title="${esc(o.title)}"` : ''}>
    <span class="sc-id-sh" aria-hidden="true"></span>
    ${lens(o.gid)}
    <span class="sc-id-t"><b>${esc(t('gd.idbar'))}</b><small>${esc(t('gd.idbarSub'))}</small></span>
    <span class="sc-id-go">${GO}</span>
  </button>`;
}
