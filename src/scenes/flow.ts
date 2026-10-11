import type Phaser from 'phaser';
import {
  DIFFICULTIES,
  MATCH_MODES,
  type Difficulty,
  type DifficultyChoice,
  type MatchMode,
} from '../config';

/** What the menu remembers between screens: the last match format and opponent picked. */
export interface MenuChoice {
  mode: MatchMode;
  difficulty: DifficultyChoice;
}

export interface TableSceneData {
  mode: MatchMode;
  seed: number;
  difficulty: Difficulty;
  /** The menu pick, so "play again" re-rolls a random opponent instead of keeping it. */
  choice: DifficultyChoice;
}

export interface ResultSceneData {
  won: boolean;
  wins: [number, number];
  draws: number;
  mode: MatchMode;
  difficulty: Difficulty;
  choice: DifficultyChoice;
  names: [string, string];
  record: { wins: number; losses: number };
}

const CHOICE_KEY = 'menuChoice';
const DEFAULT_CHOICE: MenuChoice = { mode: 'bo3', difficulty: 'medium' };

export function getMenuChoice(scene: Phaser.Scene): MenuChoice {
  return (scene.registry.get(CHOICE_KEY) as MenuChoice | undefined) ?? DEFAULT_CHOICE;
}

export function setMenuChoice(scene: Phaser.Scene, choice: MenuChoice): void {
  scene.registry.set(CHOICE_KEY, choice);
}

export const bestOf = (mode: MatchMode): number => MATCH_MODES[mode].winsNeeded * 2 - 1;

/** ?seed=123 replays a match; the same seed works with `npm run sim -- --seed`. */
function pickSeed(): number {
  const fromUrl = Number(new URLSearchParams(location.search).get('seed'));
  if (Number.isInteger(fromUrl) && fromUrl > 0) return fromUrl;
  // Presentation-side randomness is fine: the core only ever sees the resulting seed.
  return Math.floor(Math.random() * 1_000_000_000) + 1;
}

export function startMatch(scene: Phaser.Scene, mode: MatchMode, choice: DifficultyChoice): void {
  const seed = pickSeed();
  // "Random" is drawn from the seed, so a replayed seed also replays the opponent.
  const difficulty: Difficulty =
    choice === 'random' ? (DIFFICULTIES[seed % DIFFICULTIES.length] ?? 'medium') : choice;
  console.info(`[The Last Lever] ${mode}, ${difficulty}, seed ${seed}`);
  const data: TableSceneData = { mode, seed, difficulty, choice };
  scene.scene.start('TableScene', data);
}
