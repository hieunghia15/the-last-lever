import { describe, expect, it } from 'vitest';
import { cardToString, newDeck, parseCards, rankOf, suitOf } from '../../src/core/cards';
import {
  compareHands,
  evaluate7,
  handCategory,
  handRank,
  type HandRank,
} from '../../src/core/handEvaluator';
import { Rng } from '../../src/core/rng';
import { isCI } from '../testing';

const SEED = 20261010;

const value = (text: string) => evaluate7(parseCards(text));
const sign = (n: number) => Math.sign(n);

describe('hand ranking order (strongest to weakest)', () => {
  const ladder: [HandRank, string][] = [
    ['royalFlush', 'As Ks Qs Js Ts 2d 3c'],
    ['straightFlush', '9s 8s 7s 6s 5s Ad Kc'],
    ['fourOfAKind', 'Ac Ad Ah As Kd 2c 3h'],
    ['fullHouse', 'Kc Kd Kh Qs Qd 2c 3h'],
    ['flush', 'Ah Jh 9h 6h 3h Kd 2c'],
    ['straight', '9c 8d 7h 6s 5c Ad 2h'],
    ['threeOfAKind', '7c 7d 7h As Kd 2c 4h'],
    ['twoPair', 'Ac Ad Kh Ks 9d 2c 4h'],
    ['onePair', '9c 9d Ah Ks 7d 2c 4h'],
    ['highCard', 'Ac Qd 9h 7s 5d 3c 2h'],
  ];

  it.each(ladder)('names %s correctly', (rank, text) => {
    expect(handRank(value(text))).toBe(rank);
  });

  it('orders the ten ranks strictly from strongest to weakest', () => {
    const values = ladder.map(([, text]) => value(text));
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]).toBeGreaterThan(values[i]!);
    }
  });
});

describe('edge cases', () => {
  const cases: [string, string, string, -1 | 0 | 1][] = [
    ['royal flush beats king-high straight flush', 'As Ks Qs Js Ts', 'Ks Qs Js Ts 9s', 1],
    ['wheel A-2-3-4-5 loses to 2-3-4-5-6', 'Ac 2d 3h 4s 5c Kd 9h', '2c 3d 4h 5s 6c Kd 9h', -1],
    ['wheel straight flush loses to 6-high straight flush', 'As 2s 3s 4s 5s', '2s 3s 4s 5s 6s', -1],
    ['wheel straight flush beats quads', 'As 2s 3s 4s 5s', 'Kc Kd Kh Ks Ad', 1],
    ['broadway straight beats king-high straight', 'Tc Jd Qh Ks Ac', '9c Td Jh Qs Kc', 1],
    ['flush beats straight in the same 7 cards', '4h 5h 6h 7c 8h Kh 2d', '4c 5d 6s 7c 8d Kh 2d', 1],
    ['same values with different suits tie', 'Ah Kh 9c 7d 3s 2c 4d', 'Ad Kd 9s 7c 3h 2c 4d', 0],
    ['board plays: identical best five ties', 'Tc Jd Qh Ks Ac 2d 3h', 'Tc Jd Qh Ks Ac 4s 5c', 0],
    [
      'two trips make a full house with the higher trips',
      'Kc Kd Kh 9s 9d 9h 2c',
      'Kc Kd Kh 8s 8d 8h 2c',
      1,
    ],
    [
      'trips plus two pairs uses the higher pair',
      'Kc Kd Kh 9s 9d 4h 4c',
      'Kc Kd Kh 8s 8d 7h 7c',
      1,
    ],
    [
      'three pairs: kicker can come from the third pair',
      'Ac Ad Kh Ks Qd Qc 2h',
      'Ac Ad Kh Ks Jd 9c 2h',
      1,
    ],
    [
      'quads on board: highest remaining card is the kicker',
      '9c 9d 9h 9s Ad 2c 3h',
      '9c 9d 9h 9s Kd Qc Jh',
      1,
    ],
    ['seven of a suit: flush uses the top five', 'Ah Kh 9h 7h 5h 3h 2h', 'Ah Kh 9h 7h 4h 3h 2h', 1],
    ['quads kicker decides', 'Ac Ad Ah As Kd', 'Ac Ad Ah As Qd', 1],
    ['full house: trips rank first', '3c 3d 3h 2s 2d', '2c 2d 2h As Ad', 1],
    ['full house: then pair rank', 'Kc Kd Kh Qs Qd', 'Kc Kd Kh Js Jd', 1],
    ['flush compares every card', 'Ah Kh 9h 6h 4h', 'Ah Kh 9h 6h 3h', 1],
    ['trips kickers decide', '7c 7d 7h As Qd', '7c 7d 7h As Jd', 1],
    ['two pair: higher top pair wins', 'Ac Ad 2h 2s 3d', 'Kc Kd Qh Qs Jd', 1],
    ['two pair: then lower pair', 'Ac Ad Qh Qs 3d', 'Ac Ad Jh Js Kd', 1],
    ['two pair: then kicker', 'Ac Ad Qh Qs 5d', 'Ac Ad Qh Qs 4d', 1],
    ['one pair: third kicker decides', '9c 9d Ah Ks 7d', '9c 9d Ah Ks 6d', 1],
    ['high card: last card decides', 'Ac Qd 9h 7s 5d', 'Ac Qd 9h 7s 4d', 1],
    [
      'Q-K-A-2-3 is not a straight: it ties the same high cards',
      'Qc Kd Ah 2s 3c',
      'Ac Kh Qd 3s 2d',
      0,
    ],
  ];

  it.each(cases)('%s', (_name, a, b, expected) => {
    expect(sign(compareHands(value(a), value(b)))).toBe(expected);
  });

  it('treats Q-K-A-2-3 as high card', () => {
    expect(handRank(value('Qc Kd Ah 2s 3c'))).toBe('highCard');
  });

  it('works with 5 and 6 cards too', () => {
    expect(handRank(value('As Ks Qs Js Ts'))).toBe('royalFlush');
    expect(handRank(value('2c 2d 5h 5s 9c Kd'))).toBe('twoPair');
  });
});

