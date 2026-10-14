import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import {
  bolt,
  boltBranches,
  boltPoints,
  edgeTargets,
  ringBolts,
  type BoltShape,
  type Point,
} from '../../src/ui/lightningModel';

const SHAPE: BoltShape = { depth: 4, jitter: 0.25, branchChance: 0.3, branchScale: 0.4 };
const FRAME = { width: 1280, height: 720 };
const FROM = { x: 100, y: 200 };
const TO = { x: 700, y: 500 };

/** Distance from p to the infinite line through a and b. */
function lineDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / Math.hypot(dx, dy);
}

describe('boltPoints', () => {
  it('keeps both ends exact and has 2^depth + 1 points', () => {
    for (const depth of [1, 3, 5]) {
      const points = boltPoints(FROM, TO, new Rng(depth), { depth, jitter: 0.3 });
      expect(points).toHaveLength(2 ** depth + 1);
      expect(points[0]).toEqual(FROM);
      expect(points[points.length - 1]).toEqual(TO);
    }
  });

  it('stays inside the jitter corridor around the straight line', () => {
    const length = Math.hypot(TO.x - FROM.x, TO.y - FROM.y);
    // A segment at level k is at most r^k of the full length, and each level adds jitter of it.
    const r = Math.sqrt(0.25 + SHAPE.jitter ** 2);
    let bound = 0;
    for (let k = 0; k < SHAPE.depth; k++) bound += SHAPE.jitter * length * r ** k;
    for (let seed = 0; seed < 50; seed++) {
      for (const p of boltPoints(FROM, TO, new Rng(seed), SHAPE)) {
        expect(lineDistance(p, FROM, TO)).toBeLessThanOrEqual(bound + 1e-9);
      }
    }
  });

  it('is a straight line without jitter, and a point when both ends meet', () => {
    for (const p of boltPoints(FROM, TO, new Rng(1), { depth: 3, jitter: 0 })) {
      expect(lineDistance(p, FROM, TO)).toBeCloseTo(0, 9);
    }
    for (const p of boltPoints(FROM, FROM, new Rng(1), SHAPE)) expect(p).toEqual(FROM);
  });

  it('draws the same bolt from the same seed and a different one from another', () => {
    const a = bolt(FROM, TO, new Rng(9), SHAPE);
    expect(bolt(FROM, TO, new Rng(9), SHAPE)).toEqual(a);
    expect(bolt(FROM, TO, new Rng(10), SHAPE)).not.toEqual(a);
  });
});

describe('boltBranches', () => {
  it('starts every branch on an inner point of the main bolt', () => {
    const main = boltPoints(FROM, TO, new Rng(4), SHAPE);
    const inner = main.slice(1, -1);
    const branches = boltBranches(main, new Rng(5), { ...SHAPE, branchChance: 1 });
    expect(branches).toHaveLength(inner.length);
    branches.forEach((branch, i) => expect(branch[0]).toEqual(inner[i]));
  });

  it('grows nothing when the chance is zero', () => {
    const main = boltPoints(FROM, TO, new Rng(4), SHAPE);
    expect(boltBranches(main, new Rng(5), { ...SHAPE, branchChance: 0 })).toEqual([]);
  });
});

describe('edgeTargets', () => {
  const onEdge = (p: Point) =>
    Math.abs(p.x) < 1e-6 ||
    Math.abs(p.x - FRAME.width) < 1e-6 ||
    Math.abs(p.y) < 1e-6 ||
    Math.abs(p.y - FRAME.height) < 1e-6;

  it('puts every target on the edge of the frame', () => {
    for (let seed = 0; seed < 30; seed++) {
      const origin = { x: 200 + seed * 25, y: 150 + seed * 10 };
      for (const p of edgeTargets(origin, 6, new Rng(seed), FRAME)) {
        expect(onEdge(p)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(FRAME.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(FRAME.height);
      }
    }
  });

  it('fans out in every direction instead of bunching up', () => {
    const origin = { x: 640, y: 360 };
    const count = 6;
    const slice = (Math.PI * 2) / count;
    for (let seed = 0; seed < 30; seed++) {
      const angles = edgeTargets(origin, count, new Rng(seed), FRAME)
        .map((p) => Math.atan2(p.y - origin.y, p.x - origin.x))
        .sort((a, b) => a - b);
      const gaps = angles.map((a, i) => (angles[i + 1] ?? (angles[0] ?? 0) + Math.PI * 2) - a);
      expect(Math.max(...gaps)).toBeLessThan(2 * slice);
    }
  });
});

describe('ringBolts', () => {
  it('starts every arc on the rim and ends it near the rim', () => {
    const center = { x: 640, y: 117 };
    const segments = ringBolts(center, 50, 4, new Rng(2));
    expect(segments).toHaveLength(4);
    for (const { from, to } of segments) {
      expect(Math.hypot(from.x - center.x, from.y - center.y)).toBeCloseTo(50, 9);
      const end = Math.hypot(to.x - center.x, to.y - center.y);
      expect(end).toBeGreaterThanOrEqual(45);
      expect(end).toBeLessThanOrEqual(60);
    }
  });
});
