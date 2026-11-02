/**
 * SYSTEM CHECK drawer (PLAN 2.9): a lamp per data feed (green pass, amber degraded, red failed), the check
 * that is worst and the feed's data age, with a re-run button. It runs the same `allChecks()` list as the daily
 * Action (src/verify/registry.ts). The last run is kept on the device: offline, the panel shows that result and
 * its age instead of running checks that could only fail.
 */
import { dataAge, formatAge } from './adapters/data-age';
import { t, type Key } from './i18n';
import { en } from './i18n/en';
import type { Net } from './net';
import { closeButton, type Sheets } from './sheets';
import { groupByFeed, lastRunAt, loadResults, saveResults, type FeedReport } from './verify/report';
import { runChecks, worstOf, type Check, type CheckResult, type Status } from './verify/types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const feedTitle = (feed: string) => (`check.feed.${feed}` in en ? t(`check.feed.${feed}` as Key) : feed.toUpperCase());
const STATUS_KEY: Record<Status, Key> = { pass: 'check.pass', warn: 'check.warn', fail: 'check.fail' };
const TONE: Record<Status, string> = { pass: 'green', warn: '', fail: 'red' };

export interface SystemCheckDeps {
  checks: () => Check[];
  net: Net;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  now?: () => number;
}

export function mountSystemCheck(root: HTMLElement, sheets: Sheets, deps: SystemCheckDeps) {
  const now = deps.now ?? Date.now;
  let results: CheckResult[] = loadResults(deps.storage);
  let running = false;

  const el = document.createElement('section');
  el.className = 'panel check';
  el.id = 'check-panel';
  el.innerHTML = `
    <div class="ph"><span>${t('check.title')} <span class="tag" id="ck-all">--</span></span></div>
    <div class="ck-bar"><button type="button" class="tab" id="ck-run"></button><span class="lbl" id="ck-when" role="status"></span></div>
    <div class="ck-list" id="ck-list"></div>
    <p class="rules-advice">${t('check.note')}</p>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('check')));
  root.appendChild(el);
  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;

  // The tab: a lamp shows the overall result even with the drawer shut.
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab check-open';
  tab.setAttribute('aria-controls', el.id);
  root.querySelector('.top-tabs')?.appendChild(tab);
  tab.addEventListener('click', () => {
    sheets.toggle('check');
    if (sheets.is('check') && !results.length && deps.net.online()) run();
  });

  const rowHtml = (g: FeedReport) => {
    const a = dataAge.get(g.feed);
    const age = a ? `<span class="ck-age seg sm">${formatAge(now() - a.fetchedAt)}</span>` : '';
    const detail = g.worst ? `<span class="ck-worst">${esc(g.worst.label)}: ${esc(g.worst.detail)}</span>` : `<span class="ck-worst dim">${t('check.allOk', { n: g.passed, total: g.results.length })}</span>`;
    const items = g.results
      .map((r) => `<li class="ck-item"><span class="ck-st ${TONE[r.status]}">${t(STATUS_KEY[r.status])}</span><span class="ck-kind">${t(`check.kind.${r.kind}` as Key)}</span><span class="ck-txt">${esc(r.label)}<br><span class="dim">${esc(r.detail)}</span></span></li>`)
      .join('');
    return `<details class="ck-feed ${g.status}"${g.status === 'pass' ? '' : ' open'}>
      <summary><span class="ck-lamp ${TONE[g.status]}" aria-hidden="true">●</span><span class="ck-name">${esc(feedTitle(g.feed))}</span><span class="ck-st ${TONE[g.status]}">${t(STATUS_KEY[g.status])}</span>${age}${detail}</summary>
      <ul class="ck-items">${items}</ul></details>`;
  };

  const render = () => {
    const online = deps.net.online();
    const overall: Status | null = results.length ? worstOf(results) : null;
    const open = sheets.is('check');
    el.classList.toggle('open', open);
    tab.classList.toggle('on', open);
    tab.setAttribute('aria-expanded', String(open));
    tab.innerHTML = `${t('check.open')}${overall ? `<i class="lamp ${overall}" aria-hidden="true"></i>` : ''}`;
    tab.setAttribute('aria-label', `${t('check.title')}${overall ? `: ${t(STATUS_KEY[overall])}` : ''}`);
    const tag = $('ck-all');
    tag.textContent = overall ? t(STATUS_KEY[overall]) : '--';
    tag.className = `tag ${overall ?? ''}`;
    const btn = $<HTMLButtonElement>('ck-run');
    btn.textContent = running ? t('check.running') : t('check.rerun');
    btn.disabled = running || !online;
    const at = lastRunAt(results);
    $('ck-when').textContent = running ? '' : !results.length ? (online ? t('check.never') : t('check.offlineNone')) : `${online ? t('check.last') : t('check.offlineLast')} ${formatAge(now() - at!)}`;
    $('ck-list').innerHTML = groupByFeed(results).map(rowHtml).join('');
  };

  async function run() {
    if (running || !deps.net.online()) return;
    running = true;
    render();
    try {
      results = await runChecks(deps.checks(), now);
      saveResults(deps.storage, results);
    } finally {
      running = false;
      render();
    }
  }
  $('ck-run').addEventListener('click', run);
  sheets.subscribe(render);
  deps.net.subscribe(render);
  render();
  // Stored ages tick on screen without a re-render of every row: refresh once a minute while open.
  setInterval(() => sheets.is('check') && render(), 60_000);
}
