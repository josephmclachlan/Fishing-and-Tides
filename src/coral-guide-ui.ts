/**
 * Coral species guide and disease cards in the CORAL drawer (PLAN 7.34), folded by default so the
 * drawer stays short. Data: src/coral/species.ts; text in i18n (`cg.*`, `cd.*`).
 */
import { t, type Key } from './i18n';
import { CORAL_SPECIES, CORAL_THREATS } from './coral/species';

export function mountCoralGuide(panel: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'coral-guide';
  (panel.querySelector('.coral-spawn') ?? panel.querySelector('.coral-heat') ?? panel.querySelector('.ph'))?.after(box);
  const tag = (cls: string, text: string) => `<span class="cr-lvl ${cls}">${text}</span>`;
  box.innerHTML = `
    <details class="cr-fold"><summary class="lbl">${t('coral.threats')}</summary>
      <ul class="cr-guide">${CORAL_THREATS.map((c) => `<li><div class="cr-name">${t(`cd.${c}.name` as Key)}</div><p>${t(`cd.${c}.signs` as Key)}</p><p><span class="lbl">${t('coral.do')}</span> ${t(`cd.${c}.do` as Key)}</p></li>`).join('')}</ul>
    </details>
    <details class="cr-fold"><summary class="lbl">${t('coral.guide', { n: CORAL_SPECIES.length })}</summary>
      <ul class="cr-guide">${CORAL_SPECIES.map((s) => `<li><div class="cr-name">${t(`cg.${s.id}.name` as Key)} <i class="lbl">${s.name}</i></div>
        <div class="cr-tags">${s.status ? tag('cr-red', t(`coral.iucn.${s.status}` as Key)) : ''}${tag(s.sctld === 'high' ? 'cr-red' : s.sctld === 'mid' ? 'cr-amber' : 'cr-green', t(`coral.sctld.${s.sctld}` as Key))}${s.localSctld ? tag('cr-amber', t('coral.sctld.local')) : ''}${s.heatSensitive ? tag('cr-amber', t('coral.heatSens')) : ''}</div>
        <p>${t(`cg.${s.id}.tip` as Key)}</p></li>`).join('')}</ul>
    </details>`;
}
