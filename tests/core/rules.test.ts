import { describe, expect, it } from 'vitest';
import type { BetMove } from '../../src/core/betting';
import { IllegalActionError } from '../../src/core/errors';
import type { Action, GameEvent, GameState, Seat } from '../../src/core/gameState';
import { applyAction, availableActions, createMatch, currentActor } from '../../src/core/rules';
import { deepFreeze, play, withCards, withFirstActor, withLevers } from '../testing';

const SEED = 4242;

const bet = (seat: Seat, move: BetMove): Action => ({ type: 'bet', seat, move });
const pull = (seat: Seat, lever: number): Action => ({ type: 'pull', seat, lever });
const types = (events: GameEvent[]) => events.map((e) => e.type);

/** A dealt round where seat 0 opens, with known cards. Seat 0 holds aces, seat 1 holds kings. */
function dealtRound(opts: { hole0?: string; hole1?: string; board?: string } = {}): GameState {
  const dealt = applyAction(createMatch({ mode: 'bo3', seed: SEED }), { type: 'deal' }).state;
  return withFirstActor(
    withCards(dealt, {
      hole0: opts.hole0 ?? 'As Ad',
      hole1: opts.hole1 ?? 'Ks Kd',
      board: opts.board ?? '2c 7d 9h Jc 3s',
    }),
    0,
  );
}

/** Both seats check through all four streets. */
const checkDown: Action[] = Array.from({ length: 8 }, (_, i) => bet(i % 2 === 0 ? 0 : 1, 'check'));

describe('deal', () => {
  it('deals 9 distinct cards and starts pre-flop betting at level 1', () => {
    const { state, events } = applyAction(createMatch({ mode: 'bo5', seed: SEED }), {
      type: 'deal',
    });
    const dealt = [...state.holes[0], ...state.holes[1], ...state.board];
    expect(new Set(dealt).size).toBe(9);
    expect(state).toMatchObject({ phase: 'betting', round: 1, revealed: 0 });
    expect(state.betting).toMatchObject({ street: 'preflop', level: 1, toAct: state.firstActor });
    expect(types(events)).toEqual(['roundStarted', 'holeCardsDealt']);
  });

  it('does not mutate its input', () => {
    const s = deepFreeze(createMatch({ mode: 'bo3', seed: SEED }));
    expect(() => applyAction(s, { type: 'deal' })).not.toThrow();
  });

  it('rejects dealing in the middle of a round', () => {
    expect(() => applyAction(dealtRound(), { type: 'deal' })).toThrow(IllegalActionError);
  });

  it('lets both seats go first over several seeded rounds', () => {
    const firsts = new Set<Seat>();
    for (let seed = 1; seed <= 20; seed++) {
      firsts.add(
        applyAction(createMatch({ mode: 'bo3', seed }), { type: 'deal' }).state.firstActor,
      );
    }
    expect([...firsts].sort()).toEqual([0, 1]);
  });
});

describe('betting through the streets', () => {
  it('has the first actor open all four streets', () => {
    let s = dealtRound();
    const openers: Seat[] = [];
    for (let street = 0; street < 4; street++) {
      openers.push(currentActor(s)!);
      s = play(s, bet(0, 'check'), bet(1, 'check')).state;
    }
    expect(openers).toEqual([0, 0, 0, 0]);
  });

  it('reveals 3, 1 and 1 community cards', () => {
    const { events } = play(dealtRound(), ...checkDown);
    const reveals = events.filter((e) => e.type === 'streetRevealed');
    expect(reveals.map((e) => [e.street, e.cards.length])).toEqual([
      ['flop', 3],
      ['turn', 1],
      ['river', 1],
    ]);
  });

  it('rejects acting out of turn and illegal moves', () => {
    const s = dealtRound();
    expect(() => applyAction(s, bet(1, 'check'))).toThrow(IllegalActionError);
    expect(() => applyAction(s, bet(0, 'call'))).toThrow(IllegalActionError);
    expect(() => applyAction(s, pull(0, 0))).toThrow(IllegalActionError);
  });
});

describe('showdown', () => {
  it('sends the poker loser to pull the current level', () => {
    const { state, events } = play(
      dealtRound(),
      bet(0, 'raise'),
      bet(1, 'call'),
      ...checkDown.slice(2),
    );
    expect(types(events)).toContain('showdown');
    expect(state.phase).toBe('challenge');
    expect(state.challenge).toMatchObject({ loser: 1, pulls: 2, pulledCount: 0 });
  });

  it('ends the round as a draw with no levers on a poker tie', () => {
    const tied = dealtRound({ hole0: '2d 3d', hole1: '2h 3h', board: 'Tc Jd Qh Ks As' });
    const { state, events } = play(tied, ...checkDown);
    expect(types(events)).not.toContain('challengeStarted');
    expect(events.at(-1)).toMatchObject({
      type: 'roundEnded',
      result: { kind: 'draw', reason: 'pokerTie' },
    });
    expect(state).toMatchObject({ phase: 'roundResult', draws: 1, wins: [0, 0] });
  });

  it('runs the board out after an all-in is called, then pulls 6', () => {
    const { state, events } = play(dealtRound(), bet(0, 'allIn'), bet(1, 'call'));
    expect(types(events)).toEqual([
      'betPlaced',
      'betPlaced',
      'streetRevealed',
      'streetRevealed',
      'streetRevealed',
      'showdown',
      'challengeStarted',
    ]);
    expect(state.revealed).toBe(5);
    expect(state.challenge).toMatchObject({ loser: 1, pulls: 6 });
  });
});