/**
 * Independent reference evaluator: slow and obvious on purpose. It scores every 5-card
 * combination by sorting rank groups and keeps the best, so it shares no logic with the
 * bitmask evaluator under test. Returns [category, ...tie-break ranks].
 */
function referenceScore(cards: readonly number[]): number[] {
  let best: number[] = [];
  for (let a = 0; a < cards.length; a++)
    for (let b = a + 1; b < cards.length; b++)
      for (let c = b + 1; c < cards.length; c++)
        for (let d = c + 1; d < cards.length; d++)
          for (let e = d + 1; e < cards.length; e++) {
            const score = scoreFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (compareScores(score, best) > 0) best = score;
          }
  return best;
}

function scoreFive(five: number[]): number[] {
  const ranks = five.map(rankOf).sort((x, y) => y - x);
  const isFlush = five.every((card) => suitOf(card) === suitOf(five[0]!));
  const distinct = new Set(ranks).size === 5;
  const isWheel = ranks.join() === '12,3,2,1,0';
  const isStraight = distinct && (ranks[0]! - ranks[4]! === 4 || isWheel);
  const straightTop = isWheel ? 3 : ranks[0]!;

  // Rank groups ordered by size, then rank: e.g. full house K-K-K-Q-Q -> [[3,K],[2,Q]].
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts].sort((x, y) => y[1] - x[1] || y[0] - x[0]);
  const shape = groups.map(([, n]) => n).join('');
  const byGroup = groups.map(([r]) => r);

  if (isStraight && isFlush) return [8, straightTop];
  if (shape === '41') return [7, ...byGroup];
  if (shape === '32') return [6, ...byGroup];
  if (isFlush) return [5, ...ranks];
  if (isStraight) return [4, straightTop];
  if (shape === '311') return [3, ...byGroup];
  if (shape === '221') return [2, ...byGroup];
  if (shape === '2111') return [1, ...byGroup];
  return [0, ...ranks];
}

function compareScores(x: number[], y: number[]): number {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? -1) - (y[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

describe('cross-check against an independent reference evaluator', () => {
  it('agrees on the category and winner of 10,000 random seeded hand pairs', () => {
    const rng = new Rng(SEED);
    const deck = newDeck();
    const mismatches: string[] = [];
    const show = (cs: number[]) => cs.map(cardToString).join(' ');

    for (let i = 0; i < 10_000; i++) {
      const cards = rng.shuffle(deck).slice(0, 9);
      const board = cards.slice(4);
      const a = [...cards.slice(0, 2), ...board];
      const b = [...cards.slice(2, 4), ...board];
      const [va, vb] = [evaluate7(a), evaluate7(b)];
      const [ra, rb] = [referenceScore(a), referenceScore(b)];

      if (
        handCategory(va) !== ra[0] ||
        handCategory(vb) !== rb[0] ||
        sign(compareHands(va, vb)) !== sign(compareScores(ra, rb))
      ) {
        mismatches.push(`${show(a)} vs ${show(b)}`);
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('the reference itself ranks the known ladder correctly', () => {
    const sample = [
      'As Ks Qs Js Ts',
      'Ac Ad Ah As Kd',
      'Kc Kd Kh Qs Qd',
      'Ah Jh 9h 6h 3h',
      'Ac 2d 3h 4s 5c',
      '7c 7d 7h As Kd',
      'Ac Ad Kh Ks 9d',
      '9c 9d Ah Ks 7d',
      'Ac Qd 9h 7s 5d',
    ].map((text) => referenceScore(parseCards(text))[0]);
    expect(sample).toEqual([8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });
});

describe('performance', () => {
  it.skipIf(isCI)('scores 600 seven-card hands quickly', () => {
    const rng = new Rng(SEED);
    const hands = Array.from({ length: 600 }, () => rng.shuffle(newDeck()).slice(0, 7));
    for (const h of hands) evaluate7(h); // warm up the JIT
    // Best of 5 with a wide bound: other test files run in parallel and steal CPU.
    let best = Infinity;
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      for (const h of hands) evaluate7(h);
      best = Math.min(best, performance.now() - start);
    }
    expect(best).toBeLessThan(25);
  });
});
