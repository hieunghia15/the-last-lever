import type { TalkLabel } from '../ai/types';
import type { Rng } from '../core/rng';
import type { MessageKey } from '../i18n';
import { vi } from '../i18n/vi';

/** Betting lines follow the bot's label; challenge lines depend only on who has to pull. */
export type TalkGroup = TalkLabel | 'challenge.botPulls' | 'challenge.youPull';

/** Message keys of one group, counted from the Vietnamese catalog so lines can be added freely. */
export function talkKeys(group: TalkGroup): MessageKey[] {
  const prefix = `talk.${group}.`;
  return (Object.keys(vi) as MessageKey[]).filter(
    (key) => key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length)),
  );
}

/** Picks lines at random, never the same line twice in a row. */
export function createTalkPicker(rng: Rng): (group: TalkGroup) => MessageKey {
  let last: MessageKey | null = null;
  return (group) => {
    const keys = talkKeys(group);
    const choices = keys.length > 1 ? keys.filter((key) => key !== last) : keys;
    last = rng.pick(choices);
    return last;
  };
}
