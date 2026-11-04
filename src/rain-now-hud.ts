/**
 * RAIN CELLS rows in the WEATHER group and the alert strip (PLAN 7.24 item 3): for each town, raining now,
 * rain arriving in about N minutes, or dry for the next 2 hours, from the satellite rain-cell nowcast
 * (src/rain/nowcast.ts); the cells' motion; and the source with its age. This is about the real present,
 * not the slider. Rows show -- until the feed loads and NO DATA when it cannot (not on GitHub Pages).
 */
import { condSlot } from './cond-groups';
import { t } from './i18n';
import { RAIN_TOWNS } from './region';
import type { RainCellsData } from './adapters/rain-cells';
import { compass8, motion, STALE_MIN, townNowcast, type Motion, type TownNowcast } from './rain/nowcast';

/** Alert when a cell this heavy (mm/h) is this close (min) to a town. */
export const RAIN_ALERT_MM_H = 5;
export const RAIN_ALERT_MIN = 30;

export interface RainNowState {
  motion: Motion | null;
  towns: { id: string; name: string; n: TownNowcast }[];
}

export function rainNowState(d: RainCellsData, nowMs: number): RainNowState {
  const m = motion(d.grid, d.frames);
  return { motion: m, towns: RAIN_TOWNS.map((tw) => ({ id: tw.id, name: tw.name, n: townNowcast(d.grid, d.frames, m, tw.lngLat, nowMs) })) };
}

/** Alert-strip lines: a heavy cell reaching a town within RAIN_ALERT_MIN. */
export function rainAlerts(s: RainNowState | null): string[] {
  if (!s) return [];
  return s.towns
    .filter(({ n }) => n.status === 'coming' && n.etaMin! <= RAIN_ALERT_MIN && n.peakMmH >= RAIN_ALERT_MM_H)
    .map(({ name, n }) => t('rn.alert', { town: name, min: n.etaMin! }));
}

export function mountRainNowHud(root: HTMLElement) {
  const side = condSlot(root, 'weather', 12);
  if (!side) return null;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast rain-now">
      <div class="ro"><span class="lbl">${t('rn.title')}</span></div>
      ${RAIN_TOWNS.map((tw) => `<div class="ro"><span class="lbl">${tw.name}</span><span class="seg sm" id="rn-${tw.id}">--</span></div>`).join('')}
      <div class="ro"><span class="seg sm" id="rn-move">--</span></div>
      <div class="ro"><span class="seg sm" id="rn-src">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let d: RainCellsData | null = null;
  let state: RainNowState | null = null;
  let failed = false;

  const render = () => {
    const now = Date.now();
    const newest = d?.frames.at(-1)?.t ?? NaN;
    const ageMin = Math.round((now - newest) / 60000);
    const stale = !d || !(ageMin <= STALE_MIN);
    state = d && !stale ? rainNowState(d, now) : null;
    for (const tw of RAIN_TOWNS) {
      const el = $(`rn-${tw.id}`);
      const n = state?.towns.find((x) => x.id === tw.id)?.n;
      el.textContent = !n || n.status === 'unknown' ? (failed && !d ? t('rn.noData') : '--')
        : n.status === 'raining' ? t('rn.raining', { mm: n.nowMmH.toFixed(0) })
          : n.status === 'coming' ? t('rn.coming', { min: n.etaMin! })
            : t('rn.dry');
      el.className = 'seg sm ' + (!n ? '' : n.status === 'dry' ? 'green' : (n.status === 'raining' ? n.nowMmH : n.peakMmH) >= 10 ? 'red' : '');
    }
    const m = state?.motion;
    $('rn-move').textContent = !state ? '--' : m && m.speedKmh >= 3 ? t('rn.move', { dir: compass8(m.towardsDeg), kmh: Math.round(m.speedKmh) }) : t('rn.still');
    const src = $('rn-src');
    src.textContent = !d ? (failed ? t('rn.noData') : '--') : stale ? t('rn.stale', { min: Number.isFinite(ageMin) ? ageMin : '--' }) : t('rn.src', { src: t(`rn.src.${d.source}`), min: ageMin });
    src.className = 'seg sm ' + (d && stale ? 'red' : '');
  };
  render();
  setInterval(render, 60000);

  return {
    set(data: RainCellsData) {
      d = data;
      render();
    },
    setFailed() {
      failed = true;
      render();
    },
    alerts: () => rainAlerts(state),
  };
}
