/**
 * SUN & MOON rows in the side panel (PLAN 7.7): sunrise and sunset, golden hours, moon phase and
 * rise/set, and solunar windows for the day on the time slider at the map centre. All computed on the
 * device (src/physics/astro.ts), so it works offline and needs no feed, hence no DATA AGE tag.
 */
import { t, type Key } from './i18n';
import { REGION } from './region';
import { daySky, localDayStart, type SolunarWindow } from './physics/astro';
import type { TimeStore } from './time';
import type { Map as MlMap } from 'maplibre-gl';

const pad = (n: number) => String(n).padStart(2, '0');

/** Costa Rica clock time, HH:MM, or dashes when the event does not happen that day. */
export function clock(ms: number | null): string {
  if (ms === null) return '--:--';
  const d = new Date(ms + REGION.tzOffsetH * 3.6e6);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const range = (r: readonly [number, number] | null) => (r ? `${clock(r[0])}–${clock(r[1])}` : '--:--');
const windows = (ws: SolunarWindow[], kind: SolunarWindow['kind']) => ws.filter((w) => w.kind === kind).map((w) => `${clock(w.start)}–${clock(w.end)}`).join(' · ') || '--:--';
/** Four-pip rating, filled pips first. */
const pips = (n: number) => '●'.repeat(n) + '○'.repeat(4 - n);

export function mountAstroHud(root: HTMLElement, map: MlMap, time: TimeStore) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  const row = (label: Key, id: string) => `<div class="ro"><span class="lbl">${t(label)}</span><span class="seg sm" id="${id}">--</span></div>`;
  side.insertAdjacentHTML(
    'beforeend',
    `<details class="astro">
      <summary><span class="lbl">${t('astro.title')}</span><span class="seg sm" id="as-phase">--</span></summary>
      ${row('astro.sun', 'as-sun')}${row('astro.goldAm', 'as-gam')}${row('astro.goldPm', 'as-gpm')}
      ${row('astro.moon', 'as-moon')}${row('astro.major', 'as-major')}${row('astro.minor', 'as-minor')}${row('astro.rating', 'as-rating')}
      <div class="ro"><span class="lbl note">${t('astro.note')}</span></div>
    </details>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let key = '';
  const render = () => {
    const c = map.getCenter();
    // Recompute only when the local day or the place (to 0.1°) changes.
    const day = localDayStart(time.validMs(), REGION.tzOffsetH);
    const lat = Math.round(c.lat * 10) / 10;
    const lng = Math.round(c.lng * 10) / 10;
    const next = `${day}|${lat}|${lng}`;
    if (next === key) return;
    key = next;
    const s = daySky(day, lat, lng);
    $('as-phase').textContent = `${t(`astro.moon.${s.phase.name}` as Key)} ${Math.round(s.phase.illumination * 100)}%`;
    $('as-sun').textContent = `${clock(s.sun.sunrise)} / ${clock(s.sun.sunset)}`;
    $('as-gam').textContent = range(s.sun.goldenAm);
    $('as-gpm').textContent = range(s.sun.goldenPm);
    $('as-moon').textContent = `${clock(s.moon.moonrise)} / ${clock(s.moon.moonset)}`;
    $('as-major').textContent = windows(s.windows, 'major');
    $('as-minor').textContent = windows(s.windows, 'minor');
    $('as-rating').textContent = pips(s.rating);
    $('as-rating').className = `seg sm ${s.rating >= 3 ? 'green' : ''}`;
  };
  time.subscribe(render);
  map.on('moveend', render);
  render();
}