describe('folding', () => {
  it('pulls 1 when folding on the first action, with no showdown', () => {
    const { state, events } = play(dealtRound(), bet(0, 'fold'));
    expect(types(events)).toEqual(['betPlaced', 'folded', 'challengeStarted']);
    expect(state.showdown).toBeNull();
    expect(state.challenge).toMatchObject({ loser: 0, pulls: 1 });
  });

  it('pulls the level already matched after being raised', () => {
    const { state } = play(
      dealtRound(),
      bet(0, 'raise'),
      bet(1, 'call'),
      bet(0, 'raise'),
      bet(1, 'fold'),
    );
    expect(state.challenge).toMatchObject({ loser: 1, pulls: 2 });
  });

  it('pulls the matched level when folding to an all-in', () => {
    const { state } = play(dealtRound(), bet(0, 'allIn'), bet(1, 'fold'));
    expect(state.challenge).toMatchObject({ loser: 1, pulls: 1 });
  });
});

describe('lever challenge', () => {
  /** Seat 1 lost the showdown at level 3 and must pull 3 levers. */
  const challengeAt3 = (pattern: string) =>
    withLevers(
      play(dealtRound(), bet(0, 'raise'), bet(1, 'raise'), bet(0, 'call'), ...checkDown.slice(2))
        .state,
      pattern,
    );

  it('stops at the first Danger lever and gives the opponent a win', () => {
    const { state, events } = play(challengeAt3('SDSSSS'), pull(1, 0), pull(1, 1));
    expect(events.map((e) => (e.type === 'leverPulled' ? e.danger : e.type))).toEqual([
      false,
      true,
      'roundEnded',
    ]);
    expect(state).toMatchObject({
      phase: 'roundResult',
      wins: [1, 0],
      lastResult: { kind: 'win', winner: 0, reason: 'danger' },
    });
    expect(() => applyAction(state, pull(1, 2))).toThrow(IllegalActionError);
  });

  it('is a draw when every pulled lever is Safe', () => {
    const { state, events } = play(challengeAt3('SSSDDD'), pull(1, 0), pull(1, 1), pull(1, 2));
    expect(events.at(-1)).toMatchObject({
      type: 'roundEnded',
      result: { kind: 'draw', reason: 'allSafe' },
    });
    expect(state).toMatchObject({ draws: 1, wins: [0, 0] });
  });

  it('only lets the poker loser pull, and only unpulled levers', () => {
    const s = challengeAt3('SSSDDD');
    expect(() => applyAction(s, pull(0, 0))).toThrow(IllegalActionError);
    const after = applyAction(s, pull(1, 0)).state;
    expect(() => applyAction(after, pull(1, 0))).toThrow(IllegalActionError);
  });

  it('offers exactly the unpulled levers to the loser', () => {
    const after = applyAction(challengeAt3('SSDSSD'), pull(1, 4)).state;
    expect(availableActions(after)).toEqual(
      [0, 1, 2, 3, 5].map((lever) => ({ type: 'pull', seat: 1, lever })),
    );
  });
});

describe('ending the match', () => {
  /** Plays rounds where seat 1 always folds first and pulls straight into Danger. */
  function seat0WinsRound(s: GameState): ReturnType<typeof play> {
    const dealt = withFirstActor(applyAction(s, { type: 'deal' }).state, 1);
    const folded = applyAction(dealt, bet(1, 'fold')).state;
    return play(withLevers(folded, 'DSSSSS'), pull(1, 0));
  }

  it.each([
    ['bo3', 2],
    ['bo5', 3],
    ['bo7', 4],
  ] as const)('%s ends after %i wins', (mode, need) => {
    let s = createMatch({ mode, seed: SEED });
    let last: GameEvent[] = [];
    for (let i = 0; i < need; i++) {
      expect(s.phase).not.toBe('matchOver');
      ({ state: s, events: last } = seat0WinsRound(s));
    }
    expect(s.phase).toBe('matchOver');
    expect(last.at(-1)).toMatchObject({ type: 'matchEnded', winner: 0, wins: [need, 0] });
    expect(availableActions(s)).toEqual([]);
    expect(() => applyAction(s, { type: 'deal' })).toThrow(IllegalActionError);
  });
});
