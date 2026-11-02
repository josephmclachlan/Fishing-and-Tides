/**
 * SET drawer (PLAN 5.3): on a phone the settings controls (ENHANCE, SUN, language flags, SYSTEM CHECK) live in a drawer
 * behind one top-bar tab, which keeps the top bar to a single row of tabs. On wide screens they stay in the
 * top bar. The same elements move between the two places when the screen changes shape.
 */
import { t } from './i18n';
import { PHONE_QUERY, closeButton, type Sheets } from './sheets';

export function mountSettingsPanel(root: HTMLElement, sheets: Sheets) {
  const tabs = root.querySelector<HTMLElement>('.top-tabs')!;
  const controls = [...tabs.querySelectorAll<HTMLElement>('.enh-toggle, .sun-toggle, .snd-toggle, .lang, .check-open')];

  const el = document.createElement('section');
  el.className = 'panel settings';
  el.id = 'settings-panel';
  el.innerHTML = `<div class="ph"><span>${t('settings.title')}</span></div><div class="settings-body"></div>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('settings')));
  root.appendChild(el);
  const body = el.querySelector<HTMLElement>('.settings-body')!;

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab mob-only';
  tab.textContent = t('sheet.settings');
  tab.setAttribute('aria-controls', el.id);
  tab.addEventListener('click', () => sheets.toggle('settings'));
  tabs.appendChild(tab);

  const phone = window.matchMedia(PHONE_QUERY);
  const place = () => {
    // Appending moves the element; the order stays ENHANCE, SUN, language.
    for (const c of controls) (phone.matches ? body : tabs).insertBefore(c, phone.matches ? null : tab);
  };
  phone.addEventListener('change', place);
  place();

  const render = () => {
    tab.classList.toggle('on', sheets.is('settings'));
    tab.setAttribute('aria-expanded', String(sheets.is('settings')));
  };
  sheets.subscribe(render);
  render();
}
