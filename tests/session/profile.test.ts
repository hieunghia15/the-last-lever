import { describe, expect, it } from 'vitest';
import {
  browserStore,
  emptyStats,
  loadLocale,
  loadStats,
  recordMatch,
  saveLocale,
  type KeyValueStore,
} from '../../src/session/profile';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('profile', () => {
  it('starts every difficulty at zero', () => {
    expect(loadStats(memoryStore())).toEqual(emptyStats());
  });

  it('records wins and losses per difficulty and keeps them', () => {
    const store = memoryStore();
    recordMatch(store, 'medium', true);
    recordMatch(store, 'medium', false);
    recordMatch(store, 'hard', true);
    const stats = loadStats(store);
    expect(stats.medium).toEqual({ wins: 1, losses: 1 });
    expect(stats.hard).toEqual({ wins: 1, losses: 0 });
    expect(stats.easy).toEqual({ wins: 0, losses: 0 });
  });

  it('ignores broken or hand-edited data', () => {
    expect(loadStats(memoryStore({ 'tll.stats': '{not json' }))).toEqual(emptyStats());
    const odd = memoryStore({
      'tll.stats': JSON.stringify({ easy: { wins: -2, losses: 'x' }, medium: 5, hard: null }),
    });
    expect(loadStats(odd)).toEqual(emptyStats());
  });

  it('saves the chosen language', () => {
    const store = memoryStore();
    expect(loadLocale(store)).toBeNull();
    saveLocale(store, 'en');
    expect(loadLocale(store)).toBe('en');
  });

  it('survives having no localStorage at all', () => {
    const store = browserStore();
    expect(() => store.setItem('k', 'v')).not.toThrow();
    expect(store.getItem('missing')).toBeNull();
  });
});
