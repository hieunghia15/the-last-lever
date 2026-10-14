import { BETTING, BOT, EQUITY, type PersonalityId } from '../config';
import { foldPulls, STREETS, type BetMove } from '../core/betting';
import type { PlayerView } from '../core/gameState';
import { dangerProbability } from '../core/levers';
import { Rng } from '../core/rng';
import { unknownLevers } from './baselineBots';
import { estimateEquity } from './equity';
import { fearFactor, personality, type Personality } from './personalities';
import type { Bot, BotTrace, TalkLabel } from './types';

/** A planned bluff for the current round: force one raise or all-in regardless of equity. */
export type Bluff = 'none' | 'raise' | 'allIn';

export interface DecisionContext {
  equity: number;
  fear: number;
  personality: Personality;
  bluff: Bluff;
}

export interface Decision {
  move: BetMove;
  trace: Omit<BotTrace, 'lied'>;
}

/**
 * m_final (decision #6): the stake after calling, plus half a level for each betting street
 * still to come, rounded up and capped at the max level.
 */
export function finalLevel(view: PlayerView): number {
  const betting = expectBetting(view);
  const remaining = STREETS.length - 1 - STREETS.indexOf(betting.street);
  return Math.min(BETTING.maxLevel, Math.ceil(betting.level + 0.5 * remaining));
}

/**
 * The pure part of the bot: no randomness, no simulation. Checking is free, so the bot never
 * folds when it may check; the risk formula only decides between calling and folding.
 */
export function decideBet(view: PlayerView, ctx: DecisionContext): Decision {
  const betting = expectBetting(view);
  const { equity, fear, personality: p } = ctx;
  const can = (move: BetMove) => view.legal.includes(move);

  let move: BetMove;
  let riskFold: number | null = null;
  let riskGo: number | null = null;
  let bluffed = false;

  if (can('check')) {
    if (can('allIn') && (equity > p.allInAt || ctx.bluff === 'allIn')) {
      move = 'allIn';
      bluffed = equity <= p.allInAt;
    } else if (can('raise') && (equity > p.raiseAt || ctx.bluff === 'raise')) {
      move = 'raise';
      bluffed = equity <= p.raiseAt;
    } else {
      move = 'check';
    }
  } else {
    riskFold = dangerProbability(foldPulls(betting, view.me));
    riskGo = (1 - equity) * dangerProbability(finalLevel(view)) * fear;
    if (riskGo >= riskFold) move = 'fold';
    else if (can('allIn') && equity > p.allInAt) move = 'allIn';
    else if (can('raise') && equity > p.raiseAt) move = 'raise';
    else move = 'call';
  }

  if (!can(move)) throw new Error(`Bot picked "${move}", which is not legal here`);
  return { move, trace: { equity, fear, riskFold, riskGo, bluffed } };
}

/** The honest label for a hand: what the bot would say if it never lied. */
export function honestTalk(equity: number): TalkLabel {
  if (equity >= BOT.talkStrongAt) return 'strong';
  if (equity < BOT.talkWeakAt) return 'weak';
  return 'neutral';
}

function lie(label: TalkLabel, rng: Rng): TalkLabel {
  if (label === 'strong') return 'weak';
  if (label === 'weak') return 'strong';
  return rng.next() < 0.5 ? 'strong' : 'weak';
}

export interface BotOptions {
  personality: PersonalityId;
  seed: number;
  /** Monte Carlo trials per equity estimate; the balance script lowers it for quick runs. */
  trials?: number;
  /** Replaces some personality numbers, so the balance script can try values before config. */
  overrides?: Partial<Personality>;
}

/**
 * A personality bot. It owns a seeded Rng separate from the deal, so how often it simulates
 * never changes the cards, and the same seed always plays the same way.
 */
export function createBot(opts: BotOptions): Bot {
  const rng = new Rng(opts.seed);
  const p: Personality = { ...personality(opts.personality), ...opts.overrides };
  const trials = opts.trials ?? EQUITY.trials;
  // The bot often decides twice on one street (raised back), so it reuses the estimate:
  // cheaper, and it keeps the bot consistent with itself.
  const equityCache = new Map<string, number>();
  let round = -1;
  let bluff: Bluff = 'none';

  function startRound(view: PlayerView): void {
    if (view.round === round) return;
    round = view.round;
    equityCache.clear();
    // One draw per round decides whether this is a bluff round.
    const roll = rng.next();
    if (roll < p.bluffAllIn) bluff = 'allIn';
    else if (roll < p.bluffAllIn + p.bluffRaise) bluff = 'raise';
    else bluff = 'none';
  }

  function equityFor(view: PlayerView): number {
    const key = [...view.hole, ...view.board].join(',');
    let equity = equityCache.get(key);
    if (equity === undefined) {
      equity = estimateEquity(view.hole, view.board, rng, trials);
      equityCache.set(key, equity);
    }
    return equity;
  }

  return {
    chooseBet(view) {
      startRound(view);
      const equity = equityFor(view);
      const decision = decideBet(view, {
        equity,
        fear: fearFactor(p, view),
        personality: p,
        bluff,
      });
      // A bluff forces only the first raise it gets; after that the bot plays it straight.
      if (decision.trace.bluffed) bluff = 'none';

      if (rng.next() >= BOT.talkChance) {
        return { move: decision.move, trace: { ...decision.trace, lied: null } };
      }
      const lied = rng.next() < p.lieRate;
      const honest = honestTalk(equity);
      return {
        move: decision.move,
        talk: lied ? lie(honest, rng) : honest,
        trace: { ...decision.trace, lied },
      };
    },
    chooseLever(view) {
      return { lever: rng.pick(unknownLevers(view)) };
    },
  };
}

function expectBetting(view: PlayerView): NonNullable<PlayerView['betting']> {
  if (!view.betting || view.legal.length === 0) {
    throw new Error('Bot asked to bet when it is not its turn');
  }
  return view.betting;
}
