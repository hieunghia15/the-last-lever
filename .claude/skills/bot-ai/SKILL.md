---
name: bot-ai
description: "Dùng khi viết hoặc sửa bot của The Last Lever trong src/ai: equity.ts (mô phỏng tỉ lệ thắng poker), botBrain.ts (chọn Xem bài/Tăng/Theo/Bỏ/Tất tay theo rủi ro kéo cần), personalities.ts (Thận trọng, Cân bằng, Liều lĩnh), bluff, bong bóng thoại nói dối, chọn cần, scripts/balance.ts. Triggers on: bot, AI, equity, Monte Carlo, botBrain, personality, tính cách, hệ số sợ, bluff, lừa, bong bóng thoại, balance, cân bằng bot."
---

# Bot (src/ai)

Bot so **rủi ro thua ván nếu Bỏ ngay** với **rủi ro thua ván nếu đi tiếp**, rồi lệch đi theo tính cách. Đọc trước skill `game-rules-core` (`PlayerView`, RNG), `poker-engine` (`evaluate7`, `legalActions`) và `lever-challenge` (`dangerProbability`).

## Quy tắc bắt buộc

1. **Bot chỉ nhận `PlayerView`** từ `viewFor(state, seat)`, không bao giờ nhận `GameState`. Mọi hàm public của `src/ai` có tham số kiểu `PlayerView`.
2. **Không import** Phaser, `scenes/`, `ui/`, `i18n/`. Bot trả **nhãn** (`'strong'`, `'weak'`...), lớp hiển thị chọn câu qua `t()`.
3. **RNG riêng của bot** (`new Rng(seed)` từ `core/rng.ts`), tách khỏi RNG của ván. Nhờ vậy số lần bot mô phỏng không làm đổi bài được chia, và cùng hạt giống thì bot quyết định giống nhau.
4. **Mọi con số nằm trong `config.ts`**, khối `BOT` (xem phần cuối). L(m) lấy từ `dangerProbability`, không viết tay bảng số.
5. **Độ trễ suy nghĩ** 0,8–2,5 giây là việc của lớp hiển thị. Bot quyết định đồng bộ và tức thì.

## equity.ts

```ts
// Trả một số: thắng + hòa / 2. Dùng chung cho bot và thẻ "BỘ BÀI".
export function estimateEquity(hole: readonly Card[], board: readonly Card[], rng: Rng, trials = EQUITY.trials): number;
```

- Bộ bài còn lại là 52 lá trừ bài riêng của bot và các lá chung **đã lật**. Bài thật của đối thủ là ẩn số.
- Mỗi lần mô phỏng: Fisher-Yates **một phần** trên mảng bài còn lại để rút 2 lá cho đối thủ và `5 − board.length` lá chung, rồi chấm hai tay bằng `evaluate7` và so.
- **Hiệu năng:** dưới 50 ms cho 300 lần trên điện thoại (≈ 0,4 ms trên máy tính). Cấp phát mảng làm việc một lần ngoài vòng lặp, tái sử dụng bên trong. Nếu chậm thì tối ưu `evaluate7` trước, chuyển sang Web Worker sau, và giảm `EQUITY.trials` là phương án cuối.
- Bot cache equity theo bộ lá (bài riêng + lá chung đã lật) trong một ván, xoá khi `view.round` đổi.

## personalities.ts

Số đã chỉnh theo `docs/balance.md` (khác tài liệu thiết kế: hệ số sợ thấp hơn vì công thức chỉ tính rủi ro của bot, không tính lợi khi đối thủ phải kéo):

| Tính cách | `fear` | Tăng khi equity > | Tất tay khi equity > | Lừa Tăng | Lừa Tất tay | Nói dối | Mức khó |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Thận trọng | 0,9 | 0,70 | 0,90 | 0 | 0 | 10% | Dễ |
| Cân bằng | 0,75 | 0,60 | 0,80 | 0 | 0 | 20% | Vừa |
| Liều lĩnh | 0,6 | 0,55 | 0,70 | 15% số ván | 5% số ván | 35% | Khó |

