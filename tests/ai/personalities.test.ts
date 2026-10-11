import { describe, expect, it } from 'vitest';
import { BOT } from '../../src/config';
import { fearFactor, personality } from '../../src/ai/personalities';
import { bettingView } from '../testing';

describe('fearFactor', () => {
  const balanced = personality('balanced');
  // Bot sits in seat 1, BEST OF 5 (3 wins needed).
  const fear = (wins: [number, number]) => fearFactor(balanced, bettingView({ mode: 'bo5', wins }));

  it('is the personality fear on an even score', () => {
    expect(fear([0, 0])).toBeCloseTo(balanced.fear);
    expect(fear([1, 1])).toBeCloseTo(balanced.fear);
  });

  it('drops a little when the bot leads', () => {
    expect(fear([0, 1])).toBeCloseTo(balanced.fear + BOT.fearWhenLeading);
  });

  it('rises when the opponent is one win away', () => {
    expect(fear([2, 2])).toBeCloseTo(balanced.fear + BOT.fearWhenOpponentOneAway);
    expect(fear([2, 1])).toBeCloseTo(balanced.fear + BOT.fearWhenOpponentOneAway);
  });

  it('reads the score from the seat it plays', () => {
    const asSeat0 = fearFactor(balanced, bettingView({ me: 0, mode: 'bo5', wins: [1, 0] }));
    expect(asSeat0).toBeCloseTo(balanced.fear + BOT.fearWhenLeading);
  });
});
