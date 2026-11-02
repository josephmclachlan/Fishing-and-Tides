/**
 * SEA STATE rows in the side panel (PLAN 6.6): the comfort class and score for sailing, from wind-sea
 * and swell partitions. Real partitions come from the waves feed (both swells, energy-added, and the
 * wind sea); `simPartitions` (tagged SIM) stands in when the feed has none (mock, OUTLOOK climatology).
 */
import { condSlot } from './cond-groups';
import { t, type Key } from './i18n';
import { seaState, simPartitions, type SeaPartitions } from './physics/sea-state';
import type { SeaState as Waves } from './adapters/waves';
import type { Conditions } from './mock';

const ok = (x: number) => Number.isFinite(x) && x > 0;

/** The feed's partitions as the comfort index's two trains, or null if the feed has no split. */
export function feedPartitions(w: Waves | null): SeaPartitions | null {
  if (!w || !Number.isFinite(w.swellHs)) return null;
  const h1 = Math.max(0, w.swellHs);
  const h2 = ok(w.swell2Hs) ? w.swell2Hs : 0;
  const e = h1 * h1 + h2 * h2;
  // Both swells add by energy; the period is energy-weighted. The primary's direction stands for both.
  const swellTs = e > 0 ? (h1 * h1 * (ok(w.swellT) ? w.swellT : 0) + h2 * h2 * (ok(w.swell2T) ? w.swell2T : 0)) / e : 0;
  const hw = ok(w.windSeaHs) ? w.windSeaHs : 0;
  return {
    swellHm: Math.sqrt(e),
    swellTs,
    swellDirDeg: Number.isFinite(w.swellDir) ? w.swellDir : undefined,
    windWaveHm: hw,
    windWaveTs: ok(w.windSeaT) ? w.windSeaT : 2,
    windWaveDirDeg: Number.isFinite(w.windSeaDir) ? w.windSeaDir : undefined,
  };
}

export function mountSeaStateHud(root: HTMLElement, getData: () => Conditions, seaAt: () => Waves | null = () => null) {
  const side = condSlot(root, 'waves', 20);
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      <div class="ro"><span class="lbl">${t('sea.title')}<span id="ss-sim"> · ${t('sea.sim')}</span></span><span class="seg sm" id="ss-comfort">--</span></div>
      <div class="ro"><span class="lbl">${t('sea.comfort')}</span><span class="seg sm" id="ss-score">--</span></div>
      <div class="ro"><span class="seg sm" id="ss-detail">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  const tick = () => {
    const real = feedPartitions(seaAt());
    $('ss-sim').hidden = !!real;
    const s = seaState(real ?? simPartitions(getData()));
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
