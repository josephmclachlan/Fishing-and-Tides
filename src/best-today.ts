/**
 * BEST TIME TODAY button: one row in the CONDITIONS panel and one above the phone glance strip.
 * It shows the best two-hour window left today for the current activity (SURF, FISH, DIVE, BOAT)
 * at the spot nearest the map centre, and tapping it moves the time slider there so every panel
 * shows that hour. The scoring is in `metrics/best-today.ts`; this file is only DOM.
 */
import type { Map } from 'maplibre-gl';
import { REGION, SPOTS } from './region';
import { t, type Key } from './i18n';
import type { TimeStore } from './time';
import type { MetricEnv } from './metrics/registry';
import { BEST_MAX_DAY, bestOnDay, spotNear, todayOver, type Activity, type BestToday } from './metrics/best-today';
import { localDayStart } from './physics/astro';


const HOUR = 3.6e6;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const hhmm = (ms: number) => {
  const m = Math.floor((ms + REGION.tzOffsetH * HOUR) / 60_000) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Slider offset (whole hours ahead of NOW) for a window: now if it has already started. */
export const offsetFor = (w: BestToday, baseMs: number): number => Math.max(0, Math.round((w.startMs - baseMs) / HOUR));

export function mountBestToday(
  root: HTMLElement,
  map: Map,
  time: TimeStore,
  getEnv: () => MetricEnv,
  /** The activity to score: the CONDITIONS picker's, or the glance strip's when that is ALL. */
  getActivity: () => Activity,
) {
  const make = (cls: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `best-today ${cls}`;
    b.addEventListener('click', go);
    return b;
  };
  const rows = [make('bt-cond'), make('bt-glance')];
  const panel = root.querySelector<HTMLElement>('#cond-panel');
  const acts = panel?.querySelector('.cg-acts');
  if (acts) acts.after(rows[0]);
  else rows[0].hidden = true;
  const glance = root.querySelector<HTMLElement>('#glance');
  if (glance) glance.after(rows[1]);
  else rows[1].hidden = true;

  let win: BestToday | null = null;
  function go() {
    if (win) time.set(offsetFor(win, time.baseMs()));
  }

  // The day the slider is on (0 = today), so the button answers for the day being looked at.
  const dayAhead = () => {
    const tz = getEnv().tzOffsetH;
    return Math.round((localDayStart(time.validMs(), tz) - localDayStart(Date.now(), tz)) / (24 * HOUR));
  };
  let shownDay = -1;
  /** True while the button says NO DATA YET: it then rechecks every few seconds so it fills in as the feeds land. */
  let waiting = false;

  const refresh = () => {
    const c = map.getCenter();
    const spot = spotNear([c.lng, c.lat], SPOTS);
    const act = getActivity();
    const day = (shownDay = dayAhead());
    const found = spot ? bestOnDay(getEnv(), act, spot, Date.now(), day) : null;
    // A window where even the best hours are mostly red is not worth offering.
    win = found && found.good ? found : null;
    const name = t(`cg.act.${act}` as Key);
    const when = day === 0 ? t('bt.today') : day === 1 ? t('bt.tomorrow') : t(`day.${new Date(time.validMs() + getEnv().tzOffsetH * HOUR).getUTCDay()}` as Key);
    // Why it is empty: past the forecast, a day with nothing good, the day's windows over, or a feed missing.
    const none = t(
      day > BEST_MAX_DAY ? 'bt.tooFar' : found && !found.good ? 'bt.poor' : day === 0 && todayOver(getEnv().tzOffsetH, Date.now(), act) ? 'bt.noneLeft' : 'bt.noData',
    );
    waiting = !win && none === t('bt.noData');
    const body = win
      ? `<span class="seg sm green">${hhmm(win.startMs)}–${hhmm(win.endMs)}</span><span class="bt-at">${esc(win.spot)}</span>`
      : `<span class="seg sm">--</span><span class="bt-at">${none}</span>`;
    const html = `<span class="lbl">${t('bt.label', { name, when })}</span>${body}<span class="bt-go" aria-hidden="true">▸</span>`;
    for (const r of rows) {
      r.innerHTML = html;
      r.disabled = !win;
      r.setAttribute('aria-label', win ? t('bt.aria', { name, when, time: `${hhmm(win.startMs)}–${hhmm(win.endMs)}`, spot: win.spot }) : none);
    }
  };

  map.on('moveend', refresh);
  time.subscribe(() => {
    if (dayAhead() !== shownDay) refresh();
  });
  setInterval(refresh, 60_000);
  setInterval(() => waiting && refresh(), 2_000);
  refresh();
  return { refresh, window: () => win };
}
