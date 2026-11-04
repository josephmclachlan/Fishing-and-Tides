/**
 * SEA STATE rows in the side panel (PLAN 6.6): the comfort class and score for sailing, from wind-sea
 * and swell partitions. Real partitions come from the waves feed (both swells, energy-added, and the
 * wind sea); `simPartitions` (tagged SIM) stands in when the feed has none (mock, OUTLOOK climatology).
 */
import { condSlot } from './cond-groups';
import { t, type Key } from './i18n';
import { opposingMs, seaState, simPartitions, withCurrent } from './physics/sea-state';
import { feedPartitions } from './sea-partitions';
import type { SeaState as Waves } from './adapters/waves';
import type { Conditions } from './mock';
import { boatVerdict, type VerdictInputs } from './boat/verdict';
import type { Vessel } from './settings';

/** What the BOAT verdict reads besides wind and sea: the safety feeds, supplied by main.ts. */
export type VerdictSafety = Pick<VerdictInputs, 'gustKt' | 'squall' | 'lightning' | 'stormKm' | 'rainMmH' | 'debris'>;
export interface SeaStateDeps {
  vessel: () => Vessel;
  safety: () => VerdictSafety;
  /** Surface current [east, north] m/s at the reticle, or null (PLAN 7.23 item 3). */
  current?: () => readonly [number, number] | null;
}

export { feedPartitions };

/**
 * Wave steepness H/L in words. Ocean swell is under about 0.01; fresh wind chop runs 0.03 to 0.05 and breaks near
 * 1/7 (0.14), so past 0.025 the sea is short and steep enough to slam a small boat.
 */
export const steepWord = (steep: number): 'gentle' | 'moderate' | 'steep' => (steep < 0.01 ? 'gentle' : steep < 0.025 ? 'moderate' : 'steep');

export function mountSeaStateHud(root: HTMLElement, getData: () => Conditions, seaAt: () => Waves | null = () => null, deps?: SeaStateDeps) {
  const side = condSlot(root, 'waves', 20);
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      <div class="ro"><span class="lbl">${t('sea.title')}<span id="ss-sim"> · ${t('sea.sim')}</span></span><span class="seg sm" id="ss-comfort">--</span></div>
      <div class="ro"><span class="lbl">${t('sea.comfort')}</span><span class="seg sm" id="ss-score">--</span></div>
      <div class="ro"><span class="seg sm wrap" id="ss-detail">--</span></div>
      <div class="ro"><span class="lbl">${t('sea.current')}</span><span class="seg sm wrap" id="ss-curr">--</span></div>
      <div class="ro"><span class="lbl">${t('verdict.title')}</span><span class="seg sm" id="bv-verdict">--</span></div>
      <div class="ro"><span class="seg sm wrap" id="bv-why">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  const tick = () => {
    const real = feedPartitions(seaAt());
    $('ss-sim').hidden = !!real;
    const base = real ?? simPartitions(getData());
    const cur = deps?.current?.();
    const c = cur ? { u: cur[0], v: cur[1] } : null;
    const s = seaState(c ? withCurrent(base, c) : base);
    // Current against the waves steepens them (physics/sea-state.ts currentFactor); the comfort score above already includes it.
    const speed = c ? Math.hypot(c.u, c.v) : 0;
    const opp = c ? opposingMs(base, c) : null;
    $('ss-curr').textContent = !c ? '--' : `${(speed * 1.94384).toFixed(1)} ${t('unit.kt')}${speed >= 0.1 && opp !== null ? ' · ' + t(opp / speed > 0.5 ? 'sea.curr.against' : opp / speed < -0.5 ? 'sea.curr.with' : 'sea.curr.cross') : ''}`;
    $('ss-curr').className = `seg sm wrap ${opp !== null && speed >= 0.25 && opp / speed > 0.5 ? 'red' : ''}`;
    const tone = s.comfort === 'comfortable' ? 'green' : s.comfort === 'lively' ? '' : 'red';
    $('ss-comfort').textContent = t(`sea.${s.comfort}` as Key);
    $('ss-comfort').className = `seg sm ${tone}`;
    $('ss-score').textContent = `${s.score}/100`;
    $('ss-detail').textContent =
      t('sea.detail', { h: s.totalHm.toFixed(1), tp: s.meanPeriodS.toFixed(0), steep: t(`sea.steep.${steepWord(s.steepness)}` as Key) }) +
      ` · ${t(`sea.dominant.${s.dominant}` as Key)}${s.confusion > 0.5 ? ` · ${t('sea.cross')}` : ''}`;
    if (deps) {
      const v = boatVerdict({ vessel: deps.vessel(), windKt: getData().windKt, hsM: s.totalHm, comfort: s.score, ...deps.safety() });
      $('bv-verdict').textContent = t(`verdict.${v.verdict}` as Key);
      $('bv-verdict').className = `seg sm ${v.verdict === 'go' ? 'green' : v.verdict === 'nogo' ? 'red' : ''}`;
      const why = v.reasons.slice(0, 3).map((r) => t(`verdict.why.${r.id}` as Key, { kt: Math.round(r.value ?? 0), m: (r.value ?? s.totalHm).toFixed(1) }));
      $('bv-why').textContent = (why.length ? why.join(' · ') : t('verdict.why.none')) + (real ? '' : ` · ${t('verdict.sim')}`);
    }
  };
  tick();
  setInterval(tick, 1000);
}
