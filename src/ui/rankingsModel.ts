import type { HandRank } from '../core/handEvaluator';
import type { MessageKey } from '../i18n';

/** How a row's strength tag looks: highlighted words for the extremes, "Tier n" in between. */
export type StrengthStyle = 'top' | 'high' | 'mid' | 'tier' | 'bottom';

export interface RankingRow {
  rank: HandRank;
  /** Short example in card notation, parsed with parseCards. */
  example: string;
  tone: 'red' | 'green' | 'cream';
  strength: MessageKey;
  style: StrengthStyle;
}

/** The ten hands, strongest first, with the examples and tags from the Figma screen. */
export const RANKINGS: readonly RankingRow[] = [
  {
    rank: 'royalFlush',
    example: 'As Ks Qs Js Ts',
    tone: 'red',
    strength: 'rankings.strongest',
    style: 'top',
  },
  {
    rank: 'straightFlush',
    example: '9d 8d 7d 6d 5d',
    tone: 'green',
    strength: 'rankings.veryStrong',
    style: 'high',
  },
  {
    rank: 'fourOfAKind',
    example: '7c 7s 7h 7d',
    tone: 'cream',
    strength: 'rankings.reallyStrong',
    style: 'high',
  },
  {
    rank: 'fullHouse',
    example: 'Jh Jd Js 5c 5s',
    tone: 'red',
    strength: 'rankings.strong',
    style: 'mid',
  },
  {
    rank: 'flush',
    example: 'Ac Jc 8c 4c 2c',
    tone: 'green',
    strength: 'rankings.fair',
    style: 'mid',
  },
  {
    rank: 'straight',
    example: 'Ts 9h 8d 7c 6s',
    tone: 'cream',
    strength: 'rankings.tier',
    style: 'tier',
  },
  {
    rank: 'threeOfAKind',
    example: 'Qh Qd Qs',
    tone: 'red',
    strength: 'rankings.tier',
    style: 'tier',
  },
  {
    rank: 'twoPair',
    example: 'Js Jh 4d 4c',
    tone: 'cream',
    strength: 'rankings.tier',
    style: 'tier',
  },
  { rank: 'onePair', example: 'Th Td', tone: 'red', strength: 'rankings.tier', style: 'tier' },
  {
    rank: 'highCard',
    example: 'As Jd',
    tone: 'cream',
    strength: 'rankings.weakest',
    style: 'bottom',
  },
];
