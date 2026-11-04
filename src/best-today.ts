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
import { bestToday, spotNear, type Activity, type BestToday } from './metrics/best-today';


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

  const refresh = () => {
    const c = map.getCenter();
    const spot = spotNear([c.lng, c.lat], SPOTS);
    const act = getActivity();
    win = spot ? bestToday(getEnv(), act, spot, Date.now()) : null;
    const name = t(`cg.act.${act}` as Key);
    const body = win
      ? `<span class="seg sm green">${hhmm(win.startMs)}–${hhmm(win.endMs)}</span><span class="bt-at">${esc(win.spot)}</span>`
      : `<span class="seg sm">--</span><span class="bt-at">${t('bt.none')}</span>`;
    const html = `<span class="lbl">${t('bt.label', { name })}</span>${body}<span class="bt-go" aria-hidden="true">▸</span>`;
    for (const r of rows) {
      r.innerHTML = html;
      r.disabled = !win;
      r.setAttribute('aria-label', win ? t('bt.aria', { name, time: `${hhmm(win.startMs)}–${hhmm(win.endMs)}`, spot: win.spot }) : t('bt.none'));
    }
  };

  map.on('moveend', refresh);
  setInterval(refresh, 60_000);
  refresh();
  return { refresh, window: () => win };
}
