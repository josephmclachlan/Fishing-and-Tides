/**
 * DIVE SURGE rows in the side panel at the spot tier (PLAN 6.2): bed surge at 3, 6 and 12 m
 * for the spot nearest the reticle, as CALM / SURGY / DANGEROUS with the speed and how far the
 * water swings each way.
 */
import type { Map } from 'maplibre-gl';
import { nearest } from './geo';
import { panelHeader } from './hud-kit';
import { t, type Key } from './i18n';
import { DIVE_DEPTHS, surgeProfile } from './physics/surge';
import { SPOTS } from './region';
import type { SpotPhysics } from './spot-physics';

export function mountDiveHud(root: HTMLElement, map: Map, spots: SpotPhysics) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-spot">
      ${panelHeader(t('dive.title'))}
      ${DIVE_DEPTHS.map((d) => `<div class="ro"><span class="lbl">${t('dive.at', { d })}</span><span class="seg sm" id="dv-${d}">--</span></div>`).join('')}
    </div>`,
  );
  const update = () => {
    const c = map.getCenter();
    const st = spots.byName(nearest([c.lng, c.lat], SPOTS)!.point.name);
    const r = st?.result;
    const profile = r ? surgeProfile(st!.sea.Hs, st!.sea.Tp, r.waves.refraction.K, r.waves.refraction.depth) : null;
    DIVE_DEPTHS.forEach((d, i) => {
      const el = side.querySelector<HTMLElement>(`#dv-${d}`)!;
      const s = profile?.[i];
      el.textContent = s ? `${t(`dive.band.${s.band}` as Key)} ${s.uMs.toFixed(1)} ${t('unit.ms')} ±${s.excursionM.toFixed(1)}${t('unit.m')}` : '--';
      el.className = 'seg sm ' + (!s ? '' : s.band === 'DANGEROUS' ? 'red' : s.band === 'SURGY' ? '' : 'green');
    });
  };
  spots.subscribe(update);
  let queued = false;
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(() => ((queued = false), update()));
  });
  update();
}
