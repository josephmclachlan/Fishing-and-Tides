/**
 * Optional UI sounds (PLAN 5.5). Short blips synthesized with Web Audio, so there are no audio files to
 * cache or license. Off by default (settings.sound); the AudioContext is created on the first tap after
 * it is turned on, which is also what browsers require. Silent where Web Audio is missing.
 */
export type Blip = 'tap' | 'on' | 'off' | 'alert';

/** Frequency (Hz) and length (s) of each blip. */
export const BLIPS: Record<Blip, { hz: number; s: number }> = {
  tap: { hz: 880, s: 0.04 },
  on: { hz: 1320, s: 0.07 },
  off: { hz: 440, s: 0.07 },
  alert: { hz: 660, s: 0.18 },
};

export function createSounds(enabled: () => boolean, makeCtx: () => AudioContext | null) {
  let ctx: AudioContext | null = null;
  return {
    play(kind: Blip) {
      if (!enabled()) return false;
      try {
        ctx ??= makeCtx();
        if (!ctx) return false;
        if (ctx.state === 'suspended') void ctx.resume();
        const { hz, s } = BLIPS[kind];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = ctx.currentTime;
        osc.type = 'square';
        osc.frequency.value = hz;
        gain.gain.setValueAtTime(0.04, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + s);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + s);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Blip on every HUD button press: `on` / `off` for toggles by their aria-pressed state, `tap` otherwise. */
export function mountSounds(doc: Document, enabled: () => boolean) {
  const sounds = createSounds(enabled, () => {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  });
  doc.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement | null)?.closest<HTMLElement>('button, .tab');
    if (!b) return;
    // aria-pressed flips in the button's own handler, which runs before this one at the document.
    const p = b.getAttribute('aria-pressed');
    sounds.play(p === 'true' ? 'on' : p === 'false' ? 'off' : 'tap');
  });
  return sounds;
}
