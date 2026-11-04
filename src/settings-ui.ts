/**
 * ENHANCE (PLAN 1.9) and SUN (PLAN 5.3) toggles: HUD buttons in the top bar on wide screens, in the
 * SET drawer on phones (src/settings-panel.ts); the choices are remembered (src/settings.ts).
 */
import { t, type Key } from './i18n';
import { VESSELS, type Settings } from './settings';

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

  // UI sounds (src/sounds.ts): off by default.
  const snd = document.createElement('button');
  snd.type = 'button';
  snd.className = 'tab snd-toggle';
  snd.title = t('settings.soundTitle');
  root.querySelector('.top-tabs')?.appendChild(snd);
  const renderSnd = () => {
    const on = settings.sound();
    snd.setAttribute('aria-pressed', String(on));
    snd.classList.toggle('on', on);
    snd.textContent = `${t('settings.sound')}: ${t(on ? 'settings.on' : 'settings.off')}`;
  };
  snd.addEventListener('click', () => settings.setSound(!settings.sound()));
  settings.subscribe(renderSnd);
  renderSnd();

  // Vessel for the BOAT verdict (PLAN 7.23): small open boat or sailing yacht.
  const vsl = document.createElement('button');
  vsl.type = 'button';
  vsl.className = 'tab vessel-toggle';
  vsl.title = t('settings.vesselTitle');
  root.querySelector('.top-tabs')?.appendChild(vsl);
  const renderVsl = () => {
    vsl.textContent = `${t('settings.vessel')}: ${t(`settings.vessel.${settings.vessel()}` as Key)}`;
  };
  vsl.addEventListener('click', () => settings.setVessel(VESSELS[(VESSELS.indexOf(settings.vessel()) + 1) % VESSELS.length]!));
  settings.subscribe(renderVsl);
  renderVsl();
}
