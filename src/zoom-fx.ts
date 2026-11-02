/**
 * Zoom tiers + the military-satellite "lock-on" transition (DESIGN.md §5, PLAN 1.3).
 *
 * Owns the current tier (with hysteresis) and publishes it as `body[data-tier]`, which
 * CSS and the HUD key off. Crossing a tier plays the transition:
 *   1. scanline sweep across the screen (down when zooming in, up when zooming out),
 *   2. the map drops to coarse pixel blocks; square cells sharpen one by one, in random
 *      order, until the whole frame has "locked on",
 *   3. targeting brackets close on the reticle, ACQUIRING -> LOCKED,
 *   4. live lat / lon / altitude readout beside the reticle.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import { tierForZoom, type Tier } from './region';
import { CELL_SPAN, LOCK_STEPS, RESOLVE_CELL_PX, cellBlockAt, nextTier, tierDirection } from './zoom';
import { cameraAltitudeM, toDDM } from './geo';

const ACQUIRE_MS = 1100; // sweep + sharpen
const HOLD_MS = 900; // LOCKED stays up before fading

export function currentTier(): Tier {
  return (document.body.dataset.tier as Tier) ?? 'COAST';
}

/** Camera altitude for the map's current view, m. */
export function mapAltitudeM(map: MapLibreMap): number {
  const c = map.getCenter();
  return cameraAltitudeM(c.lat, map.getZoom(), map.getContainer().clientHeight, map.getVerticalFieldOfView(), map.getPitch());
}

export function formatAltitude(m: number): string {
  return m >= 10_000 ? `${(m / 1000).toFixed(0)}KM` : m >= 1000 ? `${(m / 1000).toFixed(1)}KM` : `${m.toFixed(0)}M`;
}

export function mountZoomTiers(map: MapLibreMap, before: HTMLElement) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

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
    <div class="fx-sweep"></div>
    <div class="fx-lock"><i></i><i></i><i></i><i></i></div>
    <div class="fx-tag"><span class="fx-state">ACQUIRING</span><span class="fx-tier"></span></div>
    <div class="fx-coords">
      <div><span class="lbl">LAT</span><span class="seg" data-k="lat">--</span></div>
      <div><span class="lbl">LON</span><span class="seg" data-k="lon">--</span></div>
      <div><span class="lbl">ALT</span><span class="seg" data-k="alt">--</span></div>
    </div>`;
  before.parentElement!.insertBefore(pixels, before);
  before.parentElement!.insertBefore(fx, before);

  const q = (s: string) => fx.querySelector<HTMLElement>(s)!;
  const sweep = q('.fx-sweep');
  const state = q('.fx-state');
  const tierEl = q('.fx-tier');
  const coords = { lat: q('[data-k=lat]'), lon: q('[data-k=lon]'), alt: q('[data-k=alt]') };

  let tier: Tier = tierForZoom(map.getZoom());
  document.body.dataset.tier = tier;

  let start = 0;
  let dir: -1 | 0 | 1 = 1;
  let raf = 0;
  let t = 1; // acquire progress 0..1; 1 = sharp, pixel layer off
  let delays: Float32Array = new Float32Array(0); // per-cell start of its resolve
  let gridCols = 0;
  let gridRows = 0;
  let hideTimer = 0;

  const layout = () => {
    gridCols = Math.ceil(window.innerWidth / RESOLVE_CELL_PX);
    gridRows = Math.ceil(window.innerHeight / RESOLVE_CELL_PX);
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
  const drawPixels = () => {
    layout(); // follows a rotate/resize mid-transition
    const src = map.getCanvas();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.clearRect(0, 0, pixels.width, pixels.height);
    let coarsest = 1;
    for (const d of delays) coarsest = Math.max(coarsest, cellBlockAt(t, d));
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
        lv.drawImage(src, 0, 0, vw, vh); // device px -> CSS px
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
        const b = cellBlockAt(t, delays[r * gridCols + k] ?? 0);
        if (b <= 1) continue;
        const lv = levels.get(b)!.canvas;
        const x = k * c;
        const y = r * c;
        ctx.drawImage(lv, x / b, y / b, c / b, c / b, x, y, c, c);
        // Faint sensor-tile frame on cells still resolving.
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

  const frame = () => {
    t = Math.min(1, (performance.now() - start) / ACQUIRE_MS);
    const y = dir < 0 ? 1 - t : t;
    sweep.style.transform = `translateY(${(y * 110 - 5).toFixed(2)}vh)`;
    fx.style.setProperty('--lock', (1 - t).toFixed(3));
    if (t < 1) {
      map.triggerRepaint(); // keep 'render' firing so the pixel layer tracks the live map
      raf = requestAnimationFrame(frame);
    } else {
      pixels.classList.remove('on');
      fx.classList.add('locked');
      document.body.classList.add('fx-locked');
      state.textContent = 'LOCKED';
      hideTimer = window.setTimeout(() => {
        fx.classList.remove('on', 'locked');
        document.body.classList.remove('fx-locked');
      }, HOLD_MS);
    }
  };

  const play = (to: Tier, d: -1 | 0 | 1) => {
    cancelAnimationFrame(raf);
    clearTimeout(hideTimer);
    dir = d;
    start = performance.now();
    tierEl.textContent = `TIER ${to}`;
    state.textContent = d < 0 ? 'WIDE SCAN' : 'ACQUIRING';
    fx.classList.remove('locked');
    document.body.classList.remove('fx-locked');
    fx.classList.add('on');
    fx.classList.toggle('reduced', reduceMotion.matches);
    updateCoords();
    if (reduceMotion.matches) {
      // No sweep or pixelation: just the lock state.
      start -= ACQUIRE_MS;
      frame();
      return;
    }
    t = 0;
    layout();
    delays = new Float32Array(gridCols * gridRows).map(() => Math.random() * (1 - CELL_SPAN));
    pixels.classList.add('on');
    map.triggerRepaint();
    raf = requestAnimationFrame(frame);
  };

  map.on('render', () => {
    if (t < 1) drawPixels();
  });

  map.on('move', () => {
    if (fx.classList.contains('on')) updateCoords();
    const next = nextTier(tier, map.getZoom());
    if (next === tier) return;
    const d = tierDirection(tier, next);
    tier = next;
    document.body.dataset.tier = tier;
    play(tier, d);
  });

  // Boot: lock on once the first frame of the real map is up.
  map.once('load', () => play(tier, 1));
}
