/**
 * "Enhance" fly-to (PLAN 1.7): the 80s action-movie zoom onto a picked beach or coordinate.
 *
 *   1. Slew: pan to the target (pulling back to a wide view first if it's off screen or
 *      we're already zoomed in).
 *   2. Per hop (2 to 4, see planHops): box and highlight the area the next view will show,
 *      zoom into it under coarse pixel blocks, wait for the tiles, then resolve cell by cell.
 *   3. Lock on the target.
 *
 * Any touch, drag or wheel on the map cancels it and hands control back.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LockFx } from './zoom-fx';
import type { Target } from './target';
import { ENHANCE_WIDE_ZOOM, ENHANCE_ZOOM, planHops } from './zoom';

/** Step timings, ms. Slow on purpose so it reads as a sensor working, not a glitch. */
const T = { slew: 1400, wide: 2400, designate: 1300, zoom: 2000, tiles: 3000, resolve: 2600, settle: 700, hold: 2500 };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const once = (map: MapLibreMap, ev: 'moveend' | 'idle') => new Promise<void>((r) => map.once(ev, () => r()));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

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
    const moveTo = async (opts: Parameters<MapLibreMap['easeTo']>[0], fly = false) => {
      const done = once(map, 'moveend');
      if (fly) map.flyTo({ ...opts, essential: true });
      else map.easeTo({ ...opts, essential: true });
      await done;
    };

    fx.start(target.name);

    // 1. Slew onto the target.
    const z0 = map.getZoom();
    if (!map.getBounds().contains(target.lngLat) || z0 > ENHANCE_ZOOM - 1.5) {
      fx.state('WIDE SCAN');
      await moveTo({ center: target.lngLat, zoom: Math.min(z0, ENHANCE_WIDE_ZOOM), duration: T.wide * k }, true);
    } else {
      fx.state('SLEWING');
      await moveTo({ center: target.lngLat, duration: T.slew * k, easing: easeInOut });
    }

    // 2. Box, zoom, resolve; repeat.
    const hops = planHops(map.getZoom(), ENHANCE_ZOOM);
    for (let i = 0; i < hops.length; i++) {
      if (!alive()) return;
      const dz = hops[i] - map.getZoom();
      const c = map.project(target.lngLat);
      const w = map.getContainer().clientWidth / 2 ** dz;
      const h = map.getContainer().clientHeight / 2 ** dz;
      const sw = map.unproject([c.x - w / 2, c.y + h / 2]);
      const ne = map.unproject([c.x + w / 2, c.y - h / 2]);
      fx.box([[sw.lng, sw.lat], [ne.lng, ne.lat]], `SECTOR ${i + 1}/${hops.length}`);
      fx.state('TARGET DESIGNATED');
      await wait(T.designate * k);
      if (!alive()) return;

      fx.state('ENHANCE');
      if (!reduceMotion.matches) fx.coarse();
      await moveTo({ center: target.lngLat, zoom: hops[i], duration: T.zoom * k, easing: easeInOut });
      if (!alive()) return;
      fx.box(null);
      if (!map.areTilesLoaded()) await Promise.race([once(map, 'idle'), wait(T.tiles)]);
      if (!alive()) return;

      fx.state('RESOLVING');
      if (!reduceMotion.matches && !(await fx.resolve(T.resolve))) return;
      fx.lock(i === hops.length - 1 ? 'LOCKED' : 'SECTOR CLEAR');
      await wait(T.settle * k);
    }
    if (!alive()) return;
    active = false;
    fx.finish(T.hold);
  }

  return { go, cancel };
}
