/**
 * Listen to AISStream's websocket for a while and fold what arrives into a vessel table (PLAN 7.97).
 * Node 22's built-in WebSocket; the key comes from AISSTREAM_API_KEY and never reaches the browser.
 */
import { applyAisMessage, type Vessel } from '../../src/adapters/ais-parse.ts';

export async function listenAis(box: readonly [readonly [number, number], readonly [number, number]], seconds: number, table: Map<number, Vessel>, opts: { noFilter?: boolean } = {}): Promise<{ heard: number; positions: number }> {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) throw new Error('AISSTREAM_API_KEY is not set');
  const [[w, s], [e, n]] = box;
  let heard = 0;
  let positions = 0;
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    let opened = false;
    const stop = setTimeout(() => ws.close(), seconds * 1000);
    ws.addEventListener('open', () => {
      opened = true;
      // AISStream wants [lat, lon] corners and the subscription within 3 s of connecting.
      ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: [[[s, w], [n, e]]], ...(opts.noFilter ? {} : { FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ShipStaticData'] }) }));
    });
    ws.addEventListener('message', async (ev) => {
      try {
        const text = typeof ev.data === 'string' ? ev.data : await (ev.data as Blob).text();
        const msg = JSON.parse(text);
        if (msg.error) return reject(new Error(`aisstream: ${msg.error}`));
        heard++;
        if (heard <= 3) console.log(`  [ais] message ${heard}: ${msg.MessageType ?? Object.keys(msg).join(',')}`);
        if (applyAisMessage(table, msg, Date.now()) && msg.MessageType !== 'ShipStaticData') positions++;
      } catch {
        // A malformed message is skipped.
      }
    });
    ws.addEventListener('close', () => (clearTimeout(stop), opened ? resolve() : reject(new Error('aisstream: connection closed before opening'))));
    ws.addEventListener('error', () => (clearTimeout(stop), reject(new Error('aisstream: websocket error'))));
  });
  return { heard, positions };
}
