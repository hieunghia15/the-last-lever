import type { MatchMode } from '../config';
import type { BetMove, BettingState, Street } from './betting';
import type { Card } from './cards';
import type { HandRank, HandValue } from './handEvaluator';
import type { LeverBoard } from './levers';

// The core knows two seats, not "human" and "bot": scenes and scripts decide who sits where.
export type Seat = 0 | 1;

export const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

export type Phase = 'deal' | 'betting' | 'challenge' | 'roundResult' | 'matchOver';

export type Action =
  | { type: 'deal' }
  | { type: 'bet'; seat: Seat; move: BetMove }
  | { type: 'pull'; seat: Seat; lever: number };

export interface ChallengeState {
  loser: Seat;
  pulls: number;
  pulledCount: number;
  board: LeverBoard;
}

export type RoundResult =
  | { kind: 'win'; winner: Seat; reason: 'danger' }
  | { kind: 'draw'; reason: 'pokerTie' | 'allSafe' };

export interface ShowdownResult {
  values: [HandValue, HandValue];
  ranks: [HandRank, HandRank];
  winner: Seat | null;
}

/** Plain data only (no classes, Maps or functions) so it survives structuredClone and JSON. */
export interface GameState {
  phase: Phase;
  mode: MatchMode;
  rngState: number;
  round: number;
  wins: [number, number];
  /** Poker ties and all-Safe challenges share one counter. */
  draws: number;
  /** Random every round; opens all four streets. */
  firstActor: Seat;
  holes: [Card[], Card[]];
  /** All five community cards are dealt up front and shown as `revealed` grows. */
  board: Card[];
  revealed: 0 | 3 | 4 | 5;
  /** Kept through the challenge so the stake stays visible; reset on the next deal. */
  betting: BettingState | null;
  challenge: ChallengeState | null;
  showdown: ShowdownResult | null;
  lastResult: RoundResult | null;
}

export type GameEvent =
  | { type: 'roundStarted'; round: number; firstActor: Seat }
  | { type: 'holeCardsDealt'; holes: [Card[], Card[]] }
  | { type: 'betPlaced'; seat: Seat; move: BetMove; level: number }
  | { type: 'streetRevealed'; street: Street; cards: Card[] }
  | ({ type: 'showdown'; holes: [Card[], Card[]] } & ShowdownResult)
  | { type: 'folded'; seat: Seat; pulls: number }
  | { type: 'challengeStarted'; loser: Seat; pulls: number }
  | { type: 'leverPulled'; seat: Seat; lever: number; danger: boolean }
  | { type: 'roundEnded'; result: RoundResult; wins: [number, number]; draws: number }
  | { type: 'matchEnded'; winner: Seat; wins: [number, number]; draws: number };

export type LeverView = 'unknown' | 'safe' | 'danger';

/**
 * Everything one seat may know. A separate type (not Partial<GameState>) so hidden fields
 * cannot leak in by accident. Bots only ever receive this.
 */
export interface PlayerView {
  me: Seat;
  phase: Phase;
  mode: MatchMode;
  winsNeeded: number;
  wins: [number, number];
  draws: number;
  round: number;
  firstActor: Seat;
  hole: Card[];
  board: Card[];
  betting: {
    street: Street;
    level: number;
    called: [number, number];
    raisesThisStreet: [number, number];
    toAct: Seat;
  } | null;
  /** Bet moves this seat may make right now; empty when it is not this seat's turn. */
  legal: BetMove[];
  challenge: {
    loser: Seat;
    pulls: number;
    pulledCount: number;
    levers: LeverView[];
  } | null;
  /** Present only after a showdown. */
  showdown: {
    opponentHole: Card[];
    myRank: HandRank;
    opponentRank: HandRank;
    winner: Seat | null;
  } | null;
  lastResult: RoundResult | null;
}
