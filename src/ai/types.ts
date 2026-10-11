import type { BetMove } from '../core/betting';
import type { PlayerView } from '../core/gameState';

/** What the bot's speech bubble should convey; the UI picks the actual line via t(). */
export type TalkLabel = 'strong' | 'weak' | 'neutral';

/** Bots only ever see a PlayerView, never the full GameState. */
export interface Bot {
  chooseBet(view: PlayerView): { move: BetMove; talk?: TalkLabel };
  chooseLever(view: PlayerView): { lever: number; talk?: TalkLabel };
}
