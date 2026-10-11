import { RANKS, rankOf, suitOf, type Card } from '../core/cards';

export interface CardFace {
  rank: string;
  suit: '♣' | '♦' | '♥' | '♠';
  red: boolean;
}

// Same order as SUITS in core/cards ('cdhs').
const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'] as const;

export function cardFace(card: Card): CardFace {
  const suit = suitOf(card);
  return {
    rank: RANKS.charAt(rankOf(card)).replace('T', '10'),
    suit: SUIT_SYMBOLS[suit] ?? '♠',
    red: suit === 1 || suit === 2,
  };
}
