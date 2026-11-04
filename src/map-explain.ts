/**
 * Tap-on-map explainers (PLAN 7.12): tap a lightning flash, storm, live observation or wave crest
 * line and the same card as the panel labels (src/explain.ts) says what it is. Marks are small, so
 * the hit test uses a box around the tap. Registered before the rip and sargassum handlers in
 * main.ts, so where marks overlap those win (the last card shown stays).
 */
import type { Map } from 'maplibre-gl';
import { t } from './i18n';
import { HIGH_SEA_M } from './layers/waves';
import { mapTapClaimed } from './here-card';

const TAP_BOX_PX = 9;
/** Layers in the order that wins when several are under the tap. */
export const TAPPABLE = ['ob-dot', 'ob-label', 'lt-dot', 'st-ring', 'st-label', 'wv-crest'] as const;

export interface Pick { title: string; id: string }

/** What card a rendered feature earns, or null. `props` are the feature's GeoJSON properties. */
export function pickExplain(layerId: string, props: Record<string, unknown>): Pick | null {
  switch (layerId) {
    case 'lt-dot':
      return { title: t('layer.lightning'), id: props.fresh ? 'lightningNew' : 'lightningOld' };
    case 'st-ring':
    case 'st-label':
      return { title: String(props.label ?? t('layer.weather')).split('\n')[0], id: 'stormMark' };
    case 'ob-dot':
    case 'ob-label':
      return { title: String(props.label ?? t('layer.obs')).split('\n')[0], id: 'obsMark' };
    case 'wv-crest': {
      const hs = Number(props.hs);
      const title = Number.isFinite(hs) ? `${t('layer.waves')} ${hs.toFixed(1)} m` : t('layer.waves');
      return { title, id: hs >= HIGH_SEA_M ? 'crestHigh' : 'crest' };
    }
    default:
      return null;
  }
}

export function mountMapExplain(map: Map, show: (title: string, id: string, at: { x: number; y: number }) => void) {
  map.on('click', (e) => {
    if (mapTapClaimed()) return;
    const layers = TAPPABLE.filter((id) => map.getLayer(id));
    if (!layers.length) return;
    const { x, y } = e.point;
    const hits = map.queryRenderedFeatures([[x - TAP_BOX_PX, y - TAP_BOX_PX], [x + TAP_BOX_PX, y + TAP_BOX_PX]], { layers: [...layers] });
    for (const id of TAPPABLE) {
      const f = hits.find((h) => h.layer.id === id);
      const pick = f && pickExplain(id, f.properties ?? {});
      if (pick) return show(pick.title, pick.id, e.point);
    }
  });
}
