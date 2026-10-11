import { EQUITY } from '../config';
import { newDeck, type Card } from '../core/cards';
import { evaluate7 } from '../core/handEvaluator';
import type { Rng } from '../core/rng';

const BOARD_SIZE = 5;
const HOLE_SIZE = 2;

/**
 * Share of the showdowns `hole` wins against one random hand, ties counting half.
 * Monte Carlo over the opponent's cards and the community cards still to come.
 */
export function estimateEquity(
  hole: readonly Card[],
  board: readonly Card[],
  rng: Rng,
  trials: number = EQUITY.trials,
): number {
  if (trials <= 0) return 0;
  const known = new Set([...hole, ...board]);
  const deck = newDeck().filter((card) => !known.has(card));
  const missing = BOARD_SIZE - board.length;
  const draw = HOLE_SIZE + missing;

  // Both 7-card hands share the board, so fill the known part once and the rest per trial.
  const mine: Card[] = [...hole, ...board];
  const theirs: Card[] = [0, 0, ...board];
  let score = 0;
  for (let trial = 0; trial < trials; trial++) {
    // Partial Fisher-Yates: only the first `draw` slots need to be random.
    for (let i = 0; i < draw; i++) {
      const j = i + rng.int(deck.length - i);
      const tmp = deck[i]!;
      deck[i] = deck[j]!;
      deck[j] = tmp;
    }
    theirs[0] = deck[0]!;
    theirs[1] = deck[1]!;
    for (let i = 0; i < missing; i++) {
      const card = deck[HOLE_SIZE + i]!;
      mine[hole.length + board.length + i] = card;
      theirs[HOLE_SIZE + board.length + i] = card;
    }
    const me = evaluate7(mine);
    const them = evaluate7(theirs);
    score += me > them ? 1 : me === them ? 0.5 : 0;
  }
  return score / trials;
}
