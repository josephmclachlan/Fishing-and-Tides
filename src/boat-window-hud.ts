/**
 * DAYLIGHT, MOON, PRESSURE and NEXT GO WINDOW rows for the BOAT activity (PLAN 7.23 item 4), under SEA STATE.
 * All from the same forecast the WATCH tracker reads (boat/window.ts); the sun and moon are computed on the device.
 */
import type { Map } from 'maplibre-gl';
import { clock } from './astro-hud';
import { condSlot } from './cond-groups';
import { t, type Key } from './i18n';
import { REGION } from './region';
import { daySky, localDayStart } from './physics/astro';
import { daylight, hourlyVerdicts, nextWindow, pressureWord, pressureTrend3h } from './boat/window';
import { debrisAt } from './boat/debris';
import type { RiverFlow } from './adapters/river-flow';
import type { MetricEnv } from './metrics/registry';
import type { Vessel } from './settings';

export interface BoatWindowDeps {
  env: () => MetricEnv;
  vessel: () => Vessel;
  validMs: () => number;
  riverFlow: () => RiverFlow | null;
}

const hm = (min: number) => `${Math.floor(min / 60)}H ${String(min % 60).padStart(2, '0')}M`;

export function mountBoatWindowHud(root: HTMLElement, map: Map, deps: BoatWindowDeps) {
  const side = condSlot(root, 'waves', 21);
  if (!side) return;
  const row = (label: Key, id: string) => `<div class="ro"><span class="lbl">${t(label)}</span><span class="seg sm" id="${id}">--</span></div>`;
  side.insertAdjacentHTML('beforeend', `<div class="from-coast">${row('bw.light', 'bw-light')}${row('bw.moon', 'bw-moon')}${row('bw.press', 'bw-press')}${row('bw.window', 'bw-window')}${row('bw.debris', 'bw-debris')}</div>`);
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;

  const tick = () => {
    const now = deps.validMs();
    const c = map.getCenter();
    const day = localDayStart(now, REGION.tzOffsetH);
    const sky = daySky(day, c.lat, c.lng);
    const tomorrow = daySky(day + 24 * 3.6e6, c.lat, c.lng);
    const dl = daylight(sky, tomorrow.sun.sunrise, now);
    $('bw-light').textContent = !dl ? '--' : dl.kind === 'day' ? t('bw.sunset', { at: clock(dl.untilMs), left: hm(dl.minutes) }) : t('bw.dark', { at: clock(dl.untilMs) });
    $('bw-light').className = `seg sm ${dl?.kind === 'night' ? 'red' : dl && dl.minutes < 120 ? '' : 'green'}`;
    const dark = dl?.kind === 'night';
    $('bw-moon').textContent = dark ? t('bw.moonLit', { pct: Math.round(sky.phase.illumination * 100) }) : '--';
    const env = deps.env();
    const word = pressureWord(pressureTrend3h(env, now));
    $('bw-press').textContent = word ? t(`bw.press.${word}` as Key) : '--';
    $('bw-press').className = `seg sm ${word === 'fallingFast' ? 'red' : word === 'falling' ? '' : word ? 'green' : ''}`;
    const hours = hourlyVerdicts(env, deps.vessel(), c.lng, c.lat, now, 48);
    const known = hours.some((h) => h.verdict !== null);
    const w = known ? nextWindow(hours, now) : null;
    $('bw-window').textContent = !known ? '--' : !w ? t('bw.noWindow') : w.now ? t('bw.windowNow', { until: clock(w.endMs) }) : t('bw.windowAt', { from: clock(w.startMs), to: clock(w.endMs) });
    $('bw-window').className = `seg sm ${w?.now ? 'green' : known && !w ? 'red' : ''}`;
    const flow = deps.riverFlow();
    const db = flow ? debrisAt(flow, c.lng, c.lat, now) : null;
    $('bw-debris').textContent = !flow ? '--' : !db ? t('bw.debris.far') : db.level === 'none' ? t('bw.debris.none') : t(`bw.debris.${db.level}` as Key, { river: db.river, km: Math.round(db.km) });
    $('bw-debris').className = `seg sm ${db?.level === 'likely' ? 'red' : db?.level === 'possible' ? '' : db ? 'green' : ''}`;
  };
  tick();
  setInterval(tick, 5000);
  return { refresh: tick };
}
