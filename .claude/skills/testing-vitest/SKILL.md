---
name: testing-vitest
description: "Dùng khi viết hoặc sửa test Vitest cho The Last Lever: test lõi luật chơi, bộ xếp hạng bài (kèm đối chiếu pokersolver), cược, cần gạt, bot, test hạt giống tái hiện, test hàm thuần, test thống kê xác suất, benchmark, kiểm tra config. Triggers on: test, Vitest, *.test.ts, kiểm thử, unit test, pokersolver, snapshot, benchmark, seed, flaky."
---

# Kiểm thử bằng Vitest

Vitest chạy trong môi trường `node` (`vite.config.ts`), chỉ quét `src/**/*.test.ts`. Lệnh: `npm test` (chạy một lần), `npm run test:watch`.

## Quy ước

- Test **đặt cạnh file nguồn**: `src/core/handEvaluator.ts` đi với `src/core/handEvaluator.test.ts`.
- Import tường minh: `import { describe, expect, it } from 'vitest';` (không bật globals).
- Tên `describe` và `it` viết bằng tiếng Anh, mô tả hành vi: `it('pulls the level the folder had called, not the raised one')`.
- Phải qua `typecheck`, `lint` (ESLint có kiểm tra kiểu cũng chạy trên test) và `format:check`.
- **Ưu tiên test:** bộ xếp hạng bài và các chuyển trạng thái của lõi. Lớp Phaser (`scenes/`, `ui/`) không viết unit test; kiểm tra bằng cách chơi thử.

## Không bao giờ flaky

- **Mọi thứ ngẫu nhiên đều có hạt giống.** Test không dùng `Math.random`. Hạt giống viết cứng trong test: `const SEED = 12345;`.
- Test thống kê vẫn tất định nhờ hạt giống, nhưng chọn sai số rộng (±0,01 với 100.000 mẫu) để đổi thứ tự rút RNG không làm test vỡ.
- **Không assert thời gian trên CI.** Benchmark dùng `it.skipIf(process.env.CI)(...)` với ngưỡng rộng, hoặc tách ra script chạy tay.

## Helper dùng chung

Đặt ở `src/core/testing.ts`. Chỉ test và `scripts/` được import file này, code chạy game thì không.

```ts
export const cards = (s: string) => parseCards(s); // cards('As Kd 7h')
export function deepFreeze<T>(o: T): T; // freeze đệ quy để bắt việc sửa input
export function withCards(
  state: GameState,
  opts: { hole0?: string; hole1?: string; board?: string },
): GameState; // ghi đè bài sau deal
export function withLevers(state: GameState, pattern: string): GameState; // 'SSDSSD', sau khi vào challenge
export function play(state: GameState, ...actions: Action[]): { state: GameState; events: GameEvent[] };
```

State là dữ liệu thuần, nên test được phép dựng tình huống bằng cách ghi đè trường (bài, cần) thay vì dò tìm hạt giống ra đúng bài.

## Các nhóm test bắt buộc

### 1. Bộ xếp hạng bài (`handEvaluator.test.ts`)

- Dùng `it.each` theo bảng cho **mọi trường hợp biên** trong skill `poker-engine`: sảnh A-5, thùng phá sảnh A-5, không có sảnh vòng, hai bộ ba, ba đôi, tứ quý trên bàn, 6–7 lá cùng chất, bàn tự thắng...
- Mỗi hạng tay (category) có ít nhất một ca, và có ca so kicker trong cùng hạng.
- **Đối chiếu `pokersolver`** (devDependency, chưa có kiểu nên cần một file `declare module 'pokersolver'` tối thiểu): sinh khoảng 10.000 cặp tay 7 lá có hạt giống, so kết quả thắng/thua/hòa của `compareHands` với `Hand.winners([...])`. Khi sai, in ra bài để tái hiện.

```ts
import { Hand } from 'pokersolver';
const a = Hand.solve(handA.map(cardToString));
const b = Hand.solve(handB.map(cardToString));
const winners = Hand.winners([a, b]); // 2 phần tử nghĩa là hòa
```

### 2. Cược (`betting.test.ts`)

