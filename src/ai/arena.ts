import type { MatchMode } from '../config';
import type { GameEvent, GameState, PlayerView, Seat } from '../core/gameState';
import { applyAction, createMatch, currentActor, viewFor } from '../core/rules';
import type { BetChoice, Bot } from './types';

export interface ArenaHooks {
  onBet?(seat: Seat, view: PlayerView, choice: BetChoice): void;
  onPull?(seat: Seat, view: PlayerView, lever: number): void;
  onEvent?(event: GameEvent, state: GameState): void;
}

/**
 * Plays one whole match between two bots, each seeing only its own PlayerView, and returns the
 * final state. Used by the balance script, the sim and bot tests.
 */
export function playMatch(
  bots: readonly [Bot, Bot],
  opts: { mode: MatchMode; seed: number },
  hooks: ArenaHooks = {},
): GameState {
  let state = createMatch(opts);
  while (state.phase !== 'matchOver') {
    const seat = currentActor(state);
    let result;
    if (seat === null) {
      result = applyAction(state, { type: 'deal' });
    } else if (state.phase === 'betting') {
      const view = viewFor(state, seat);
      const choice = bots[seat].chooseBet(view);
      hooks.onBet?.(seat, view, choice);
      result = applyAction(state, { type: 'bet', seat, move: choice.move });
    } else {
      const view = viewFor(state, seat);
      const { lever } = bots[seat].chooseLever(view);
      hooks.onPull?.(seat, view, lever);
      result = applyAction(state, { type: 'pull', seat, lever });
    }
    state = result.state;
    for (const event of result.events) hooks.onEvent?.(event, state);
  }
  return state;
}
