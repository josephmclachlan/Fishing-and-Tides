/**
 * Physics Web Worker (PLAN 3.6): runs spot refraction, breaking and rip risk off the main
 * thread. Protocol in ./client.ts. No DOM.
 */
import { spotModelFromGrids, type SeafloorGrids, type SpotRequest } from './spot-model';

export type WorkerIn = { type: 'init'; grids: SeafloorGrids } | { type: 'spot'; id: number; req: SpotRequest };
export type WorkerOut = { type: 'ready' } | { type: 'spot'; id: number; result: ReturnType<ReturnType<typeof spotModelFromGrids>['spot']> } | { type: 'error'; id?: number; message: string };

// The project's tsconfig has DOM lib, not WebWorker, so type the worker scope minimally.
const ctx = self as unknown as { onmessage: ((e: MessageEvent<WorkerIn>) => void) | null; postMessage(msg: WorkerOut): void };
let model: ReturnType<typeof spotModelFromGrids> | null = null;

ctx.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      model = spotModelFromGrids(msg.grids);
      ctx.postMessage({ type: 'ready' });
    } else if (msg.type === 'spot') {
      if (!model) throw new Error('physics worker: spot before init');
      ctx.postMessage({ type: 'spot', id: msg.id, result: model.spot(msg.req) });
    }
  } catch (err) {
    ctx.postMessage({ type: 'error', id: 'id' in msg ? msg.id : undefined, message: String(err) });
  }
};