`legalActions` cho: lượt đầu vòng, bị tăng, bị tăng lại, đã dùng lượt tăng, mức đã là 6. Kết thúc vòng: Xem-Xem, Tăng-Theo, Tăng-Tăng-Theo. `foldPulls`: Bỏ ngay lượt đầu kéo 1; đang 2, bị tăng lên 3, Bỏ thì kéo 2.

### 3. Chuyển trạng thái (`rules.test.ts`)

Mỗi nhánh trong `docs/plan.md` Phase 1 có ít nhất một test:

| Nhánh | Kiểm tra |
| --- | --- |
| Bỏ ở lượt đầu | Vào `challenge`, `pulls = 1`, không lật bài bot |
| Bỏ sau khi bị tăng | `pulls` bằng mức đã theo |
| Tất tay được Theo | Có `streetRevealed` cho các lá còn lại, rồi so bài, rồi `pulls = 6` |
| Tất tay bị Bỏ | Người Bỏ kéo mức đã theo |
| So bài hòa | `roundEnded` hòa `pokerTie`, `draws + 1`, không có `challengeStarted` |
| Kéo trúng Nguy hiểm | Dừng ngay, đối thủ +1, kéo tiếp thì throw |
| Kéo đủ toàn Safe | Hòa `allSafe`, `draws + 1` |
| Kết thúc trận | Đạt `winsNeeded` của bo3, bo5, bo7 thì vào `matchOver` và có `matchEnded` |
| Người đi trước | Mở lời ở cả 4 vòng; qua nhiều ván có hạt giống thì cả hai ghế đều từng đi trước |
| Hành động sai | Sai lượt, sai phase, hành động không có trong `legalActions` đều throw |

### 4. Thuộc tính của lõi

```ts
it('never mutates its input', () => {
  const s = deepFreeze(createMatch({ mode: 'bo3', seed: SEED }));
  expect(() => applyAction(s, { type: 'deal' })).not.toThrow(); // gán vào object frozen sẽ throw (ESM là strict mode)
});

it('replays identically from the same seed', () => {
  expect(runScripted(SEED)).toEqual(runScripted(SEED));
});
```

- Thêm **một** `toMatchInlineSnapshot` ngắn cho chuỗi sự kiện của một hạt giống cố định. Snapshot đổi nghĩa là thứ tự rút RNG hoặc luật đã đổi; chỉ cập nhật (`vitest -u`) khi chủ ý đổi.
- **Fuzz:** chạy khoảng 200 trận hai bot ngẫu nhiên có hạt giống tới `matchOver`, assert bất biến sau mỗi bước: `1 ≤ level ≤ 6`, `called[i] ≤ level`, tổng thắng không vượt `winsNeeded`, `JSON.parse(JSON.stringify(state))` bằng `state`.

### 5. Cần gạt (`levers.test.ts`)

`dangerProbability` khớp bảng 1/2, 11/15, 17/20, 23/25, 29/30, 1 (`toBeCloseTo(x, 9)`); mô phỏng 100.000 lần khớp L(m) trong ±0,01; `d` phân phối đều 1–5.

### 6. Bot (`src/ai/*.test.ts`)

`move` luôn thuộc `view.legal`; không Bỏ khi Xem bài được; công thức Theo/Bỏ với equity cố định truyền vào; cùng hạt giống cho cùng quyết định; equity của AA trước flop khoảng 0,85 ± 0,03.

### 7. PlayerView không rò rỉ

`viewFor` trước khi so bài không có bài đối thủ; không có `rngState`, bộ bài, lá chung chưa lật; cần chưa kéo là `'unknown'`. Kiểm tra cả tập khóa: `expect(Object.keys(view).sort()).toEqual([...])`, để thêm trường mới thì phải sửa test có chủ ý.

### 8. Config (`src/config.test.ts`)

`1 ≤ minDanger ≤ maxDanger ≤ count − 1`; `maxLevel ≤ LEVERS.count`; `startLevel ≤ maxLevel`; ngưỡng bot nằm trong 0–1 và ngưỡng Tăng < ngưỡng Tất tay.

## Checklist trước khi xong

- [ ] `npm test` xanh; chạy lại lần hai vẫn xanh (không flaky).
- [ ] Test mới hỏng được thật: sửa tạm luật cho sai thì test đỏ.
- [ ] `npm run typecheck`, `lint`, `format:check` đều qua.
