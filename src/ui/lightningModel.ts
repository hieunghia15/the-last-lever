import type { Rng } from '../core/rng';

/** Lightning geometry for the lever challenge. No Phaser here, so it is tested on Node. */

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  from: Point;
  to: Point;
}

export interface BoltShape {
  /** Midpoint subdivisions; a bolt has 2^depth + 1 points. */
  depth: number;
  /** Largest sideways offset of a midpoint, as a share of its segment's length. */
  jitter: number;
  /** Chance that an inner point of the main bolt grows a branch. */
  branchChance: number;
  /** Branch length as a share of the main bolt's length. */
  branchScale: number;
}

/** A jagged path from `from` to `to` by midpoint displacement; the ends stay exact. */
export function boltPoints(
  from: Point,
  to: Point,
  rng: Rng,
  shape: Pick<BoltShape, 'depth' | 'jitter'>,
): Point[] {
  let points: Point[] = [from, to];
  for (let level = 0; level < shape.depth; level++) {
    const next: Point[] = [from];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1] as Point;
      const b = points[i] as Point;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const offset = (rng.next() * 2 - 1) * shape.jitter;
      // (-dy, dx) is the perpendicular scaled by the segment length, so offset is a share of it.
      next.push({ x: (a.x + b.x) / 2 - dy * offset, y: (a.y + b.y) / 2 + dx * offset }, b);
    }
    points = next;
  }
  return points;
}

/** Short forks off the inner points of a bolt, angled away from its main direction. */
export function boltBranches(main: readonly Point[], rng: Rng, shape: BoltShape): Point[][] {
  const first = main[0];
  const last = main[main.length - 1];
  if (!first || !last) return [];
  const axis = Math.atan2(last.y - first.y, last.x - first.x);
  const reach = Math.hypot(last.x - first.x, last.y - first.y) * shape.branchScale;
  const branches: Point[][] = [];
  for (let i = 1; i < main.length - 1; i++) {
    if (rng.next() >= shape.branchChance) continue;
    const start = main[i] as Point;
    const side = rng.next() < 0.5 ? -1 : 1;
    const angle = axis + side * (0.35 + rng.next() * 0.5);
    const length = reach * (0.5 + rng.next() * 0.5);
    const tip = { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
    branches.push(
      boltPoints(start, tip, rng, { depth: Math.max(1, shape.depth - 2), jitter: shape.jitter }),
    );
  }
  return branches;
}

/** One bolt: the main path first, then its branches. */
export function bolt(from: Point, to: Point, rng: Rng, shape: BoltShape): Point[][] {
  const main = boltPoints(from, to, rng, shape);
  return [main, ...boltBranches(main, rng, shape)];
}

/**
 * `count` points on the edge of the frame, one per equal slice of the circle around `origin`
 * with some wobble, so bolts fan out in every direction instead of bunching up.
 */
export function edgeTargets(
  origin: Point,
  count: number,
  rng: Rng,
  frame: { width: number; height: number },
): Point[] {
  const slice = (Math.PI * 2) / count;
  const turn = rng.next() * slice;
  const targets: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = turn + (i + 0.2 + rng.next() * 0.6) * slice;
    targets.push(rayToEdge(origin, Math.cos(angle), Math.sin(angle), frame));
  }
  return targets;
}

/** Where a ray from a point inside the frame leaves it. */
function rayToEdge(
  origin: Point,
  dx: number,
  dy: number,
  frame: { width: number; height: number },
): Point {
  const hits: number[] = [];
  if (dx > 0) hits.push((frame.width - origin.x) / dx);
  if (dx < 0) hits.push(-origin.x / dx);
  if (dy > 0) hits.push((frame.height - origin.y) / dy);
  if (dy < 0) hits.push(-origin.y / dy);
  const t = Math.min(...hits);
  return {
    x: Math.min(frame.width, Math.max(0, origin.x + dx * t)),
    y: Math.min(frame.height, Math.max(0, origin.y + dy * t)),
  };
}

/** Short arcs hugging a circle, for a shocked portrait: each spans part of the rim. */
export function ringBolts(center: Point, radius: number, count: number, rng: Rng): Segment[] {
  const segments: Segment[] = [];
  const slice = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const start = (i + rng.next() * 0.5) * slice;
    const end = start + (0.4 + rng.next() * 0.5) * Math.PI;
    const at = (angle: number, r: number): Point => ({
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
    });
    segments.push({ from: at(start, radius), to: at(end, radius * (0.9 + rng.next() * 0.3)) });
  }
  return segments;
}
