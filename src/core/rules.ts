import type { MatchMode } from '../config';
import {
  applyBet,
  legalActions as legalBetMoves,
  startBetting,
  STREETS,
  type BetMove,
  type Street,
} from './betting';
import { newDeck } from './cards';
import { IllegalActionError } from './errors';
import {
  other,
  type Action,
  type GameEvent,
  type GameState,
  type PlayerView,
  type RoundResult,
  type Seat,
  type ShowdownResult,
} from './gameState';
import { compareHands, evaluate7, handRank } from './handEvaluator';
import { pullLever, setupLevers } from './levers';
import { matchWinner, winsNeeded } from './match';
import { Rng } from './rng';

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}

const REVEAL_AFTER = [3, 4, 5] as const; // flop, turn, river

export function createMatch(opts: { mode: MatchMode; seed: number }): GameState {
  return {
    phase: 'deal',
    mode: opts.mode,
    rngState: opts.seed | 0,
    round: 0,
    wins: [0, 0],
    draws: 0,
    firstActor: 0,
    holes: [[], []],
    board: [],
    revealed: 0,
    betting: null,
    challenge: null,
    showdown: null,
    lastResult: null,
  };
}

/**
 * The only way to advance the game. Pure: returns a new state plus the events to animate,
 * in order. Throws IllegalActionError for anything not offered by availableActions.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
  const rng = new Rng(state.rngState);
  const events: GameEvent[] = [];
  let next: GameState;

  switch (action.type) {
    case 'deal':
      next = deal(state, rng, events);
      break;
    case 'bet':
      next = bet(state, action.seat, action.move, rng, events);
      break;
    case 'pull':
      next = pull(state, action.seat, action.lever, events);
      break;
  }

  return { state: { ...next, rngState: rng.state }, events };
}

// RNG draw order is part of the contract: first actor, then the deck. Changing it changes
// every seeded game, so do it on purpose and update the snapshot test.
function deal(state: GameState, rng: Rng, events: GameEvent[]): GameState {
  if (state.phase !== 'deal' && state.phase !== 'roundResult') {
    throw new IllegalActionError(`Cannot deal during ${state.phase}`);
  }
  const firstActor: Seat = rng.int(2) === 0 ? 0 : 1;
  const deck = rng.shuffle(newDeck());
  const holes: [number[], number[]] = [deck.slice(0, 2), deck.slice(2, 4)];
  const round = state.round + 1;

  events.push({ type: 'roundStarted', round, firstActor });
  events.push({ type: 'holeCardsDealt', holes });

  return {
    ...state,
    phase: 'betting',
    round,
    firstActor,
    holes,
    board: deck.slice(4, 9),
    revealed: 0,
    betting: startBetting(firstActor),
    challenge: null,
    showdown: null,
    lastResult: null,
  };
}

function bet(
  state: GameState,
  seat: Seat,
  move: BetMove,
  rng: Rng,
  events: GameEvent[],
): GameState {
  if (state.phase !== 'betting' || !state.betting) {
    throw new IllegalActionError(`Cannot bet during ${state.phase}`);
  }
  const outcome = applyBet(state.betting, seat, move, state.firstActor);
  events.push({ type: 'betPlaced', seat, move, level: outcome.betting.level });

  switch (outcome.kind) {
    case 'continue':
      return { ...state, betting: outcome.betting };
    case 'nextStreet':
      return revealNext({ ...state, betting: outcome.betting }, events);
    case 'runout': {
      let s: GameState = { ...state, betting: outcome.betting };
      while (s.revealed < 5) s = revealNext(s, events);
      return showdown(s, rng, events);
    }
    case 'showdown':
      return showdown({ ...state, betting: outcome.betting }, rng, events);
    case 'fold':
      // No showdown on a fold, so the folder's opponent never shows their cards.
      events.push({ type: 'folded', seat, pulls: outcome.pulls });
      return startChallenge(state, outcome.loser, outcome.pulls, rng, events);
  }
}

function revealNext(state: GameState, events: GameEvent[]): GameState {
  const step = REVEAL_AFTER.findIndex((n) => n > state.revealed);
  const revealed = REVEAL_AFTER[step] as 3 | 4 | 5;
  events.push({
    type: 'streetRevealed',
    street: STREETS[step + 1] as Street,
    cards: state.board.slice(state.revealed, revealed),
  });
  return { ...state, revealed };
}

function showdown(state: GameState, rng: Rng, events: GameEvent[]): GameState {
  const values: [number, number] = [
    evaluate7([...state.holes[0], ...state.board]),
    evaluate7([...state.holes[1], ...state.board]),
  ];
  const cmp = compareHands(values[0], values[1]);
  const winner: Seat | null = cmp > 0 ? 0 : cmp < 0 ? 1 : null;
  const result: ShowdownResult = {
    values,
    ranks: [handRank(values[0]), handRank(values[1])],
    winner,
  };
  events.push({ type: 'showdown', holes: state.holes, ...result });
  const shown: GameState = { ...state, showdown: result };

  if (winner === null) return endRound(shown, { kind: 'draw', reason: 'pokerTie' }, events);
  return startChallenge(shown, other(winner), shown.betting?.level ?? 1, rng, events);
}

// RNG draw order: Danger count, then lever positions (inside setupLevers).
function startChallenge(
  state: GameState,
  loser: Seat,
  pulls: number,
  rng: Rng,
  events: GameEvent[],
): GameState {
  events.push({ type: 'challengeStarted', loser, pulls });
  return {
    ...state,
    phase: 'challenge',
    challenge: { loser, pulls, pulledCount: 0, board: setupLevers(rng) },
  };
}

function pull(state: GameState, seat: Seat, lever: number, events: GameEvent[]): GameState {
  const challenge = state.challenge;
  if (state.phase !== 'challenge' || !challenge) {
    throw new IllegalActionError(`Cannot pull a lever during ${state.phase}`);
  }
  if (seat !== challenge.loser) throw new IllegalActionError(`Seat ${seat} lost no poker hand`);

  const { board, danger } = pullLever(challenge.board, lever);
  const pulledCount = challenge.pulledCount + 1;
  events.push({ type: 'leverPulled', seat, lever, danger });
  const next: GameState = { ...state, challenge: { ...challenge, board, pulledCount } };

  if (danger) return endRound(next, { kind: 'win', winner: other(seat), reason: 'danger' }, events);
  if (pulledCount >= challenge.pulls) {
    return endRound(next, { kind: 'draw', reason: 'allSafe' }, events);
  }
  return next;
}

function endRound(state: GameState, result: RoundResult, events: GameEvent[]): GameState {
  const wins: [number, number] = [...state.wins];
  let draws = state.draws;
  if (result.kind === 'win') wins[result.winner]++;
  else draws++;

  events.push({ type: 'roundEnded', result, wins, draws });
  const winner = matchWinner(wins, state.mode);
  if (winner !== null) events.push({ type: 'matchEnded', winner, wins, draws });

  return {
    ...state,
    phase: winner === null ? 'roundResult' : 'matchOver',
    wins,
    draws,
    lastResult: result,
  };
}

/** The seat that must act now, or null when the next step is a deal or the match is over. */
export function currentActor(state: GameState): Seat | null {
  if (state.phase === 'betting' && state.betting) return state.betting.toAct;
  if (state.phase === 'challenge' && state.challenge) return state.challenge.loser;
  return null;
}

