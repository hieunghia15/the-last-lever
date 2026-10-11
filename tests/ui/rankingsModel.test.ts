import { describe, expect, it } from 'vitest';
import { parseCards, rankOf, suitOf } from '../../src/core/cards';
import { vi } from '../../src/i18n/vi';
import { RANKINGS } from '../../src/ui/rankingsModel';

describe('rankingsModel', () => {
  it('lists the ten hands strongest first, in the same order as the hand names', () => {
    const handKeys = Object.keys(vi)
      .filter((key) => key.startsWith('hand.'))
      .map((key) => key.slice('hand.'.length));
    expect(RANKINGS.map((row) => row.rank)).toEqual(handKeys);
  });

  it('only uses examples that are valid, duplicate-free cards', () => {
    for (const row of RANKINGS) expect(() => parseCards(row.example), row.rank).not.toThrow();
  });

  it('shows examples that actually look like their hand', () => {
    const byRank = Object.fromEntries(RANKINGS.map((row) => [row.rank, parseCards(row.example)]));
    const sameSuit = (rank: string) => new Set(byRank[rank]?.map(suitOf)).size === 1;
    const ranks = (rank: string) => byRank[rank]?.map(rankOf) ?? [];
    expect(sameSuit('royalFlush')).toBe(true);
    expect(sameSuit('straightFlush')).toBe(true);
    expect(sameSuit('flush')).toBe(true);
    expect(new Set(ranks('fourOfAKind')).size).toBe(1);
    expect(new Set(ranks('threeOfAKind')).size).toBe(1);
    expect(new Set(ranks('onePair')).size).toBe(1);
    expect(new Set(ranks('twoPair')).size).toBe(2);
    expect(new Set(ranks('fullHouse')).size).toBe(2);
  });

  it('shows the straight flushes as five full cards in a row', () => {
    const run = (rank: string) => {
      const row = RANKINGS.find((r) => r.rank === rank);
      return parseCards(row?.example ?? '').map(rankOf);
    };
    // Ranks are 0 (two) .. 12 (ace): A K Q J 10 and 9 8 7 6 5.
    expect(run('royalFlush')).toEqual([12, 11, 10, 9, 8]);
    expect(run('straightFlush')).toEqual([7, 6, 5, 4, 3]);
  });
});
