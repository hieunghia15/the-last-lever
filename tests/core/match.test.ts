import { describe, expect, it } from 'vitest';
import { isMatchOver, matchWinner, winsNeeded } from '../../src/core/match';

describe('match', () => {
  it.each([
    ['bo3', 2],
    ['bo5', 3],
    ['bo7', 4],
  ] as const)('%s needs %i wins', (mode, need) => {
    expect(winsNeeded(mode)).toBe(need);
    expect(isMatchOver([need - 1, need - 1], mode)).toBe(false);
    expect(matchWinner([need, need - 1], mode)).toBe(0);
    expect(matchWinner([0, need], mode)).toBe(1);
  });

  it('has no winner at the start', () => {
    expect(matchWinner([0, 0], 'bo3')).toBeNull();
  });
});
