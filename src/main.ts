import '@fontsource/share-tech-mono';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { createMap } from './map';
import { mountHud } from './hud';
import { mockConditions } from './mock';

registerSW({ immediate: true });

const map = createMap('map');
mountHud(document.getElementById('hud')!, map, () => mockConditions());
