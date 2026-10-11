import { describe, expect, it } from 'vitest';
import { estimateEquity } from '../../src/ai/equity';
import { Rng } from '../../src/core/rng';
import { cards } from '../testing';

const SEED = 20261011;
const equity = (hole: string, board = '', trials = 2000) =>
  estimateEquity(cards(hole), cards(board), new Rng(SEED), trials);

describe('estimateEquity', () => {
  it('rates pocket aces near 85% before the flop', () => {
    expect(equity('As Ah')).toBeGreaterThan(0.8);
    expect(equity('As Ah')).toBeLessThan(0.9);
  });

  it('rates 7-2 offsuit as an underdog', () => {
    expect(equity('7c 2d')).toBeLessThan(0.4);
  });

  it('is exactly 1 for the nuts on a full board', () => {
    expect(equity('As Ks', 'Qs Js Ts 2d 3c', 300)).toBe(1);
  });

  it('counts a board everyone plays as a tie', () => {
    expect(equity('2c 3d', 'As Ks Qs Js Ts', 300)).toBe(0.5);
  });

  it('gives the same number for the same seed', () => {
    expect(equity('Jh Td', '9c 8s 2h', 300)).toBe(equity('Jh Td', '9c 8s 2h', 300));
  });

  it('returns 0 for zero trials', () => {
    expect(equity('As Ah', '', 0)).toBe(0);
  });
});
