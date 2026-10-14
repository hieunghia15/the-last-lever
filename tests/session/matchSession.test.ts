import { describe, expect, it } from 'vitest';
import { createRandomBot } from '../../src/ai/baselineBots';
import { createBot } from '../../src/ai/botBrain';
import type { Bot } from '../../src/ai/types';
import type { MatchMode } from '../../src/config';
import { IllegalActionError } from '../../src/core/errors';
import type { GameEvent, PlayerView } from '../../src/core/gameState';
import { Rng } from '../../src/core/rng';
import { MatchSession } from '../../src/session/matchSession';

/** Plays the human side with seeded random choices until the match ends. */
function playOut(session: MatchSession, humanSeed: number): GameEvent[] {
  const rng = new Rng(humanSeed);
  const events: GameEvent[] = [];
  for (let steps = 0; session.turn !== 'over'; steps++) {
    if (steps > 10_000) throw new Error('match never ended');
    const view = session.view;
    switch (session.turn) {
      case 'deal':
        events.push(...session.deal());
        break;
      case 'bot':
        events.push(...session.botAct().events);
        break;
      case 'human':
        if (view.phase === 'betting') {
          events.push(...session.humanBet(rng.pick(view.legal)));
        } else {
          const unknown = view.challenge!.levers.flatMap((s, i) => (s === 'unknown' ? [i] : []));
          events.push(...session.humanPull(rng.pick(unknown)));
        }
        break;
    }
  }
  return events;
}

describe('MatchSession', () => {
  it.each<MatchMode>(['bo3', 'bo5', 'bo7'])('plays a %s match to the end', (mode) => {
    for (let seed = 1; seed <= 20; seed++) {
      const session = new MatchSession({ mode, seed });
      const events = playOut(session, seed * 7);
      expect(events.at(-1)?.type).toBe('matchEnded');
      const { wins, winsNeeded } = session.view;
      expect(Math.max(...wins)).toBe(winsNeeded);
    }
  });

  it.each<MatchMode>(['bo3', 'bo5', 'bo7'])(
    'plays a %s match against a personality bot',
    (mode) => {
      for (let seed = 1; seed <= 5; seed++) {
        const bot = createBot({ personality: 'reckless', seed: seed + 1, trials: 40 });
        const events = playOut(new MatchSession({ mode, seed, bot }), seed * 7);
        expect(events.at(-1)?.type).toBe('matchEnded');
      }
    },
  );

  it('passes on what the bot said and why it moved', () => {
    const inner = createRandomBot(5);
    const talker: Bot = {
      chooseBet: (view) => ({
        ...inner.chooseBet(view),
        talk: 'strong',
        trace: { equity: 0.9, fear: 1, riskFold: null, riskGo: null, bluffed: false, lied: true },
      }),
      chooseLever: (view) => inner.chooseLever(view),
    };
    const session = new MatchSession({ mode: 'bo3', seed: 2, bot: talker });
    session.deal();
    while (session.turn === 'human') session.humanBet('check');
    const turn = session.botAct();
    expect(turn.events.length).toBeGreaterThan(0);
    expect(turn.talk).toBe('strong');
    expect(turn.trace?.lied).toBe(true);
  });

  it('starts waiting for a deal', () => {
    const session = new MatchSession({ mode: 'bo3', seed: 1 });
    expect(session.turn).toBe('deal');
    expect(session.view.round).toBe(0);
  });

  it('gives the bot only its own filtered view', () => {
    const seen: PlayerView[] = [];
    const inner = createRandomBot(5);
    const spy: Bot = {
      chooseBet: (view) => (seen.push(view), inner.chooseBet(view)),
      chooseLever: (view) => (seen.push(view), inner.chooseLever(view)),
    };
    playOut(new MatchSession({ mode: 'bo5', seed: 3, bot: spy }), 11);

    expect(seen.length).toBeGreaterThan(0);
    for (const view of seen) {
      expect(view.me).toBe(1);
      expect(view).not.toHaveProperty('holes');
      expect(view).not.toHaveProperty('rngState');
      expect(view.board.length).toBeLessThanOrEqual(5);
      if (view.phase === 'betting') expect(view.showdown).toBeNull();
    }
  });

  it('replays the same events for the same seed and choices', () => {
    const run = () => playOut(new MatchSession({ mode: 'bo5', seed: 42 }), 9);
    expect(run()).toEqual(run());
  });

  it('rejects moves out of turn without changing anything', () => {
    const session = new MatchSession({ mode: 'bo3', seed: 1 });
    expect(() => session.humanBet('check')).toThrow(IllegalActionError);
    expect(() => session.botAct()).toThrow(IllegalActionError);

    session.deal();
    const before = session.view;
    const wrong =
      session.turn === 'human' ? () => session.botAct() : () => session.humanBet('check');
    expect(wrong).toThrow(IllegalActionError);
    expect(() => session.deal()).toThrow(IllegalActionError);
    expect(session.view).toEqual(before);
  });

  it('rejects an illegal human move without changing anything', () => {
    const session = new MatchSession({ mode: 'bo3', seed: 1 });
    session.deal();
    while (session.turn === 'bot') session.botAct();
    const before = session.view;
    const illegal = (['check', 'call'] as const).find((m) => !before.legal.includes(m))!;
    expect(() => session.humanBet(illegal)).toThrow(IllegalActionError);
    expect(session.view).toEqual(before);
  });
});
