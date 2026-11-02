/**
 * BREAK rows in the side panel from the coast tier in (PLAN 6.4): the nearest catalog break within
 * 1.5 km of the reticle, its type and the way it faces, its hazards, and a CHECK tag when the guides
 * disagree or only one covers it. INFO opens a card with the guides it came from.
 */
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { breaksNear, compass8 } from './surf-breaks';
import type { SurfBreak } from './data/surf-breaks';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function mountSurfHud(root: HTMLElement, map: Map) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      <div class="ro"><span class="lbl">${t('surf.title')}</span><span class="seg sm green" id="sb-name">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.type')}</span><span class="seg sm" id="sb-type">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.hazard')}</span><span class="seg sm" id="sb-haz">--</span></div>
      <div class="ro"><button type="button" class="tab" id="sb-info" hidden>${t('rules.source')}</button></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;

  const card = document.createElement('section');
  card.className = 'panel rules-card';
  card.hidden = true;
  root.appendChild(card);
  card.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.rules-close')) card.hidden = true;
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && (card.hidden = true));

  let here: SurfBreak | null = null;
  $('sb-info').addEventListener('click', () => {
    if (!here) return;
    card.innerHTML = `<div class="ph">${esc(here.name)}<button type="button" class="tab rules-close">${t('rules.close')}</button></div>
      <ul class="rules-list">${here.sources.map((s) => `<li><a class="rule-src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`).join('')}</ul>
      <p class="rules-advice">${t('surf.advice')}</p>`;
    card.hidden = false;
  });

  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const hit = breaksNear(c.lng, c.lat)[0]?.brk ?? null;
    here = hit;
    $('sb-name').textContent = hit ? `${hit.name}${hit.confidence === 'check' ? ` · ${t('surf.check')}` : ''}` : t('surf.none');
    $('sb-type').textContent = hit ? `${t(`surf.type.${hit.type}` as Key)} ${t(`surf.shape.${hit.shape}` as Key)}, ${t('surf.faces', { dir: compass8(hit.facing) })}` : '--';
    $('sb-haz').textContent = hit ? (hit.hazards.map((h) => t(`surf.hazard.${h}` as Key)).join(', ') || t('surf.hazard.none')) : '--';
    $('sb-info').hidden = !hit;
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
}
