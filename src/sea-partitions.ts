/**
 * The wave feed's partitions as the sea-comfort index's two trains (PLAN 6.6). Pure, shared by the
 * SEA STATE rows and the WATCH / BEST TODAY comfort metric.
 */
import type { SeaState as Waves } from './adapters/waves';
import type { SeaPartitions } from './physics/sea-state';

const ok = (x: number) => Number.isFinite(x) && x > 0;

/** The feed's partitions as the comfort index's two trains, or null if the feed has no split. */
export function feedPartitions(w: Waves | null): SeaPartitions | null {
  if (!w || !Number.isFinite(w.swellHs)) return null;
  const h1 = Math.max(0, w.swellHs);
  const h2 = ok(w.swell2Hs) ? w.swell2Hs : 0;
  const e = h1 * h1 + h2 * h2;
  // Both swells add by energy; the period is energy-weighted. The primary's direction stands for both.
  const swellTs = e > 0 ? (h1 * h1 * (ok(w.swellT) ? w.swellT : 0) + h2 * h2 * (ok(w.swell2T) ? w.swell2T : 0)) / e : 0;
  const hw = ok(w.windSeaHs) ? w.windSeaHs : 0;
  return {
    swellHm: Math.sqrt(e),
    swellTs,
    swellDirDeg: Number.isFinite(w.swellDir) ? w.swellDir : undefined,
    windWaveHm: hw,
    windWaveTs: ok(w.windSeaT) ? w.windSeaT : 2,
    windWaveDirDeg: Number.isFinite(w.windSeaDir) ? w.windSeaDir : undefined,
  };
}

