/**
 * SHARE for the WATCH forecast (PLAN 7.13): draw the table view onto a canvas in the HUD colours,
 * then hand it to the phone's share sheet, or download it as a PNG where sharing files isn't
 * supported. Colours come from the CSS variables.
 */
import type { WatchForecast } from './forecast';
import type { Tone } from './registry';

export interface ShareText {
  title: string;
  subtitle: string;
  best: string | null;
  metric(id: string): string;
  day(ms: number): string;
  value(id: string, v: number | null, decimals: number): string;
}

const css = (name: string, fb: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;

export function drawForecast(f: WatchForecast, tx: ShareText): HTMLCanvasElement {
  const pal: Record<Tone, string> = { green: css('--green', '#39ff7a'), amber: css('--amber', '#ffb000'), red: css('--red', '#ff3b2f'), none: css('--amber', '#ffb000') };
  const amber = pal.amber, dim = css('--amber-dim', 'rgba(255,176,0,0.35)'), bg = css('--bg', '#050805');
  const W = 1000, pad = 28, labelW = 230, rowH = 64, top = 150;
  const H = top + 40 + f.rows.length * rowH + 50;
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = dim;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.font = '700 26px "Share Tech Mono", ui-monospace, monospace';
  g.fillStyle = amber;
  g.textBaseline = 'alphabetic';
  g.fillText(tx.title, pad, 56);
  g.font = '16px "Share Tech Mono", ui-monospace, monospace';
  g.globalAlpha = 0.7;
  g.fillText(tx.subtitle, pad, 84);
  g.globalAlpha = 1;
  if (tx.best) {
    g.strokeStyle = pal.green;
    g.strokeRect(pad, 100, W - 2 * pad, 32);
    g.fillStyle = pal.green;
    g.fillText(`▶ ${tx.best}`, pad + 12, 122);
  }
  const colW = (W - 2 * pad - labelW) / f.days;
  g.fillStyle = amber;
  g.globalAlpha = 0.75;
  g.textAlign = 'center';
  for (let d = 0; d < f.days; d++) g.fillText(tx.day(f.startMs + d * 864e5), pad + labelW + colW * (d + 0.5), top + 20);
  g.globalAlpha = 1;
  f.rows.forEach((r, i) => {
    const y = top + 40 + i * rowH;
    g.strokeStyle = dim;
    g.beginPath();
    g.moveTo(pad, y);
    g.lineTo(W - pad, y);
    g.stroke();
    g.textAlign = 'left';
    g.fillStyle = amber;
    g.font = '18px "Share Tech Mono", ui-monospace, monospace';
    g.fillText(tx.metric(r.id), pad, y + 30);
    g.globalAlpha = 0.6;
    g.font = '13px "Share Tech Mono", ui-monospace, monospace';
    g.fillText(r.unit, pad, y + 50);
    g.globalAlpha = 1;
    g.textAlign = 'center';
    r.days.forEach((cell, d) => {
      g.fillStyle = pal[cell.tone];
      g.font = '30px "Share Tech Mono", ui-monospace, monospace';
      g.fillText(tx.value(r.id, cell.value, r.decimals), pad + labelW + colW * (d + 0.5), y + 38);
    });
  });
  g.textAlign = 'left';
  g.fillStyle = amber;
  g.globalAlpha = 0.6;
  g.font = '12px "Share Tech Mono", ui-monospace, monospace';
  g.fillText('FISHING-AND-TIDES · GANDOCA TO LIMÓN', pad, H - 24);
  return c;
}

/** Share the image where the browser can share files, else download it. Resolves to what happened. */
export async function shareCanvas(c: HTMLCanvasElement, name: string): Promise<'shared' | 'saved' | 'failed'> {
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], name, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'saved';
}
