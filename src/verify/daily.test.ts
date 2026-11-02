import { describe, expect, it } from 'vitest';
import { formatReport, issueAction } from './daily';
import type { CheckResult } from './types';

const r = (feed: string, status: CheckResult['status'], label = 'x', detail = 'd'): CheckResult => ({ feed, kind: 'fresh', label, detail, status, at: 0 });

describe('daily verify report', () => {
  const results = [r('wind', 'pass'), r('waves', 'warn', 'Fetched within 24 h', '30 h old'), r('gauge', 'fail', 'Latest reading within 30 min', '3 h old'), r('gauge', 'pass')];
  it('lists feeds worst first', () => {
    const md = formatReport(results, 0, 's');
    expect(md.indexOf('`gauge`')).toBeLessThan(md.indexOf('`waves`'));
    expect(md.indexOf('`waves`')).toBeLessThan(md.indexOf('`wind`'));
  });
  it('names failing feeds and the failing check', () => {
    const md = formatReport(results, Date.UTC(2026, 10, 2, 6), 'https://example/');
    expect(md).toContain('**1 feed failing:** gauge');
    expect(md).toContain('🔴 Latest reading within 30 min: 3 h old');
    expect(md).toContain('🟠 Fetched within 24 h: 30 h old');
    expect(md).toContain('2026-11-02 06:00');
  });
  it('opens, updates and closes the issue', () => {
    expect(issueAction(results, false)).toBe('open');
    expect(issueAction(results, true)).toBe('update');
    expect(issueAction([r('wind', 'warn')], true)).toBe('close');
    expect(issueAction([r('wind', 'pass')], false)).toBe('none');
  });
});
