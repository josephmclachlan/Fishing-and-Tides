/**
 * Surface current under the reticle (PLAN 1.4), in the side panel from the coast tier in:
 * speed in knots (red when too strong to paddle against) and set, the direction it flows toward.
 */
import type { Map } from 'maplibre-gl';
import type { FlowSource } from './layers/flow-sim';
import { KT_PER_MS, sampleField, towardDeg } from './physics/flow';
import { readout } from './hud-kit';
import { t } from './i18n';

export function mountFlowHud(root: HTMLElement, map: Map, current: () => FlowSource) {
  const side = root.querySelector<HTMLElement>('.side');
  const sst = side?.querySelector('#sst')?.parentElement;
  if (!side || !sst) return null;
  sst.insertAdjacentHTML('afterend', `<div class="from-coast">${readout(t('flow.current'), 'curr', t('unit.kt'), 'green')}${readout(t('flow.set'), 'cset', t('unit.degT'), 'green')}</div>`);
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;

  const v: [number, number] = [0, 0];
  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const src = current();
    const land = !!src.water && !src.water(c.lng, c.lat);
    const ok = !land && sampleField(src.field, c.lng, c.lat, v);
    const ms = Math.hypot(v[0], v[1]);
    $('curr').textContent = land ? t('flow.land') : ok ? (ms * KT_PER_MS).toFixed(1) : '--';
    $('curr').className = 'seg ' + (ok && ms >= src.strongMs ? 'red' : 'green');
    $('cset').textContent = ok ? String(Math.round(towardDeg(v[0], v[1])) % 360).padStart(3, '0') : '--';
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
  return { refresh: update };
}
