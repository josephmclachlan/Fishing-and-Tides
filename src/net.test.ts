import { describe, expect, it, vi } from 'vitest';
import { createNet } from './net';

describe('net', () => {
  it('follows the online and offline events and notifies on change only', () => {
    const t = new EventTarget();
    const net = createNet(t, true);
    const fn = vi.fn();
    net.subscribe(fn);
    t.dispatchEvent(new Event('online'));
    expect(fn).not.toHaveBeenCalled();
    t.dispatchEvent(new Event('offline'));
    expect(net.online()).toBe(false);
    t.dispatchEvent(new Event('online'));
    expect(net.online()).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('starts from the given state', () => {
    expect(createNet(null, false).online()).toBe(false);
  });
});
