import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';

const SEED = 12345;

const take = (rng: Rng, n: number) => Array.from({ length: n }, () => rng.next());

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(take(new Rng(SEED), 20)).toEqual(take(new Rng(SEED), 20));
  });

  it('produces different sequences for different seeds', () => {
    expect(take(new Rng(SEED), 5)).not.toEqual(take(new Rng(SEED + 1), 5));
  });

  it('resumes identically from a saved state', () => {
    const a = new Rng(SEED);
    take(a, 7);
    const b = new Rng(a.state);
    expect(take(b, 10)).toEqual(take(a, 10));
  });

  it('keeps next() in [0, 1) and int(n) in [0, n)', () => {
    const rng = new Rng(SEED);
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const k = rng.int(7);
      expect(Number.isInteger(k) && k >= 0 && k < 7).toBe(true);
    }
  });

  it('keeps range(min, max) inclusive on both ends', () => {
    const rng = new Rng(SEED);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) seen.add(rng.range(1, 5));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('distributes int(6) evenly', () => {
    const rng = new Rng(SEED);
    const counts = new Array<number>(6).fill(0);
    const n = 60_000;
    for (let i = 0; i < n; i++) counts[rng.int(6)]!++;
    for (const c of counts) expect(Math.abs(c / n - 1 / 6)).toBeLessThan(0.02);
  });

  it('shuffles into a permutation without mutating the input', () => {
    const input = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const out = new Rng(SEED).shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort((a, b) => a - b)).toEqual([...input]);
    expect(out).not.toEqual([...input]);
  });

  it('throws when picking from an empty array', () => {
    expect(() => new Rng(SEED).pick([])).toThrow(RangeError);
  });
});
