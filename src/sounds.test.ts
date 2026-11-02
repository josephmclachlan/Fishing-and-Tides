import { describe, expect, it, vi } from 'vitest';
import { BLIPS, createSounds } from './sounds';

const fakeCtx = () => {
  const osc = { type: '', frequency: { value: 0 }, connect: vi.fn(function (this: unknown) { return { connect: vi.fn() }; }), start: vi.fn(), stop: vi.fn() };
  const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  const ctx = { state: 'running', currentTime: 0, destination: {}, createOscillator: () => osc, createGain: () => gain, resume: vi.fn() };
  return { ctx: ctx as unknown as AudioContext, osc };
};

describe('sounds', () => {
  it('plays nothing and makes no audio context while disabled', () => {
    const make = vi.fn();
    expect(createSounds(() => false, make).play('tap')).toBe(false);
    expect(make).not.toHaveBeenCalled();
  });
  it('plays the blip frequency when enabled', () => {
    const { ctx, osc } = fakeCtx();
    expect(createSounds(() => true, () => ctx).play('on')).toBe(true);
    expect(osc.frequency.value).toBe(BLIPS.on.hz);
    expect(osc.start).toHaveBeenCalled();
  });
  it('stays silent when Web Audio is missing or throws', () => {
    expect(createSounds(() => true, () => null).play('tap')).toBe(false);
    expect(createSounds(() => true, () => { throw new Error('no'); }).play('tap')).toBe(false);
  });
});
