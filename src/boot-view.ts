/**
 * The launch screen and map loader's look (PLAN 7.160, Joseph 2026-11-16, mockup approved with dots). Pure strings, no
 * DOM, so the build can put the launch screen straight into index.html (vite.config.ts): it shows before any script
 * or font arrives, so the app never opens on a blank or half-drawn page. src/boot.ts runs it.
 *
 * Black screen, the SurCast mark drawing itself in, the name, then a row of eight dots. As the data arrives, each dot
 * turns into an activity icon, left to right. The map loader is the same with a smaller mark.
 *
 * Always dark whatever the scheme (Joseph asked for black), so the colours are the dark scheme's values, set as
 * variables on the loader itself.
 *
 * Smooth while the app starts (Joseph 2026-11-16: the logo drew in jittery). The app's start-up work keeps the main
 * thread busy, and anything animated there (a stroke being drawn, say) stutters. So everything here moves only by
 * transform and opacity, which the browser animates off the main thread: each of the mark's eight runs is its own
 * layer that swings up and fades in from the "now" point, like the forecast fanning out; each dot swells and fades as
 * its icon turns and scales in.
 */
import { BRAND_NAVY, RUN_HEX, RUN_TOKENS, runPath } from './brand';
import { ACTIVITY_GLYPH, ACTIVITY_ORDER, ACTIVITY_TOKEN } from './icons/activities';

export const BOOT_ID = 'sc-boot';
export const DOTS = ACTIVITY_ORDER.length;

const ink = '#EDF3FA';

/** Icons lit for `done` of `total` steps: always left to right, all eight only when everything is in. */
export function litDots(done: number, total: number, dots = DOTS): number {
  if (total <= 0) return dots;
  const f = Math.max(0, Math.min(1, done / total));
  return f >= 1 ? dots : Math.min(dots - 1, Math.floor(f * dots));
}

