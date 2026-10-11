import { describe, expect, it } from 'vitest';
import { cardToString, rankOf, suitOf } from '../../src/core/cards';
import { DECK_SUITS, suitCards } from '../../src/ui/deckModel';

describe('deckModel', () => {
  it('lists all 52 cards exactly once', () => {
    const all = DECK_SUITS.flatMap(suitCards);
    expect(all).toHaveLength(52);
    expect(new Set(all).size).toBe(52);
  });

  it('runs every suit from ace down to two', () => {
    for (const suit of DECK_SUITS) {
      const cards = suitCards(suit);
      expect(cards.map(cardToString)[0]).toBe(`A${suit}`);
      expect(cards.map(cardToString).at(-1)).toBe(`2${suit}`);
      expect(new Set(cards.map(suitOf)).size).toBe(1);
      const ranks = cards.map(rankOf);
      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    }
  });
});
