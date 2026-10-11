import { createRandomBot } from '../ai/baselineBots';
import type { Bot } from '../ai/types';
import type { MatchMode } from '../config';
import type { BetMove } from '../core/betting';
import { IllegalActionError } from '../core/errors';
import type { Action, GameEvent, GameState, PlayerView, Seat } from '../core/gameState';
import { applyAction, createMatch, currentActor, viewFor } from '../core/rules';

export const HUMAN: Seat = 0;
export const BOT: Seat = 1;

/** Who moves next: the table deals, the human acts, the bot acts, or the match is over. */
export type Turn = 'deal' | 'human' | 'bot' | 'over';

export interface SessionOptions {
  mode: MatchMode;
  seed: number;
  /** Defaults to the random baseline bot seeded from the match seed. */
  bot?: Bot;
}

/**
 * Holds one match and routes every move through applyAction. The UI reads only `view`
 * (the human's PlayerView) and animates the returned events.
 */
export class MatchSession {
  readonly mode: MatchMode;
  readonly seed: number;
  private state: GameState;
  private readonly bot: Bot;

  constructor(opts: SessionOptions) {
    this.mode = opts.mode;
    this.seed = opts.seed;
    this.state = createMatch({ mode: opts.mode, seed: opts.seed });
    this.bot = opts.bot ?? createRandomBot(opts.seed + 1);
  }

  get view(): PlayerView {
    return viewFor(this.state, HUMAN);
  }

  get turn(): Turn {
    if (this.state.phase === 'matchOver') return 'over';
    const actor = currentActor(this.state);
    if (actor === null) return 'deal';
    return actor === HUMAN ? 'human' : 'bot';
  }

  deal(): GameEvent[] {
    this.expectTurn('deal');
    return this.apply({ type: 'deal' });
  }

  humanBet(move: BetMove): GameEvent[] {
    this.expectTurn('human');
    return this.apply({ type: 'bet', seat: HUMAN, move });
  }

  humanPull(lever: number): GameEvent[] {
    this.expectTurn('human');
    return this.apply({ type: 'pull', seat: HUMAN, lever });
  }

  /** The bot sees only its own filtered view; its move is still checked by applyAction. */
  botAct(): GameEvent[] {
    this.expectTurn('bot');
    const view = viewFor(this.state, BOT);
    if (this.state.phase === 'betting') {
      return this.apply({ type: 'bet', seat: BOT, move: this.bot.chooseBet(view).move });
    }
    return this.apply({ type: 'pull', seat: BOT, lever: this.bot.chooseLever(view).lever });
  }

  private expectTurn(turn: Turn): void {
    if (this.turn !== turn) {
      throw new IllegalActionError(`Expected the ${turn} turn, but it is the ${this.turn} turn`);
    }
  }

  // applyAction throws before returning on an illegal move, so state never half-updates.
  private apply(action: Action): GameEvent[] {
    const { state, events } = applyAction(this.state, action);
    this.state = state;
    return events;
  }
}
