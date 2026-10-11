import { describe, expect, it } from 'vitest';
import { newDeck } from '../../src/core/cards';
import { cardFace } from '../../src/ui/cardFace';
import { cards } from '../testing';

describe('cardFace', () => {
  it('gives every card of the deck a distinct face', () => {
    const faces = newDeck().map((c) => {
      const f = cardFace(c);
      return `${f.rank}${f.suit}`;
    });
    expect(new Set(faces).size).toBe(52);
  });

  it('writes ten as 10 and colours hearts and diamonds red', () => {
    const [tenHearts, aceSpades, twoClubs, kingDiamonds] = cards('Th As 2c Kd');
    expect(cardFace(tenHearts!)).toEqual({ rank: '10', suit: '♥', red: true });
    expect(cardFace(aceSpades!)).toEqual({ rank: 'A', suit: '♠', red: false });
    expect(cardFace(twoClubs!)).toEqual({ rank: '2', suit: '♣', red: false });
    expect(cardFace(kingDiamonds!)).toEqual({ rank: 'K', suit: '♦', red: true });
  });
});
