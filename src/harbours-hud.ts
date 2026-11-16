/**
 * HARBOUR and SHELTER rows in the side panel (PLAN 6.7): the nearest catalog place within 3 km of the
 * reticle with a CHECK tag when unverified, and how sheltered the reticle is from the current wind
 * (fetch over water upwind, from the land mask). INFO opens a card with sources and the advisory.
 */
import { condSlot } from './cond-groups';
import type { Map } from 'maplibre-gl';
import { dec, t, type Key } from './i18n';
import { nearestPlace } from './harbours';
import { compass8 } from './surf-breaks';
import { windFetchM, shelterClass } from './physics/fetch';
import type { Grid } from './physics/bathy';
import type { Place } from './data/harbours';
import { nearestPort, type WpiPort } from './adapters/wpi';

const SAILING_DIRECTIONS = 'https://msi.nga.mil/Publications/SailingDirections';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface HarboursDeps {
  windFromDeg: () => number;
  land: () => Grid | null;
}

export function mountHarboursHud(root: HTMLElement, map: Map, deps: HarboursDeps) {
  const side = condSlot(root, 'place', 20);
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
  let ports: readonly WpiPort[] = [];
  $('an-info').addEventListener('click', () => {
    if (!here) return;
    card.innerHTML = `<div class="ph">${esc(here.name)}<button type="button" class="tab rules-close">${t('rules.close')}</button></div>
      <ul class="rules-list">${here.sources.map((s) => `<li><a class="rule-src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`).join('')}</ul>
      ${wpiBlock(here)}
      <p class="rules-advice">${t('place.advice')}</p>`;
    card.hidden = false;
  });

  const wpiBlock = (p: Place) => {
    const port = nearestPort(ports, p.lngLat);
    const rows = port ? Object.entries(port.facts).map(([k, v]) => `<li>${t(`place.wpi.${k}` as Key)}: ${esc(v)}</li>`).join('') : '';
    const head = port ? `<div class="lbl">${t('place.wpi', { name: esc(port.name) })}</div><ul class="rules-list">${rows}</ul>` : '';
    return `${head}<ul class="rules-list"><li><a class="rule-src" href="${SAILING_DIRECTIONS}" target="_blank" rel="noopener noreferrer">${t('place.sailingDirections')}</a></li></ul>`;
  };

  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const hit = nearestPlace(c.lng, c.lat);
    here = hit?.place ?? null;
    $('an-name').textContent = hit ? `${hit.place.name} · ${t(`place.kind.${hit.place.kind}` as Key)}${hit.place.confidence === 'check' ? ` · ${t('place.check')}` : ''}` : t('place.none');
    $('an-dist').textContent = hit ? `${dec((hit.distanceM / 1000), 1)} KM` : '--';
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
    $('an-fetch').textContent = t('shelter.fetch', { km: dec((f / 1000), 1), dir: compass8(from) });
  };
  const queue = () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  };
  map.on('move', queue);
  update();
  return { refresh: queue, setPorts: (p: readonly WpiPort[]) => void (ports = p) };
}
