import { describe, expect, it } from 'vitest';
import type { BetMove } from '../../src/core/betting';
import type { PlayerView } from '../../src/core/gameState';
import { actionBarModel } from '../../src/ui/actionBarModel';

function view(opts: {
  level: number;
  called: [number, number];
  raises?: [number, number];
  legal: BetMove[];
}): PlayerView {
  return {
    me: 0,
    phase: 'betting',
    mode: 'bo3',
    winsNeeded: 2,
    wins: [0, 0],
    draws: 0,
    round: 1,
    firstActor: 0,
    hole: [],
    board: [],
    betting: {
      street: 'flop',
      level: opts.level,
      called: opts.called,
      raisesThisStreet: opts.raises ?? [0, 0],
      toAct: 0,
    },
    legal: opts.legal,
    challenge: null,
    showdown: null,
    lastResult: null,
  };
}

const enabled = (v: PlayerView) =>
  actionBarModel(v)
    .filter((i) => i.enabled)
    .map((i) => i.move);
const subtitleOf = (v: PlayerView, move: BetMove) =>
  actionBarModel(v).find((i) => i.move === move)!.subtitle;

describe('actionBarModel', () => {
  it('lists the five moves in action-bar order', () => {
    const items = actionBarModel(
      view({ level: 1, called: [1, 1], legal: ['check', 'raise', 'fold', 'allIn'] }),
    );
    expect(items.map((i) => i.move)).toEqual(['check', 'raise', 'call', 'fold', 'allIn']);
    expect(items.map((i) => i.label)).toEqual(['XEM BÀI', 'TĂNG +1', 'THEO', 'BỎ', 'TẤT TAY']);
  });

  it('opens a street with check, raise, fold and all-in, but no call', () => {
    const v = view({ level: 1, called: [1, 1], legal: ['check', 'raise', 'fold', 'allIn'] });
    expect(enabled(v)).toEqual(['check', 'raise', 'fold', 'allIn']);
    expect(subtitleOf(v, 'raise')).toBe('lên 2');
    expect(subtitleOf(v, 'fold')).toBe('kéo 1 cần');
    expect(subtitleOf(v, 'allIn')).toBe('lên 6');
  });

  it('after a raise from 2 to 3, calling risks 3 and folding pulls 2', () => {
    const v = view({ level: 3, called: [2, 3], legal: ['raise', 'call', 'fold', 'allIn'] });
    expect(subtitleOf(v, 'call')).toBe('thua: kéo 3 cần');
    expect(subtitleOf(v, 'fold')).toBe('kéo 2 cần');
  });

  it('disables raise and all-in at the top level', () => {
    const v = view({ level: 6, called: [3, 6], legal: ['call', 'fold'] });
    expect(enabled(v)).toEqual(['call', 'fold']);
  });

  it('disables everything when it is not my turn', () => {
    const v = view({ level: 2, called: [2, 2], legal: [] });
    expect(enabled(v)).toEqual([]);
  });
});
