import { describe, expect, it } from 'vitest';
import type { Seat } from '../../src/core/gameState';
import { applyAction, createMatch, currentActor, viewFor } from '../../src/core/rules';
import { createRandomBot } from '../../src/ai/baselineBots';

/** Runs a full match between two random bots, recording each decision. */
function botMatch(seed: number): string[] {
  const bots = [createRandomBot(seed + 1), createRandomBot(seed + 2)];
  let state = createMatch({ mode: 'bo5', seed });
  const log: string[] = [];
  while (state.phase !== 'matchOver') {
    const seat: Seat | null = currentActor(state);
    if (seat === null) {
      state = applyAction(state, { type: 'deal' }).state;
      continue;
    }
    const view = viewFor(state, seat);
    if (state.phase === 'betting') {
      const { move } = bots[seat]!.chooseBet(view);
      expect(view.legal).toContain(move);
      log.push(`${seat}:${move}`);
      state = applyAction(state, { type: 'bet', seat, move }).state;
    } else {
      const { lever } = bots[seat]!.chooseLever(view);
      expect(view.challenge?.levers[lever]).toBe('unknown');
      log.push(`${seat}:L${lever}`);
      state = applyAction(state, { type: 'pull', seat, lever }).state;
    }
  }
  return log;
}

describe('createRandomBot', () => {
  it('only makes legal moves and pulls unknown levers through whole matches', () => {
    for (let seed = 1; seed <= 30; seed++) botMatch(seed);
  });

  it('decides the same way from the same seed', () => {
    expect(botMatch(5)).toEqual(botMatch(5));
  });
});
