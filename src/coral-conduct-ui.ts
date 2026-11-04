/**
 * Coral rules and reef conduct in the CORAL drawer (PLAN 7.35), folded under the guide. Data:
 * src/coral/conduct.ts; rule rows look like the fishing RULES card's.
 */
import { t, type Key } from './i18n';
import { CORAL_CONTACTS, CORAL_ETIQUETTE, CORAL_RULES } from './coral/conduct';
import type { Rule } from './rules';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const ruleHtml = (r: Rule) => `<li><span class="rule-tag ${r.confidence === 'official' ? 'green' : 'amber'}">${t(`rules.${r.confidence}` as Key)}</span>${t(`crule.${r.id}` as Key)}
  <a class="rule-src" href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer">${t('rules.source')}: ${esc(r.source.name)}</a></li>`;

/** Shown as dialled; Costa Rican numbers as +506 XXXX-XXXX. */
const telText = (n: string) => (n.startsWith('+506') ? `+506 ${n.slice(4, 8)}-${n.slice(8)}` : n);

export function mountCoralConduct(panel: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'coral-conduct';
  (panel.querySelector('.coral-guide') ?? panel.querySelector('.coral-spawn') ?? panel.querySelector('.ph'))?.after(box);
  box.innerHTML = `
    <details class="cr-fold"><summary class="lbl">${t('coral.rules')}</summary>
      <ul class="rules-list">${CORAL_RULES.map(ruleHtml).join('')}</ul>
      <div class="lbl">${t('coral.etiquette')}</div>
      <ul class="cr-guide">${CORAL_ETIQUETTE.map((id) => `<li><p>${t(`cet.${id}` as Key)}</p></li>`).join('')}</ul>
      <div class="lbl">${t('coral.contacts')}</div>
      <ul class="cr-guide">${CORAL_CONTACTS.map((c) => `<li><div class="cr-name">${t(`ccon.${c.id}` as Key)}</div><p>${[
        ...(c.tel ?? []).map((n) => `<a href="tel:${n}">${telText(n)}</a>`),
        c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : '',
        c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.url.replace(/^https:\/\/|\/$/g, ''))}</a>` : '',
      ].filter(Boolean).join(' · ')}</p></li>`).join('')}</ul>
      <p class="rules-advice">${t('coral.rulesAdvice')}</p>
    </details>`;
}
