import '@fontsource/share-tech-mono';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { createMap } from './map';
import { mountHud } from './hud';
import { mockConditions } from './mock';
import { createLockFx, mountZoomTiers } from './zoom-fx';
import { createEnhancer } from './enhance';
import { mountSeek } from './seek';

registerSW({ immediate: true });

const map = createMap('map');
const hud = document.getElementById('hud')!;
// Tiers first: the HUD reads the tier they publish on each move.
mountZoomTiers(map);
mountHud(hud, map, () => mockConditions());
// The lock-on effect plays only for a picked target, never on scroll/pinch zoom.
const enhancer = createEnhancer(map, createLockFx(map, hud));
mountSeek(hud, (t) => enhancer.go(t));
