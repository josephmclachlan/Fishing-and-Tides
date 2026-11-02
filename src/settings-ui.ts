/**
 * ENHANCE (PLAN 1.9) and SUN (PLAN 5.3) toggles: HUD buttons in the top bar on wide screens, in the
 * SET drawer on phones (src/settings-panel.ts); the choices are remembered (src/settings.ts).
 */
import { t } from './i18n';
import type { Settings } from './settings';

export function mountSettingsUi(root: HTMLElement, settings: Settings) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tab enh-toggle';
  btn.title = t('settings.enhanceTitle');
  root.querySelector('.top-tabs')?.appendChild(btn);

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

  // Sunlight mode: body[data-contrast='high'] turns off scanlines, glow and dimming (style.css).
  const sun = document.createElement('button');
  sun.type = 'button';
  sun.className = 'tab sun-toggle';
  sun.title = t('settings.sunTitle');
  root.querySelector('.top-tabs')?.appendChild(sun);
  const renderSun = () => {
    const on = settings.sun();
    sun.setAttribute('aria-pressed', String(on));
    sun.classList.toggle('on', on);
    sun.textContent = `${t('settings.sun')}: ${t(on ? 'settings.on' : 'settings.off')}`;
    document.body.dataset.contrast = on ? 'high' : 'normal';
  };
  sun.addEventListener('click', () => settings.setSun(!settings.sun()));
  settings.subscribe(renderSun);
  renderSun();
}
