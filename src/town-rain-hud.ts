/**
 * RAIN BY TOWN rows in the WEATHER group (PLAN 7.24 item 1): rain over the next 3 h from the slider's
 * valid time at Cahuita, Playa Negra, Puerto Viejo and Manzanillo, as the mean model amount and the
 * share of models that rain. Rows show -- until the town forecast has loaded.
 */
import { condSlot } from './cond-groups';
import { t } from './i18n';
import { RAIN_TOWNS } from './region';
import type { TownRain } from './adapters/town-rain';
import { hourStart, townWindow, type TownRainWindow } from './rain/town';

export const TOWN_WINDOW_H = 3;

/** True when the towns tell different stories: one town's models mostly dry while another's mostly wet. */
export function townsSplit(ws: readonly (TownRainWindow | null)[]): boolean {
  const c = ws.filter((w): w is TownRainWindow => !!w).map((w) => w.chance);
  return c.length > 1 && Math.min(...c) <= 0.25 && Math.max(...c) >= 0.75;
}

export function mountTownRainHud(root: HTMLElement, deps: { validMs: () => number }) {
  const side = condSlot(root, 'weather', 11);
  if (!side) return null;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast town-rain">
      <div class="ro"><span class="lbl">${t('wx.towns')}</span></div>
      ${RAIN_TOWNS.map((tw) => `<div class="ro"><span class="lbl">${tw.name}</span><span class="seg sm" id="tr-${tw.id}">--</span></div>`).join('')}
      <div class="ro"><span class="seg sm" id="tr-note">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let d: TownRain | null = null;

  const render = () => {
    const from = hourStart(deps.validMs());
    const ws = RAIN_TOWNS.map((tw) => (d ? townWindow(d, tw.id, from, TOWN_WINDOW_H) : null));
    RAIN_TOWNS.forEach((tw, k) => {
      const w = ws[k];
      const el = $(`tr-${tw.id}`);
      el.textContent = w ? t('wx.townRow', { mm: w.amountMm.toFixed(1), pct: Math.round(w.chance * 100) }) : '--';
      el.className = 'seg sm ' + (!w ? '' : w.chance === 0 ? 'green' : w.chance >= 0.75 && w.amountMm >= 10 ? 'red' : '');
    });
    $('tr-note').textContent = !d ? t('wx.none') : townsSplit(ws) ? t('wx.townSplit') : t('wx.townNote');
  };
  render();

  return {
    set(data: TownRain) {
      d = data;
      render();
    },
    refresh: render,
  };
}
