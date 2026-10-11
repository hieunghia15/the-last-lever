import { MATCH_MODES, type MatchMode } from '../config';
import type { Seat } from './gameState';

export const winsNeeded = (mode: MatchMode): number => MATCH_MODES[mode].winsNeeded;

export function matchWinner(wins: readonly [number, number], mode: MatchMode): Seat | null {
  const need = winsNeeded(mode);
  if (wins[0] >= need) return 0;
  if (wins[1] >= need) return 1;
  return null;
}

export const isMatchOver = (wins: readonly [number, number], mode: MatchMode): boolean =>
  matchWinner(wins, mode) !== null;
