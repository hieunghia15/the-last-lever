import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { en } from '../../src/i18n/en';
import { createTalkPicker, talkKeys, type TalkGroup } from '../../src/ui/talkModel';

const MIN_LINES: Record<TalkGroup, number> = {
  strong: 8,
  weak: 8,
  neutral: 8,
  'challenge.botPulls': 4,
  'challenge.youPull': 4,
};
const GROUPS = Object.keys(MIN_LINES) as TalkGroup[];

describe('talkKeys', () => {
  it.each(GROUPS)('has enough %s lines in both languages', (group) => {
    const keys = talkKeys(group);
    expect(keys.length).toBeGreaterThanOrEqual(MIN_LINES[group]);
    for (const key of keys) expect(en[key]).toBeTruthy();
  });

  it('keeps the challenge lines out of the betting groups', () => {
    const betting = [...talkKeys('strong'), ...talkKeys('weak'), ...talkKeys('neutral')];
    expect(betting.some((key) => key.includes('challenge'))).toBe(false);
  });
});

describe('createTalkPicker', () => {
  it('never says the same line twice in a row', () => {
    const pick = createTalkPicker(new Rng(3));
    let last = '';
    for (let i = 0; i < 500; i++) {
      const key = pick(i % 7 === 0 ? 'weak' : 'strong');
      expect(key).not.toBe(last);
      last = key;
    }
  });

  it('only returns lines of the asked group', () => {
    const pick = createTalkPicker(new Rng(4));
    for (const group of GROUPS) {
      for (let i = 0; i < 20; i++) expect(talkKeys(group)).toContain(pick(group));
    }
  });

  it('uses every line of a group eventually', () => {
    const pick = createTalkPicker(new Rng(5));
    const seen = new Set(Array.from({ length: 200 }, () => pick('neutral')));
    expect(seen.size).toBe(talkKeys('neutral').length);
  });
});
