import { describe, expect, it } from 'vitest';
import {
  applyBet,
  foldPulls,
  legalActions,
  startBetting,
  type BetMove,
  type BetOutcome,
  type BettingState,
} from '../../src/core/betting';
import { IllegalActionError } from '../../src/core/errors';
import type { Seat } from '../../src/core/gameState';

const FIRST: Seat = 0;

/** Plays moves for whoever is to act; returns the final betting state and last outcome. */
function bets(...moves: BetMove[]): { betting: BettingState; outcome: BetOutcome } {
  let betting = startBetting(FIRST);
  let outcome: BetOutcome | undefined;
  for (const move of moves) {
    outcome = applyBet(betting, betting.toAct, move, FIRST);
    betting = outcome.betting;
  }
  if (!outcome) throw new Error('bets() needs at least one move');
  return { betting, outcome };
}

describe('legalActions', () => {
  it('opens a street with check, raise, fold and all-in', () => {
    expect(legalActions(startBetting(FIRST))).toEqual(['check', 'raise', 'fold', 'allIn']);
  });

  it('offers call instead of check when facing a raise', () => {
    expect(legalActions(bets('raise').betting)).toEqual(['raise', 'call', 'fold', 'allIn']);
  });

  it('lets the raiser only call or fold after being re-raised', () => {
    const { betting } = bets('raise', 'raise');
    expect(betting.toAct).toBe(0);
    expect(legalActions(betting)).toEqual(['call', 'fold']);
  });

  it('counts all-in as the street raise', () => {
    const { betting } = bets('allIn');
    expect(betting.level).toBe(6);
    expect(legalActions(betting)).toEqual(['call', 'fold']);
  });

  it('blocks raise and all-in once the level is 6', () => {
    const s: BettingState = { ...startBetting(FIRST), level: 6, called: [5, 6] };
    expect(legalActions(s)).toEqual(['call', 'fold']);
  });

  it('lets a seat that already raised this street check but not raise again', () => {
    const s: BettingState = { ...startBetting(FIRST), raisesThisStreet: [1, 0] };
    expect(legalActions(s)).toEqual(['check', 'fold']);
  });
});

describe('applyBet street flow', () => {
  it('check-check moves to the flop with the first actor opening again', () => {
    const { outcome } = bets('check', 'check');
    expect(outcome.kind).toBe('nextStreet');
    expect(outcome.betting).toMatchObject({ street: 'flop', level: 1, toAct: FIRST });
  });

  it('raise-call moves on at the raised level', () => {
    const { outcome } = bets('raise', 'call');
    expect(outcome.kind).toBe('nextStreet');
    expect(outcome.betting).toMatchObject({ street: 'flop', level: 2, called: [2, 2] });
  });

  it('raise-raise-call moves on at level 3', () => {
    const { outcome } = bets('raise', 'raise', 'call');
    expect(outcome.kind).toBe('nextStreet');
    expect(outcome.betting.level).toBe(3);
  });

  it('check-raise gives the opener another turn', () => {
    const { outcome } = bets('check', 'raise');
    expect(outcome.kind).toBe('continue');
    expect(outcome.betting.toAct).toBe(0);
  });

  it('all-in then call runs the board out', () => {
    expect(bets('allIn', 'call').outcome.kind).toBe('runout');
  });

  it('reaching 6 by raises and calling also runs out', () => {
    const { outcome } = bets(
      'raise',
      'raise',
      'call', // flop at 3
      'raise',
      'raise',
      'call', // turn at 5
      'raise',
      'call', // 6 on the turn
    );
    expect(outcome.betting.level).toBe(6);
    expect(outcome.kind).toBe('runout');
  });

  it('closing the river goes to showdown', () => {
    const checks: BetMove[] = new Array<BetMove>(8).fill('check');
    expect(bets(...checks).outcome.kind).toBe('showdown');
  });

  it('never mutates the input state', () => {
    const s = startBetting(FIRST);
    const snapshot = structuredClone(s);
    applyBet(Object.freeze(s), 0, 'raise', FIRST);
    expect(s).toEqual(snapshot);
  });

  it('rejects acting out of turn or an illegal move', () => {
    const s = startBetting(FIRST);
    expect(() => applyBet(s, 1, 'check', FIRST)).toThrow(IllegalActionError);
    expect(() => applyBet(s, 0, 'call', FIRST)).toThrow(IllegalActionError);
  });
});

describe('folding', () => {
  it('pulls 1 when folding on the very first action', () => {
    expect(bets('fold').outcome).toMatchObject({ kind: 'fold', loser: 0, pulls: 1 });
  });

  it('pulls the level already matched, not the raised one', () => {
    // Level 2 after raise-call; on the flop seat 0 raises to 3 and seat 1 folds: seat 1 pulls 2.
    const { outcome } = bets('raise', 'call', 'raise', 'fold');
    expect(outcome).toMatchObject({ kind: 'fold', loser: 1, pulls: 2 });
  });

  it('pulls the matched level when folding to an all-in', () => {
    const { outcome } = bets('raise', 'raise', 'call', 'allIn', 'fold');
    expect(outcome).toMatchObject({ kind: 'fold', loser: 1, pulls: 3 });
  });

  it('exposes foldPulls for the action bar', () => {
    const { betting } = bets('raise');
    expect(foldPulls(betting, 1)).toBe(1);
    expect(foldPulls(betting, 0)).toBe(2);
  });
});
