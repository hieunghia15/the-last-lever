import { describe, expect, it } from 'vitest';
import type { Action, GameState, Seat } from '../../src/core/gameState';
import { applyAction, createMatch, viewFor } from '../../src/core/rules';
import { play, withCards, withFirstActor, withLevers } from '../testing';

const SEED = 99;
const bet = (seat: Seat, move: 'check' | 'call' | 'raise' | 'fold' | 'allIn'): Action => ({
  type: 'bet',
  seat,
  move,
});

function dealt(): GameState {
  const s = applyAction(createMatch({ mode: 'bo3', seed: SEED }), { type: 'deal' }).state;
  return withFirstActor(
    withCards(s, { hole0: 'As Ad', hole1: 'Ks Kd', board: '2c 7d 9h Jc 3s' }),
    0,
  );
}

describe('viewFor', () => {
  it('exposes exactly the public fields', () => {
    expect(Object.keys(viewFor(dealt(), 0)).sort()).toEqual([
      'betting',
      'board',
      'challenge',
      'draws',
      'firstActor',
      'hole',
      'lastResult',
      'legal',
      'me',
      'mode',
      'phase',
      'round',
      'showdown',
      'wins',
      'winsNeeded',
    ]);
  });

  it('never contains the opponent hole cards, the deck or unrevealed board before showdown', () => {
    const s = dealt();
    const view = viewFor(s, 0);
    const json = JSON.stringify(view);
    expect(view.hole).toEqual(s.holes[0]);
    expect(view.board).toEqual([]);
    expect(view.showdown).toBeNull();
    expect(json).not.toContain('rngState');
    for (const card of s.holes[1]) expect(view.hole).not.toContain(card);
  });

  it('shows only revealed community cards', () => {
    const flop = play(dealt(), bet(0, 'check'), bet(1, 'check')).state;
    expect(viewFor(flop, 1).board).toEqual(flop.board.slice(0, 3));
  });

  it('lists legal moves only for the seat to act', () => {
    const s = dealt();
    expect(viewFor(s, 0).legal).toEqual(['check', 'raise', 'fold', 'allIn']);
    expect(viewFor(s, 1).legal).toEqual([]);
  });

  it('shows opponent cards and hand ranks after a showdown', () => {
    const shown = play(dealt(), bet(0, 'allIn'), bet(1, 'call')).state;
    expect(viewFor(shown, 0).showdown).toEqual({
      opponentHole: shown.holes[1],
      myRank: 'onePair',
      opponentRank: 'onePair',
      winner: 0,
    });
  });

  it('does not show opponent cards after a fold', () => {
    const folded = play(dealt(), bet(0, 'fold')).state;
    expect(viewFor(folded, 0).showdown).toBeNull();
    expect(viewFor(folded, 1).showdown).toBeNull();
  });

  it('reveals only the levers that were pulled', () => {
    const folded = withLevers(play(dealt(), bet(0, 'raise'), bet(1, 'fold')).state, 'DSSSSD');
    expect(viewFor(folded, 1).challenge?.levers).toEqual(new Array(6).fill('unknown'));
    const after = applyAction(folded, { type: 'pull', seat: 1, lever: 2 }).state;
    expect(viewFor(after, 0).challenge?.levers).toEqual([
      'unknown',
      'unknown',
      'safe',
      'unknown',
      'unknown',
      'unknown',
    ]);
  });
});
