/**
 * GO / MARGINAL / NO-GO at the top of CONDITIONS (PLAN 7.8): one chip per activity for the
 * cross-hair and the slider's hour (SURF, FISH, SNORKEL, DIVE, BOAT), and the top reasons for the
 * activity picked (or the worst one under ALL). Tapping a chip picks that activity, which opens its
 * groups and moves the glance strip with it; SNORKEL and DIVE also set the dive panel's mode.
 * A trailing ? marks a low-confidence forecast hour. Advisory only.
 *
 * BOAT is the sailing audit's verdict (src/boat/verdict.ts), read from its row in the sea-state panel
 * so the two never disagree; the chip hides while that row isn't there.
 */
import { t, type Key } from './i18n';
import type { Mode } from './glance';
import type { CondGroups } from './cond-groups';
import { ACTIVITIES, verdict, verdictConfidence, type Activity, type Level, type Reason, type Verdict, type VerdictInputs } from './verdict';

type Chip = Activity | 'boat';
const CHIPS: readonly Chip[] = [...ACTIVITIES, 'boat'];
const GROUP: Record<Chip, Mode> = { surf: 'surf', fish: 'fish', snorkel: 'dive', dive: 'dive', boat: 'boat' };
const LABEL: Record<Chip, Key> = { surf: 'cg.act.surf', fish: 'cg.act.fish', snorkel: 'dive.mode.snorkel', dive: 'dive.mode.dive', boat: 'cg.act.boat' };
const TONE: Record<Level, string> = { GO: 'green', MARGINAL: '', 'NO-GO': 'red' };
const RANK: Record<Level, number> = { GO: 0, MARGINAL: 1, 'NO-GO': 2 };

/** "SURGE DANGEROUS", "WIND 22 KT", "STORM 420 KM", or the outing score's own words. */
export function reasonText(r: Reason): string {
  const v = r.value;
  const n = v === undefined ? '' : String(v >= 10 || Number.isInteger(v) ? Math.round(v) : Math.round(v * 10) / 10);
  return t(r.key as Key, { v: n });
}

export const levelText = (v: Pick<Verdict, 'level' | 'confidence'>) => (v.level ? t(`vd.${v.level}` as Key) + (v.confidence === 'LOW' ? '?' : '') : '--');

/** The dive panel's SNORKEL / DIVE mode (dive-hud.ts), once it is mounted. */
export interface DiveLink {
  mode: () => 'snorkel' | 'dive';
  setMode: (m: 'snorkel' | 'dive') => void;
}

export function mountVerdictHud(root: HTMLElement, inputs: () => VerdictInputs, groups: CondGroups, dive: () => DiveLink | null) {
  const core = root.querySelector<HTMLElement>('#cond-panel .cg-core');
  if (!core) return null;
  const box = document.createElement('div');
  box.className = 'vd';
  box.title = t('vd.note');
  box.innerHTML = `<div class="vd-chips" role="group" aria-label="${t('vd.aria')}">${CHIPS.map(
    (m) => `<button type="button" class="vd-chip" data-m="${m}"><span class="lbl">${t(LABEL[m])}</span><span class="seg sm" id="vd-${m}">--</span></button>`,
  ).join('')}</div>
    <div class="vd-why" id="vd-why" data-help="goNogo" data-help-title="${t('vd.title')}" role="button" tabindex="0">--</div>`;
  core.insertBefore(box, core.firstChild);
  const why = box.querySelector<HTMLElement>('#vd-why')!;
  const chip = (m: Chip) => box.querySelector<HTMLElement>(`[data-m="${m}"]`)!;
  const seg = (m: Chip) => box.querySelector<HTMLElement>(`#vd-${m}`)!;
  /** Which chip is picked: the open activity, and for the dive group the dive panel's mode. */
  const picked = (m: Chip) => groups.activity() === GROUP[m] && (GROUP[m] !== 'dive' || (dive()?.mode() ?? 'snorkel') === m);
  for (const m of CHIPS)
    chip(m).addEventListener('click', () => {
      const on = picked(m);
      if (m === 'snorkel' || m === 'dive') dive()?.setMode(m);
      groups.setActivity(on ? 'all' : GROUP[m]);
      // Switching SNORKEL to DIVE keeps the same group open, so nothing else would redraw the chips.
      refresh();
    });

  /** The sailing audit's BOAT row: its level from the row's colour, its reasons as written. */
  const boat = (conf: Verdict['confidence']): (Verdict & { text: string }) | null => {
    const row = root.querySelector<HTMLElement>('#bv-verdict');
    if (!row) return null;
    const txt = row.textContent?.trim() ?? '';
    const level: Level | null = !txt || txt === '--' ? null : row.classList.contains('green') ? 'GO' : row.classList.contains('red') ? 'NO-GO' : 'MARGINAL';
    const w = root.querySelector<HTMLElement>('#bv-why')?.textContent?.trim();
    return { level, reasons: [], confidence: conf, text: w && w !== '--' ? w : '' };
  };

  const refresh = () => {
    const inp = inputs();
    const all: Partial<Record<Chip, Verdict & { text: string }>> = {};
    for (const m of ACTIVITIES) {
      const v = verdict(m, inp);
      all[m] = { ...v, text: v.reasons.map(reasonText).join(' · ') };
    }
    const b = boat(verdictConfidence(inp.band, inp.leadH));
    if (b) all.boat = b;
    chip('boat').hidden = !b;
    const diveMode = dive()?.mode() ?? 'snorkel';
    for (const m of CHIPS) {
      const v = all[m];
      const el = seg(m);
      el.textContent = v ? levelText(v) : '--';
      el.className = `seg sm ${v?.level ? TONE[v.level] : ''}`;
      chip(m).classList.toggle('on', picked(m));
      // The phone glance strip shows one verdict per mode; for DIVE it is the dive panel's mode.
      const g = GROUP[m] !== 'dive' || m === diveMode ? GROUP[m] : '';
      if (g) el.dataset.glanceVd = g;
      else delete el.dataset.glanceVd;
    }
    // Reasons for the picked chip, or under ALL for the worst one.
    const act = groups.activity();
    const shown = CHIPS.filter((m) => all[m]);
    const pick = act !== 'all' ? (act === 'dive' ? diveMode : act) : shown.reduce((w, m) => (RANK[all[m]!.level ?? 'GO'] > RANK[all[w]!.level ?? 'GO'] ? m : w), shown[0]!);
    const v = all[pick];
    if (!v) return void ((why.textContent = t('vd.noData')), (why.className = 'vd-why'));
    why.textContent = act === 'all' && v.level && v.level !== 'GO' ? `${t(LABEL[pick])}: ${v.text}` : v.text || (v.level ? '' : t('vd.noData'));
    why.className = `vd-why ${v.level === 'NO-GO' ? 'is-nogo' : ''}`;
  };
  groups.subscribe(refresh);
  return { refresh };
}
