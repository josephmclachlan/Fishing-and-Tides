/**
 * "Enhance" fly-to (PLAN 1.7): the 80s action-movie zoom onto a picked beach or coordinate.
 *
 *   1. Full pull-back in steps to the wide view (zoom at which the whole region fits the
 *      screen), without panning, and further if needed until the target is in view.
 *   2. Per hop (see planHops): box and highlight the target where it sits on screen, framing
 *      what the next view will show, then zoom into that box in discrete steps while the
 *      picture breaks into blocks that grow with the zoom; wait for tiles, resolve cell by cell.
 *   3. Lock on the target.
 *
 * No smooth glides: every camera move is stepped (steppedEase), like old tracking optics.
 * Any touch, drag or wheel on the map cancels it and hands control back.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LockFx } from './zoom-fx';
import type { Target } from './target';
import { REGION } from './region';
import { ENHANCE_WIDE_ZOOM, ENHANCE_ZOOM, planHops, steppedEase, zoomOutToFit } from './zoom';

/** Step timings, ms. Slow on purpose so it reads as a sensor working, not a glitch. */
const T = { wide: 1800, designate: 1300, zoom: 2200, tiles: 3000, resolve: 2600, settle: 700, hold: 2500 };
/** Discrete camera jumps per move. */
const STEPS = { wide: 5, zoom: 9 };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const once = (map: MapLibreMap, ev: 'moveend' | 'idle') => new Promise<void>((r) => map.once(ev, () => r()));

export function createEnhancer(map: MapLibreMap, fx: LockFx) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let run = 0;
  let active = false;

  const cancel = () => {
    if (!active) return;
    run++;
    active = false;
    map.stop();
    fx.cancel();
  };
  // The user grabbing the map takes control back.
  for (const ev of ['pointerdown', 'wheel', 'touchstart'] as const) {
    map.getCanvasContainer().addEventListener(ev, cancel, { passive: true });
  }

  async function go(target: Target) {
    cancel();
    const id = ++run;
    const alive = () => id === run;
    active = true;
    const k = reduceMotion.matches ? 0.15 : 1;
    const moveTo = async (opts: Parameters<MapLibreMap['easeTo']>[0]) => {
      const done = once(map, 'moveend');
      map.easeTo({ ...opts, essential: true });
      await done;
    };

    fx.start(target.name);

    // 1. Full pull-back to the wide view, never panning; further if the target is still off screen.
    const z0 = map.getZoom();
    const p = map.project(target.lngLat);
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    // Wide view = the whole Gandoca–Limón stretch fits on this screen (capped at ENHANCE_WIDE_ZOOM).
    const regionFit = map.cameraForBounds(REGION.bounds)?.zoom ?? ENHANCE_WIDE_ZOOM;
    const wide = Math.min(z0, ENHANCE_WIDE_ZOOM, regionFit, z0 - zoomOutToFit(p.x - w / 2, p.y - h / 2, w, h));
    if (z0 - wide > 0.05) {
      fx.state('WIDE SCAN');
      await moveTo({ zoom: wide, duration: T.wide * k, easing: steppedEase(STEPS.wide) });
    }

    // 2. Box the target where it sits, zoom into the box, resolve; repeat.
    const hops = planHops(map.getZoom(), ENHANCE_ZOOM);
    for (let i = 0; i < hops.length; i++) {
      if (!alive()) return;
      fx.box({ at: target.lngLat, zoom: hops[i] }, `SECTOR ${i + 1}/${hops.length}`);
      fx.state('TARGET DESIGNATED');
      await wait(T.designate * k);
      if (!alive()) return;

      fx.state('ENHANCE');
      if (!reduceMotion.matches) fx.magnify(map.getZoom(), hops[i], target.lngLat);
      await moveTo({ center: target.lngLat, zoom: hops[i], duration: T.zoom * k, easing: steppedEase(STEPS.zoom) });
      if (!alive()) return;
      fx.box(null);
      if (!map.areTilesLoaded()) await Promise.race([once(map, 'idle'), wait(T.tiles)]);
      if (!alive()) return;

      fx.state('RESOLVING');
      if (!(await fx.resolve(T.resolve))) return;
      fx.lock(i === hops.length - 1 ? 'LOCKED' : 'SECTOR CLEAR');
      await wait(T.settle * k);
    }
    if (!alive()) return;
    active = false;
    fx.finish(T.hold);
  }

  return { go, cancel };
}
