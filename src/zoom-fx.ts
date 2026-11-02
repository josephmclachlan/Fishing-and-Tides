/**
 * Zoom tiers and the military-satellite "lock-on" effect (DESIGN.md §5, PLAN 1.3 / 1.7).
 *
 * `mountZoomTiers` tracks the tier (with hysteresis) as you scroll or pinch and publishes it
 * as `body[data-tier]`; CSS, map layers and the HUD reveal detail from that. No effect plays.
 *
 * `createLockFx` is the effect itself, driven step by step by the enhance sequence
 * (src/enhance.ts) when a beach or coordinate is picked:
 *   - a highlighted target box framing what the view will show at a given zoom, centred on
 *     the target and tracking it as the map moves,
 *   - pixel blocks that grow in proportion to the zoom (sharp when a hop starts, coarsest on
 *     arrival, anchored on the target so the coastline outline stays readable), then square
 *     cells sharpening one by one in random order under a scanline sweep,
 *   - targeting brackets closing on the reticle, with live lat / lon / altitude.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import { tierForZoom, type Tier } from './region';
import { CELL_SPAN, LOCK_STEPS, RESOLVE_CELL_PX, cellBlockAt, nextTier, zoomBlock } from './zoom';
import { cameraAltitudeM, toDDM } from './geo';
import { t as tr } from './i18n'; // 't' is the resolve progress below

/** Camera altitude for the map's current view, m. */
export function mapAltitudeM(map: MapLibreMap): number {
  const c = map.getCenter();
  return cameraAltitudeM(c.lat, map.getZoom(), map.getContainer().clientHeight, map.getVerticalFieldOfView(), map.getPitch());
}

export function formatAltitude(m: number): string {
  return m >= 10_000 ? `${(m / 1000).toFixed(0)}KM` : m >= 1000 ? `${(m / 1000).toFixed(1)}KM` : `${m.toFixed(0)}M`;
}

/** Track the zoom tier and publish it as body[data-tier]. Detail changes; no transition plays. */
export function mountZoomTiers(map: MapLibreMap) {
  let tier: Tier = tierForZoom(map.getZoom());
  document.body.dataset.tier = tier;
  map.on('move', () => {
    const next = nextTier(tier, map.getZoom());
    if (next !== tier) document.body.dataset.tier = tier = next;
  });
}

/** Box framing what the screen will show once zoomed to `zoom` with `at` centred. */
export interface BoxSpec {
  at: [number, number];
  zoom: number;
}

export interface LockFx {
  /** Show the overlay for a new target. */
  start(title: string): void;
  /** Status word next to the reticle, e.g. ACQUIRING. */
  state(text: string): void;
  /**
   * Highlight the area the view will show at `spec.zoom` centred on `spec.at`, or clear it.
   * Drawn in screen space around the target's projected point (a viewport-shaped box scaled
   * by 2^(zoom now - spec.zoom)), so it stays right however the map is panned or zoomed and
   * grows to fill the screen as the zoom arrives.
   */
  box(spec: BoxSpec | null, label?: string): void;
  /**
   * Pixelate in step with a zoom from `z0` to `z1`: sharp now, coarsest at `z1`. The block grid
   * is anchored on `anchor` so blocks scale out from the target. Picks fresh random cell
   * schedules for the resolve that follows.
   */
  magnify(z0: number, z1: number, anchor: [number, number]): void;
  /** Sharpen cell by cell over `ms` under a scanline sweep. False if cancelled meanwhile. */
  resolve(ms: number): Promise<boolean>;
  /** Brackets go green: target locked. */
  lock(text?: string): void;
  /** Fade out after `holdMs`. */
  finish(holdMs: number): void;
  /** Hide immediately. */
  cancel(): void;
}

