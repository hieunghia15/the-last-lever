import { DIFFICULTIES, type Difficulty } from '../config';

/** The slice of the Web Storage API the profile needs; tests pass an in-memory fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MatchRecord {
  wins: number;
  losses: number;
}

export type Stats = { [D in Difficulty]: MatchRecord };

const KEYS = { stats: 'tll.stats', locale: 'tll.locale' } as const;

export const emptyStats = (): Stats => ({
  easy: { wins: 0, losses: 0 },
  medium: { wins: 0, losses: 0 },
  hard: { wins: 0, losses: 0 },
});

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;

/** Reads match stats, falling back to zeros for anything missing or hand-edited into nonsense. */
export function loadStats(store: KeyValueStore): Stats {
  const stats = emptyStats();
  let saved: unknown;
  try {
    saved = JSON.parse(store.getItem(KEYS.stats) ?? '{}');
  } catch {
    return stats;
  }
  if (typeof saved !== 'object' || saved === null) return stats;
  for (const difficulty of DIFFICULTIES) {
    const entry = (saved as { [key: string]: unknown })[difficulty];
    if (typeof entry !== 'object' || entry === null) continue;
    const { wins, losses } = entry as { wins?: unknown; losses?: unknown };
    stats[difficulty] = { wins: count(wins), losses: count(losses) };
  }
  return stats;
}

/** Adds one finished match and returns the updated stats. */
export function recordMatch(store: KeyValueStore, difficulty: Difficulty, won: boolean): Stats {
  const stats = loadStats(store);
  const entry = stats[difficulty];
  stats[difficulty] = won
    ? { wins: entry.wins + 1, losses: entry.losses }
    : { wins: entry.wins, losses: entry.losses + 1 };
  store.setItem(KEYS.stats, JSON.stringify(stats));
  return stats;
}

export const loadLocale = (store: KeyValueStore): string | null => store.getItem(KEYS.locale);

export function saveLocale(store: KeyValueStore, locale: string): void {
  store.setItem(KEYS.locale, locale);
}

/**
 * localStorage behind try/catch: private mode, disabled storage or a full quota must never
 * break the game, so failures read as "nothing saved" and writes are dropped.
 */
export function browserStore(): KeyValueStore {
  const storage = (): Storage | null => {
    try {
      return (globalThis as { localStorage?: Storage }).localStorage ?? null;
    } catch {
      return null;
    }
  };
  return {
    getItem(key) {
      try {
        return storage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        storage()?.setItem(key, value);
      } catch {
        // Quota or privacy settings; the game simply forgets.
      }
    },
  };
}
