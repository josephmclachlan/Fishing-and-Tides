/** Binds catalog layers that declare `mapPrefixes` to MapLibre style layers (PLAN 1.8). */
import type { Map } from 'maplibre-gl';
import { LAYERS, type LayerStore } from './registry';

export function bindMapLayers(map: Map, store: LayerStore) {
  for (const def of LAYERS) {
    const prefixes = def.mapPrefixes;
    if (!prefixes) continue;
    let on = true;
    const apply = () => {
      if (!map.getStyle()) return;
      for (const l of map.getStyle().layers ?? []) {
        if (!prefixes.some((p) => l.id.startsWith(p))) continue;
        const want = on ? 'visible' : 'none';
        if ((l.layout?.visibility ?? 'visible') !== want) map.setLayoutProperty(l.id, 'visibility', want);
      }
    };
    store.register(def.id, { setVisible: (v) => ((on = v), apply()) });
    // Layers such as the seafloor are added after boot; catch them as they appear.
    map.on('styledata', apply);
  }
}
