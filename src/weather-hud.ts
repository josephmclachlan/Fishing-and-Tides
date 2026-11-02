/**
 * WEATHER rows in the side panel (PLAN 7.5): rain now and over the next 24 h, cloud, UV and air
 * temperature at the slider's valid time (mean of GFS, ECMWF and ICON, with a note when they disagree),
 * and the nearest active tropical storm. `alerts()` feeds the alert strip. Rows show -- until the
 * forecast has loaded. There is no radar yet: it needs an observation source (see docs/WEATHER.md).
 */
import { t } from './i18n';
import { readout } from './hud-kit';
import type { WeatherData } from './adapters/weather';
import type { Storm } from './adapters/storms';
import { heavyRainSoon, nearestStorm, summarise, STORM_ALERT_KM } from './weather';

export interface WeatherHudDeps {
  validMs: () => number;
}

const fmt = (x: number, digits = 0) => (Number.isFinite(x) ? x.toFixed(digits) : '--');

export function mountWeatherHud(root: HTMLElement, deps: WeatherHudDeps) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return null;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      ${readout(t('wx.rain'), 'wx-rain', t('unit.mmh'))}
      ${readout(t('wx.rain24'), 'wx-rain24', t('unit.mm'))}
      ${readout(t('wx.cloud'), 'wx-cloud', t('unit.pct'))}
      ${readout(t('wx.uv'), 'wx-uv', '')}
      ${readout(t('wx.air'), 'wx-air', t('unit.degC'))}
      <div class="ro"><span class="seg sm" id="wx-note">--</span></div>
      <div class="ro"><span class="lbl">${t('wx.storm')}</span><span class="seg sm" id="wx-storm">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let wx: WeatherData | null = null;
  let storms: readonly Storm[] | null = null;

  const render = () => {
    const s = wx ? summarise(wx, deps.validMs()) : null;
    $('wx-rain').textContent = s ? fmt(s.rainMmH, 1) : '--';
    $('wx-rain24').textContent = s ? fmt(s.rain24Mm) : '--';
    $('wx-cloud').textContent = s ? fmt(s.cloudPct) : '--';
    $('wx-uv').textContent = s ? fmt(s.uv, 1) : '--';
    $('wx-air').textContent = s ? fmt(s.tempC, 1) : '--';
    $('wx-note').textContent = !s ? t('wx.none') : s.models > 1 && s.rainSpreadMmH >= 2 ? t('wx.spread') : t('wx.models', { n: s.models });
    const n = storms ? nearestStorm(storms) : null;
    const el = $('wx-storm');
    el.textContent = !storms ? '--' : n ? t('wx.stormRow', { name: n.storm.name, cls: n.category ? t('wx.cat', { n: n.category }) : n.storm.classification, km: Math.round(n.km) }) : t('wx.noStorm');
    el.className = 'seg sm ' + (n && n.km <= STORM_ALERT_KM ? 'red' : '');
  };
  render();

  return {
    setWeather(d: WeatherData) {
      wx = d;
      render();
    },
    setStorms(s: readonly Storm[]) {
      storms = s;
      render();
    },
    refresh: render,
    /** Alert-strip messages for the HUD. */
    alerts(): string[] {
      const out: string[] = [];
      const n = storms ? nearestStorm(storms) : null;
      if (n && n.km <= STORM_ALERT_KM) out.push(t('wx.alertStorm', { name: n.storm.name, km: Math.round(n.km) }));
      if (wx && heavyRainSoon(wx, Date.now())) out.push(t('wx.alertRain'));
      return out;
    },
  };
}
