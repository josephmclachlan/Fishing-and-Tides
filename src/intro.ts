/**
 * First-run intro (PLAN 7.12): a short "what is this and how do I read it" card the first time the
 * app opens, and again from the ABOUT button (top bar on wide screens, SET drawer on a phone).
 * Closing it is remembered on the device, so it never nags. Text in i18n `intro.*`.
 */
import { t, type Key } from './i18n';

export const INTRO_KEY = 'ft.intro';
export const INTRO_STEPS = [1, 2, 3, 4, 5] as const;

type Store = Pick<globalThis.Storage, 'getItem' | 'setItem'> | undefined;

export function introSeen(store: Store): boolean {
  try {
    return store?.getItem(INTRO_KEY) === 'seen';
  } catch {
    return false;
  }
}

export function markIntroSeen(store: Store): void {
  try {
    store?.setItem(INTRO_KEY, 'seen');
  } catch {
    /* private mode: it will show again next visit */
  }
}

export function introHtml(text: (key: Key) => string): string {
  return `<div class="ph"><span>${text('intro.title')}</span><button type="button" class="sheet-x intro-x" aria-label="${text('ui.close')}">✕</button></div>
    <p class="intro-lead">${text('intro.lead')}</p>
    <ol class="intro-steps">${INTRO_STEPS.map((n) => `<li>${text(`intro.${n}` as Key)}</li>`).join('')}</ol>
    <p class="intro-colours">${text('intro.colours')}</p>
    <button type="button" class="tab intro-ok">${text('intro.ok')}</button>`;
}

export function mountIntro(root: HTMLElement, store: Store) {
  const card = document.createElement('aside');
  card.className = 'panel intro';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', t('intro.title'));
  card.innerHTML = introHtml(t);
  root.appendChild(card);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tab intro-open';
  btn.textContent = t('intro.tab');
  btn.title = t('intro.title');
  root.querySelector('.top-tabs')?.appendChild(btn);

  const close = () => {
    if (card.hidden) return;
    card.hidden = true;
    markIntroSeen(store);
    btn.focus();
  };
  const open = () => {
    card.hidden = false;
    card.querySelector<HTMLElement>('.intro-ok')!.focus();
  };
  btn.addEventListener('click', () => (card.hidden ? open() : close()));
  card.querySelector('.intro-ok')!.addEventListener('click', close);
  card.querySelector('.intro-x')!.addEventListener('click', close);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  if (!introSeen(store)) open();
  return { open, close };
}
