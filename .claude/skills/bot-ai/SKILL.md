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
4. **Mọi con số nằm trong `config.ts`**, thêm khối `BOT` (xem phần cuối). L(m) lấy từ `dangerProbability`, không viết tay bảng số.
5. **Độ trễ suy nghĩ** 0,8–2,5 giây là việc của lớp hiển thị. Bot quyết định đồng bộ và tức thì.

## equity.ts

```ts
export interface Equity {
  win: number;
  tie: number;
  lose: number;
  equity: number; // win + tie / 2
}
export function estimateEquity(hole: Card[], board: Card[], rng: Rng, samples = BOT.equitySamples): Equity;
```

- Bộ bài còn lại là 52 lá trừ bài riêng của bot và các lá chung **đã lật**. Bài thật của đối thủ là ẩn số.
- Mỗi lần mô phỏng: Fisher-Yates **một phần** trên mảng bài còn lại để rút 2 lá cho đối thủ và `5 − board.length` lá chung, rồi chấm hai tay bằng `evaluate7` và so.
- **Hiệu năng:** dưới 50 ms cho 300 lần trên điện thoại. Cấp phát mảng làm việc một lần ngoài vòng lặp, tái sử dụng bên trong. Nếu chậm thì tối ưu `evaluate7` trước, chuyển sang Web Worker sau, và giảm `samples` là phương án cuối.

## personalities.ts

| Tính cách | `fear` | Tăng khi equity > | Tất tay khi equity > | Lừa Tăng | Lừa Tất tay | Nói dối |
| --- | --- | --- | --- | --- | --- | --- |
| Thận trọng | 1,3 | 0,70 | 0,90 | 0 | 0 | 10% |
| Cân bằng | 1,0 | 0,60 | 0,80 | 0 | 0 | 20% |
| Liều lĩnh | 0,7 | 0,50 | 0,65 | 15% số ván | 5% số ván | 35% |

Ba tính cách dùng chung một nhân vật. Việc gán Dễ/Vừa/Khó làm sau khi chạy `scripts/balance.ts` (quyết định #4).

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

Đầu mỗi ván (phát hiện qua `view.round` đổi), bot rút một lần xem ván này có lừa Tất tay hay lừa Tăng không, theo tỉ lệ của tính cách. Một ván lừa chỉ ép hành động tăng ở cơ hội hợp lệ đầu tiên. Nếu sau đó bị tăng lại thì quay về công thức Theo/Bỏ như thường.

### Chọn cần

Bot chọn đều ngẫu nhiên trong các cần `'unknown'` của `view.challenge`, dùng RNG của bot.

### Bong bóng thoại (quyết định #9)

- Bot nói ở khoảng 30% lượt hành động (`BOT.talkChance`) và luôn có một câu khi vào thử thách.
- **Nhãn thật** lấy theo equity: `strong` nếu ≥ `BOT.talkStrongAt`, `weak` nếu < `BOT.talkWeakAt`, còn lại `neutral`.
- **Nói dối** theo tỉ lệ của tính cách: `strong` thành `weak` và ngược lại; `neutral` đổi ngẫu nhiên sang `strong` hoặc `weak`.
- Bot chỉ trả nhãn. Lớp hiển thị bốc ngẫu nhiên một trong khoảng 8 câu của nhãn đó trong `vi.ts` và `en.ts`, hiện trong 2 giây.

### Hình dạng API gợi ý

```ts
export type TalkLabel = 'strong' | 'weak' | 'neutral';
export interface Bot {
  chooseBet(view: PlayerView): { move: BetMove; talk?: TalkLabel };
  chooseLever(view: PlayerView): { lever: number; talk?: TalkLabel };
}
export function createBot(opts: { personality: PersonalityId; seed: number }): Bot;
```

`move` trả ra **phải nằm trong `view.legal`**. Kiểm tra lại ở cuối hàm cho chắc.

## Bot cơ sở và scripts/balance.ts

- **Bot ngẫu nhiên:** chọn đều trong `view.legal`, kéo cần ngẫu nhiên.
- **Bot luôn Theo:** Theo khi bị tăng, ngoài ra Xem bài; không bao giờ Tăng hay Bỏ.
- `scripts/balance.ts` cho mỗi cặp đấu 1.000 trận (kể cả đấu với bot cơ sở), đổi ghế qua lại cho công bằng, và in tỉ lệ thắng, tỉ lệ hòa, số ván trung bình mỗi trận, tần suất Tất tay và Bỏ. Có tham số `--seed` và `--mode`.
- **Tiêu chí đạt** (quyết định #5): mỗi tính cách thắng bot cơ sở ≥ 60%, mọi cặp tính cách nằm trong 35–65%. Ghi kết quả cuối vào `docs/balance.md`.

## Khối BOT gợi ý cho config.ts

```ts
export const BOT = {
  equitySamples: 300,
  thinkDelayMs: { min: 800, max: 2500 },
  talkChance: 0.3,
  talkStrongAt: 0.6,
  talkWeakAt: 0.4,
  talkDurationMs: 2000,
  fearWhenOpponentOneAway: 0.2,
  fearWhenLeading: -0.1,
  personalities: {
    cautious: { fear: 1.3, raiseAt: 0.7, allInAt: 0.9, bluffRaise: 0, bluffAllIn: 0, lieRate: 0.1 },
    balanced: { fear: 1.0, raiseAt: 0.6, allInAt: 0.8, bluffRaise: 0, bluffAllIn: 0, lieRate: 0.2 },
    reckless: { fear: 0.7, raiseAt: 0.5, allInAt: 0.65, bluffRaise: 0.15, bluffAllIn: 0.05, lieRate: 0.35 },
  },
} as const;
```

## Checklist trước khi xong

- [ ] Có test: hàm public của bot chỉ nhận `PlayerView`, và `viewFor` không lộ bài đối thủ hay trạng thái cần ẩn.
- [ ] Có test: không bao giờ Bỏ khi `check` hợp lệ; `move` luôn thuộc `view.legal`.
- [ ] Có test công thức Theo/Bỏ với equity cố định (truyền equity giả vào hàm quyết định để không phụ thuộc mô phỏng).
- [ ] Có test: cùng hạt giống thì cùng quyết định.
- [ ] Equity với AA trước flop xấp xỉ 0,85 (±0,03, có hạt giống); benchmark dưới 50 ms.
