import { describe, expect, it } from 'vitest';
import { playMatch } from '../../src/ai/arena';
import { createRandomBot } from '../../src/ai/baselineBots';
import {
  createBot,
  decideBet,
  finalLevel,
  honestTalk,
  type Bluff,
  type DecisionContext,
} from '../../src/ai/botBrain';
import { personality } from '../../src/ai/personalities';
import type { BetChoice, Bot } from '../../src/ai/types';
import { BOT, PERSONALITIES, type PersonalityId } from '../../src/config';
import type { PlayerView } from '../../src/core/gameState';
import { dangerProbability } from '../../src/core/levers';
import { Rng } from '../../src/core/rng';
import { bettingView, type BettingSpot } from '../testing';

const ctx = (
  equity: number,
  opts: { id?: PersonalityId; fear?: number; bluff?: Bluff } = {},
): DecisionContext => {
  const p = personality(opts.id ?? 'balanced');
  return { equity, fear: opts.fear ?? p.fear, personality: p, bluff: opts.bluff ?? 'none' };
};

/** Facing a raise from 2 to 3 on the river: folding pulls 2, calling risks 3. */
const facingRiver: BettingSpot = { street: 'river', level: 3, called: [3, 2], raises: [1, 0] };

describe('finalLevel', () => {
  it('adds half a level per street still to come, rounded up', () => {
    expect(finalLevel(bettingView({ street: 'preflop', level: 1 }))).toBe(3);
    expect(finalLevel(bettingView({ street: 'flop', level: 2 }))).toBe(3);
    expect(finalLevel(bettingView({ street: 'turn', level: 2 }))).toBe(3);
    expect(finalLevel(bettingView({ street: 'river', level: 2 }))).toBe(2);
  });

  it('never goes past the max level', () => {
    expect(finalLevel(bettingView({ street: 'preflop', level: 5 }))).toBe(6);
    expect(finalLevel(bettingView({ street: 'flop', level: 6 }))).toBe(6);
  });
});

describe('decideBet', () => {
  it('never folds when it may check, even with no equity at all', () => {
    for (const id of PERSONALITIES) {
      for (const level of [1, 3, 6]) {
        const view = bettingView({ level });
        expect(view.legal).toContain('check');
        expect(decideBet(view, ctx(0, { id })).move).not.toBe('fold');
      }
    }
  });

  it('folds a weak hand and calls a fair one when raised', () => {
    const view = bettingView(facingRiver);
    expect(decideBet(view, ctx(0.05, { fear: 1 })).move).toBe('fold');
    expect(decideBet(view, ctx(0.4, { fear: 1 })).move).toBe('call');
  });

  it('weighs fold and play-on risk with L(m) and the fear factor', () => {
    const view = bettingView(facingRiver);
    const { trace } = decideBet(view, ctx(0.25, { fear: 1 }));
    expect(trace.riskFold).toBeCloseTo(dangerProbability(2));
    expect(trace.riskGo).toBeCloseTo(0.75 * dangerProbability(3));
    // 0.75 × 0.85 = 0.64 < L(2) ≈ 0.733 → call; × 1.3 = 0.83 → fold.
    expect(decideBet(view, ctx(0.25, { fear: 1 })).move).toBe('call');
    expect(decideBet(view, ctx(0.25, { fear: 1.3 })).move).toBe('fold');
  });

  it.each(PERSONALITIES)('raises and goes all-in past the %s thresholds', (id) => {
    const p = personality(id);
    const view = bettingView({ level: 2 });
    expect(decideBet(view, ctx(p.raiseAt - 0.01, { id })).move).toBe('check');
    expect(decideBet(view, ctx(p.raiseAt + 0.01, { id })).move).toBe('raise');
    expect(decideBet(view, ctx(p.allInAt + 0.01, { id })).move).toBe('allIn');
  });

  it('re-raises a raise only with a strong hand', () => {
    const view = bettingView({ street: 'flop', level: 2, called: [2, 1] });
    expect(decideBet(view, ctx(0.5)).move).toBe('call');
    expect(decideBet(view, ctx(0.7)).move).toBe('raise');
    expect(decideBet(view, ctx(0.95)).move).toBe('allIn');
  });

  it('cannot raise once the stake is at the top', () => {
    const view = bettingView({ level: 6 });
    expect(decideBet(view, ctx(1)).move).toBe('check');
  });

  it('forces a raise on a bluff round, but plays a re-raise straight', () => {
    const free = bettingView({ level: 1 });
    const raised = decideBet(free, ctx(0.1, { bluff: 'raise' }));
    expect(raised).toMatchObject({ move: 'raise', trace: { bluffed: true } });
    const shoved = decideBet(free, ctx(0.1, { bluff: 'allIn' }));
    expect(shoved).toMatchObject({ move: 'allIn', trace: { bluffed: true } });

    const facing = bettingView(facingRiver);
    expect(decideBet(facing, ctx(0.05, { bluff: 'allIn', fear: 1 })).move).toBe('fold');
  });

  it('does not count a strong raise as a bluff', () => {
    const decision = decideBet(bettingView(), ctx(0.7, { bluff: 'raise' }));
    expect(decision).toMatchObject({ move: 'raise', trace: { bluffed: false } });
  });

  it('always picks a legal move across random spots', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 2000; i++) {
      const level = rng.range(1, 6);
      const mine = rng.range(1, level);
      const spot: BettingSpot = {
        street: rng.pick(['preflop', 'flop', 'turn', 'river'] as const),
        level,
        called: [level, mine],
        raises: [rng.int(2), rng.int(2)],
      };
      const view = bettingView(spot);
      const bluff = rng.pick(['none', 'raise', 'allIn'] as const);
      const id = rng.pick(PERSONALITIES);
      const { move } = decideBet(view, ctx(rng.next(), { id, bluff, fear: 0.5 + rng.next() }));
      expect(view.legal).toContain(move);
    }
  });

  it('refuses to decide out of turn', () => {
    const view: PlayerView = { ...bettingView(), legal: [] };
    expect(() => decideBet(view, ctx(0.5))).toThrow();
  });
});

