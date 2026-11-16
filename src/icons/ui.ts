/**
 * The interface's own small icons (PLAN 7.107): one close, one pair of pager arrows, one "go" chevron and one star,
 * drawn the same everywhere instead of the text characters ✕ ‹ › ◀ ▶ ▸ ★, which every font draws differently.
 * Stroke icons on a 24 grid in `currentColor`, sized 1em by the `.ui-i` class (style.css). Pure strings.
 */
const ico = (body: string, cls = '') => `<svg class="ui-i${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

export const UI = {
  close: ico('<path d="M6 6l12 12M18 6L6 18"/>'),
  prev: ico('<path d="M15 5l-7 7 7 7"/>'),
  next: ico('<path d="M9 5l7 7-7 7"/>'),
  star: ico('<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>', 'ui-fill'),
} as const;
