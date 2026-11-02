/**
 * ZONE readout in the side panel from the coast tier in (PLAN 4.3): the protected area under the
 * reticle and what it means for fishing, plus a hazard strip while inside one that bars fishing.
 */
import { condSlot } from './cond-groups';
import type { Map } from 'maplibre-gl';
import { readout } from './hud-kit';
import { t } from './i18n';
import { zoneName, zoneStatus } from './layers/zones';
import { mountRulesCard } from './rules-card';
import { zoneAt, type ZonePoly } from './zone-lookup';

export function mountZonesHud(root: HTMLElement, map: Map, zones: ZonePoly[]) {
  const side = condSlot(root, 'place', 30);
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">${readout(t('zone.label'), 'zone', '', 'green').replace('<span class="seg', '<span class="seg sm').replace('<span class="unit"></span>', '')}
      <div class="ro"><button type="button" class="tab" id="zone-rules">${t('rules.open')}</button></div></div>`,
  );
  const out = side.querySelector<HTMLElement>('#zone')!;
  const card = mountRulesCard(root);
  let here: ReturnType<typeof zoneAt> = null;
  side.querySelector('#zone-rules')!.addEventListener('click', () => card.open(here ? { id: here.id, name: zoneName(here) } : null));

  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const z = (here = zoneAt(zones, [c.lng, c.lat]));
    out.textContent = z ? `${zoneName(z)}: ${zoneStatus(z)}` : t('zone.none');
    out.className = 'seg sm ' + (z ? (z.status === 'closed' ? 'red' : '') : 'green');
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
}
