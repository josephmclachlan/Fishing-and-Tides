import { describe, expect, it, vi } from 'vitest';
import { HORIZON_H, bandFor, createTimeStore, offsetLabel, validLabel } from './time';

const T0 = Date.UTC(2026, 10, 2, 4, 12, 55); // Mon 04:12:55 UTC

describe('time store', () => {
  it('starts at NOW, anchored to the hour', () => {
    const s = createTimeStore(T0);
    expect(s.offsetH()).toBe(0);
    expect(s.isForecast()).toBe(false);
    expect(s.baseMs()).toBe(Date.UTC(2026, 10, 2, 4));
  });
  it('clamps and rounds to whole hours within the horizon', () => {
    const s = createTimeStore(T0);
    s.set(-5);
    expect(s.offsetH()).toBe(0);
    s.set(1000);
    expect(s.offsetH()).toBe(HORIZON_H);
    s.set(5.6);
    expect(s.offsetH()).toBe(6);
    s.set(NaN);
    expect(s.offsetH()).toBe(0);
  });
  it('valid time follows the offset', () => {
    const s = createTimeStore(T0);
    s.step(6);
    expect(s.validMs()).toBe(Date.UTC(2026, 10, 2, 10));
    expect(s.isForecast()).toBe(true);
    s.reset();
    expect(s.validMs()).toBe(s.baseMs());
  });
  it('notifies only on change, and unsubscribes', () => {
    const s = createTimeStore(T0);
    const fn = vi.fn();
    const off = s.subscribe(fn);
    s.set(0);
    expect(fn).not.toHaveBeenCalled();
    s.set(3);
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    s.set(4);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('has three confidence bands that set the step size', () => {
    expect(HORIZON_H).toBe(720);
    expect(bandFor(0).id).toBe('forecast');
    expect(bandFor(167).id).toBe('forecast');
    expect(bandFor(168).id).toBe('lowconf');
    expect(bandFor(384).id).toBe('outlook');
    const s = createTimeStore(T0);
    s.set(200);
    expect(s.offsetH()).toBe(201); // 3 h steps from 168
    s.set(500);
    expect(s.offsetH()).toBe(504); // whole days from 384
    expect(s.band()).toBe('outlook');
  });
  it('steps cross band edges using the finer step going back', () => {
    const s = createTimeStore(T0);
    s.set(168);
    s.step(-3);
    expect(s.offsetH()).toBe(165);
    s.step(3);
    expect(s.offsetH()).toBe(168); // 165 + 3 one-hour steps
  });
  it('formats labels', () => {
    expect(offsetLabel(0)).toBe('NOW');
    expect(offsetLabel(6)).toBe('+06H');
    expect(offsetLabel(48)).toBe('+48H');
    expect(validLabel(Date.UTC(2026, 10, 2, 4))).toBe('SUN 01 22:00'); // Costa Rica is UTC-6
    expect(validLabel(Date.UTC(2026, 10, 2, 14))).toBe('MON 02 08:00');
    expect(validLabel(Date.UTC(2026, 10, 2, 4), 0)).toBe('MON 02 04:00');
  });
});
