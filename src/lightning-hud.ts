/**
 * LIGHTNING rows in the side panel and the alert strip (PLAN 7.6): the nearest flash to the reticle in
 * the last 15 minutes with its range and age, and a warning when one is within 25 km. Rows show -- until
 * the feed loads and NO DATA when it cannot (not on GitHub Pages, or offline with nothing cached). The
 * file's age is shown so a stalled collector is visible: a quiet map from a stale file is not "no storms".
 */
import { condSlot } from './cond-groups';
import type { Map } from 'maplibre-gl';
import { t } from './i18n';
import { countNear, nearestFlash, STRIKE_ALERT_KM, STRIKE_ALERT_MIN, type Flash } from './lightning';

const STALE_MIN = 30;

export function mountLightningHud(root: HTMLElement, map: Map) {
  const side = condSlot(root, 'weather', 20);
  if (!side) return null;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      <div class="ro"><span class="lbl">${t('lt.title')}</span><span class="seg sm" id="lt-near">--</span></div>
      <div class="ro"><span class="seg sm" id="lt-count">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let flashes: readonly Flash[] | null = null;
  let fetchedAt = NaN;
  let failed = false;

  const stale = () => !Number.isFinite(fetchedAt) || Date.now() - fetchedAt > STALE_MIN * 60000;
  const render = () => {
    const near = $('lt-near');
    const count = $('lt-count');
    if (!flashes) {
      near.textContent = failed ? t('lt.noData') : '--';
      near.className = 'seg sm';
      count.textContent = '--';
      return;
    }
    const c = map.getCenter();
    const n = nearestFlash(flashes, c.lng, c.lat, Date.now());
    const ageMin = Math.round((Date.now() - fetchedAt) / 60000);
    near.textContent = stale() ? t('lt.stale', { min: ageMin }) : n ? t('lt.near', { km: Math.round(n.km), min: Math.round(n.ageMin) }) : t('lt.none', { min: STRIKE_ALERT_MIN });
    near.className = 'seg sm ' + (!stale() && n && n.km <= STRIKE_ALERT_KM ? 'red' : '');
    count.textContent = stale() ? '--' : t('lt.count', { n: countNear(flashes, c.lng, c.lat, Date.now(), 100), km: 100 });
  };
  let queued = false;
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(() => ((queued = false), render()));
  });
  render();

  return {
    setFlashes(f: readonly Flash[], at: number) {
      flashes = f;
      fetchedAt = at;
      render();
    },
    setFailed() {
      failed = true;
      render();
    },
    refresh: render,
    alerts(): string[] {
      if (!flashes || stale()) return [];
      const c = map.getCenter();
      const n = nearestFlash(flashes, c.lng, c.lat, Date.now());
      return n && n.km <= STRIKE_ALERT_KM ? [t('lt.alert', { km: Math.round(n.km), min: Math.round(n.ageMin) })] : [];
    },
  };
}
