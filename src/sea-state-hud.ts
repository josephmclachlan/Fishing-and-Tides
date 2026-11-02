/**
 * SEA STATE rows in the side panel (PLAN 6.6): the comfort class and score for sailing, from wind-sea
 * and swell partitions. Partitions come from `simPartitions` (tagged SIM) until the marine feed lands.
 */
import { t, type Key } from './i18n';
import { seaState, simPartitions } from './physics/sea-state';
import type { Conditions } from './mock';

export function mountSeaStateHud(root: HTMLElement, getData: () => Conditions) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      <div class="ro"><span class="lbl">${t('sea.title')} · ${t('sea.sim')}</span><span class="seg sm" id="ss-comfort">--</span></div>
      <div class="ro"><span class="lbl">${t('sea.comfort')}</span><span class="seg sm" id="ss-score">--</span></div>
      <div class="ro"><span class="seg sm" id="ss-detail">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  const tick = () => {
    const s = seaState(simPartitions(getData()));
    const tone = s.comfort === 'comfortable' ? 'green' : s.comfort === 'lively' ? '' : 'red';
    $('ss-comfort').textContent = t(`sea.${s.comfort}` as Key);
    $('ss-comfort').className = `seg sm ${tone}`;
    $('ss-score').textContent = String(s.score).padStart(3, '0');
    $('ss-detail').textContent =
      t('sea.detail', { h: s.totalHm.toFixed(1), tp: s.meanPeriodS.toFixed(0), steep: s.steepness.toFixed(3) }) +
      ` · ${t(`sea.dominant.${s.dominant}` as Key)}${s.confusion > 0.5 ? ` · ${t('sea.cross')}` : ''}`;
  };
  tick();
  setInterval(tick, 1000);
}
