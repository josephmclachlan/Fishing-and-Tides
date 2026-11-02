/**
 * SYNC FOR TRIP button (PLAN 5.1). Tap to download the region for offline use; the button shows
 * the step and percentage while it runs, and a second tap cancels. The TRIP row under DATA AGE
 * shows when the last sync finished and its size: green within a day, amber after, red once its
 * 7-day forecasts have run out. Needs a signal, so the button is disabled offline.
 */
import { t, type Key } from './i18n';
import { loadSummary, saveSummary, syncForTrip, type SyncJob, type SyncSummary } from './offline/sync';
import { localClock } from './tide-chart';
import type { Net } from './net';

const DAY_MS = 864e5;

export interface SyncUiDeps {
  net: Net;
  storage: Pick<globalThis.Storage, 'getItem' | 'setItem'> | undefined;
  styleUrl: string;
  base: string;
  jobs: () => SyncJob[];
  /** Called after a sync so the HUD picks up the fresh copies. */
  onDone?: (s: SyncSummary) => void;
}

const mb = (bytes: number) => (bytes / 1e6).toFixed(bytes < 1e7 ? 1 : 0);

/** "TUE 02 14:00 · 18 MB" in UTC, like the clock and VALID UTC beside it. */
function when(s: SyncSummary): string {
  const d = new Date(s.at);
  return `${t(`day.${d.getUTCDay()}` as Key)} ${String(d.getUTCDate()).padStart(2, '0')} ${localClock(s.at, 0)} · ${mb(s.bytes)} ${t('sync.mb')}`;
}

export function mountSyncUi(root: HTMLElement, deps: SyncUiDeps) {
  const btn = root.querySelector<HTMLButtonElement>('#sync');
  if (!btn) return null;
  btn.type = 'button';
  btn.insertAdjacentHTML(
    'beforebegin',
    `<div class="ro sync-ro"><span class="lbl">${t('sync.last')}</span><span class="seg" id="sync-at" title="${t('sync.lastTitle')}">--</span></div>`,
  );
  const at = root.querySelector<HTMLElement>('#sync-at')!;
  let running: AbortController | null = null;
  let flash: string | null = null;
  let flashTimer = 0;

  const renderLast = () => {
    const s = loadSummary(deps.storage);
    if (!s) {
      at.textContent = t('sync.never');
      at.className = 'seg dim';
      return;
    }
    const age = Date.now() - s.at;
    at.textContent = when(s);
    at.className = 'seg ' + (age > 7 * DAY_MS ? 'red' : age < DAY_MS && !s.failed && !s.feedsFailed.length ? 'green' : '');
  };

  const idle = () => {
    const on = deps.net.online();
    btn.disabled = !on && !running;
    btn.classList.toggle('dim', btn.disabled);
    btn.textContent = flash ?? (on ? t('hud.sync') : t('sync.offline'));
    btn.title = t('hud.syncTitle');
    btn.removeAttribute('aria-busy');
  };

  const say = (text: string) => {
    flash = text;
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => ((flash = null), idle()), 4000);
    idle();
  };

  const start = async () => {
    running = new AbortController();
    btn.setAttribute('aria-busy', 'true');
    btn.title = t('sync.cancelTitle');
    btn.textContent = t('sync.starting');
    try {
      const s = await syncForTrip({
        styleUrl: deps.styleUrl,
        base: deps.base,
        jobs: deps.jobs(),
        signal: running.signal,
        onProgress: (p) => {
          const pct = Math.floor((100 * p.done) / Math.max(1, p.total));
          btn.textContent = t('sync.running', { phase: t(`sync.phase.${p.phase}` as Key), pct, mb: mb(p.bytes) });
        },
      });
      saveSummary(deps.storage, s);
      renderLast();
      const missing = s.failed + s.feedsFailed.length + (s.staticOk === false ? 1 : 0);
      say(missing ? t('sync.partial', { n: missing }) : t('sync.done'));
      deps.onDone?.(s);
    } catch (err) {
      const cancelled = (err as Error)?.name === 'AbortError';
      if (!cancelled) console.warn('sync failed', err);
      say(cancelled ? t('sync.cancelled') : t('sync.failed'));
    } finally {
      running = null;
      idle();
    }
  };

  btn.addEventListener('click', () => {
    if (running) return running.abort();
    if (deps.net.online()) void start();
  });
  deps.net.subscribe(() => {
    if (!running) idle();
  });
  renderLast();
  idle();
  // The colour of the TRIP row moves with its age.
  setInterval(renderLast, 10 * 60_000);
  return { renderLast };
}