export function bootCss(): string {
  const ease = 'cubic-bezier(.2,.8,.2,1)';
  return `
#${BOOT_ID},.sc-load{--sc-black:#000;--sc-ink:${ink};--sc-ink2:#A2B2C5;--sc-mute:#5A6B80;--sc-navy:${BRAND_NAVY};
position:fixed;inset:0;z-index:5000;background:var(--sc-black);color:var(--sc-ink);display:grid;place-content:center;justify-items:center;
padding:env(safe-area-inset-top,0px) 16px env(safe-area-inset-bottom,0px);transition:opacity .6s ease;font-family:"Geist Mono Variable","Geist Mono",ui-monospace,Menlo,monospace}
.sc-load.sc-gone{opacity:0;pointer-events:none}
.sc-load .sc-lm{position:relative;width:132px;height:132px}
.sc-load.sc-map .sc-lm{width:72px;height:72px}
.sc-load .sc-lm svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;transform-origin:11.7% 85%;will-change:transform,opacity;backface-visibility:hidden}
.sc-load .sc-run{opacity:0;transform:rotate(-38deg) scale(.55);animation:sc-fan 1.1s ${ease} forwards}
${[0, 1, 2, 3, 4, 5, 6, 7].map((n) => `.sc-load .sc-run:nth-child(${n + 1}){animation-delay:${(0.15 + n * 0.09).toFixed(2)}s}`).join('')}
.sc-load .sc-now{opacity:0;transform:scale(0);animation:sc-pop .5s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes sc-fan{to{opacity:1;transform:none}}
@keyframes sc-pop{to{opacity:1;transform:none}}
.sc-load .sc-lw{margin-top:20px;font:620 40px/1 "Anybody Variable","Arial Narrow",Arial,sans-serif;font-variation-settings:"wdth" 128;letter-spacing:-.025em;opacity:0;transform:translateY(8px);transition:opacity .8s ${ease} .2s,transform .8s ${ease} .2s;will-change:transform,opacity}
.sc-load.sc-map .sc-lw{font-size:16px;font-weight:850;font-variation-settings:"wdth" 72;letter-spacing:.02em;text-transform:uppercase;margin-top:12px}
.sc-load.sc-f .sc-lw{opacity:1;transform:none}
.sc-load .sc-lw i{font-style:normal;color:${RUN_HEX.dark.surf};background:linear-gradient(90deg,${RUN_HEX.dark.snorkel},${RUN_HEX.dark.surf} 30%,${RUN_HEX.dark.dive} 50%,${RUN_HEX.dark.swim} 70%,${RUN_HEX.dark.fish} 85%,${RUN_HEX.dark.sail});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.sc-load .sc-ls{min-height:14px;margin-top:8px;font-size:10px;letter-spacing:.14em;color:var(--sc-ink2);text-transform:uppercase;text-align:center;opacity:0;transition:opacity .8s ease .5s}
.sc-load.sc-f .sc-ls{opacity:1}
.sc-load .sc-lr{display:flex;gap:8px;margin-top:52px}
.sc-load.sc-map .sc-lr{margin-top:34px}
.sc-load .sc-d{position:relative;width:30px;height:30px}
.sc-load .sc-d svg{position:absolute;inset:0;width:100%;height:100%;will-change:transform,opacity;backface-visibility:hidden}
.sc-load .sc-dot{fill:var(--sc-mute);transition:transform .5s ${ease},opacity .4s ease}
.sc-load .sc-d.sc-next .sc-dot{fill:var(--sc-ink2);animation:sc-breathe 1.2s ease-in-out infinite}
@keyframes sc-breathe{50%{opacity:.35}}
.sc-load .sc-ic{opacity:0;transform:scale(.35) rotate(-30deg);transition:transform .7s cubic-bezier(.2,1.35,.4,1),opacity .35s ease;filter:drop-shadow(0 0 5px var(--c))}
.sc-load .sc-d.sc-on .sc-dot{transform:scale(2.6);opacity:0;animation:none}
.sc-load .sc-d.sc-on .sc-ic{opacity:1;transform:none}
.sc-load .sc-lt{height:14px;margin-top:18px;font-size:10.5px;letter-spacing:.12em;color:var(--sc-ink2);text-transform:uppercase;white-space:nowrap;transition:opacity .12s ease}
.sc-load .sc-lt.sc-swap{opacity:0}
@media (prefers-reduced-motion:reduce){.sc-load *,.sc-load{animation:none!important;transition:none!important}.sc-load .sc-run,.sc-load .sc-now{opacity:1;transform:none}.sc-load .sc-lw,.sc-load .sc-ls{opacity:1;transform:none}}
`.trim();
}

/** The loader's markup. `map`: the smaller version shown while the map's data loads. Text is filled in by boot.ts. */
export function bootHtml(variant: 'launch' | 'map' = 'launch'): string {
  // One layer per run, so each can move on its own without redrawing the others.
  const layer = (inner: string, cls: string) => `<svg class="${cls}" viewBox="2 2 60 60" aria-hidden="true">${inner}</svg>`;
  const runs = RUN_TOKENS.map((run, i) => layer(`<path d="${runPath(i)}" fill="none" stroke="${RUN_HEX.dark[run]}" stroke-width="1.45" stroke-linecap="round"/>`, 'sc-run')).join('');
  const now = layer(`<circle cx="9" cy="53" r="3" fill="${ink}"/>`, 'sc-now');
  const dots = ACTIVITY_ORDER.map((a) => {
    const c = RUN_HEX.dark[ACTIVITY_TOKEN[a]];
    return `<span class="sc-d" style="--c:${c}"><svg class="sc-dot" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.4"/></svg><svg class="sc-ic" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACTIVITY_GLYPH[a]}</svg></span>`;
  }).join('');
  const id = variant === 'launch' ? ` id="${BOOT_ID}"` : '';
  const wm = variant === 'launch' ? 'Sur<i>Cast</i>' : '';
  return `<div${id} class="sc-load sc-${variant}" role="progressbar" aria-label="SurCast" aria-valuemin="0" aria-valuemax="${DOTS}" aria-valuenow="0"><div class="sc-lm" aria-hidden="true">${runs}${now}</div><div class="sc-lw">${wm}</div><div class="sc-ls"></div><div class="sc-lr">${dots}</div><div class="sc-lt" aria-live="polite"></div></div>`;
}
