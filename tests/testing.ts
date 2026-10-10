// Helpers for tests only. Game code under src/ may not import from tests/ (enforced by ESLint).
// State is plain data, so tests may set up a situation by overwriting fields (cards, levers)
// instead of hunting for a seed that happens to deal them.
import { parseCards, type Card } from '../src/core/cards';
import type { Action, GameEvent, GameState, Seat } from '../src/core/gameState';
import { applyAction } from '../src/core/rules';

/** cards('As Kd 7h') */
export const cards = (text: string): Card[] => parseCards(text);

/** True on CI, where timing assertions are skipped. src/ has no Node typings, hence the cast. */
export const isCI = Boolean(
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.CI,
);

/** Freezes recursively so any mutation of an input throws (ES modules run in strict mode). */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/** Overrides dealt cards after a deal, e.g. withCards(s, { hole0: 'As Ad', board: '...' }). */
export function withCards(
  state: GameState,
  opts: { hole0?: string; hole1?: string; board?: string },
): GameState {
  return {
    ...state,
    holes: [
      opts.hole0 ? cards(opts.hole0) : state.holes[0],
      opts.hole1 ? cards(opts.hole1) : state.holes[1],
    ],
    board: opts.board ? cards(opts.board) : state.board,
  };
}

/** Overrides who opens every street of the current round. */
export function withFirstActor(state: GameState, firstActor: Seat): GameState {
  if (!state.betting) throw new Error('withFirstActor() needs a dealt round');
  return { ...state, firstActor, betting: { ...state.betting, toAct: firstActor } };
}

/** Overrides the hidden levers once a challenge started, e.g. withLevers(s, 'SSDSSD'). */
export function withLevers(state: GameState, pattern: string): GameState {
  if (!state.challenge) throw new Error('withLevers() needs an active challenge');
  return {
    ...state,
    challenge: {
      ...state.challenge,
      board: { ...state.challenge.board, danger: [...pattern].map((c) => c === 'D') },
    },
  };
}

/** Applies actions in order and collects every event. */
export function play(
  state: GameState,
  ...actions: Action[]
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let current = state;
  for (const action of actions) {
    const result = applyAction(current, action);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}
