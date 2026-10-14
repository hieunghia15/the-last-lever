import { describe, expect, it } from 'vitest';
import { playMatch } from '../../src/ai/arena';
import { createCallingBot, createRandomBot } from '../../src/ai/baselineBots';
import type { Bot } from '../../src/ai/types';

/** Runs a full match between two bots, checking and recording each decision. */
function botMatch(bots: [Bot, Bot], seed: number): string[] {
  const log: string[] = [];
  playMatch(
    bots,
    { mode: 'bo5', seed },
    {
      onBet: (seat, view, { move }) => {
        expect(view.legal).toContain(move);
        log.push(`${seat}:${move}`);
      },
      onPull: (seat, view, lever) => {
        expect(view.challenge?.levers[lever]).toBe('unknown');
        log.push(`${seat}:L${lever}`);
      },
    },
  );
  return log;
}

const randomPair = (seed: number): [Bot, Bot] => [
  createRandomBot(seed + 1),
  createRandomBot(seed + 2),
];

describe('createRandomBot', () => {
  it('only makes legal moves and pulls unknown levers through whole matches', () => {
    for (let seed = 1; seed <= 30; seed++) botMatch(randomPair(seed), seed);
  });

  it('decides the same way from the same seed', () => {
    expect(botMatch(randomPair(5), 5)).toEqual(botMatch(randomPair(5), 5));
  });
});

describe('createCallingBot', () => {
  it('only ever checks or calls, and always legally', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const log = botMatch([createCallingBot(seed), createRandomBot(seed + 1)], seed);
      const moves = log.filter((entry) => entry.startsWith('0:') && !entry.includes(':L'));
      expect(moves.length).toBeGreaterThan(0);
      for (const entry of moves) expect(['0:check', '0:call']).toContain(entry);
    }
  });
});
