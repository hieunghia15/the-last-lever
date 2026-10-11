// Bots play each other many times and the result is printed as Markdown for docs/balance.md.
// npm run balance -- [--matches 1000] [--mode 3|5|7] [--seed 1] [--trials 300] [--only a,b]
//   [--set reckless.fear=0.6,cautious.raiseAt=0.65]   try numbers before moving them to config
import { parseArgs } from 'node:util';
import { playMatch } from '../src/ai/arena';
import { createCallingBot, createRandomBot } from '../src/ai/baselineBots';
import { createBot } from '../src/ai/botBrain';
import type { Personality } from '../src/ai/personalities';
import type { Bot } from '../src/ai/types';
import { BOT, EQUITY, PERSONALITIES, type MatchMode, type PersonalityId } from '../src/config';
import type { Seat } from '../src/core/gameState';

const MODES: Record<string, MatchMode> = { '3': 'bo3', '5': 'bo5', '7': 'bo7' };
const BASELINES = ['random', 'calling'] as const;
type Contestant = PersonalityId | (typeof BASELINES)[number];

// Decision #5. The calling bot never folds, so bluffs only lose to it and even a bluff-free bot
// tops out near 62–64%; its bar is lower (see docs/balance.md).
const BEAT_BASELINE: Record<(typeof BASELINES)[number], number> = { random: 0.6, calling: 0.55 };
const PAIR_RANGE = [0.35, 0.65] as const;

const { values } = parseArgs({
  options: {
    matches: { type: 'string', default: '1000' },
    mode: { type: 'string', default: '3' },
    seed: { type: 'string', default: '1' },
    trials: { type: 'string', default: String(EQUITY.trials) },
    only: { type: 'string' },
    set: { type: 'string' },
  },
});

const mode: MatchMode =
  MODES[values.mode] ?? fail(`--mode must be 3, 5 or 7 (got "${values.mode}")`);

function fail(message: string): never {
  throw new Error(message);
}
const matches = positiveInt('matches');
const seed = positiveInt('seed');
const trials = positiveInt('trials');

