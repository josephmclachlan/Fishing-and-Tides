/**
 * EN / ESP toggle (PLAN 5.6): two small flag buttons in the top bar, the active language lit.
 * Flags are HUD line art (UK: St George, St Andrew and St Patrick crosses; Costa Rica: the five bands,
 * red band shaded), no photos. All text is built once at start-up, so a change saves the choice and
 * reloads, keeping the map where it was (src/settings.ts saveView / takeView).
 */
import type { Map } from 'maplibre-gl';
import { LANGS, t, type Key, type Lang } from './i18n';
import { safeSession, saveView, type Settings } from './settings';

const SVG = (body: string) =>
  `<svg viewBox="0 0 60 30" width="30" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${body}</svg>`;

export const FLAGS: Record<Lang, string> = {
  en: SVG('<rect x="1" y="1" width="58" height="28"/><path d="M1 1L59 29M59 1L1 29" stroke-width="1.5"/><path d="M30 1V29M1 15H59" stroke-width="6"/>'),
  es: SVG('<rect x="1" y="1" width="58" height="28"/><rect x="1" y="10" width="58" height="10" fill="currentColor" fill-opacity="0.4" stroke-width="1.5"/><path d="M1 5H59M1 25H59" stroke-width="1.5"/>'),
};

export function mountLangUi(root: HTMLElement, settings: Settings, map: Map) {
  const group = document.createElement('div');
  group.className = 'lang';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t('lang.group'));
  group.innerHTML = LANGS.map(
    (l) => `<button type="button" class="tab flag" data-lang="${l}" title="${t(`lang.${l}` as Key)}" aria-label="${t(`lang.${l}` as Key)}">${FLAGS[l]}</button>`,
  ).join('');
  root.querySelector('.top-tabs')?.appendChild(group);

  const buttons = [...group.querySelectorAll<HTMLButtonElement>('[data-lang]')];
  for (const b of buttons) {
    const on = b.dataset.lang === settings.lang();
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', () => {
      const lang = b.dataset.lang as Lang;
      if (lang === settings.lang()) return;
      settings.setLang(lang);
      const c = map.getCenter();
      saveView(safeSession(), { center: [c.lng, c.lat], zoom: map.getZoom() });
      location.reload();
    });
  }
}
