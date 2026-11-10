/**
 * WEATHER rows in the side panel (PLAN 7.5): rain now and over the next 24 h, cloud, UV and air
 * temperature at the slider's valid time (GFS, ECMWF and ICON: temperature and gusts blended by their recent
 * skill at the Limón airport, the rest averaged; PLAN 7.4), a CONFIDENCE row with the model the blend leans on,
 * and the nearest active tropical storm. `alerts()` feeds the alert strip. Rows show -- until the
 * forecast has loaded. There is no radar yet: it needs an observation source (see docs/WEATHER.md).
 */
import { condSlot } from './cond-groups';
import { t } from './i18n';
import { readout } from './hud-kit';
import type { WeatherData } from './adapters/weather';
import { MODEL_SHORT } from './adapters/weather-skill';
import type { Storm } from './adapters/storms';
import { heavyRainSoon, nearestStorm, squallSoon, summarise, uvBand, uvPeakDay, STORM_ALERT_KM } from './weather';
import { localClock } from './tide-chart';

export interface WeatherHudDeps {
  validMs: () => number;
}

const fmt = (x: number, digits = 0) => (Number.isFinite(x) ? x.toFixed(digits) : '--');

export function mountWeatherHud(root: HTMLElement, deps: WeatherHudDeps) {
  const side = condSlot(root, 'weather', 10);
  if (!side) return null;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      ${readout(t('wx.rain'), 'wx-rain', t('unit.mmh'))}
      ${readout(t('wx.rain24'), 'wx-rain24', t('unit.mm'))}
      ${readout(t('wx.cloud'), 'wx-cloud', t('unit.pct'))}
      ${readout(t('wx.uv'), 'wx-uv', '')}
      <div class="ro"><span class="lbl">${t('wx.uvPeak')}</span><span class="seg sm" id="wx-uvpeak">--</span></div>
      ${readout(t('wx.air'), 'wx-air', t('unit.degC'))}
      ${readout(t('wx.gust'), 'wx-gust', t('unit.kt'))}
      ${readout(t('wx.cape'), 'wx-cape', t('unit.jkg'))}
      <div class="ro"><span class="lbl">${t('wx.squall')}</span><span class="seg sm" id="wx-squall">--</span></div>
      <div class="ro"><span class="lbl">${t('wx.conf')}</span><span class="seg sm" id="wx-conf">--</span></div>
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
    // The day's peak, so sun protection can be planned from the morning (Joseph, 2026-11-10).
    const pk = wx ? uvPeakDay(wx, deps.validMs()) : null;
    const pkEl = $('wx-uvpeak');
    const band = pk ? uvBand(pk.uv) : null;
    pkEl.textContent = pk && band ? `${fmt(pk.uv)} ${t(`wx.uvb.${band}`)} ${localClock(pk.atMs)}` : '--';
    pkEl.className = 'seg sm ' + (band === 'vhigh' || band === 'extreme' ? 'red' : band === 'low' || band === 'moderate' ? 'green' : '');
    $('wx-air').textContent = s ? fmt(s.tempC, 1) : '--';
    $('wx-gust').textContent = s ? fmt(s.gustKt) : '--';
    $('wx-cape').textContent = s ? fmt(s.capeJkg) : '--';
    const sq = wx ? squallSoon(wx, deps.validMs()) : null;
    const sqEl = $('wx-squall');
    sqEl.textContent = sq ? t(`wx.squall.${sq}`) : '--';
    sqEl.className = 'seg sm ' + (sq === 'high' ? 'red' : sq === 'watch' ? '' : 'green');
    const conf = $('wx-conf');
    conf.textContent = s ? t(`wx.conf.${s.confidence}`) : '--';
    conf.className = 'seg sm ' + (s?.confidence === 'HIGH' ? 'green' : s?.confidence === 'LOW' ? 'red' : '');
    $('wx-note').textContent = !s
      ? t('wx.none')
      : s.models > 1 && s.rainSpreadMmH >= 2
        ? t('wx.spread')
        : s.lead && s.models > 1
          ? t('wx.lead', { n: s.models, model: MODEL_SHORT[s.lead.model], pct: Math.round(100 * s.lead.share) })
          : t('wx.models', { n: s.models });
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
      const sq = wx ? squallSoon(wx, Date.now()) : 'none';
      if (sq !== 'none') out.push(t(sq === 'high' ? 'wx.alertSquallHigh' : 'wx.alertSquall'));
      return out;
    },
  };
}
