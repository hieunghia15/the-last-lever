import type { PlayerView } from '../core/gameState';
import { Rng } from '../core/rng';
import type { Bot } from './types';

function unknownLevers(view: PlayerView): number[] {
  const levers = view.challenge?.levers ?? [];
  return levers.flatMap((state, i) => (state === 'unknown' ? [i] : []));
}

/** Picks uniformly among legal moves and unpulled levers. Baseline for sims and balance runs. */
export function createRandomBot(seed: number): Bot {
  const rng = new Rng(seed);
  return {
    chooseBet: (view) => {
      if (view.legal.length === 0) throw new Error('Random bot asked to bet out of turn');
      return { move: rng.pick(view.legal) };
    },
    chooseLever: (view) => ({ lever: rng.pick(unknownLevers(view)) }),
  };
}
