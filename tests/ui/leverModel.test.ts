import { describe, expect, it } from 'vitest';
import type { LeverView } from '../../src/core/gameState';
import { Rng } from '../../src/core/rng';
import { hesitationPath } from '../../src/ui/leverModel';

const HOVERS = { min: 1, max: 3 };

/** Boards with a few levers already pulled, and every open lever as a target. */
const BOARDS: LeverView[][] = [
  ['unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'],
  ['safe', 'unknown', 'unknown', 'safe', 'unknown', 'unknown'],
  ['safe', 'safe', 'unknown', 'safe', 'unknown', 'safe'],
  ['safe', 'safe', 'safe', 'safe', 'unknown', 'safe'],
];

function* cases() {
  for (const board of BOARDS) {
    for (let target = 0; target < board.length; target++) {
      if (board[target] !== 'unknown') continue;
      for (let seed = 0; seed < 40; seed++) yield { board, target, seed };
    }
  }
}

describe('hesitationPath', () => {
  it('ends on the chosen lever and only visits open levers', () => {
    for (const { board, target, seed } of cases()) {
      const path = hesitationPath(board, target, new Rng(seed), HOVERS);
      expect(path[path.length - 1]).toBe(target);
      for (const lever of path) expect(board[lever]).toBe('unknown');
    }
  });

  it('never stays on the same lever twice in a row', () => {
    for (const { board, target, seed } of cases()) {
      const path = hesitationPath(board, target, new Rng(seed), HOVERS);
      path.slice(1).forEach((lever, i) => expect(lever).not.toBe(path[i]));
    }
  });

  it('hovers within the range, but never more than the other open levers', () => {
    for (const { board, target, seed } of cases()) {
      const open = board.filter((state) => state === 'unknown').length;
      const hovers = hesitationPath(board, target, new Rng(seed), HOVERS).length - 1;
      expect(hovers).toBeLessThanOrEqual(Math.min(HOVERS.max, open - 1));
      expect(hovers).toBeGreaterThanOrEqual(Math.min(HOVERS.min, open - 1));
    }
  });

  it('goes straight to the last open lever', () => {
    expect(hesitationPath(BOARDS[3] ?? [], 4, new Rng(1), HOVERS)).toEqual([4]);
  });

  it('gives the same path for the same seed', () => {
    const board = BOARDS[0] ?? [];
    const a = hesitationPath(board, 2, new Rng(7), HOVERS);
    expect(hesitationPath(board, 2, new Rng(7), HOVERS)).toEqual(a);
  });

  it('rejects a lever that is already pulled', () => {
    expect(() => hesitationPath(BOARDS[1] ?? [], 0, new Rng(1), HOVERS)).toThrow(RangeError);
  });
});
