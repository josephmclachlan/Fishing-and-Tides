/**
 * SURF ZONE readouts in the side panel at the spot tier (PLAN 4.2): breaker height and type,
 * wave power, longshore drift and the rip band at the spot nearest the reticle.
 */
import type { Map } from 'maplibre-gl';
import { nearest } from './geo';
import { panelHeader, readout } from './hud-kit';
import { t, type Key } from './i18n';
import { SPOTS } from './region';
import type { SpotPhysics } from './spot-physics';

export function mountSurfHud(root: HTMLElement, map: Map, spots: SpotPhysics) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-spot">
      ${panelHeader(t('surf.title'))}
      ${readout(t('surf.breaker'), 'sz-hb', t('unit.m'))}
      <div class="ro"><span class="lbl">${t('surf.type')}</span><span class="seg sm" id="sz-type">--</span></div>
      ${readout(t('surf.power'), 'sz-pow', t('unit.kwm'))}
      ${readout(t('surf.drift'), 'sz-drift', t('unit.ms'))}
      <div class="ro"><span class="lbl">${t('rip.strength')}</span><span class="seg sm" id="sz-rips">--</span></div>
      ${readout(t('rip.reach'), 'sz-ripl', t('unit.m'))}
      <div class="ro"><span class="lbl dim">${t('surf.note')}</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  const update = () => {
    const c = map.getCenter();
    const name = nearest([c.lng, c.lat], SPOTS)!.point.name;
    const r = spots.byName(name)?.result;
    if (!r) {
      for (const id of ['sz-hb', 'sz-type', 'sz-pow', 'sz-drift', 'sz-rips', 'sz-ripl']) $(id).textContent = '--';
      return;
    }
    const b = r.waves.breaker;
    $('sz-hb').textContent = b.Hb.toFixed(1);
    $('sz-type').textContent = b.type ? t(`surf.type.${b.type}` as Key) : '--';
    $('sz-pow').textContent = b.powerKWm.toFixed(0);
    $('sz-drift').textContent = Math.abs(b.longshoreMs).toFixed(1);
    const rips = $('sz-rips');
    rips.textContent = `${t(`rip.str.${r.rip.strength}` as Key)} ${r.rip.speedMs.toFixed(1)}`;
    rips.className = 'seg sm ' + (r.rip.level === 'HIGH' ? 'red' : r.rip.level === 'MOD' ? '' : 'green');
    $('sz-ripl').textContent = String(Math.round(r.rip.lengthM / 10) * 10);
  };
  spots.subscribe(update);
  let queued = false;
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(() => ((queued = false), update()));
  });
  update();
}
