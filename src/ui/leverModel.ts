import type { LeverView } from '../core/gameState';
import type { Rng } from '../core/rng';

/**
 * The levers the bot's hand drifts over before it pulls `target`, ending on `target`. The bot
 * has already chosen, so this is only acting; it never looks at whether a lever is Danger.
 * Only unpulled levers, never the same one twice in a row, and at most one hover per other
 * unpulled lever, so a nearly empty board does not drag on.
 */
export function hesitationPath(
  levers: readonly LeverView[],
  target: number,
  rng: Rng,
  hovers: { min: number; max: number },
): number[] {
  const open = levers.flatMap((state, i) => (state === 'unknown' ? [i] : []));
  if (!open.includes(target)) throw new RangeError(`Lever ${target} is not open`);
  const count = Math.min(rng.range(hovers.min, hovers.max), open.length - 1);
  const path: number[] = [];
  let previous = -1;
  for (let i = 0; i < count; i++) {
    const last = i === count - 1;
    const choices = open.filter((lever) => lever !== previous && !(last && lever === target));
    if (choices.length === 0) break;
    previous = rng.pick(choices);
    path.push(previous);
  }
  path.push(target);
  return path;
}
