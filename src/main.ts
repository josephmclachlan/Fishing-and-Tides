import '@fontsource/share-tech-mono';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { createMap } from './map';
import { mountHud } from './hud';
import { mockConditions } from './mock';
import { createLockFx, mountZoomTiers } from './zoom-fx';
import { createEnhancer } from './enhance';
import { mountSeek } from './seek';
import { fetchSeafloor } from './adapters/seafloor';
import { mountSeafloor } from './layers/seafloor';
import { mountSeafloorHud } from './seafloor-hud';
import { layers } from './layers/registry';
import { bindMapLayers } from './layers/visibility';
import { mountLayersPanel } from './layers-panel';

registerSW({ immediate: true });

const map = createMap('map');
const hud = document.getElementById('hud')!;
// Tiers first: the HUD reads the tier they publish on each move.
mountZoomTiers(map);
mountHud(hud, map, () => mockConditions());
// The lock-on effect plays only for a picked target, never on scroll/pinch zoom.
const enhancer = createEnhancer(map, createLockFx(map, hud));
mountSeek(hud, (t) => enhancer.go(t));
// Layer toggles and activity presets; other layers register into `layers` (src/layers/registry.ts).
bindMapLayers(map, layers);
mountLayersPanel(hud, layers);

// Depth, reefs and seamarks: static assets, precached for offline use.
fetchSeafloor()
  .then(({ data }) => {
    mountSeafloorHud(hud, map, data);
    return mountSeafloor(map, data);
  })
  .catch((err) => console.warn('seafloor layer unavailable', err));
