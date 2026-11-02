/**
 * Keeps a pinch on the HUD from zooming the page itself.
 *
 * A trackpad pinch reaches the page as wheel events with ctrlKey set (Chrome, Edge, Firefox) or
 * as gesture events (Safari). Over the map canvas MapLibre takes them and zooms the map. Over a
 * HUD panel nothing did, so the browser zoomed the whole page instead: the panels slid off
 * screen and the reticle, which is centred on the layout viewport, sat off the visible centre.
 *
 * Here a pinch over the HUD is passed on to the map (so it still zooms the map, around the same
 * point), and the page never zooms. Touch screens get `touch-action` in style.css for the same reason.
 */
import type { Map } from 'maplibre-gl';

export function mountPinchGuard(map: Map, doc: Document = document) {
  const canvas = map.getCanvas();
  const mapArea = map.getCanvasContainer();
  doc.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey || (e.target instanceof Node && mapArea.contains(e.target))) return;
      e.preventDefault();
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ, deltaMode: e.deltaMode,
          clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
          ctrlKey: true, bubbles: true, cancelable: true,
        }),
      );
    },
    { passive: false },
  );
  // Safari's own pinch events: the map handles touch pinches itself, so just stop the page zoom.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
