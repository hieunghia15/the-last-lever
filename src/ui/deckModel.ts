import { makeCard, RANKS, SUITS, type Card } from '../core/cards';

export type SuitCode = 's' | 'h' | 'd' | 'c';

/** Suit rows in the order the design lists them: spades, hearts, diamonds, clubs. */
export const DECK_SUITS: readonly SuitCode[] = ['s', 'h', 'd', 'c'];

/** One suit's thirteen cards, strongest (A) first. */
export function suitCards(suit: SuitCode): Card[] {
  const suitIndex = SUITS.indexOf(suit);
  return Array.from({ length: RANKS.length }, (_, i) => makeCard(RANKS.length - 1 - i, suitIndex));
}
