import { describe, expect, it } from 'vitest';
import { BETTING, LEVERS, MATCH_MODES } from '../src/config';

describe('config', () => {
  it('always leaves at least one Safe and one Danger lever', () => {
    expect(LEVERS.minDanger).toBeGreaterThanOrEqual(1);
    expect(LEVERS.minDanger).toBeLessThanOrEqual(LEVERS.maxDanger);
    expect(LEVERS.maxDanger).toBeLessThanOrEqual(LEVERS.count - 1);
  });

  it('never asks a player to pull more levers than exist', () => {
    expect(BETTING.maxLevel).toBeLessThanOrEqual(LEVERS.count);
  });

  it('has a sane betting range', () => {
    expect(BETTING.startLevel).toBeGreaterThanOrEqual(1);
    expect(BETTING.startLevel).toBeLessThanOrEqual(BETTING.maxLevel);
    expect(BETTING.raiseStep).toBeGreaterThanOrEqual(1);
    expect(BETTING.minPullOnFold).toBeGreaterThanOrEqual(1);
    expect(BETTING.minPullOnFold).toBeLessThanOrEqual(BETTING.maxLevel);
    expect(BETTING.maxRaisesPerPlayerPerStreet).toBeGreaterThanOrEqual(1);
  });

  it('maps BEST OF 3/5/7 to 2/3/4 wins', () => {
    expect(MATCH_MODES.bo3.winsNeeded).toBe(2);
    expect(MATCH_MODES.bo5.winsNeeded).toBe(3);
    expect(MATCH_MODES.bo7.winsNeeded).toBe(4);
  });
});
