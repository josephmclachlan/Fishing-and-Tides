/** ENHANCE on/off toggle (PLAN 1.9): a HUD button in the top bar; the choice is remembered (src/settings.ts). */
import { t } from './i18n';
import type { Settings } from './settings';

export function mountSettingsUi(root: HTMLElement, settings: Settings) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tab enh-toggle';
  btn.title = t('settings.enhanceTitle');
  root.querySelector('.top')?.appendChild(btn);

  const render = () => {
    const on = settings.enhance();
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    btn.textContent = `${t('settings.enhance')}: ${t(on ? 'settings.on' : 'settings.off')}`;
    document.body.dataset.enhance = on ? 'on' : 'off';
  };
  btn.addEventListener('click', () => settings.setEnhance(!settings.enhance()));
  settings.subscribe(render);
  render();
}
