/**
 * Reef heat and risks at the top of the CORAL drawer (PLAN 7.32), for the reef nearest the map centre:
 * NOAA Coral Reef Watch DHW and alert, the 12-week build-up, every year's peak since 1985, and today's
 * stresses (risk rows from src/coral/risks.ts). The site log below it is coral-panel.ts.
 */
import { t, type Key } from './i18n';
import { ALERT_KEYS, coralNow, type CoralData, type CoralReef } from './adapters/coral';
import type { CoralHistory } from './coral/history';
import { peakFor } from './coral/history';
import { dhwTrendSvg, peaksSvg, yearsOver } from './coral/charts';
import { coralRisks, type RiskInputs } from './coral/risks';
import { toneOf } from './layers/coral';

const day = (ms: number) => new Date(ms).toISOString().slice(5, 10);

export interface CoralHeatDeps {
  /** The reef nearest the map centre. */
  reef: () => CoralReef | null;
  heat: () => CoralData | null;
  history: () => CoralHistory | null;
  /** Today's inputs for the risk rows at a reef (alert is filled in here). */
  risks: (reefId: string) => Omit<RiskInputs, 'alert'>;
}

export function mountCoralHeat(panel: HTMLElement, deps: CoralHeatDeps) {
  const box = document.createElement('div');
  box.className = 'coral-heat';
  panel.querySelector('.ph')?.after(box);

  const render = () => {
    const d = deps.heat();
    const reef = deps.reef();
    if (!d || !reef) {
      box.innerHTML = `<div class="ro"><span class="lbl">${t('coral.heat')}</span><span class="seg sm">${t('coral.nodata')}</span></div>`;
      return;
    }
    const now = coralNow(d, reef);
    const tone = toneOf(now.alert);
    const alert = now.alert === null ? t('coral.nodata') : t(`coral.alert.${ALERT_KEYS[now.alert]}` as Key);
    const h = deps.history();
    const year = new Date().getUTCFullYear();
    const years = h ? [...h.years.filter((y) => y < year), year] : [year];
    const peaks = years.map((y) => peakFor(h, reef.id, y, { peak: now.peakDhw, year }));
    const severe = yearsOver(years, peaks, 8);
    const rows = coralRisks({ alert: now.alert, ...deps.risks(reef.id) });
    box.innerHTML = `
      <div class="ro"><span class="lbl">${t('coral.reef')}</span><span class="seg sm">${reef.name}</span></div>
      <div class="ro"><span class="lbl">DHW</span><span class="seg cr-${tone}">${Number.isFinite(now.dhw) ? now.dhw.toFixed(1) : '--'}</span><span class="cr-lvl cr-${tone}">${alert}</span><span class="lbl">${Number.isFinite(now.dhwDay) ? day(now.dhwDay) : ''}</span></div>
      <div class="lbl">${t('coral.trend')}</div>
      ${dhwTrendSvg(reef.dhw)}
      <div class="lbl">${t('coral.peaks', { from: years[0] })}</div>
      ${peaksSvg(years, peaks)}
      <div class="cr-note">${severe.length ? `${t('coral.severeYears')} ${severe.slice(0, 6).join(' ')}` : ''}</div>
      <div class="lbl">${t('coral.risks')}</div>
      <ul class="cr-risks">${rows.map((r) => `<li><span class="lbl">${t(`coral.risk.${r.id}` as Key)}</span><span class="cr-lvl cr-${r.level === 'high' ? 'red' : r.level === 'watch' ? 'amber' : r.level === 'ok' ? 'green' : 'dim'}">${t(`coral.lvl.${r.level}` as Key)}</span><span class="seg sm">${r.value}</span></li>`).join('')}</ul>
      <p class="rules-advice">${t('coral.heatNote')}</p>`;
  };
  render();
  return { refresh: render };
}
