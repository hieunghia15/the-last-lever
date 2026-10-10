import { LEVERS } from '../config';
import { IllegalActionError } from './errors';
import type { Rng } from './rng';

export interface LeverConfig {
  count: number;
  minDanger: number;
  maxDanger: number;
}

export interface LeverBoard {
  /** Hidden state; never exposed in a PlayerView until that lever is pulled. */
  danger: boolean[];
  pulled: boolean[];
}

/** Draws the number of Danger levers first, then shuffles their positions. */
export function setupLevers(rng: Rng, cfg: LeverConfig = LEVERS): LeverBoard {
  const dangerCount = rng.range(cfg.minDanger, cfg.maxDanger);
  const layout = Array.from({ length: cfg.count }, (_, i) => i < dangerCount);
  return {
    danger: rng.shuffle(layout),
    pulled: new Array<boolean>(cfg.count).fill(false),
  };
}

export function pullLever(
  board: LeverBoard,
  index: number,
): { board: LeverBoard; danger: boolean } {
  if (!Number.isInteger(index) || index < 0 || index >= board.pulled.length) {
    throw new IllegalActionError(`Lever ${index} does not exist`);
  }
  if (board.pulled[index]) throw new IllegalActionError(`Lever ${index} was already pulled`);
  const pulled = board.pulled.slice();
  pulled[index] = true;
  return { board: { danger: board.danger, pulled }, danger: board.danger[index] === true };
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/**
 * L(m): chance of hitting at least one Danger lever when pulling m levers, with the Danger
 * count uniform over [minDanger, maxDanger]. Stopping early on Danger does not change it.
 */
export function dangerProbability(m: number, cfg: LeverConfig = LEVERS): number {
  if (m <= 0) return 0;
  if (m > cfg.count) return 1;
  const options = cfg.maxDanger - cfg.minDanger + 1;
  let allSafe = 0;
  for (let d = cfg.minDanger; d <= cfg.maxDanger; d++) {
    allSafe += choose(cfg.count - d, m) / choose(cfg.count, m);
  }
  return 1 - allSafe / options;
}
