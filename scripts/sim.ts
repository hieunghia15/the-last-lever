// Two random bots play one full match and every event is logged.
// npm run sim -- --seed 42 --mode 5 [--quiet]
import { parseArgs } from 'node:util';
import { createRandomBot } from '../src/ai/baselineBots';
import type { MatchMode } from '../src/config';
import type { Action, GameState } from '../src/core/gameState';
import { applyAction, createMatch, currentActor, viewFor } from '../src/core/rules';
import { formatEvent } from './format';

const MODES: Record<string, MatchMode> = { '3': 'bo3', '5': 'bo5', '7': 'bo7' };

const { values } = parseArgs({
  options: {
    seed: { type: 'string' },
    mode: { type: 'string', default: '3' },
    quiet: { type: 'boolean', default: false },
  },
});

const mode = MODES[values.mode];
if (!mode) throw new Error(`--mode must be 3, 5 or 7 (got "${values.mode}")`);
const seed = values.seed === undefined ? Date.now() % 1_000_000 : Number(values.seed);
if (!Number.isInteger(seed)) throw new Error(`--seed must be an integer (got "${values.seed}")`);

const names: [string, string] = ['Ghế 0', 'Ghế 1'];
const bots = [createRandomBot(seed + 1), createRandomBot(seed + 2)] as const;

function nextAction(state: GameState): Action {
  const seat = currentActor(state);
  if (seat === null) return { type: 'deal' };
  const view = viewFor(state, seat);
  if (state.phase === 'betting') {
    return { type: 'bet', seat, move: bots[seat].chooseBet(view).move };
  }
  return { type: 'pull', seat, lever: bots[seat].chooseLever(view).lever };
}

console.log(`The Last Lever – mô phỏng BEST OF ${values.mode}, seed ${seed}`);
let state = createMatch({ mode, seed });
while (state.phase !== 'matchOver') {
  const result = applyAction(state, nextAction(state));
  state = result.state;
  for (const event of result.events) {
    const line = formatEvent(event, { names });
    if (!line) continue;
    if (!values.quiet || event.type === 'matchEnded') {
      console.log(event.type === 'roundStarted' ? line : `[V${state.round}] ${line}`);
    }
  }
}
console.log(`Kết thúc sau ${state.round} ván.`);
