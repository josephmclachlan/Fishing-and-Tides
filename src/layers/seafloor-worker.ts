/**
 * Seafloor baking off the main thread (PLAN 5.4): the shading rasters and contours took about
 * a second of main-thread time at start on a 4× slowed CPU (a mid-range phone), blocking the
 * first map frames. The rasters are PNG-encoded here when OffscreenCanvas is available, so the
 * main thread only makes an object URL; otherwise the pixels come back (transferred) to encode there.
 */
import { bake, type BakeInput } from './seafloor-bake';
import type { ShadeImage } from './seafloor-shade';

/** A baked raster: a PNG when the worker could encode it, else the raw pixels. */
export type BakedShade = ShadeImage | { png: Blob; width: number; height: number; coordinates: ShadeImage['coordinates'] };
export type BakeOut = { ok: true; macro: BakedShade; region: BakedShade; contours: GeoJSON.FeatureCollection } | { ok: false; message: string };

const ctx = self as unknown as { onmessage: ((e: MessageEvent<BakeInput>) => void) | null; postMessage(msg: BakeOut, transfer?: Transferable[]): void };

async function encode(img: ShadeImage): Promise<BakedShade> {
  if (typeof OffscreenCanvas === 'undefined') return img;
  const canvas = new OffscreenCanvas(img.width, img.height);
  const g = canvas.getContext('2d');
  if (!g) return img;
  g.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
  const png = await canvas.convertToBlob({ type: 'image/png' });
  return { png, width: img.width, height: img.height, coordinates: img.coordinates };
}

ctx.onmessage = async (e) => {
  try {
    const out = bake(e.data);
    const [macro, region] = await Promise.all([encode(out.macro), encode(out.region)]);
    const transfer = [macro, region].flatMap((s) => ('data' in s ? [s.data.buffer as ArrayBuffer] : []));
    ctx.postMessage({ ok: true, macro, region, contours: out.contours }, transfer);
  } catch (err) {
    ctx.postMessage({ ok: false, message: String(err) });
  }
};
