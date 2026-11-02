/**
 * Shore/kayak fishing rows in the side panel from the coast tier in (PLAN 4.5): the target species
 * (tap the arrows to change it), then the habitat score at the reticle and how the forecast month
 * suits the species. The species is remembered on the device.
 */
import { condSlot } from './cond-groups';
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import type { FishingLayer } from './layers/fishing';
import type { TimeStore } from './time';
import { SPECIES, seasonOf, type SpeciesId } from './fishing/species';

const KEY = 'ft.fishing.species';

export function loadSpecies(): SpeciesId {
  try {
    const v = localStorage.getItem(KEY);
    return SPECIES.find((s) => s.id === v)?.id ?? SPECIES[0].id;
  } catch {
    return SPECIES[0].id;
  }
}

export function mountFishingHud(root: HTMLElement, map: Map, layer: FishingLayer, time: TimeStore, initial: SpeciesId) {
  const side = condSlot(root, 'fishing', 10);
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast fish-rows">
      <div class="ro fish-pick"><span class="lbl">${t('fish.target')}</span>
        <button type="button" class="tab" id="fish-prev" aria-label="${t('fish.prev')}">‹</button>
        <span class="seg sm green" id="fish-sp">--</span>
        <button type="button" class="tab" id="fish-next" aria-label="${t('fish.next')}">›</button></div>
      <div class="ro"><span class="lbl">${t('fish.score')}</span><span class="seg sm green" id="fish-score">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let i = Math.max(0, SPECIES.findIndex((s) => s.id === initial));

  const month = () => new Date(time.validMs()).getUTCMonth();
  let queued = false;
  const update = () => {
    queued = false;
    const sp = SPECIES[i];
    $('fish-sp').textContent = t(`fish.${sp.id}` as Key);
    const season = t(`season.${seasonOf(sp, month())}` as Key);
    const c = map.getCenter();
    const score = layer.scoreAt(c.lng, c.lat);
    // "63% GOOD": habitat at the reticle, then how the month suits the species.
    $('fish-score').textContent = score === null ? `-- ${season}` : `${Math.round(score * 100)}% ${season}`;
    $('fish-score').className = 'seg sm ' + (score !== null && score >= 0.5 ? 'green' : '');
  };
  const apply = () => {
    layer.setSpecies(SPECIES[i].id);
    layer.setMonth(month());
    try {
      localStorage.setItem(KEY, SPECIES[i].id);
    } catch {
      /* private mode */
    }
    update();
  };
  const step = (d: number) => ((i = (i + d + SPECIES.length) % SPECIES.length), apply());
  $('fish-prev').addEventListener('click', () => step(-1));
  $('fish-next').addEventListener('click', () => step(1));
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  time.subscribe(() => (layer.setMonth(month()), update()));
  apply();
}
