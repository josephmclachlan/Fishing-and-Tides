/** The craft the PADDLE page and map are judged for (kayak or stand-up paddleboard), kept on this device. */
import { isPaddleCraft, type PaddleCraft } from './physics/paddle';

export const CRAFT_KEY = 'ft.paddle.craft';
type Store = Pick<Storage, 'getItem' | 'setItem'> | undefined;

export function loadCraft(storage: Store): PaddleCraft {
  try {
    const v = storage?.getItem(CRAFT_KEY);
    return isPaddleCraft(v) ? v : 'kayak';
  } catch {
    return 'kayak';
  }
}
export function saveCraft(storage: Store, c: PaddleCraft) {
  try {
    storage?.setItem(CRAFT_KEY, c);
  } catch {
    /* private mode */
  }
}
