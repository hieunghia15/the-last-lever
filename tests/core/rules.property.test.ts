import { describe, expect, it } from 'vitest';
import { BETTING } from '../../src/config';
import { cardToString } from '../../src/core/cards';
import type { GameEvent, GameState } from '../../src/core/gameState';
import { winsNeeded } from '../../src/core/match';
import { applyAction, availableActions, createMatch } from '../../src/core/rules';
import { Rng } from '../../src/core/rng';
import { deepFreeze } from '../testing';

const show = (cs: readonly number[]) => cs.map(cardToString).join(' ');

function describeEvent(e: GameEvent): string {
  switch (e.type) {
    case 'roundStarted':
      return `round ${e.round}, seat ${e.firstActor} first`;
    case 'holeCardsDealt':
      return `holes ${show(e.holes[0])} | ${show(e.holes[1])}`;
    case 'betPlaced':
      return `seat ${e.seat} ${e.move} -> ${e.level}`;
    case 'streetRevealed':
      return `${e.street} ${show(e.cards)}`;
    case 'showdown':
      return `showdown ${e.ranks.join(' vs ')}, winner ${e.winner}`;
    case 'folded':
      return `seat ${e.seat} folds, pulls ${e.pulls}`;
    case 'challengeStarted':
      return `seat ${e.loser} must pull ${e.pulls}`;
    case 'leverPulled':
      return `seat ${e.seat} lever ${e.lever} ${e.danger ? 'DANGER' : 'safe'}`;
    case 'roundEnded':
      return `round ended ${e.result.kind}, wins ${e.wins.join('-')}, draws ${e.draws}`;
    case 'matchEnded':
      return `match won by seat ${e.winner}`;
  }
}

/** Plays a whole match picking uniformly among legal actions; `check` runs after every step. */
function randomMatch(
  seed: number,
  check: (state: GameState) => void = () => {},
): { state: GameState; events: GameEvent[] } {
  const chooser = new Rng(seed ^ 0x5eed);
  let state = createMatch({ mode: (['bo3', 'bo5', 'bo7'] as const)[seed % 3]!, seed });
  const events: GameEvent[] = [];
  for (let step = 0; step < 10_000; step++) {
    const actions = availableActions(state);
    if (actions.length === 0) return { state, events };
    const result = applyAction(deepFreeze(state), chooser.pick(actions));
    state = result.state;
    events.push(...result.events);
    check(state);
  }
  throw new Error(`Match with seed ${seed} did not finish`);
}

describe('core properties', () => {
  it('replays identically from the same seed', () => {
    expect(randomMatch(1234)).toEqual(randomMatch(1234));
  });

  it('keeps the event sequence of a fixed seed stable', () => {
    const { events } = randomMatch(7);
    // Cards and seats are included so a change in RNG draw order shows up here too.
    expect(events.slice(0, 14).map(describeEvent)).toMatchInlineSnapshot(`
      [
        "round 1, seat 0 first",
        "holes Kc 7s | Ah 6d",
        "seat 0 raise -> 2",
        "seat 1 raise -> 3",
        "seat 0 call -> 3",
        "flop Qd 7h 4d",
        "seat 0 allIn -> 6",
        "seat 1 call -> 6",
        "turn 8s",
        "river As",
        "showdown onePair vs onePair, winner 1",
        "seat 0 must pull 6",
        "seat 0 lever 3 safe",
        "seat 0 lever 5 DANGER",
      ]
    `);
  });

  it('holds its invariants over 200 random matches (and never mutates input)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { state } = randomMatch(seed, (s) => {
        if (s.betting) {
          expect(s.betting.level).toBeGreaterThanOrEqual(BETTING.startLevel);
          expect(s.betting.level).toBeLessThanOrEqual(BETTING.maxLevel);
          expect(s.betting.called[0]).toBeLessThanOrEqual(s.betting.level);
          expect(s.betting.called[1]).toBeLessThanOrEqual(s.betting.level);
        }
        if (s.challenge) {
          expect(s.challenge.pulledCount).toBeLessThanOrEqual(s.challenge.pulls);
        }
        expect(Math.max(...s.wins)).toBeLessThanOrEqual(winsNeeded(s.mode));
        expect(JSON.parse(JSON.stringify(s))).toEqual(s);
      });
      expect(state.phase).toBe('matchOver');
      expect(Math.max(...state.wins)).toBe(winsNeeded(state.mode));
    }
  });
});
