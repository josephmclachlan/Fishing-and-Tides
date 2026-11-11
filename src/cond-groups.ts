/**
 * CONDITIONS panel layout: an always-visible CORE (swell, wind, tide, rip risk) and five groups
 * underneath (WAVES, WATER, WEATHER, FISHING, PLACE), each a collapsible section. An activity
 * picker (ALL, SURF, FISH, DIVE, BOAT) decides which groups are open; tapping a group header
 * opens or shuts it by hand until the activity changes. A group with a live warning in it (a
 * storm or lightning close by, a closed zone) opens whatever the activity, so nothing that
 * matters for safety is ever folded away.
 *
 * Each HUD module asks for a slot in its group with `condSlot(root, group, order)`; slots sit in
 * `order`, so rows land in the same place whichever panel finishes loading first.
 */
import { t, type Key } from './i18n';
import { MODES, type Mode } from './glance';

export type GroupId = 'waves' | 'water' | 'weather' | 'fishing' | 'place';
export type CondActivity = 'all' | Mode;

export const ACTIVITIES: readonly CondActivity[] = ['all', ...MODES];

/** The groups in panel order, and the activities each one is open for. */
export const GROUPS: readonly { id: GroupId; for: readonly Mode[] }[] = [
  { id: 'waves', for: ['surf', 'dive', 'boat'] },
  { id: 'water', for: ['fish', 'dive'] },
  { id: 'weather', for: ['fish', 'boat'] },
  { id: 'fishing', for: ['fish'] },
  { id: 'place', for: ['fish', 'dive', 'boat'] },
];

/**
 * Value elements that, when they turn red, are a warning that forces their group open: a storm
 * or lightning within the alert radius, the zone under the reticle being closed to fishing.
 */
export const ALERT_IDS: Readonly<Partial<Record<GroupId, readonly string[]>>> = {
  weather: ['wx-storm', 'lt-near'],
  place: ['zone'],
};

export type Overrides = Partial<Record<GroupId, boolean>>;

/** Which groups are open: the activity's own, then the user's taps, then any group with a warning. */
export function openGroups(activity: CondActivity, overrides: Overrides, alerts: ReadonlySet<GroupId>): Set<GroupId> {
  const open = new Set<GroupId>();
  for (const g of GROUPS) {
    const base = activity === 'all' || g.for.includes(activity);
    if ((overrides[g.id] ?? base) || alerts.has(g.id)) open.add(g.id);
  }
  return open;
}

export const isActivity = (v: unknown): v is CondActivity => ACTIVITIES.includes(v as CondActivity);

/** Layer presets (layers/registry.ts) to the matching conditions activity. */
export function activityForPreset(preset: string | null): CondActivity | null {
  const map: Record<string, CondActivity> = { all: 'all', fishing: 'fish', dive: 'dive', spear: 'dive', surf: 'surf', sail: 'boat' };
  return preset ? (map[preset] ?? null) : null;
}

/** Panel skeleton: the activity picker, the core section (filled by hud.ts) and the empty groups. */
export function groupsHtml(core: string): string {
  const acts = ACTIVITIES.map((a) => `<button type="button" class="tab" data-cact="${a}">${t(`cg.act.${a}` as Key)}</button>`).join('');
  const groups = GROUPS.map(
    (g) => `<section class="cg" data-g="${g.id}">
      <button type="button" class="cg-h" aria-expanded="false" aria-controls="cg-${g.id}"><span class="cg-t">${t(`cg.${g.id}` as Key)}</span><span class="cg-alert" hidden>!</span><span class="cg-chev" aria-hidden="true"></span></button>
      <div class="cg-b" id="cg-${g.id}"></div>
    </section>`,
  ).join('');
  return `<div class="cg-acts" role="group" aria-label="${t('cg.show')}">${acts}</div>
    <section class="cg cg-core" data-g="core">${core}</section>${groups}`;
}

/**
 * A slot for a HUD module's rows in `group`, placed by `order` (low first). Falls back to the
 * end of the side panel if the groups aren't there (a test page, say).
 */
