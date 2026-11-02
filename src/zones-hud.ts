/**
 * ZONE readout in the side panel from the coast tier in (PLAN 4.3): the protected area under the
 * reticle and what it means for fishing, plus a hazard strip while inside one that bars fishing.
 */
import type { Map } from 'maplibre-gl';
import { readout } from './hud-kit';
import { t } from './i18n';
import { zoneName, zoneStatus } from './layers/zones';
import { zoneAt, type ZonePoly } from './zone-lookup';

export function mountZonesHud(root: HTMLElement, map: Map, zones: ZonePoly[]) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML('beforeend', `<div class="from-coast">${readout(t('zone.label'), 'zone', '', 'green').replace('<span class="seg', '<span class="seg sm').replace('<span class="unit"></span>', '')}</div>`);
  const out = side.querySelector<HTMLElement>('#zone')!;

  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const z = zoneAt(zones, [c.lng, c.lat]);
    out.textContent = z ? `${zoneName(z)}: ${zoneStatus(z)}` : t('zone.none');
    out.className = 'seg sm ' + (z ? (z.status === 'closed' ? 'red' : '') : 'green');
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
}
