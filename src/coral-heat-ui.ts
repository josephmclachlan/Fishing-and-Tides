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
import { clarityLevel } from './physics/clarity';
import type { MudNow } from './adapters/mud';
import type { MudHistory } from './adapters/mud-parse';
import { MUD_HIGH, MUD_WATCH } from './physics/mud';

const MUD_BANDS = { watch: MUD_WATCH, high: MUD_HIGH, cap: 10 };
const mudTone = (l: string) => (l === 'high' ? 'red' : l === 'watch' ? 'amber' : l === 'ok' ? 'green' : 'dim');

/** Visibility colour on the BEST VISIT line: the best day can still be murky, and should look it. */
const VIS_TONE = { GOOD: 'green', FAIR: 'amber', POOR: 'red' } as const;

/** "DATED 29 OCT": when the satellite reading is from, in words rather than 10-29 (persona review J9). */
const dated = (ms: number) => {
  const d = new Date(ms);
  return t('coral.dated', { d: `${d.getUTCDate()} ${t(`coral.mon.${d.getUTCMonth() + 1}` as Key)}` });
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The best day this week to be in the water at a reef (metrics/best-today.ts bestVisitDay), as the drawer shows it. */
export interface ReefVisit {
  /** "SAT", "TODAY", "TOMORROW". */
  when: string;
  /** "09:00–11:00". */
  hours: string;
  visM: number | null;
}

export interface CoralHeatDeps {
  /** The reef nearest the map centre. */
  reef: () => CoralReef | null;
  heat: () => CoralData | null;
  history: () => CoralHistory | null;
  /** Today's inputs for the risk rows at a reef (alert is filled in here). */
  risks: (reefId: string) => Omit<RiskInputs, 'alert'>;
  /** Best day this week to visit `reef`; null when no day has a good window or there is no forecast yet. */
  visit?: (reef: CoralReef) => ReefVisit | null;
  /** Move the map to a reef from the list. */
  goTo?: (reef: CoralReef) => void;
  /** MUD WEEKS at a reef (PLAN 7.39), null before the feed loads. */
  mud?: (reefId: string) => (MudNow & { fromHistory: boolean }) | null;
  mudHistory?: () => MudHistory | null;
  /** The logged sites (private, on this device) whose nearest reef is this one, and opening one's folder (PLAN 7.40). */
  sitesFor?: (reefId: string) => { id: string; name: string }[];
  openSite?: (id: string) => void;
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
    const visit = deps.visit?.(reef);
    // Every reef the app tracks, so they can be compared; tap one to go there.
    const list = d.reefs
      .map((r) => {
        const n = coralNow(d, r);
        const rt = toneOf(n.alert);
        const lvl = n.alert === null ? t('coral.nodata') : t(`coral.alert.${ALERT_KEYS[n.alert]}` as Key);
        return `<li><button type="button" class="cr-reef${r.id === reef.id ? ' on' : ''}" data-reef="${esc(r.id)}"><span class="cr-rn">${esc(r.name)}</span><span class="seg sm cr-${rt}">${Number.isFinite(n.dhw) ? n.dhw.toFixed(1) : '--'}</span><span class="cr-lvl cr-${rt}">${lvl}</span></button></li>`;
      })
      .join('');
    box.innerHTML = `
      <details class="cr-all"><summary class="lbl">${t('coral.allReefs', { n: d.reefs.length })}</summary><ul class="cr-list">${list}</ul></details>
      <div class="ro"><span class="lbl">${t('coral.reef')}</span><span class="seg sm">${esc(reef.name)}</span></div>
      ${sitesHtml(reef.id)}
      <div class="ro"><span class="lbl">DHW</span><span class="seg cr-${tone}">${Number.isFinite(now.dhw) ? now.dhw.toFixed(1) : '--'}</span><span class="cr-lvl cr-${tone}">${alert}</span><span class="lbl">${Number.isFinite(now.dhwDay) ? dated(now.dhwDay) : ''}</span></div>
      <div class="ro"><span class="lbl">${t('coral.bestVisit')}</span>${
        visit
          ? `<span class="seg sm green">${t('coral.bestVisitAt', { when: visit.when, hours: visit.hours })}</span>${
              visit.visM !== null
                ? `<span class="seg sm cr-${VIS_TONE[clarityLevel(visit.visM)]}">${t('coral.bestVisitVis', { m: visit.visM < 10 ? visit.visM.toFixed(1) : Math.round(visit.visM) })}</span>`
                : ''
            }`
          : `<span class="seg sm">${t('coral.bestVisitNone')}</span>`
      }</div>
      <div class="lbl">${t('coral.trend')}</div>
      ${dhwTrendSvg(reef.dhw)}
      <div class="lbl">${t('coral.peaks', { from: years[0] })}</div>
      ${peaksSvg(years, peaks)}
      <div class="cr-note">${severe.length ? `${t('coral.severeYears')} ${severe.slice(0, 6).join(' ')}` : ''}</div>
      ${mudHtml(reef.id)}
      <div class="lbl">${t('coral.risks')}</div>
      <ul class="cr-risks">${rows.map((r) => `<li><span class="lbl">${t(`coral.risk.${r.id}` as Key)}</span><span class="cr-lvl cr-${r.level === 'high' ? 'red' : r.level === 'watch' ? 'amber' : r.level === 'ok' ? 'green' : 'dim'}">${t(`coral.lvl.${r.level}` as Key)}</span><span class="seg sm">${r.value}</span></li>`).join('')}</ul>
      <p class="rules-advice">${t('coral.heatNote')}</p>`;
  };
  /** The user's own sites by this reef, each opening its folder at CONDITIONS. */
  function sitesHtml(id: string) {
    const sites = deps.sitesFor?.(id) ?? [];
    if (!sites.length) return '';
    return `<div class="lbl">${t('coral.yourSites')}</div><ul class="boat-pins">${sites
      .map((s) => `<li><button type="button" class="tab pin-go" data-site="${esc(s.id)}">${t('coral.openFolder')} ${esc(s.name || t('coral.unnamed'))}</button></li>`)
      .join('')}</ul>`;
  }
  /** MUD WEEKS (PLAN 7.39): the number, its 12-week build-up and each year's peak, under the heat charts. */
  function mudHtml(id: string) {
    const m = deps.mud?.(id);
    if (!m) return '';
    const mh = deps.mudHistory?.() ?? null;
    const h = mh?.reefs.find((r) => r.id === id);
    const hy = mh?.years ?? [];
    const year = new Date().getUTCFullYear();
    // This year's bar: the larger of the stored history and the live window.
    const livePeak = Math.max(-Infinity, ...m.trend.filter((v): v is number => v !== null));
    const years = h ? [...hy.filter((y) => y < year), year] : [];
    const peaks = years.map((y) => {
      const i = hy.indexOf(y);
      const stored = h && i >= 0 ? h.peak[i] : null;
      return y === year && Number.isFinite(livePeak) ? Math.max(stored ?? -Infinity, livePeak) : stored;
    });
    const tone = mudTone(m.level);
    return `
      <div class="ro"><span class="lbl">${t('coral.mud')}</span><span class="seg cr-${tone}">${Number.isFinite(m.mw) ? m.mw.toFixed(1) : '--'}</span><span class="cr-lvl cr-${tone}">${t(`coral.lvl.${m.level}` as Key)}</span><span class="lbl">${Number.isFinite(m.day) ? dated(m.day) : ''}</span></div>
      <div class="lbl">${t('coral.mudTrend')}</div>
      ${dhwTrendSvg(m.trend, 280, 64, MUD_BANDS)}
      ${years.length ? `<div class="lbl">${t('coral.mudPeaks', { from: years[0] })}</div>${peaksSvg(years, peaks, 280, 56, MUD_BANDS)}` : ''}
      <p class="rules-advice">${t('coral.mudNote', { m: m.depthM })}${m.fromHistory ? '' : ` ${t('coral.mudNoHistory')}`}</p>`;
  }
  box.addEventListener('click', (e) => {
    const site = (e.target as Element).closest<HTMLElement>('[data-site]');
    if (site?.dataset.site) return deps.openSite?.(site.dataset.site);
    const b = (e.target as Element).closest<HTMLElement>('[data-reef]');
    const r = b && deps.heat()?.reefs.find((x) => x.id === b.dataset.reef);
    if (r) deps.goTo?.(r);
  });
  render();
  return { refresh: render };
}
