import type { BetMove } from '../core/betting';
import type { PlayerView } from '../core/gameState';

/** What the bot's speech bubble should convey; the UI picks the actual line via t(). */
export type TalkLabel = 'strong' | 'weak' | 'neutral';

/** Why a bot bet the way it did: for debug logs and the balance report, never for play. */
export interface BotTrace {
  equity: number;
  fear: number;
  /** Lever-loss risks compared when facing a raise; null when checking was free. */
  riskFold: number | null;
  riskGo: number | null;
  /** The move was a planned bluff raise or all-in rather than a threshold call. */
  bluffed: boolean;
  /** The speech label was reversed on purpose; null when the bot said nothing. */
  lied: boolean | null;
}

export interface BetChoice {
  move: BetMove;
  talk?: TalkLabel;
  trace?: BotTrace;
}

/** Bots only ever see a PlayerView, never the full GameState. */
export interface Bot {
  chooseBet(view: PlayerView): BetChoice;
  chooseLever(view: PlayerView): { lever: number; talk?: TalkLabel };
}
