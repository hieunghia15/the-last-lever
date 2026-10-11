import { describe, expect, it } from 'vitest';
import { LEVERS } from '../../src/config';
import { IllegalActionError } from '../../src/core/errors';
import { dangerProbability, pullLever, setupLevers } from '../../src/core/levers';
import { Rng } from '../../src/core/rng';

const SEED = 777;

describe('setupLevers', () => {
  it('always has at least one Safe and one Danger lever', () => {
    const rng = new Rng(SEED);
    for (let i = 0; i < 2_000; i++) {
      const { danger, pulled } = setupLevers(rng);
      const d = danger.filter(Boolean).length;
      expect(danger).toHaveLength(LEVERS.count);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(LEVERS.count - 1);
      expect(pulled.every((p) => !p)).toBe(true);
    }
  });

  it('draws the Danger count uniformly from 1 to 5', () => {
    const rng = new Rng(SEED);
    const n = 50_000;
    const counts = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const d = setupLevers(rng).danger.filter(Boolean).length;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([1, 2, 3, 4, 5]);
    for (const c of counts.values()) expect(Math.abs(c / n - 1 / 5)).toBeLessThan(0.01);
  });

  it('lets every position be Danger', () => {
    const rng = new Rng(SEED);
    const seen = new Array<boolean>(LEVERS.count).fill(false);
    for (let i = 0; i < 500; i++) setupLevers(rng).danger.forEach((d, j) => d && (seen[j] = true));
    expect(seen.every(Boolean)).toBe(true);
  });
});

describe('pullLever', () => {
  const board = {
    danger: [false, true, false, false, true, false],
    pulled: new Array<boolean>(6).fill(false),
  };

  it('reveals the lever without mutating the board', () => {
    const before = structuredClone(board);
    const safe = pullLever(board, 0);
    expect(board).toEqual(before);
    expect(safe.danger).toBe(false);
    expect(safe.board.pulled[0]).toBe(true);
    expect(pullLever(safe.board, 1).danger).toBe(true);
  });

  it('rejects pulling the same lever twice', () => {
    const { board: after } = pullLever(board, 2);
    expect(() => pullLever(after, 2)).toThrow(IllegalActionError);
  });

  it.each([-1, 6, 1.5])('rejects lever index %s', (index) => {
    expect(() => pullLever(board, index)).toThrow(IllegalActionError);
  });
});

describe('dangerProbability L(m)', () => {
  it.each([
    [0, 0],
    [1, 1 / 2],
    [2, 11 / 15],
    [3, 17 / 20],
    [4, 23 / 25],
    [5, 29 / 30],
    [6, 1],
  ])('L(%i) = %f with the default config', (m, expected) => {
    expect(dangerProbability(m)).toBeCloseTo(expected, 9);
  });

  it('follows the config, e.g. 1 to 3 Danger levers', () => {
    const cfg = { count: 6, minDanger: 1, maxDanger: 3 };
    expect(dangerProbability(1, cfg)).toBeCloseTo(1 / 3, 9);
    expect(dangerProbability(6, cfg)).toBe(1);
  });

  it('matches a seeded simulation within 0.01', () => {
    const rng = new Rng(SEED);
    const perM = 50_000; // σ ≈ 0.0022 at p = 0.5, so ±0.01 is ~4.5σ
    for (let m = 1; m <= LEVERS.count; m++) {
      let hits = 0;
      for (let i = 0; i < perM; i++) {
        const { danger } = setupLevers(rng);
        const order = rng.shuffle(danger.map((_, j) => j));
        if (order.slice(0, m).some((j) => danger[j])) hits++;
      }
      expect(Math.abs(hits / perM - dangerProbability(m))).toBeLessThan(0.01);
    }
  });
});
