import { describe, expect, it } from 'vitest';
import { cardToString, newDeck, parseCards, rankOf, suitOf } from '../../src/core/cards';

describe('cards', () => {
  it('builds a 52-card deck with no duplicates', () => {
    const deck = newDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
  });

  it('covers every rank and suit exactly once', () => {
    const keys = new Set(newDeck().map((c) => `${rankOf(c)}-${suitOf(c)}`));
    expect(keys.size).toBe(52);
  });

  it('round-trips every card through text', () => {
    for (const card of newDeck()) {
      expect(parseCards(cardToString(card))).toEqual([card]);
    }
  });

  it('formats cards in the standard short notation', () => {
    expect(parseCards('As Td 2c').map(cardToString)).toEqual(['As', 'Td', '2c']);
  });

  it('accepts 10 as an alias for T and ignores extra spaces', () => {
    expect(parseCards('  10h   Qs ').map(cardToString)).toEqual(['Th', 'Qs']);
  });

  it.each(['Xs', 'A', 'Ax', 'Ass', '1h'])('rejects the bad card "%s"', (text) => {
    expect(() => parseCards(text)).toThrow();
  });

  it('rejects duplicate cards', () => {
    expect(() => parseCards('As Kd As')).toThrow(/Duplicate/);
  });
});
