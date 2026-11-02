/**
 * Condition explainers: tap or click a condition label (shelter, power, rip reach, break, drift,
 * comfort, fetch ...) and a short card explains it in the active language. Rows are matched by the
 * id of their value element, so it works in any language and for panels that mount late. The text
 * lives in src/i18n/help-*.ts under `help.<id>`.
 */
import { PHONE_QUERY } from './sheets';
import { t, type Key } from './i18n';

export type HelpId = string;

/** Value-element id (or gauge id) -> explainer id. */
export const HELP_BY_ID: Readonly<Record<string, HelpId>> = {
  swell: 'swell', period: 'period', sdir: 'swellDir', wind: 'wind', wdir: 'windDir', sst: 'sst', tide: 'tide',
  rip: 'rip', ripgauge: 'rip', curr: 'current', cset: 'set', tgt: 'target', tgtrng: 'range', tgtbrg: 'bearing',
  'sz-hb': 'breaker', 'sz-type': 'wavetype', 'sz-pow': 'power', 'sz-drift': 'drift', 'sz-rips': 'ripStrength', 'sz-ripl': 'ripReach',
  'dv-3': 'surge', 'dv-6': 'surge', 'dv-12': 'surge',
  'sb-name': 'break', 'sb-q': 'surfScore', 'sb-type': 'breakType', 'sb-haz': 'hazard',
  'ss-comfort': 'seaState', 'ss-score': 'comfort', 'ss-detail': 'seaState',
  'an-name': 'harbour', 'an-dist': 'harbourRange', 'an-shelter': 'shelter', 'an-fetch': 'shelter',
  'wx-rain': 'rain', 'wx-rain24': 'rain24', 'wx-cloud': 'cloud', 'wx-uv': 'uv', 'wx-air': 'air', 'wx-storm': 'storm',
  depth: 'depth', dsrc: 'depthSource', dzone: 'reef', dbottom: 'bottom', zone: 'zone', 'fish-score': 'habitat',
  't-off': 'fcst', 't-valid': 'valid', 't-band': 'band', lat: 'lat', lon: 'lon', alt: 'alt', age: 'dataAge', tier: 'tier',
};

export const helpKey = (id: HelpId) => `help.${id}` as Key;

/** Mark a row (or gauge) as explainable. Returns true if it was tagged. */
export function tagRow(row: HTMLElement): boolean {
  if (row.dataset.help) return false;
  const valueId = row.classList.contains('gauge') ? row.id : row.querySelector<HTMLElement>('.seg[id]')?.id;
  const id = valueId && HELP_BY_ID[valueId];
  if (!id) return false;
  row.dataset.help = id;
  const lbl = row.querySelector<HTMLElement>('.lbl');
  if (lbl) {
    lbl.classList.add('has-help');
    lbl.tabIndex = 0;
    lbl.setAttribute('role', 'button');
  }
  return true;
}

const ROWS = '.ro, .gauge';

export function mountExplain(root: HTMLElement) {
  const phone = window.matchMedia(PHONE_QUERY);
  const card = document.createElement('aside');
  card.className = 'panel help-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  root.appendChild(card);
  let anchor: HTMLElement | null = null;

  const close = () => {
    card.hidden = true;
    anchor = null;
  };

  const place = (a: HTMLElement) => {
    if (phone.matches) return card.style.removeProperty('top'), card.style.removeProperty('left');
    const r = a.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    let left = r.right + 12;
    if (left + w > window.innerWidth - 8) left = Math.max(8, r.left - w - 12);
    const top = Math.min(Math.max(8, r.top - 8), window.innerHeight - h - 8);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  };

  const open = (row: HTMLElement) => {
    if (anchor === row && !card.hidden) return close();
    const id = row.dataset.help!;
    const title = (row.querySelector('.lbl')?.textContent ?? row.dataset.helpTitle ?? '').trim();
    card.innerHTML = `<div class="ph"><span>${esc(title)}</span><button type="button" class="sheet-x help-x" aria-label="${t('help.close')}">✕</button></div><p class="help-text">${esc(t(helpKey(id)))}</p>`;
    card.querySelector('.help-x')!.addEventListener('click', close);
    card.hidden = false;
    anchor = row;
    place(row);
  };

  root.addEventListener('click', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-help]');
    if (row && !(e.target as Element).closest('button:not(.gl-cell)')) open(row);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const lbl = (e.target as Element).closest<HTMLElement>('.has-help');
    const row = lbl?.closest<HTMLElement>('[data-help]');
    if (row) {
      e.preventDefault();
      open(row);
    }
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  // A tap anywhere else (including the map) puts the card away.
  document.addEventListener('pointerdown', (e) => {
    if (card.hidden) return;
    const el = e.target as Element;
    if (!card.contains(el) && !el.closest('[data-help]')) close();
  });
  window.addEventListener('resize', () => anchor && !card.hidden && place(anchor));

  // Tag what is there now, then rows that mount later (the seafloor and zone panels load after start-up).
  // Only added elements are looked at: the per-second text updates add text nodes, which are ignored.
  const scan = (el: Element) => {
    if (el.matches(ROWS)) tagRow(el as HTMLElement);
    el.querySelectorAll<HTMLElement>(ROWS).forEach(tagRow);
  };
  scan(root);
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && scan(n));
  }).observe(root, { childList: true, subtree: true });
  return { close };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
