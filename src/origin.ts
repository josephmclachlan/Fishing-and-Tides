/**
 * Where a sub-page (Field notes, Ciguatera, Dispatch) was opened from, kept on its own history entry. A reload keeps
 * history.state, so after an app update, a language switch or the phone waking the app the Back button still goes to the
 * page the person came from, not a default (Joseph 2026-11-16: "half the time the back button goes to the map, and not
 * to my forecast").
 */
export function rememberOrigin(hash: string): void {
  try {
    history.replaceState({ ...(history.state ?? {}), from: hash }, '');
  } catch {
    /* a sandboxed frame can refuse; Back then falls back to the forecast */
  }
}

export function storedOrigin(): string | null {
  const s: unknown = history.state;
  return s && typeof s === 'object' && typeof (s as { from?: unknown }).from === 'string' ? (s as { from: string }).from : null;
}
