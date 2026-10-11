// A card is an integer 0..51 so game state stays plain, cheap-to-copy data.
export type Card = number;

export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';
export const RANK_ACE = 12;

export const makeCard = (rank: number, suit: number): Card => rank * 4 + suit;
export const rankOf = (card: Card): number => card >> 2;
export const suitOf = (card: Card): number => card & 3;

/** All 52 cards in a fixed order; shuffle with Rng, never here. */
export function newDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

/** 'As', 'Td', '2c' — the standard short notation. */
export function cardToString(card: Card): string {
  return `${RANKS[rankOf(card)]}${SUITS[suitOf(card)]}`;
}

/** Parses 'As Kd 7h' (or '10h' for ten). Meant for tests and scripts, not the game loop. */
export function parseCards(text: string): Card[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const cards = tokens.map(parseCard);
  if (new Set(cards).size !== cards.length) throw new Error(`Duplicate card in "${text}"`);
  return cards;
}

function parseCard(token: string): Card {
  const normalized = token.replace(/^10/, 'T');
  const rank = RANKS.indexOf(normalized.charAt(0).toUpperCase());
  const suit = SUITS.indexOf(normalized.charAt(1).toLowerCase());
  if (normalized.length !== 2 || rank < 0 || suit < 0) throw new Error(`Bad card "${token}"`);
  return makeCard(rank, suit);
}