export function createLockFx(map: MapLibreMap, before: HTMLElement): LockFx {
  const pixels = document.createElement('canvas');
  pixels.className = 'fx-pixels';
  pixels.setAttribute('aria-hidden', 'true');
  const ctx = pixels.getContext('2d')!;
  const amber = getComputedStyle(document.documentElement).getPropertyValue('--amber').trim() || 'orange';
  // Max-pooled pyramid of the frame, one level per block size (1, 2, 4 ... 32 px).
  // Max (not mean) keeps thin glowing lines alive as fat blocks instead of averaging to black.
  const levels = new Map<number, CanvasRenderingContext2D>(
    LOCK_STEPS.map((b) => [b, document.createElement('canvas').getContext('2d')!]),
  );
  const scratch = document.createElement('canvas').getContext('2d')!;

  const fx = document.createElement('div');
  fx.className = 'fx';
  fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = `
    <div class="fx-box"><span class="fx-box-lbl"></span></div>
    <div class="fx-sweep"></div>
    <div class="fx-lock"><i></i><i></i><i></i><i></i></div>
    <div class="fx-tag"><span class="fx-state">${tr('fx.acquiring')}</span><span class="fx-tier"></span></div>
    <div class="fx-coords">
      <div><span class="lbl">${tr('hud.lat')}</span><span class="seg" data-k="lat">--</span></div>
      <div><span class="lbl">${tr('hud.lon')}</span><span class="seg" data-k="lon">--</span></div>
      <div><span class="lbl">${tr('hud.alt')}</span><span class="seg" data-k="alt">--</span></div>
    </div>`;
  before.parentElement!.insertBefore(pixels, before);
  before.parentElement!.insertBefore(fx, before);

  const q = (s: string) => fx.querySelector<HTMLElement>(s)!;
  const sweep = q('.fx-sweep');
  const stateEl = q('.fx-state');
  const titleEl = q('.fx-tier');
  const boxEl = q('.fx-box');
  const boxLbl = q('.fx-box-lbl');
  const coords = { lat: q('[data-k=lat]'), lon: q('[data-k=lon]'), alt: q('[data-k=alt]') };

  // Pixel layer: off, growing with the zoom, or resolving cell by cell (t = 0..1).
  let mode: 'off' | 'zoom' | 'resolve' = 'off';
  let t = 1;
  let zoomFrom = 0;
  let zoomTo = 0;
  let anchor: [number, number] = [0, 0];
  let originX = 0; // screen position of the grid's top-left, so a cell corner sits on the anchor
  let originY = 0;
  let delays: Float32Array = new Float32Array(0); // per-cell start of its resolve
  let gridCols = 0;
  let gridRows = 0;
  let raf = 0;
  let hideTimer = 0;
  let boxSpec: BoxSpec | null = null;
  let resolving: ((ok: boolean) => void) | null = null;

  const layout = () => {
    const c = RESOLVE_CELL_PX;
    const p = map.project(anchor);
    originX = (((p.x % c) + c) % c) - c;
    originY = (((p.y % c) + c) % c) - c;
    pixels.style.transform = `translate(${originX.toFixed(1)}px, ${originY.toFixed(1)}px)`;
    // One spare row/column so the shifted grid still covers the screen.
    gridCols = Math.ceil(window.innerWidth / c) + 1;
    gridRows = Math.ceil(window.innerHeight / c) + 1;
    const w = gridCols * RESOLVE_CELL_PX;
    const h = gridRows * RESOLVE_CELL_PX;
    if (pixels.width !== w || pixels.height !== h) {
      pixels.width = w;
      pixels.height = h;
      pixels.style.width = `${w}px`;
      pixels.style.height = `${h}px`;
    }
  };

  /**
   * Paint unresolved cells as coarse blocks over the live map; resolved cells are left clear.
   * Runs inside MapLibre's 'render' event, while the WebGL frame is still readable.
   */
  const blockAt = (cell: number) =>
    mode === 'zoom' ? zoomBlock(map.getZoom(), zoomFrom, zoomTo) : cellBlockAt(t, delays[cell] ?? 0);

  const drawPixels = () => {
    layout(); // follows the anchor, and a rotate/resize mid-transition
    const src = map.getCanvas();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.clearRect(0, 0, pixels.width, pixels.height);
    let coarsest = 1;
    for (let i = 0; i < gridCols * gridRows; i++) coarsest = Math.max(coarsest, blockAt(i));
    if (coarsest <= 1) return;
    let prev: CanvasRenderingContext2D | null = null;
    for (const b of [...LOCK_STEPS].reverse()) {
      if (b > coarsest) break;
      const lv = levels.get(b)!;
      const w = Math.ceil(pixels.width / b);
      const h = Math.ceil(pixels.height / b);
      if (lv.canvas.width !== w || lv.canvas.height !== h) {
        lv.canvas.width = w;
        lv.canvas.height = h;
      } else lv.clearRect(0, 0, w, h);
      if (!prev) {
        lv.imageSmoothingEnabled = true;
        lv.drawImage(src, -originX, -originY, vw, vh); // device px -> CSS px, in grid space
      } else {
        // 2x2 max: dilate the previous level by one pixel with 'lighten', then take every other pixel.
        const pw = prev.canvas.width;
        const ph = prev.canvas.height;
        scratch.canvas.width = pw;
        scratch.canvas.height = ph;
        scratch.drawImage(prev.canvas, 0, 0);
        scratch.globalCompositeOperation = 'lighten';
        scratch.drawImage(prev.canvas, -1, 0);
        scratch.drawImage(prev.canvas, 0, -1);
        scratch.drawImage(prev.canvas, -1, -1);
        scratch.globalCompositeOperation = 'source-over';
        lv.imageSmoothingEnabled = false;
        lv.drawImage(scratch.canvas, 0, 0, pw, ph, 0, 0, pw / 2, ph / 2);
      }
      prev = lv;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = amber;
    ctx.lineWidth = 1;
    const c = RESOLVE_CELL_PX;
    for (let r = 0; r < gridRows; r++) {
      for (let k = 0; k < gridCols; k++) {
        const b = blockAt(r * gridCols + k);
        if (b <= 1) continue;
        const lv = levels.get(b)!.canvas;
        const x = k * c;
        const y = r * c;
        ctx.drawImage(lv, x / b, y / b, c / b, c / b, x, y, c, c);
        // Faint sensor-tile frame on cells still resolving.
        if (mode !== 'resolve') continue;
        ctx.globalAlpha = b >= 16 ? 0.35 : 0.18;
        ctx.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
        ctx.globalAlpha = 1;
      }
    }
  };

  const updateCoords = () => {
    const c = map.getCenter();
    coords.lat.textContent = toDDM(c.lat, 'lat');
    coords.lon.textContent = toDDM(c.lng, 'lng');
    coords.alt.textContent = formatAltitude(mapAltitudeM(map));
  };

  const placeBox = () => {
    if (!boxSpec) return;
    const p = map.project(boxSpec.at);
    const k = 2 ** (map.getZoom() - boxSpec.zoom);
    const w = map.getContainer().clientWidth * k;
    const h = map.getContainer().clientHeight * k;
    boxEl.style.transform = `translate(${(p.x - w / 2).toFixed(1)}px, ${(p.y - h / 2).toFixed(1)}px)`;
    boxEl.style.width = `${w.toFixed(1)}px`;
    boxEl.style.height = `${h.toFixed(1)}px`;
  };

  const stopResolve = (ok: boolean) => {
    cancelAnimationFrame(raf);
    resolving?.(ok);
    resolving = null;
  };

  map.on('render', () => {
    if (!fx.classList.contains('on')) return;
    if (mode !== 'off') drawPixels();
    placeBox();
  });
  map.on('move', () => {
    if (fx.classList.contains('on')) updateCoords();
  });

  return {
    start(title) {
      stopResolve(false);
      clearTimeout(hideTimer);
      titleEl.textContent = title;
      stateEl.textContent = tr('fx.acquiring');
      fx.classList.remove('locked');
      document.body.classList.remove('fx-locked');
      fx.style.setProperty('--lock', '1');
      fx.classList.add('on');
      updateCoords();
    },
    state(text) {
      stateEl.textContent = text;
    },
    box(spec, label = '') {
      if (spec) {
        // A new designation clears the previous sector's lock.
        fx.classList.remove('locked');
        document.body.classList.remove('fx-locked');
        fx.style.setProperty('--lock', '1');
      }
      boxSpec = spec;
      boxLbl.textContent = label;
      boxEl.classList.toggle('on', !!spec);
      placeBox();
    },
    magnify(z0, z1, at) {
      stopResolve(false);
      fx.classList.remove('locked');
      document.body.classList.remove('fx-locked');
      fx.style.setProperty('--lock', '1');
      zoomFrom = z0;
      zoomTo = z1;
      anchor = at;
      mode = 'zoom';
      layout();
      delays = new Float32Array(gridCols * gridRows).map(() => Math.random() * (1 - CELL_SPAN));
      pixels.classList.add('on');
      map.triggerRepaint();
    },
    resolve(ms) {
      stopResolve(false);
      return new Promise<boolean>((done) => {
        resolving = done;
        const start = performance.now();
        if (mode === 'off') {
          resolving = null;
          done(true); // nothing pixelated (e.g. reduced motion)
          return;
        }
        mode = 'resolve';
        t = 0;
        sweep.classList.add('on');
        const frame = () => {
          t = Math.min(1, (performance.now() - start) / ms);
          sweep.style.transform = `translateY(${(t * 110 - 5).toFixed(2)}vh)`;
          fx.style.setProperty('--lock', (1 - t).toFixed(3));
          map.triggerRepaint(); // keep 'render' firing so the pixel layer tracks the live map
          if (t < 1) raf = requestAnimationFrame(frame);
          else {
            mode = 'off';
            pixels.classList.remove('on');
            sweep.classList.remove('on');
            stopResolve(true);
          }
        };
        raf = requestAnimationFrame(frame);
      });
    },
    lock(text = tr('fx.locked')) {
      stateEl.textContent = text;
      fx.style.setProperty('--lock', '0');
      fx.classList.add('locked');
      document.body.classList.add('fx-locked');
    },
    finish(holdMs) {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => this.cancel(), holdMs);
    },
    cancel() {
      stopResolve(false);
      clearTimeout(hideTimer);
      mode = 'off';
      boxSpec = null;
      boxEl.classList.remove('on');
      pixels.classList.remove('on');
      sweep.classList.remove('on');
      fx.classList.remove('on', 'locked');
      document.body.classList.remove('fx-locked');
    },
  };
}