function positiveInt(name: 'matches' | 'seed' | 'trials'): number {
  const value = Number(values[name]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer (got "${values[name]}")`);
  }
  return value;
}

const overrides = parseOverrides(values.set);

function parseOverrides(
  text: string | undefined,
): Partial<Record<PersonalityId, Partial<Personality>>> {
  const out: Partial<Record<PersonalityId, Record<string, number>>> = {};
  for (const item of text ? text.split(',') : []) {
    const match = /^(\w+)\.(\w+)=([\d.]+)$/.exec(item.trim());
    const id = match?.[1] as PersonalityId | undefined;
    if (!match || !id || !PERSONALITIES.includes(id) || !(match[2]! in BOT.personalities[id])) {
      throw new Error(
        `--set expects personality.key=number, e.g. reckless.fear=0.6 (got "${item}")`,
      );
    }
    (out[id] ??= {})[match[2]!] = Number(match[3]);
  }
  return out;
}

function makeBot(who: Contestant, botSeed: number): Bot {
  if (who === 'random') return createRandomBot(botSeed);
  if (who === 'calling') return createCallingBot(botSeed);
  return createBot({ personality: who, seed: botSeed, trials, overrides: overrides[who] ?? {} });
}

interface Side {
  wins: number;
  /** Rounds in which this side went all-in, folded, bluffed, or lost a challenge. */
  allIns: number;
  folds: number;
  bluffs: number;
  lies: number;
  talks: number;
  challengesLost: number;
}

interface PairResult {
  a: Contestant;
  b: Contestant;
  sides: [Side, Side];
  matches: number;
  rounds: number;
  draws: number;
  challenges: number;
  pullsAtChallenge: number;
}

const emptySide = (): Side => ({
  wins: 0,
  allIns: 0,
  folds: 0,
  bluffs: 0,
  lies: 0,
  talks: 0,
  challengesLost: 0,
});

function runPair(a: Contestant, b: Contestant, pairIndex: number): PairResult {
  const result: PairResult = {
    a,
    b,
    sides: [emptySide(), emptySide()],
    matches,
    rounds: 0,
    draws: 0,
    challenges: 0,
    pullsAtChallenge: 0,
  };
  for (let i = 0; i < matches; i++) {
    const matchSeed = seed * 1_000_003 + pairIndex * 100_003 + i;
    // Alternate seats so neither side keeps any first-seat quirk.
    const swapped = i % 2 === 1;
    const sideOf = (seat: Seat): 0 | 1 => (swapped ? (seat === 0 ? 1 : 0) : seat);
    const bots: [Bot, Bot] = swapped
      ? [makeBot(b, matchSeed * 2 + 1), makeBot(a, matchSeed * 2)]
      : [makeBot(a, matchSeed * 2), makeBot(b, matchSeed * 2 + 1)];

    const final = playMatch(
      bots,
      { mode, seed: matchSeed },
      {
        onBet: (seat, _view, choice) => {
          const side = result.sides[sideOf(seat)];
          if (choice.move === 'allIn') side.allIns++;
          if (choice.trace?.bluffed) side.bluffs++;
          if (choice.talk) side.talks++;
          if (choice.trace?.lied) side.lies++;
        },
        onEvent: (event) => {
          if (event.type === 'folded') result.sides[sideOf(event.seat)].folds++;
          if (event.type === 'challengeStarted') {
            result.challenges++;
            result.pullsAtChallenge += event.pulls;
          }
          if (event.type === 'roundEnded' && event.result.kind === 'win') {
            result.sides[sideOf(event.result.winner === 0 ? 1 : 0)].challengesLost++;
          }
          if (event.type === 'matchEnded') result.sides[sideOf(event.winner)].wins++;
        },
      },
    );
    result.rounds += final.round;
    result.draws += final.draws;
  }
  return result;
}

// ── Report ──────────────────────────────────────────────────────────────────

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
/** Normal-approximation 95% interval half-width for a proportion. */
const ci95 = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);

const isPersonality = (who: Contestant): who is PersonalityId =>
  (PERSONALITIES as readonly string[]).includes(who);

function pairsToRun(): [Contestant, Contestant][] {
  if (values.only) {
    const [a, b] = values.only.split(',') as [Contestant, Contestant];
    const known = [...PERSONALITIES, ...BASELINES] as string[];
    if (!known.includes(a) || !known.includes(b)) {
      throw new Error(`--only takes two of: ${known.join(', ')}`);
    }
    return [[a, b]];
  }
  const pairs: [Contestant, Contestant][] = [];
  PERSONALITIES.forEach((a, i) => PERSONALITIES.slice(i + 1).forEach((b) => pairs.push([a, b])));
  for (const a of PERSONALITIES) for (const b of BASELINES) pairs.push([a, b]);
  return pairs;
}

const started = performance.now();
const results = pairsToRun().map(([a, b], i) => {
  const r = runPair(a, b, i);
  process.stderr.write(`  ${a} – ${b}: ${((performance.now() - started) / 1000).toFixed(0)} s\n`);
  return r;
});
const seconds = (performance.now() - started) / 1000;

console.log(
  `## Báo cáo cân bằng\n\n` +
    `\`npm run balance -- --matches ${matches} --mode ${values.mode} --seed ${seed} --trials ${trials}` +
    `${values.set ? ` --set ${values.set}` : ''}\`` +
    ` · ${seconds.toFixed(0)} giây\n`,
);
console.log('### Tỉ lệ thắng trận\n');
console.log('| A | B | A thắng | ±95% | Ván / trận | Tỉ lệ ván hòa | Mức cược TB khi kéo |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const r of results) {
  const p = r.sides[0].wins / r.matches;
  console.log(
    `| ${r.a} | ${r.b} | ${pct(p)} | ${pct(ci95(p, r.matches))} | ` +
      `${(r.rounds / r.matches).toFixed(2)} | ${pct(r.draws / r.rounds)} | ` +
      `${(r.pullsAtChallenge / Math.max(1, r.challenges)).toFixed(2)} |`,
  );
}

console.log('\n### Hành vi mỗi bên (trên số ván đã chơi)\n');
console.log('| Cặp | Bên | Tất tay | Bỏ bài | Lừa | Thua thử thách | Nói | Nói dối / nói |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of results) {
  r.sides.forEach((s, i) => {
    const who = i === 0 ? r.a : r.b;
    console.log(
      `| ${r.a} – ${r.b} | ${who} | ${pct(s.allIns / r.rounds)} | ${pct(s.folds / r.rounds)} | ` +
        `${pct(s.bluffs / r.rounds)} | ${pct(s.challengesLost / r.rounds)} | ` +
        `${s.talks} | ${s.talks ? pct(s.lies / s.talks) : '–'} |`,
    );
  });
}

// Decision #5: every personality beats each baseline by its bar; personality pairs stay in 35–65%.
const verdicts: string[] = [];
for (const r of results) {
  const p = r.sides[0].wins / r.matches;
  if (isPersonality(r.a) && !isPersonality(r.b)) {
    const bar = BEAT_BASELINE[r.b];
    const ok = p >= bar;
    verdicts.push(`${ok ? 'ĐẠT' : 'CHƯA ĐẠT'}: ${r.a} thắng ${r.b} ${pct(p)} (cần ≥ ${pct(bar)})`);
  } else if (isPersonality(r.a) && isPersonality(r.b)) {
    const ok = p >= PAIR_RANGE[0] && p <= PAIR_RANGE[1];
    verdicts.push(`${ok ? 'ĐẠT' : 'CHƯA ĐẠT'}: ${r.a} – ${r.b} ${pct(p)} (cần 35–65%)`);
  }
}
console.log('\n### Tiêu chí (quyết định #5)\n');
for (const line of verdicts) console.log(`- ${line}`);
const allPass = verdicts.every((line) => line.startsWith('ĐẠT'));
console.log(`\n**${allPass ? 'ĐẠT tất cả tiêu chí' : 'CHƯA ĐẠT'}**`);