describe('honestTalk', () => {
  it('labels by equity', () => {
    expect(honestTalk(BOT.talkStrongAt)).toBe('strong');
    expect(honestTalk(BOT.talkWeakAt - 0.01)).toBe('weak');
    expect(honestTalk((BOT.talkStrongAt + BOT.talkWeakAt) / 2)).toBe('neutral');
  });
});

describe('createBot', () => {
  // Few trials keep the whole-match tests fast; the decisions stay legal either way.
  const bot = (id: PersonalityId, seed: number) => createBot({ personality: id, seed, trials: 40 });

  function record(id: PersonalityId, seeds: number, mode: 'bo3' | 'bo7' = 'bo3') {
    const choices: BetChoice[] = [];
    let rounds = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const final = playMatch(
        [bot(id, seed * 3), createRandomBot(seed * 5)],
        { mode, seed },
        {
          onBet: (seat, view, choice) => {
            if (seat !== 0) return;
            expect(view.legal).toContain(choice.move);
            choices.push(choice);
          },
          onPull: (seat, view, lever) => {
            if (seat === 0) expect(view.challenge?.levers[lever]).toBe('unknown');
          },
        },
      );
      rounds += final.round;
    }
    return { choices, rounds };
  }

  it.each(PERSONALITIES)('%s plays whole matches legally against a random bot', (id) => {
    expect(record(id, 30).choices.length).toBeGreaterThan(0);
  });

  it('decides the same way from the same seed', () => {
    const run = () => record('reckless', 5).choices.map((c) => `${c.move}/${c.talk ?? '-'}`);
    expect(run()).toEqual(run());
  });

  it('reads nothing outside its PlayerView', () => {
    const read = new Set<string>();
    const watch = <T extends object>(value: T, path: string): T =>
      new Proxy(value, {
        get(target, key, receiver) {
          if (typeof key === 'string') {
            if (!(key in target)) read.add(`${path}.${key} (missing)`);
            const inner: unknown = Reflect.get(target, key, receiver);
            return inner && typeof inner === 'object' ? watch(inner, `${path}.${key}`) : inner;
          }
          return Reflect.get(target, key, receiver) as unknown;
        },
      });
    const inner = bot('balanced', 9);
    const spy: Bot = {
      chooseBet: (view) => inner.chooseBet(watch(view, 'view')),
      chooseLever: (view) => inner.chooseLever(watch(view, 'view')),
    };
    playMatch([spy, createRandomBot(4)], { mode: 'bo5', seed: 21 });
    expect([...read]).toEqual([]);
  });

  it('talks on about the configured share of turns and lies at its personality rate', () => {
    for (const id of PERSONALITIES) {
      const { choices } = record(id, 60, 'bo7');
      const spoken = choices.filter((c) => c.talk !== undefined);
      expect(spoken.length / choices.length).toBeCloseTo(BOT.talkChance, 1);
      const lies = spoken.filter((c) => c.trace?.lied).length / spoken.length;
      expect(Math.abs(lies - BOT.personalities[id].lieRate)).toBeLessThan(0.08);
      for (const c of spoken) {
        const honest = honestTalk(c.trace!.equity);
        if (c.trace!.lied) expect(c.talk).not.toBe(honest);
        else expect(c.talk).toBe(honest);
      }
    }
  });

  it('bluffs only when its personality allows it', () => {
    const bluffs = (id: PersonalityId) =>
      record(id, 60, 'bo7').choices.filter((c) => c.trace?.bluffed).length;
    expect(bluffs('cautious')).toBe(0);
    expect(bluffs('balanced')).toBe(0);
    expect(bluffs('reckless')).toBeGreaterThan(0);
  });
});
