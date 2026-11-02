/** Which protected zone is under a point (PLAN 4.3). */
import { pointInPolygon } from './geo';
import type { LngLat, ZoneProps } from './zones';

export interface ZonePoly {
  props: ZoneProps;
  rings: LngLat[][];
}

/** First zone containing p (a [lng, lat] point), or null. Rings are outer boundaries. */
export function zoneAt(zones: readonly ZonePoly[], p: LngLat): ZoneProps | null {
  for (const z of zones) if (z.rings.some((r) => pointInPolygon(p, [r]))) return z.props;
  return null;
}
