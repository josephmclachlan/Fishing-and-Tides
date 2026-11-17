/**
 * Which full-screen pages cover the map (body class `fc-open`). Each page says when it opens and closes; the class
 * stays while any page is still open. Before this, each page added and removed the class itself, so opening the
 * species guide from the forecast page went: the guide adds it, then the forecast (closing a moment later) removes
 * it, and the app took the map as showing and put its "Opening the map" loader over the guide (Joseph 2026-11-17).
 */
const open = new Set<string>();

export function setCover(page: string, on: boolean): void {
  if (on) open.add(page);
  else open.delete(page);
  document.body.classList.toggle('fc-open', open.size > 0);
}
