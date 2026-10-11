// Play one match in the terminal against the random bot. You are seat 0.
// npm run play -- --mode 3 [--seed 42]
import { stdin, stdout } from 'node:process';
import * as readline from 'node:readline';
import { parseArgs } from 'node:util';
import { createRandomBot } from '../src/ai/baselineBots';
import { BETTING, type MatchMode } from '../src/config';
import { foldPulls, type BetMove } from '../src/core/betting';
import type { Action, GameState, PlayerView, Seat } from '../src/core/gameState';
import { applyAction, createMatch, currentActor, viewFor } from '../src/core/rules';
import { cardsText, formatEvent, streetText } from './format';

const MODES: Record<string, MatchMode> = { '3': 'bo3', '5': 'bo5', '7': 'bo7' };
const HUMAN: Seat = 0;
const BOT: Seat = 1;
const names: [string, string] = ['Bạn', 'Bot'];

const { values } = parseArgs({
  options: { seed: { type: 'string' }, mode: { type: 'string', default: '3' } },
});
const mode = MODES[values.mode];
if (!mode) throw new Error(`--mode must be 3, 5 or 7 (got "${values.mode}")`);
const seed = values.seed === undefined ? Date.now() % 1_000_000 : Number(values.seed);

const rl = readline.createInterface({ input: stdin, output: stdout });
// Reading through the async iterator buffers every line, so piped input is never dropped.
const lines = rl[Symbol.asyncIterator]();

class InputClosed extends Error {}

async function ask(prompt: string): Promise<string> {
  stdout.write(prompt);
  const { value, done } = await lines.next();
  if (done) throw new InputClosed();
  if (!stdin.isTTY) stdout.write(`${value}\n`);
  return value;
}
const bot = createRandomBot(seed + 1);

function moveLabel(move: BetMove, view: PlayerView): string {
  const b = view.betting!;
  switch (move) {
    case 'check':
      return 'Xem bài';
    case 'raise':
      return `Tăng lên ${b.level + BETTING.raiseStep}`;
    case 'call':
      return `Theo mức ${b.level} (thua bài thì kéo ít nhất ${b.level} cần)`;
    case 'fold':
      return `Bỏ (kéo ${foldPulls(b, view.me)} cần)`;
    case 'allIn':
      return `Tất tay (lên ${BETTING.maxLevel})`;
  }
}

async function askNumber(prompt: string, max: number): Promise<number> {
  for (;;) {
    const answer = Number((await ask(prompt)).trim());
    if (Number.isInteger(answer) && answer >= 1 && answer <= max) return answer;
    console.log(`  Hãy nhập một số từ 1 đến ${max}.`);
  }
}

async function askBet(view: PlayerView): Promise<BetMove> {
  const b = view.betting!;
  console.log(
    `\n  ${streetText(b.street)} | Bàn: ${cardsText(view.board)} | Bài của bạn: ${cardsText(view.hole)}`,
  );
  console.log(`  Mức cược ${b.level} (bạn đã theo ${b.called[view.me]})`);
  view.legal.forEach((move, i) => console.log(`  ${i + 1}) ${moveLabel(move, view)}`));
  const choice = await askNumber('  Chọn hành động: ', view.legal.length);
  return view.legal[choice - 1]!;
}

async function askLever(view: PlayerView): Promise<number> {
  const c = view.challenge!;
  const row = c.levers
    .map((s, i) => (s === 'unknown' ? `[${i + 1}]` : s === 'safe' ? '[✓]' : '[⚡]'))
    .join(' ');
  console.log(`\n  Cần gạt: ${row}   (đã kéo ${c.pulledCount}/${c.pulls})`);
  for (;;) {
    const lever = (await askNumber('  Kéo cần số: ', c.levers.length)) - 1;
    if (c.levers[lever] === 'unknown') return lever;
    console.log('  Cần này đã kéo rồi.');
  }
}

async function nextAction(state: GameState): Promise<Action> {
  const seat = currentActor(state);
  if (seat === null) {
    if (state.round > 0) await ask('\n(Enter để chia ván mới) ');
    return { type: 'deal' };
  }
  const view = viewFor(state, seat);
  if (state.phase === 'betting') {
    const move = seat === BOT ? bot.chooseBet(view).move : await askBet(view);
    return { type: 'bet', seat, move };
  }
  const lever = seat === BOT ? bot.chooseLever(view).lever : await askLever(view);
  return { type: 'pull', seat, lever };
}

async function main(): Promise<void> {
  console.log(`The Last Lever – BEST OF ${values.mode} với bot ngẫu nhiên (seed ${seed})`);
  let state = createMatch({ mode: mode!, seed });
  while (state.phase !== 'matchOver') {
    const result = applyAction(state, await nextAction(state));
    state = result.state;
    for (const event of result.events) {
      const line = formatEvent(event, { names, hidden: [BOT] });
      if (line) console.log(event.type === 'roundStarted' ? `\n${line}` : `  ${line}`);
    }
  }
  console.log(state.wins[HUMAN] > state.wins[BOT] ? '\nBạn thắng trận!' : '\nBạn thua trận.');
}

main()
  .catch((error: unknown) => {
    // Closing stdin (Ctrl+D) ends the game quietly.
    if (!(error instanceof InputClosed)) throw error;
    console.log('\nĐã thoát.');
  })
  .finally(() => rl.close());
