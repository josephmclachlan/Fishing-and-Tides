/**
 * "Enhance" fly-to (PLAN 1.7): the 80s action-movie zoom onto a picked beach or coordinate.
 *
 *   1. Smooth pull-back to the wide view (zoom at which the whole region fits the screen),
 *      without panning, and further if needed until the target is in view.
 *   2. Per hop (see planHops): flash a box on the target where it sits on screen, framing what
 *      the next view will show; smoothly pan to centre it under the crosshair (first hop only,
 *      after that it's already centred); then zoom into the box in discrete steps while the
 *      picture breaks into blocks that grow with the zoom; wait for tiles, resolve cell by cell.
 *   3. Lock on the target.
 *
 * Motion grammar: smooth moves cover ground we've already seen ("known data"); stepped moves
 * (steppedEase, like old tracking optics) are new detail loading.
 * Any touch, drag or wheel on the map cancels it and hands control back.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LockFx } from './zoom-fx';
import type { Target } from './target';
import { REGION } from './region';
import { ENHANCE_WIDE_ZOOM, ENHANCE_ZOOM, planHops, steppedEase, zoomOutToFit } from './zoom';

/** Step timings, ms. Slow on purpose so it reads as a sensor working, not a glitch. */
const T = { wide: 1600, designate: 1300, center: 1200, zoom: 2200, tiles: 3000, resolve: 2600, settle: 700, hold: 2500 };
/** Discrete camera jumps per stepped zoom-in. */
const ZOOM_STEPS = 9;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

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

    // 1. Smooth pull-back to the wide view, never panning; further if the target is still off screen.
    const z0 = map.getZoom();
    const p = map.project(target.lngLat);
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    // Wide view = the whole Gandoca–Limón stretch fits on this screen (capped at ENHANCE_WIDE_ZOOM).
    const regionFit = map.cameraForBounds(REGION.bounds)?.zoom ?? ENHANCE_WIDE_ZOOM;
    const wide = Math.min(z0, ENHANCE_WIDE_ZOOM, regionFit, z0 - zoomOutToFit(p.x - w / 2, p.y - h / 2, w, h));
    if (z0 - wide > 0.05) {
      fx.state('WIDE SCAN');
      await moveTo({ zoom: wide, duration: T.wide * k, easing: easeInOut });
    }

    // 2. Box the target where it sits, centre it, step into the box, resolve; repeat.
    const hops = planHops(map.getZoom(), ENHANCE_ZOOM);
    for (let i = 0; i < hops.length; i++) {
      if (!alive()) return;
      fx.box({ at: target.lngLat, zoom: hops[i] }, `SECTOR ${i + 1}/${hops.length}`);
      fx.state('TARGET DESIGNATED');
      await wait(T.designate * k);
      if (!alive()) return;

      // Smooth pan so the crosshair sits on the target (known ground, so no stepping).
      const c = map.project(target.lngLat);
      if (Math.hypot(c.x - w / 2, c.y - h / 2) > 2) {
        fx.state('SLEWING');
        await moveTo({ center: target.lngLat, duration: T.center * k, easing: easeInOut });
        if (!alive()) return;
      }

      fx.state('ENHANCE');
      if (!reduceMotion.matches) fx.magnify(map.getZoom(), hops[i], target.lngLat);
      await moveTo({ center: target.lngLat, zoom: hops[i], duration: T.zoom * k, easing: steppedEase(ZOOM_STEPS) });
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
