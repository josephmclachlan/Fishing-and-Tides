/**
 * HARBOUR and SHELTER rows in the side panel (PLAN 6.7): the nearest catalog place within 3 km of the
 * reticle with a CHECK tag when unverified, and how sheltered the reticle is from the current wind
 * (fetch over water upwind, from the land mask). INFO opens a card with sources and the advisory.
 */
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { nearestPlace } from './harbours';
import { compass8 } from './surf-breaks';
import { windFetchM, shelterClass } from './physics/fetch';
import type { Grid } from './physics/bathy';
import type { Place } from './data/harbours';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface HarboursDeps {
  windFromDeg: () => number;
  land: () => Grid | null;
}

export function mountHarboursHud(root: HTMLElement, map: Map, deps: HarboursDeps) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      <div class="ro"><span class="lbl">${t('place.title')}</span><span class="seg sm green" id="an-name">--</span></div>
      <div class="ro"><span class="lbl">${t('place.distance')}</span><span class="seg sm" id="an-dist">--</span></div>
      <div class="ro"><span class="lbl">${t('shelter.title')}</span><span class="seg sm" id="an-shelter">--</span></div>
      <div class="ro"><span class="seg sm" id="an-fetch">--</span></div>
      <div class="ro"><button type="button" class="tab" id="an-info" hidden>${t('rules.source')}</button></div>
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

  let here: Place | null = null;
  $('an-info').addEventListener('click', () => {
    if (!here) return;
    card.innerHTML = `<div class="ph">${esc(here.name)}<button type="button" class="tab rules-close">${t('rules.close')}</button></div>
      <ul class="rules-list">${here.sources.map((s) => `<li><a class="rule-src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`).join('')}</ul>
      <p class="rules-advice">${t('place.advice')}</p>`;
    card.hidden = false;
  });

  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const hit = nearestPlace(c.lng, c.lat);
    here = hit?.place ?? null;
    $('an-name').textContent = hit ? `${hit.place.name} · ${t(`place.kind.${hit.place.kind}` as Key)}${hit.place.confidence === 'check' ? ` · ${t('place.check')}` : ''}` : t('place.none');
    $('an-dist').textContent = hit ? `${(hit.distanceM / 1000).toFixed(1)} KM` : '--';
    $('an-info').hidden = !hit;
    const land = deps.land();
    if (!land) {
      $('an-shelter').textContent = '--';
      $('an-fetch').textContent = '--';
      return;
    }
    const from = deps.windFromDeg();
    const f = windFetchM(land, c.lng, c.lat, from);
    $('an-shelter').textContent = t(`shelter.${shelterClass(f)}` as Key);
    $('an-fetch').textContent = t('shelter.fetch', { km: (f / 1000).toFixed(1), dir: compass8(from) });
  };
  const queue = () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  };
  map.on('move', queue);
  update();
  return { refresh: queue };
}
