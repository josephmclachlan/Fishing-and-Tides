/**
 * TIDE chart in the side panel from the coast tier (PLAN 4.1): the local day on the time slider,
 * predicted at Limón, with the live gauge drawn over it, then the next high and low water.
 * Tap the chart to move the slider to that hour. `tideBlock` is shared with the spot page.
 */
import { condSlot } from './cond-groups';
import { t, type Key } from './i18n';
import { localDayStart } from './physics/astro';
import { REGION } from './region';
import { binReadings, localClock, nextTides, offsetForTap, signedM, tideChartSvg, tideDay, type TideDay } from './tide-chart';
import type { TimeStore } from './time';
import type { Extremum } from './physics/tide';
import { corrections } from './corrections';

export type Observed = () => readonly { t: number; levelM: number }[];

/** "TUE 14:32 +0.21" in Costa Rica time. */
export function tideWhen(e: Extremum): string {
  const d = new Date(e.t + REGION.tzOffsetH * 3.6e6);
  return `${t(`day.${d.getUTCDay()}` as Key)} ${localClock(e.t)} ${signedM(e.h)}`;
}

/** "TUE 03" for the local day starting at t0. */
function dayLabel(t0: number): string {
  const d = new Date(t0 + REGION.tzOffsetH * 3.6e6 + 12 * 3.6e6);
  return `${t(`day.${d.getUTCDay()}` as Key)} ${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * A chart that follows the slider: re-renders into `host` when the day, cursor or gauge changes,
 * and moves the slider when tapped. `prefix` keeps element ids unique per instance.
 */
export function tideBlock(host: HTMLElement, time: TimeStore, observed: Observed, size: { width: number; height: number }) {
  host.innerHTML = `<div class="tc-cap"><span class="lbl" data-r="day">--</span><span class="tc-key"><span class="k-pred"><i></i>${t('tide.pred')}</span><span class="k-obs"><i></i>${t('tide.obs')}</span></span></div>
    <button type="button" class="tc-tap" title="${t('tide.tap')}"></button>`;
  const cap = host.querySelector<HTMLElement>('[data-r="day"]')!;
  const key = host.querySelector<HTMLElement>('.tc-key')!;
  const tap = host.querySelector<HTMLButtonElement>('.tc-tap')!;
  let day: TideDay | null = null;
  let dayFix = corrections.tide();
  let last = '';
  const render = () => {
    const now = time.validMs();
    const t0 = localDayStart(now, REGION.tzOffsetH);
    if (!day || day.t0 !== t0 || dayFix !== corrections.tide()) (day = tideDay(t0)), (dayFix = corrections.tide()), (last = '');
    const obs = observed();
    const inDay = binReadings(obs.filter((r) => r.t >= day!.t0 && r.t <= day!.t1));
    const sig = `${t0}|${now}|${inDay.length}|${inDay.at(-1)?.t ?? 0}`;
    if (sig === last) return;
    last = sig;
    cap.textContent = `${t('tide.day')} ${dayLabel(t0)} · ${t('tide.cr')}`;
    key.classList.toggle('has-obs', inDay.length > 1);
    tap.innerHTML = tideChartSvg(day, { cursor: now, observed: inDay, ...size, label: t('tide.aria', { day: dayLabel(t0) }) });
    tap.setAttribute('aria-label', t('tide.aria', { day: dayLabel(t0) }));
  };
  tap.addEventListener('click', (e) => {
    if (!day) return;
    const r = tap.getBoundingClientRect();
    if (r.width > 0) time.set(offsetForTap((e.clientX - r.left) / r.width, day.t0, time.baseMs()));
  });
  return { render };
}

export function mountTideHud(root: HTMLElement, time: TimeStore, observed: Observed) {
  // The tide height stays in the conditions core; the chart and next high/low open the WATER group.
  const side = condSlot(root, 'water', 5);
  if (!side) return null;
  const box = document.createElement('div');
  box.className = 'from-coast tide-box';
  box.innerHTML = `<div class="tc-host"></div>
    <div class="ro"><span class="lbl">${t('tide.nextHigh')}</span><span class="seg sm" id="tc-hi">--</span></div>
    <div class="ro"><span class="lbl">${t('tide.nextLow')}</span><span class="seg sm" id="tc-lo">--</span></div>`;
  side.appendChild(box);
  const chart = tideBlock(box.querySelector<HTMLElement>('.tc-host')!, time, observed, { width: 240, height: 84 });
  const refresh = () => {
    chart.render();
    const next = nextTides(time.validMs());
    const hi = next.find((e) => e.type === 'high');
    const lo = next.find((e) => e.type === 'low');
    box.querySelector('#tc-hi')!.textContent = hi ? tideWhen(hi) : '--';
    box.querySelector('#tc-lo')!.textContent = lo ? tideWhen(lo) : '--';
  };
  time.subscribe(refresh);
  // The cursor and the gauge move with the clock too.
  setInterval(refresh, 60_000);
  refresh();
  return { refresh };
}
