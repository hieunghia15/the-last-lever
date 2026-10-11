import { estimateEquity } from '../ai/equity';
import { HAND_HINT } from '../config';
import { makeCard, newDeck, RANK_ACE, rankOf, suitOf, type Card } from '../core/cards';
import { evaluate7, handRank, type HandRank, type HandValue } from '../core/handEvaluator';
import { Rng } from '../core/rng';
import { t } from '../i18n';
import { cardFace } from './cardFace';
import { RANKINGS } from './rankingsModel';

export type Strength = 'strong' | 'fair' | 'weak';

export interface HandCell {
  card: Card;
  /** Plays only as a tie-breaker, shown dimmed with "(Phụ)". */
  kicker: boolean;
}

export type DrawHint =
  /** The strongest hand one more card can make, and which cards make it. */
  | { kind: 'improve'; hand: HandRank; outs: string }
  | { kind: 'preflop' }
  | { kind: 'none' }
  | { kind: 'complete' };

export interface HandPanelModel {
  rank: HandRank;
  /** Place in the rankings: 1 is the strongest of `total`. */
  position: number;
  total: number;
  detail: string;
  /** The best five cards (fewer before the flop), made cards first, kickers last. */
  cells: HandCell[];
  /** 0..1 share of showdowns won against a random hand, ties counting half. */
  equity: number;
  strength: Strength;
  draw: DrawHint;
}

const FIVE = 5;
const FULL_BOARD = 5;

/** What the "BỘ BÀI" card shows for my cards; null before anything is dealt. Pure. */
export function handPanelModel(
  hole: readonly Card[],
  board: readonly Card[],
): HandPanelModel | null {
  if (hole.length === 0) return null;
  const all = [...hole, ...board];
  const value = evaluate7(all);
  const rank = handRank(value);
  const cells = orderCells(bestFive(all, value), rank);
  // Seeded from the cards so the same situation always shows the same number.
  const equity = estimateEquity(hole, board, new Rng(seedOf(all)));
  return {
    rank,
    position: positionOf(rank),
    total: RANKINGS.length,
    detail: detailOf(rank, cells),
    cells,
    equity,
    strength:
      equity >= HAND_HINT.strongAt ? 'strong' : equity >= HAND_HINT.fairAt ? 'fair' : 'weak',
    draw: drawHint(all, rank, board.length),
  };
}

const positionOf = (rank: HandRank): number => RANKINGS.findIndex((r) => r.rank === rank) + 1;

function seedOf(cards: readonly Card[]): number {
  let h = 0x811c9dc5;
  for (const card of cards) h = Math.imul(h ^ card, 0x01000193);
  return h;
}

/** The five cards that score `value`; all of them when there are five or fewer. */
function bestFive(cards: readonly Card[], value: HandValue): Card[] {
  if (cards.length <= FIVE) return cards.slice();
  let found: Card[] | null = null;
  const pick: Card[] = [];
  const walk = (start: number) => {
    if (found) return;
    if (pick.length === FIVE) {
      if (evaluate7(pick) === value) found = pick.slice();
      return;
    }
    for (let i = start; i <= cards.length - (FIVE - pick.length); i++) {
      pick.push(cards[i]!);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  return found ?? cards.slice(0, FIVE);
}

/** Groups first (quads, trips, pairs), then kickers high to low. */
function orderCells(cards: readonly Card[], rank: HandRank): HandCell[] {
  const count = new Map<number, number>();
  for (const card of cards) count.set(rankOf(card), (count.get(rankOf(card)) ?? 0) + 1);
  const straight = rank === 'straight' || rank === 'straightFlush' || rank === 'royalFlush';
  const wheel =
    straight && cards.some((c) => rankOf(c) === RANK_ACE) && cards.some((c) => rankOf(c) === 0);
  // In A-2-3-4-5 the ace is the lowest card.
  const order = (card: Card) => (wheel && rankOf(card) === RANK_ACE ? -1 : rankOf(card));

  const sorted = cards.slice().sort((a, b) => {
    const byCount = (count.get(rankOf(b)) ?? 0) - (count.get(rankOf(a)) ?? 0);
    return byCount || order(b) - order(a) || suitOf(b) - suitOf(a);
  });
  const madeOfAll = straight || rank === 'flush' || rank === 'fullHouse';
  return sorted.map((card, i) => ({
    card,
    kicker: madeOfAll ? false : rank === 'highCard' ? i > 0 : count.get(rankOf(card)) === 1,
  }));
}

function rankName(card: Card | undefined): string {
  if (card === undefined) return '';
  return rankOf(card) === RANK_ACE ? t('handPanel.ace') : cardFace(card).rank;
}

function detailOf(rank: HandRank, cells: readonly HandCell[]): string {
  const first = cells[0]?.card;
  // The second group starts after the first run of equal ranks (a pair after trips, etc.).
  const second = cells.find((c) => first !== undefined && rankOf(c.card) !== rankOf(first))?.card;
  const last = cells[cells.length - 1]?.card;
  return t(`handPanel.detail.${rank}`, {
    a: rankName(first),
    b: rankName(second),
    low: rankName(last),
  });
}

/** Looks one card ahead for the strongest hand still in reach. */
function drawHint(all: readonly Card[], rank: HandRank, boardSize: number): DrawHint {
  if (boardSize === 0) return { kind: 'preflop' };
  if (boardSize >= FULL_BOARD) return { kind: 'complete' };

  const known = new Set(all);
  let best = positionOf(rank);
  let outs: Card[] = [];
  for (const card of newDeck()) {
    if (known.has(card)) continue;
    const position = positionOf(handRank(evaluate7([...all, card])));
    if (position < best) {
      best = position;
      outs = [card];
    } else if (position === best && outs.length > 0) {
      outs.push(card);
    }
  }
  const target = RANKINGS[best - 1];
  if (outs.length === 0 || !target) return { kind: 'none' };

  const ranks = [...new Set(outs.map(rankOf))].sort((a, b) => b - a);
  const named =
    ranks.length <= HAND_HINT.maxOutRanks
      ? ranks.map((r) => cardFace(makeCard(r, 0)).rank).join(', ')
      : t('handPanel.outs', { n: outs.length });
  return { kind: 'improve', hand: target.rank, outs: named };
}
