/**
 * Coral spawning calendar in the CORAL drawer (PLAN 7.33): each species' next predicted run of nights
 * and the time window after sunset, worked out on the device from the moon and the sun
 * (src/coral/spawning.ts), with local sightings first. Below the reef heat section.
 */
import { t, type Key } from './i18n';
import { CORAL_REEFS } from './region';
import { nextSeasons, SIGHTINGS, SPAWNERS, spawnWindows, TZ } from './coral/spawning';

const local = (ms: number) => new Date(ms + TZ * 3.6e6);
const pad = (n: number) => String(n).padStart(2, '0');
const date = (ms: number) => `${local(ms).getUTCDate()} ${t(`coral.mon.${local(ms).getUTCMonth() + 1}` as Key)}`;
const clock = (ms: number) => `${pad(local(ms).getUTCHours())}:${pad(local(ms).getUTCMinutes())}`;

export function mountCoralSpawning(panel: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'coral-spawn';
  (panel.querySelector('.coral-heat') ?? panel.querySelector('.ph'))?.after(box);
  const at = CORAL_REEFS.find((r) => r.id === 'cahuita')!.lngLat;
  let day = -1;

  const render = () => {
    const now = Date.now();
    // Moon and sun maths is cheap, but only redo it once a day (a language change reloads the page).
    day = Math.floor(now / 864e5);
    const seasons = nextSeasons(spawnWindows(now, 400, at[1], at[0]), now);
    const sp = (id: string) => SPAWNERS.find((s) => s.id === id)!;
    box.innerHTML = `
      <div class="lbl">${t('coral.spawn.title')}</div>
      <ul class="cr-spawn">${SIGHTINGS.map((s) => `<li><span class="cr-green">${t('coral.spawn.seen')}</span> <span>${t(`spawn.${s.id}` as Key)}</span> <span class="lbl">${s.place} ${s.day}</span></li>`).join('')}
      ${seasons.map((s) => `<li${s.now ? ' class="cr-now"' : ''}>${s.now ? `<span class="cr-lvl cr-green">${t('coral.spawn.now')}</span> ` : ''}<span>${t(`spawn.${s.id}` as Key)}</span> <i class="lbl">${sp(s.id).name}</i><br><span class="seg sm">${date(s.first.from)}${s.last.from !== s.first.from ? `–${date(s.last.from)}` : ''} ${local(s.last.from).getUTCFullYear()} · ${clock(s.first.from)}–${clock(s.first.to)}</span></li>`).join('')}</ul>
      <p class="rules-advice">${t('coral.spawn.note')}</p>`;
  };
  render();
  return { refresh: () => (Math.floor(Date.now() / 864e5) !== day ? render() : undefined), render };
}
