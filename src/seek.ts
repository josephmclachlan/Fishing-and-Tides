/** Target picker (PLAN 1.7): spot tabs plus a search box for a beach name or coordinate. */
import { SPOTS } from './region';
import { resolveTarget, type Target } from './target';

export function mountSeek(root: HTMLElement, onTarget: (t: Target) => void) {
  const el = document.createElement('section');
  el.className = 'panel seek';
  el.innerHTML = `
    <form class="seek-row" autocomplete="off">
      <input class="seek-in" name="q" list="seek-spots" spellcheck="false" enterkeyhint="go"
        placeholder="BEACH OR LAT, LON" aria-label="Find a beach or coordinate" />
      <button class="btn seek-go" type="submit">ENHANCE</button>
    </form>
    <datalist id="seek-spots">${SPOTS.map((s) => `<option value="${s.name}"></option>`).join('')}</datalist>
    <div class="seek-msg" role="status"></div>
    <div class="seek-tabs" role="list">${SPOTS.map((s, i) => `<button type="button" class="tab" role="listitem" data-i="${i}">${s.name}</button>`).join('')}</div>`;
  root.appendChild(el);

  const input = el.querySelector<HTMLInputElement>('.seek-in')!;
  const msg = el.querySelector<HTMLElement>('.seek-msg')!;
  const tabs = [...el.querySelectorAll<HTMLButtonElement>('.tab')];

  const pick = (t: Target) => {
    msg.textContent = '';
    tabs.forEach((b) => b.classList.toggle('on', SPOTS[Number(b.dataset.i)].name === t.name));
    input.blur(); // drop the phone keyboard so the map is visible
    onTarget(t);
  };

  el.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = resolveTarget(input.value);
    if (t) pick(t);
    else msg.textContent = 'NO MATCH: TRY A BEACH OR 9.65, -82.75';
  });
  for (const b of tabs) b.addEventListener('click', () => pick(SPOTS[Number(b.dataset.i)]));
}
