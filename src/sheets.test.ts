import { describe, expect, it } from 'vitest';
import { createSheets } from './sheets';

describe('sheets store', () => {
  it('starts with the given sheet open, or none', () => {
    expect(createSheets().current()).toBeNull();
    expect(createSheets('layers').is('layers')).toBe(true);
  });
  it('keeps one sheet open at a time', () => {
    const s = createSheets();
    s.open('cond');
    s.open('layers');
    expect(s.current()).toBe('layers');
    expect(s.is('cond')).toBe(false);
  });
  it('toggle closes the open sheet, so its own button always works', () => {
    const s = createSheets();
    s.toggle('layers');
    expect(s.is('layers')).toBe(true);
    s.toggle('layers');
    expect(s.current()).toBeNull();
  });
  it('close(id) only closes that sheet; close() closes any', () => {
    const s = createSheets('find');
    s.close('cond');
    expect(s.is('find')).toBe(true);
    s.close();
    expect(s.current()).toBeNull();
  });
  it('notifies only on change', () => {
    const s = createSheets();
    let n = 0;
    s.subscribe(() => n++);
    s.open('time');
    s.open('time');
    s.close();
    s.close();
    expect(n).toBe(2);
  });
});