Ba tính cách dùng chung một nhân vật. Mức khó gán qua `DIFFICULTY_PERSONALITY` trong config (quyết định #4). `personality(id)` trả số của tính cách, `fearFactor(p, view)` cộng điều chỉnh theo tỉ số.

## botBrain.ts

### Hệ số sợ theo tỉ số

```text
k = personality.fear
  + 0,2 nếu đối thủ chỉ còn cách 1 chiến thắng (wins[opp] === winsNeeded − 1)
  − 0,1 nếu bot đang dẫn (wins[me] > wins[opp])
```

### Khi bị tăng: Theo hay Bỏ

Đây là lúc **duy nhất** dùng công thức rủi ro (quyết định #6):

```text
rủi ro Bỏ    = L(max(called[me], minPullOnFold))
m_cuối       = min(maxLevel, ceil(level + 0,5 × số vòng cược còn lại))
               (số vòng còn lại: preflop 3, flop 2, turn 1, river 0)
rủi ro đi tiếp = (1 − equity) × L(m_cuối) × k
đi tiếp ⇔ rủi ro đi tiếp < rủi ro Bỏ
```

Nếu đi tiếp và vẫn còn quyền tăng: equity > ngưỡng Tất tay thì `allIn`, equity > ngưỡng Tăng thì `raise`, còn lại thì `call`.

### Khi không bị tăng: Xem bài là miễn phí

- **Không bao giờ Bỏ khi được Xem bài.**
- Chọn `allIn` nếu hợp lệ và (equity > ngưỡng Tất tay hoặc đây là ván lừa Tất tay); nếu không thì `raise` nếu hợp lệ và (equity > ngưỡng Tăng hoặc đây là ván lừa Tăng); còn lại thì `check`.

### Lừa tính theo **ván**, không theo lượt

Đầu mỗi ván (phát hiện qua `view.round` đổi), bot rút một lần xem ván này có lừa Tất tay hay lừa Tăng không, theo tỉ lệ của tính cách. Ván lừa chỉ dùng ở lượt **được Xem bài** đầu tiên có quyền tăng, rồi về `'none'`. Khi bị tăng thì luôn dùng công thức Theo/Bỏ, kể cả trong ván lừa.

Phần toán nằm trong hàm thuần `decideBet(view, { equity, fear, personality, bluff })` trả `{ move, trace }`, không gọi RNG; `createBot` lo RNG, cache equity, ván lừa và nhãn thoại. `finalLevel(view)` là m_cuối.

### Chọn cần

Bot chọn đều ngẫu nhiên trong các cần `'unknown'` của `view.challenge`, dùng RNG của bot.

### Bong bóng thoại (quyết định #9)

- Bot nói ở khoảng 30% lượt hành động (`BOT.talkChance`) và luôn có một câu khi vào thử thách.
- **Nhãn thật** lấy theo equity: `strong` nếu ≥ `BOT.talkStrongAt`, `weak` nếu < `BOT.talkWeakAt`, còn lại `neutral`.
- **Nói dối** theo tỉ lệ của tính cách: `strong` thành `weak` và ngược lại; `neutral` đổi ngẫu nhiên sang `strong` hoặc `weak`.
- Bot chỉ trả nhãn (và `trace.lied`). Lớp hiển thị bốc câu qua `createTalkPicker` (`src/ui/talkModel.ts`, không lặp câu liền nhau) từ các khóa `talk.<nhãn>.<n>` trong `vi.ts` và `en.ts`, hiện trong `BOT.talkMs`.
- Câu khi vào thử thách là nhóm riêng, **không nói dối** và không do bot chọn: `TableScene` hiện `talk.challenge.botPulls.*` hoặc `talk.challenge.youPull.*` khi phát `challengeStarted`. `chooseLever` không trả `talk`.
- `MatchSession.botAct()` trả `{ events, talk?, trace? }`. `?debug=bot` in `trace` (equity, fear, riskFold, riskGo, bluffed, lied) ra console.

### Hình dạng API gợi ý

```ts
export type TalkLabel = 'strong' | 'weak' | 'neutral';
export interface Bot {
  chooseBet(view: PlayerView): { move: BetMove; talk?: TalkLabel };
  chooseLever(view: PlayerView): { lever: number; talk?: TalkLabel };
}
export function createBot(opts: {
  personality: PersonalityId;
  seed: number;
  trials?: number; // script cân bằng giảm để chạy nhanh
  overrides?: Partial<Personality>; // script cân bằng thử số trước khi đưa vào config
}): Bot;
```

`move` trả ra **phải nằm trong `view.legal`**. Kiểm tra lại ở cuối hàm cho chắc.

## Bot cơ sở và scripts/balance.ts

- **Bot ngẫu nhiên:** chọn đều trong `view.legal`, kéo cần ngẫu nhiên.
- **Bot luôn Theo:** `createCallingBot(seed)`. Theo khi bị tăng, ngoài ra Xem bài; không bao giờ Tăng hay Bỏ.
- `src/ai/arena.ts`: `playMatch(bots, { mode, seed }, hooks)` chạy một trận giữa hai bot; test và script dùng chung.
- `npm run balance -- [--matches 1000] [--mode 3|5|7] [--seed 1] [--trials 300] [--only a,b] [--set reckless.fear=0.6,...]`: mỗi cặp đấu 1.000 trận (kể cả đấu với bot cơ sở), đổi ghế qua lại, in bảng Markdown (tỉ lệ thắng ±95%, tỉ lệ hòa, số ván mỗi trận, Tất tay, Bỏ, lừa, nói dối) và ĐẠT/CHƯA ĐẠT. Cả bộ chạy khoảng 1 phút.
- **Tiêu chí đạt** (quyết định #5): mỗi tính cách thắng bot ngẫu nhiên ≥ 60% và bot luôn-Theo ≥ 55%, mọi cặp tính cách nằm trong 35–65%. Ghi kết quả cuối vào `docs/balance.md`.

## Khối BOT trong config.ts

`BOT.thinkMs { min, max }`, `talkChance`, `talkStrongAt`, `talkWeakAt`, `talkMs`, `fearWhenOpponentOneAway`, `fearWhenLeading`, `personalities.{cautious,balanced,reckless}` (`fear`, `raiseAt`, `allInAt`, `bluffRaise`, `bluffAllIn`, `lieRate`). Số lần mô phỏng dùng `EQUITY.trials`. Kèm `PersonalityId`, `PERSONALITIES`, `DIFFICULTY_PERSONALITY`. `config.test.ts` kiểm tra khoảng giá trị hợp lệ.

Lưu ý: `TableScene` import hằng số ghế `BOT` từ `matchSession`, nên khối config được import dưới tên `BOT as BOT_TUNING` ở đó.

## Checklist trước khi xong

- [ ] Có test: hàm public của bot chỉ nhận `PlayerView`, và `viewFor` không lộ bài đối thủ hay trạng thái cần ẩn.
- [ ] Có test: không bao giờ Bỏ khi `check` hợp lệ; `move` luôn thuộc `view.legal`.
- [ ] Có test công thức Theo/Bỏ với equity cố định (truyền equity giả vào hàm quyết định để không phụ thuộc mô phỏng).
- [ ] Có test: cùng hạt giống thì cùng quyết định.
- [ ] Equity với AA trước flop xấp xỉ 0,85 (±0,03, có hạt giống); benchmark dưới 50 ms.
