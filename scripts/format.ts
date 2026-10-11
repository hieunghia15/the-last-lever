// Vietnamese text for the command-line tools. The game UI will use i18n/t() instead.
import type { Street } from '../src/core/betting';
import { rankOf, RANKS, suitOf, type Card } from '../src/core/cards';
import type { GameEvent, RoundResult, Seat } from '../src/core/gameState';
import type { HandRank } from '../src/core/handEvaluator';

const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];

const STREET_NAMES: Record<Street, string> = {
  preflop: 'Trước flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
};

export const HAND_NAMES: Record<HandRank, string> = {
  royalFlush: 'Thùng phá sảnh lớn',
  straightFlush: 'Thùng phá sảnh',
  fourOfAKind: 'Tứ quý',
  fullHouse: 'Cù lũ',
  flush: 'Thùng',
  straight: 'Sảnh',
  threeOfAKind: 'Sám cô',
  twoPair: 'Hai đôi',
  onePair: 'Một đôi',
  highCard: 'Mậu thầu',
};

export const cardText = (card: Card): string =>
  `${RANKS[rankOf(card)]!.replace('T', '10')}${SUIT_SYMBOLS[suitOf(card)]}`;

export const cardsText = (cards: readonly Card[]): string =>
  cards.length ? cards.map(cardText).join(' ') : '—';

export const streetText = (street: Street): string => STREET_NAMES[street];

export interface FormatOptions {
  names: [string, string];
  /** Seats whose hole cards stay hidden until showdown (the bot, when a human plays). */
  hidden?: Seat[];
}

function resultText(result: RoundResult, names: [string, string]): string {
  if (result.kind === 'win') return `${names[result.winner]} thắng ván`;
  return result.reason === 'pokerTie' ? 'Hòa (hòa bài)' : 'Hòa (kéo toàn An toàn)';
}

/** One readable line per event, or null for events that need no line. */
export function formatEvent(event: GameEvent, opts: FormatOptions): string | null {
  const { names } = opts;
  switch (event.type) {
    case 'roundStarted':
      return `── Ván ${event.round} ── ${names[event.firstActor]} đi trước`;
    case 'holeCardsDealt':
      return ([0, 1] as const)
        .map((s) => `${names[s]}: ${opts.hidden?.includes(s) ? '🂠 🂠' : cardsText(event.holes[s])}`)
        .join('   ');
    case 'betPlaced':
      switch (event.move) {
        case 'fold':
          return null; // the 'folded' event right after says it with the lever count
        case 'check':
          return `${names[event.seat]} Xem bài`;
        case 'call':
          return `${names[event.seat]} Theo (mức ${event.level})`;
        case 'raise':
          return `${names[event.seat]} Tăng lên ${event.level}`;
        case 'allIn':
          return `${names[event.seat]} Tất tay → mức ${event.level}`;
      }
      break;
    case 'streetRevealed':
      return `Lật ${streetText(event.street)}: ${cardsText(event.cards)}`;
    case 'showdown': {
      const side = (s: Seat) =>
        `${names[s]} ${cardsText(event.holes[s])} (${HAND_NAMES[event.ranks[s]]})`;
      const verdict = event.winner === null ? 'hòa bài' : `${names[event.winner]} thắng bài`;
      return `So bài: ${side(0)} vs ${side(1)} → ${verdict}`;
    }
    case 'folded':
      return `${names[event.seat]} Bỏ bài (kéo ${event.pulls} cần)`;
    case 'challengeStarted':
      return `⚡ ${names[event.loser]} phải kéo ${event.pulls} cần`;
    case 'leverPulled':
      return `${names[event.seat]} kéo cần ${event.lever + 1}: ${event.danger ? 'NGUY HIỂM ⚡' : 'An toàn'}`;
    case 'roundEnded':
      return `${resultText(event.result, names)} | Tỉ số ${event.wins[0]}-${event.wins[1]}, hòa ${event.draws}`;
    case 'matchEnded':
      return `🏆 ${names[event.winner]} thắng trận ${event.wins[0]}-${event.wins[1]} (hòa ${event.draws})`;
  }
}
