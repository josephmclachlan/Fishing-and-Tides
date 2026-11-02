/**
 * Rules card (PLAN 6.8): a HUD panel listing the fishing and spearfishing rules that apply to a
 * protected zone, then the national ones, each with its source link and whether it is official
 * or still to be checked. Opened from the ZONE row; self-contained so layout changes don't touch it.
 */
import { t, type Key } from './i18n';
import { rulesFor, type Rule } from './rules';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function ruleHtml(r: Rule): string {
  const tone = r.confidence === 'official' ? 'green' : 'amber';
  return `<li><span class="rule-tag ${tone}">${t(`rules.${r.confidence}` as Key)}</span>${t(`rule.${r.id}` as Key)}
    <a class="rule-src" href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer">${t('rules.source')}: ${esc(r.source.name)}</a></li>`;
}

export function mountRulesCard(root: HTMLElement) {
  const el = document.createElement('section');
  el.className = 'panel rules-card';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t('rules.title'));
  el.hidden = true;
  root.appendChild(el);

  const close = () => (el.hidden = true);
  el.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.rules-close')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  /** Show the card for a zone (id and display name), or just the national rules. */
  return {
    open(zone: { id: string; name: string } | null) {
      const { here, national } = rulesFor(zone?.id ?? null);
      el.innerHTML = `
        <div class="ph">${t('rules.title')}<button type="button" class="tab rules-close">${t('rules.close')}</button></div>
        ${zone && here.length ? `<div class="lbl">${t('rules.here')}: ${esc(zone.name)}</div><ul class="rules-list">${here.map(ruleHtml).join('')}</ul>` : ''}
        <div class="lbl">${t('rules.everywhere')}</div><ul class="rules-list">${national.map(ruleHtml).join('')}</ul>
        <p class="rules-advice">${t('rules.advice')}</p>`;
      el.hidden = false;
      el.querySelector<HTMLElement>('.rules-close')?.focus();
    },
    close,
  };
}