/** Every action applyAction accepts right now. Drives scripts, fuzz tests and baseline bots. */
export function availableActions(state: GameState): Action[] {
  switch (state.phase) {
    case 'deal':
    case 'roundResult':
      return [{ type: 'deal' }];
    case 'betting': {
      const betting = state.betting;
      if (!betting) return [];
      return legalBetMoves(betting).map((move) => ({ type: 'bet', seat: betting.toAct, move }));
    }
    case 'challenge': {
      const challenge = state.challenge;
      if (!challenge) return [];
      return challenge.board.pulled.flatMap((pulled, lever) =>
        pulled ? [] : [{ type: 'pull' as const, seat: challenge.loser, lever }],
      );
    }
    case 'matchOver':
      return [];
  }
}

export function viewFor(state: GameState, me: Seat): PlayerView {
  const { betting, challenge, showdown } = state;
  const opp = other(me);
  return {
    me,
    phase: state.phase,
    mode: state.mode,
    winsNeeded: winsNeeded(state.mode),
    wins: [...state.wins],
    draws: state.draws,
    round: state.round,
    firstActor: state.firstActor,
    hole: [...state.holes[me]],
    board: state.board.slice(0, state.revealed),
    betting: betting && {
      street: betting.street,
      level: betting.level,
      called: [...betting.called],
      raisesThisStreet: [...betting.raisesThisStreet],
      toAct: betting.toAct,
    },
    legal:
      state.phase === 'betting' && betting && betting.toAct === me ? legalBetMoves(betting) : [],
    challenge: challenge && {
      loser: challenge.loser,
      pulls: challenge.pulls,
      pulledCount: challenge.pulledCount,
      levers: challenge.board.pulled.map((pulled, i) =>
        pulled ? (challenge.board.danger[i] ? 'danger' : 'safe') : 'unknown',
      ),
    },
    showdown: showdown && {
      opponentHole: [...state.holes[opp]],
      myRank: showdown.ranks[me],
      opponentRank: showdown.ranks[opp],
      winner: showdown.winner,
    },
    lastResult: state.lastResult,
  };
}
