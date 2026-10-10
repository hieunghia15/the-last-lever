import { BETTING } from '../config';
import { IllegalActionError } from './errors';
import { other, type Seat } from './gameState';

export const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
export type Street = (typeof STREETS)[number];

/** Xem bài, Tăng, Theo, Bỏ, Tất tay — in action-bar order. */
export const BET_MOVES = ['check', 'raise', 'call', 'fold', 'allIn'] as const;
export type BetMove = (typeof BET_MOVES)[number];

export interface BettingState {
  street: Street;
  /** The shared stake: how many levers the poker loser pulls. */
  level: number;
  /** The level each seat has matched so far. */
  called: [number, number];
  raisesThisStreet: [number, number];
  actedThisStreet: [boolean, boolean];
  toAct: Seat;
}

export type BetOutcome =
  | { kind: 'continue'; betting: BettingState }
  | { kind: 'nextStreet'; betting: BettingState }
  /** Both seats matched the max level before the river: nothing left to bet, deal out and show. */
  | { kind: 'runout'; betting: BettingState }
  | { kind: 'showdown'; betting: BettingState }
  | { kind: 'fold'; betting: BettingState; loser: Seat; pulls: number };

export function startBetting(firstActor: Seat): BettingState {
  return {
    street: 'preflop',
    level: BETTING.startLevel,
    called: [BETTING.startLevel, BETTING.startLevel],
    raisesThisStreet: [0, 0],
    actedThisStreet: [false, false],
    toAct: firstActor,
  };
}

export function legalActions(betting: BettingState): BetMove[] {
  const p = betting.toAct;
  const facing = betting.called[p] < betting.level;
  const canRaise =
    betting.raisesThisStreet[p] < BETTING.maxRaisesPerPlayerPerStreet &&
    betting.level < BETTING.maxLevel;
  return BET_MOVES.filter((move) => {
    switch (move) {
      case 'check':
        return !facing;
      case 'call':
        return facing;
      case 'raise':
      case 'allIn':
        return canRaise;
      case 'fold':
        return true;
    }
  });
}

/** Levers the seat pulls if it folds now: the level it already matched, not the raised one. */
export const foldPulls = (betting: Pick<BettingState, 'called'>, seat: Seat): number =>
  Math.max(betting.called[seat], BETTING.minPullOnFold);

export function applyBet(
  betting: BettingState,
  seat: Seat,
  move: BetMove,
  firstActor: Seat,
): BetOutcome {
  if (seat !== betting.toAct) throw new IllegalActionError(`Not seat ${seat}'s turn`);
  if (!legalActions(betting).includes(move)) {
    throw new IllegalActionError(`"${move}" is not legal for seat ${seat} now`);
  }

  if (move === 'fold') {
    return { kind: 'fold', betting, loser: seat, pulls: foldPulls(betting, seat) };
  }

  let level = betting.level;
  if (move === 'raise') level = Math.min(level + BETTING.raiseStep, BETTING.maxLevel);
  if (move === 'allIn') level = BETTING.maxLevel;

  const called: [number, number] = [...betting.called];
  called[seat] = level;
  const raisesThisStreet: [number, number] = [...betting.raisesThisStreet];
  if (move === 'raise' || move === 'allIn') raisesThisStreet[seat]++;
  const actedThisStreet: [boolean, boolean] = [...betting.actedThisStreet];
  actedThisStreet[seat] = true;

  const next: BettingState = {
    ...betting,
    level,
    called,
    raisesThisStreet,
    actedThisStreet,
    toAct: other(seat),
  };

  const streetOver =
    actedThisStreet[0] && actedThisStreet[1] && called[0] === level && called[1] === level;
  if (!streetOver) return { kind: 'continue', betting: next };
  if (next.street === 'river') return { kind: 'showdown', betting: next };
  if (level >= BETTING.maxLevel) return { kind: 'runout', betting: next };

  const street = STREETS[STREETS.indexOf(next.street) + 1] as Street;
  return {
    kind: 'nextStreet',
    betting: {
      ...next,
      street,
      raisesThisStreet: [0, 0],
      actedThisStreet: [false, false],
      toAct: firstActor,
    },
  };
}
