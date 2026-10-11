import { BETTING } from '../config';
import { BET_MOVES, foldPulls, type BetMove } from '../core/betting';
import type { PlayerView } from '../core/gameState';
import { t } from '../i18n';

export interface ActionItem {
  move: BetMove;
  enabled: boolean;
  label: string;
  /** What the move costs, e.g. how many levers a fold means; empty when nothing to say. */
  subtitle: string;
}

/** What the five action buttons show for this view. Pure, so it is tested without Phaser. */
export function actionBarModel(view: PlayerView): ActionItem[] {
  const betting = view.betting;
  return BET_MOVES.map((move) => ({
    move,
    enabled: view.legal.includes(move),
    label: t(`action.${move}`),
    subtitle: betting ? subtitle(move, betting, view) : '',
  }));
}

function subtitle(move: BetMove, betting: NonNullable<PlayerView['betting']>, view: PlayerView) {
  switch (move) {
    case 'check':
      return '';
    case 'raise':
      return t('action.sub.raise', {
        n: Math.min(betting.level + BETTING.raiseStep, BETTING.maxLevel),
      });
    case 'call':
      return t('action.sub.call', { n: betting.level });
    case 'fold':
      return t('action.sub.fold', { n: foldPulls(betting, view.me) });
    case 'allIn':
      return t('action.sub.allIn', { n: BETTING.maxLevel });
  }
}
