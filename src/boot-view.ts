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
 */
import { BRAND_NAVY, markInner, RUN_HEX } from './brand';
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
  return `
#${BOOT_ID},.sc-load{--sc-black:#000;--sc-ink:${ink};--sc-ink2:#A2B2C5;--sc-mute:#5A6B80;--sc-navy:${BRAND_NAVY};
position:fixed;inset:0;z-index:5000;background:var(--sc-black);color:var(--sc-ink);display:grid;place-content:center;justify-items:center;
padding:env(safe-area-inset-top,0px) 16px env(safe-area-inset-bottom,0px);transition:opacity .5s ease;font-family:"Geist Mono Variable","Geist Mono",ui-monospace,Menlo,monospace}
.sc-load.sc-gone{opacity:0;pointer-events:none}
.sc-load .sc-lm{width:132px;height:132px;overflow:visible}
.sc-load.sc-map .sc-lm{width:72px;height:72px}
.sc-load .sc-lm path{stroke-dasharray:1;stroke-dashoffset:1;animation:sc-draw 1.1s cubic-bezier(.6,0,.2,1) forwards}
${[1, 2, 3, 4, 5, 6, 7].map((n) => `.sc-load .sc-lm path:nth-of-type(${n + 1}){animation-delay:${(n * 0.06).toFixed(2)}s}`).join('')}
.sc-load .sc-lm circle{transform-origin:9px 53px;animation:sc-pop .4s .1s cubic-bezier(.2,1.6,.4,1) both}
@keyframes sc-draw{to{stroke-dashoffset:0}}
@keyframes sc-pop{from{opacity:0;transform:scale(0)}}
.sc-load .sc-lw{margin-top:18px;font:620 40px/1 "Anybody Variable","Arial Narrow",Arial,sans-serif;font-variation-settings:"wdth" 128;letter-spacing:-.025em;opacity:0;transform:translateY(6px);transition:opacity .6s,transform .6s}
.sc-load.sc-map .sc-lw{font-size:16px;font-weight:850;font-variation-settings:"wdth" 72;letter-spacing:.02em;text-transform:uppercase;margin-top:12px}
.sc-load.sc-f .sc-lw{opacity:1;transform:none}
.sc-load .sc-lw i{font-style:normal;color:${RUN_HEX.dark.surf};background:linear-gradient(90deg,${RUN_HEX.dark.snorkel},${RUN_HEX.dark.surf} 30%,${RUN_HEX.dark.dive} 50%,${RUN_HEX.dark.swim} 70%,${RUN_HEX.dark.fish} 85%,${RUN_HEX.dark.sail});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.sc-load .sc-ls{min-height:14px;margin-top:8px;font-size:10px;letter-spacing:.14em;color:var(--sc-ink2);text-transform:uppercase;text-align:center}
.sc-load .sc-lr{display:flex;gap:6px;margin-top:52px}
.sc-load.sc-map .sc-lr{margin-top:34px}
.sc-load .sc-d{position:relative;width:30px;height:30px}
.sc-load .sc-d svg{position:absolute;inset:0;width:100%;height:100%}
.sc-load .sc-dot{fill:var(--sc-mute);transition:transform .45s cubic-bezier(.5,0,.2,1),opacity .35s;transform-origin:12px 12px}
.sc-load .sc-d.sc-now .sc-dot{fill:var(--sc-ink2);animation:sc-breathe 1s ease-in-out infinite}
@keyframes sc-breathe{50%{opacity:.35}}
.sc-load .sc-ic{opacity:0;transition:opacity .15s .1s}
.sc-load .sc-ic>*{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .7s cubic-bezier(.3,0,.1,1) .12s}
.sc-load .sc-d.sc-on .sc-dot{transform:scale(3.2);opacity:0;animation:none}
.sc-load .sc-d.sc-on .sc-ic{opacity:1;filter:drop-shadow(0 0 5px var(--c))}
.sc-load .sc-d.sc-on .sc-ic>*{stroke-dashoffset:0}
.sc-load .sc-lt{height:14px;margin-top:16px;font-size:10px;letter-spacing:.12em;color:var(--sc-ink2);text-transform:uppercase;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.sc-load *,.sc-load{animation:none!important;transition:none!important}.sc-load .sc-lm path{stroke-dashoffset:0}.sc-load .sc-lw{opacity:1;transform:none}}
`.trim();
}

/** The loader's markup. `map`: the smaller version shown while the map's data loads. Text is filled in by boot.ts. */
export function bootHtml(variant: 'launch' | 'map' = 'launch'): string {
  const runs = markInner({ colour: (run) => RUN_HEX.dark[run], ink, runAttrs: 'pathLength="1"' });
  const dots = ACTIVITY_ORDER.map((a) => {
    const c = RUN_HEX.dark[ACTIVITY_TOKEN[a]];
    const glyph = ACTIVITY_GLYPH[a].replace(/<(path|rect|circle)/g, '<$1 pathLength="1"');
    return `<span class="sc-d" style="--c:${c}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle class="sc-dot" cx="12" cy="12" r="2.4"/></svg><svg class="sc-ic" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph}</svg></span>`;
  }).join('');
  const id = variant === 'launch' ? ` id="${BOOT_ID}"` : '';
  const wm = variant === 'launch' ? 'Sur<i>Cast</i>' : '';
  return `<div${id} class="sc-load sc-${variant}" role="progressbar" aria-label="SurCast" aria-valuemin="0" aria-valuemax="${DOTS}" aria-valuenow="0"><svg class="sc-lm" viewBox="2 2 60 60" aria-hidden="true">${runs}</svg><div class="sc-lw">${wm}</div><div class="sc-ls"></div><div class="sc-lr">${dots}</div><div class="sc-lt" aria-live="polite"></div></div>`;
}
