import { RANK_ACE, rankOf, suitOf, type Card } from './cards';

/**
 * Bigger is stronger, so comparing hands is comparing numbers.
 * (category << 20) | (k1 << 16) | (k2 << 12) | (k3 << 8) | (k4 << 4) | k5
 */
export type HandValue = number;

export const CATEGORY = {
  highCard: 0,
  onePair: 1,
  twoPair: 2,
  threeOfAKind: 3,
  straight: 4,
  flush: 5,
  fullHouse: 6,
  fourOfAKind: 7,
  straightFlush: 8,
} as const;

/** Strongest first. A royal flush is just the ace-high straight flush, so it needs no own category. */
export type HandRank =
  | 'royalFlush'
  | 'straightFlush'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeOfAKind'
  | 'twoPair'
  | 'onePair'
  | 'highCard';

const RANK_BY_CATEGORY: readonly HandRank[] = [
  'highCard',
  'onePair',
  'twoPair',
  'threeOfAKind',
  'straight',
  'flush',
  'fullHouse',
  'fourOfAKind',
  'straightFlush',
];

// Scratch buffers reused across calls: evaluate7 runs hundreds of times per bot decision.
const counts = new Uint8Array(13);
const suitCounts = new Uint8Array(4);
const suitMasks = new Uint16Array(4);
const kickers = new Int8Array(5);

/** Packs the first n entries of the kickers buffer under the category. */
function pack(category: number, n: number): HandValue {
  let v = category;
  for (let i = 0; i < 5; i++) v = (v << 4) | (i < n ? kickers[i]! : 0);
  return v;
}

const pack1 = (category: number, a: number): HandValue => (category << 20) | (a << 16);

const pack2 = (category: number, a: number, b: number): HandValue =>
  (category << 20) | (a << 16) | (b << 12);

/** Top rank of the best straight in a rank bitmask, or -1. The wheel A-2-3-4-5 tops at 5 (rank 3). */
function straightTop(mask: number): number {
  // Shift left one bit and copy the ace into bit 0 so it can also play low.
  const m = (mask << 1) | ((mask >> RANK_ACE) & 1);
  for (let top = RANK_ACE; top >= 3; top--) {
    if (((m >> (top - 3)) & 0x1f) === 0x1f) return top;
  }
  return -1;
}

/**
 * Writes the n highest ranks set in mask into kickers starting at `offset`, skipping the
 * excluded ranks. Returns how many were written.
 */
function topRanks(mask: number, n: number, offset = 0, excludeA = -1, excludeB = -1): number {
  let found = 0;
  for (let r = RANK_ACE; r >= 0 && found < n; r--) {
    if (r !== excludeA && r !== excludeB && (mask >> r) & 1) kickers[offset + found++] = r;
  }
  return found;
}

/** Scores the best 5-card hand out of 5–7 cards. */
export function evaluate7(cards: readonly Card[]): HandValue {
  counts.fill(0);
  suitCounts.fill(0);
  suitMasks.fill(0);
  let rankMask = 0;

  for (const card of cards) {
    const r = rankOf(card);
    const s = suitOf(card);
    counts[r]!++;
    suitCounts[s]!++;
    suitMasks[s]! |= 1 << r;
    rankMask |= 1 << r;
  }

  // In 7 cards a flush can never coexist with quads or a full house, so checking it first is safe.
  for (let s = 0; s < 4; s++) {
    if (suitCounts[s]! >= 5) {
      const sfTop = straightTop(suitMasks[s]!);
      if (sfTop >= 0) return pack1(CATEGORY.straightFlush, sfTop);
      return pack(CATEGORY.flush, topRanks(suitMasks[s]!, 5));
    }
  }

  let quad = -1;
  let trip1 = -1;
  let trip2 = -1;
  let pair1 = -1;
  let pair2 = -1;
  for (let r = RANK_ACE; r >= 0; r--) {
    const c = counts[r]!;
    if (c === 4) quad = r;
    else if (c === 3) {
      if (trip1 < 0) trip1 = r;
      else if (trip2 < 0) trip2 = r;
    } else if (c === 2) {
      if (pair1 < 0) pair1 = r;
      else if (pair2 < 0) pair2 = r;
    }
  }

  if (quad >= 0) {
    topRanks(rankMask, 1, 0, quad);
    return pack2(CATEGORY.fourOfAKind, quad, kickers[0]!);
  }

  if (trip1 >= 0 && (trip2 >= 0 || pair1 >= 0)) {
    return pack2(CATEGORY.fullHouse, trip1, Math.max(trip2, pair1));
  }

  const top = straightTop(rankMask);
  if (top >= 0) return pack1(CATEGORY.straight, top);

  if (trip1 >= 0) {
    kickers[0] = trip1;
    topRanks(rankMask, 2, 1, trip1);
    return pack(CATEGORY.threeOfAKind, 3);
  }

  if (pair2 >= 0) {
    // The kicker may come from a third pair, so search every remaining rank.
    kickers[0] = pair1;
    kickers[1] = pair2;
    topRanks(rankMask, 1, 2, pair1, pair2);
    return pack(CATEGORY.twoPair, 3);
  }

  if (pair1 >= 0) {
    kickers[0] = pair1;
    topRanks(rankMask, 3, 1, pair1);
    return pack(CATEGORY.onePair, 4);
  }

  return pack(CATEGORY.highCard, topRanks(rankMask, 5));
}

/** > 0 when a wins, < 0 when b wins, 0 for a tie. Suits never break ties. */
export const compareHands = (a: HandValue, b: HandValue): number => a - b;

export const handCategory = (value: HandValue): number => value >> 20;

export function handRank(value: HandValue): HandRank {
  const category = handCategory(value);
  if (category === CATEGORY.straightFlush && ((value >> 16) & 0xf) === RANK_ACE) {
    return 'royalFlush';
  }
  return RANK_BY_CATEGORY[category] as HandRank;
}
