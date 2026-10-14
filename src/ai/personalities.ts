import { BOT, type PersonalityId } from '../config';
import { other, type PlayerView } from '../core/gameState';

type PersonalityKey = keyof (typeof BOT.personalities)[PersonalityId];

/** One personality's numbers, widened from the config literals so they can be overridden. */
export type Personality = { readonly [K in PersonalityKey]: number };

export const personality = (id: PersonalityId): Personality => BOT.personalities[id];

/**
 * The personality's fear, nudged by the match score: more afraid when the opponent is one
 * win away, a little bolder when leading. In a live match the two never apply together: leading
 * an opponent who is one win away would mean the bot already won.
 */
export function fearFactor(p: Personality, view: PlayerView): number {
  const mine = view.wins[view.me];
  const theirs = view.wins[other(view.me)];
  let fear: number = p.fear;
  if (theirs === view.winsNeeded - 1) fear += BOT.fearWhenOpponentOneAway;
  if (mine > theirs) fear += BOT.fearWhenLeading;
  return fear;
}