export function condSlot(root: ParentNode, group: GroupId, order: number): HTMLElement | null {
  const body = root.querySelector<HTMLElement>(`#cg-${group}`);
  if (!body) return root.querySelector<HTMLElement>('.side');
  const slot = document.createElement('div');
  slot.className = 'cg-slot';
  slot.dataset.order = String(order);
  const after = [...body.children].find((c) => Number((c as HTMLElement).dataset.order) > order);
  body.insertBefore(slot, after ?? null);
  return slot;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.cond';

export interface CondGroups {
  activity(): CondActivity;
  setActivity(a: CondActivity): void;
  subscribe(fn: (a: CondActivity) => void): () => void;
  refresh(): void;
}

/** Rows hidden at the current tier (the from-coast / from-spot gates in style.css) don't count as content. */
function gatedOut(el: Element, tier: string | undefined): boolean {
  if (tier === 'MACRO') return !!el.closest('.from-coast, .from-spot');
  if (tier === 'COAST') return !!el.closest('.from-spot');
  return false;
}

const CONTENT = '.ro, .gauge, details';

export function mountCondGroups(root: HTMLElement, storage?: Storage): CondGroups {
  const panel = root.querySelector<HTMLElement>('#cond-panel')!;
  let activity: CondActivity = 'all';
  let overrides: Overrides = {};
  try {
    const s = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (isActivity(s?.activity)) activity = s.activity;
    if (s?.overrides && typeof s.overrides === 'object') overrides = s.overrides;
  } catch {
    /* private window or junk: start on ALL */
  }
  const subs = new Set<(a: CondActivity) => void>();
  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify({ activity, overrides }));
    } catch {
      /* not saved */
    }
  };

  const alerts = () => {
    const out = new Set<GroupId>();
    for (const [g, ids] of Object.entries(ALERT_IDS) as [GroupId, readonly string[]][])
      if (ids.some((id) => panel.querySelector(`#${id}`)?.classList.contains('red'))) out.add(g);
    return out;
  };

  const refresh = () => {
    const warn = alerts();
    const open = openGroups(activity, overrides, warn);
    const tier = document.body.dataset.tier;
    for (const sec of panel.querySelectorAll<HTMLElement>('.cg[data-g]:not(.cg-core)')) {
      const g = sec.dataset.g as GroupId;
      const isOpen = open.has(g);
      const empty = ![...sec.querySelectorAll('.cg-b ' + CONTENT.split(', ').join(', .cg-b '))].some((el) => !gatedOut(el, tier));
      sec.hidden = empty;
      sec.classList.toggle('open', isOpen);
      sec.classList.toggle('warn', warn.has(g));
      sec.querySelector('.cg-h')!.setAttribute('aria-expanded', String(isOpen));
      sec.querySelector<HTMLElement>('.cg-alert')!.hidden = !warn.has(g);
    }
    for (const b of panel.querySelectorAll<HTMLElement>('[data-cact]')) {
      const on = b.dataset.cact === activity;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    panel.dataset.activity = activity;
  };

  const setActivity = (a: CondActivity) => {
    if (a === activity) return;
    activity = a;
    overrides = {};
    save();
    refresh();
    subs.forEach((fn) => fn(a));
  };

  panel.addEventListener('click', (e) => {
    const el = e.target as Element;
    const act = el.closest<HTMLElement>('[data-cact]');
    if (act && isActivity(act.dataset.cact)) return setActivity(act.dataset.cact);
    const head = el.closest<HTMLElement>('.cg-h');
    if (!head) return;
    const g = head.closest<HTMLElement>('.cg')!.dataset.g as GroupId;
    overrides = { ...overrides, [g]: !head.closest('.cg')!.classList.contains('open') };
    save();
    refresh();
  });
  // Tier changes (zooming) and late-loading panels change what each group holds; warnings come and go.
  new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['data-tier'] });
  setInterval(refresh, 1000);
  refresh();
  return {
    activity: () => activity,
    setActivity,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    refresh,
  };
}
