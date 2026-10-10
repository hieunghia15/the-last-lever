---
name: poker-engine
description: "Dùng khi viết hoặc sửa phần poker của The Last Lever: cards.ts (bộ bài, mã lá), handEvaluator.ts (bộ 5 lá mạnh nhất từ 7 lá, so tay, sảnh A-2-3-4-5), betting.ts (mức cược chung 1–6, Xem bài/Tăng/Theo/Bỏ/Tất tay, legalActions, giới hạn tăng mỗi vòng, số cần phải kéo khi Bỏ). Triggers on: hand evaluator, xếp hạng bài, so bài, showdown, kicker, straight, flush, betting, legalActions, Tất tay, all-in, fold, raise."
---

# Poker: bộ bài, xếp hạng tay, cược

Texas Hold'em tay đôi, nhưng cược bằng **mức chung** (số cần gạt), không có tiền, không có blind. Đọc skill `game-rules-core` trước để biết `Seat`, `GameState`, sự kiện và quy tắc hàm thuần.

## cards.ts

Lá bài là **số nguyên 0–51**: nhỏ, chép nhanh, dùng được trong state thuần.

```ts
export type Card = number; // rank * 4 + suit
// rank 0..12 = 2,3,4,5,6,7,8,9,T,J,Q,K,A    suit 0..3 = c,d,h,s
export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
```

- `cardToString(c)` cho ra `'As'`, `'Td'`, `'2c'`, cùng định dạng với `pokersolver`.
- `parseCards('As Kd 7h')` trả `Card[]` và throw nếu chuỗi sai hoặc trùng lá. Hàm này dùng cho test và `scripts/`, không dùng cho đường chơi chính.
- `newDeck()` trả 52 lá theo thứ tự cố định; xáo bằng `rng.shuffle`, không xáo bên trong `cards.ts`.

## handEvaluator.ts

Quyết định #10: **tự viết**; `pokersolver` chỉ là devDependency để đối chiếu trong test. Yêu cầu tốc độ: equity 300 lần mô phỏng (khoảng 600 lần chấm 7 lá) dưới 50 ms trên điện thoại.

### Thứ tự hạng tay, từ mạnh đến yếu (luật cốt lõi)

Đây là phần quan trọng nhất của bộ xếp hạng. Mọi so sánh tay bài phải theo đúng bảng này.

| Hạng | Tên | Tiếng Anh | `HandRank` | `category` | Ví dụ | Cùng hạng thì so |
| --- | --- | --- | --- | --- | --- | --- |
| 1 (mạnh nhất) | Thùng phá sảnh lớn | Royal Flush | `royalFlush` | 8 (lá cao nhất là A) | A♠ K♠ Q♠ J♠ 10♠ | Luôn hòa |
| 2 | Thùng phá sảnh | Straight Flush | `straightFlush` | 8 | 5♠ 6♠ 7♠ 8♠ 9♠ | Lá cao nhất của sảnh; A-2-3-4-5 là thấp nhất (lá cao nhất là 5) |
| 3 | Tứ quý | Four of a Kind | `fourOfAKind` | 7 | A A A A | Giá trị tứ quý, rồi 1 kicker |
| 4 | Cù lũ | Full House | `fullHouse` | 6 | K K K Q Q | Giá trị bộ ba, rồi giá trị đôi |
| 5 | Thùng | Flush | `flush` | 5 | 5 lá cùng chất, không cần liên tiếp | Lần lượt 5 lá từ cao xuống thấp |
| 6 | Sảnh | Straight | `straight` | 4 | 5 lá liên tiếp, không cần cùng chất | Lá cao nhất của sảnh; A-2-3-4-5 là thấp nhất |
| 7 | Sám cô | Three of a Kind | `threeOfAKind` | 3 | 7 7 7 | Giá trị bộ ba, rồi 2 kicker |
| 8 | Hai đôi | Two Pair | `twoPair` | 2 | A A K K | Đôi cao, đôi thấp, rồi 1 kicker |
| 9 | Một đôi | One Pair | `onePair` | 1 | 9 9 | Giá trị đôi, rồi 3 kicker |
| 10 (yếu nhất) | Mậu thầu | High Card | `highCard` | 0 | Không có bộ nào ở trên | Lần lượt 5 lá từ cao xuống thấp |

Mẹo nhớ: Thùng phá sảnh > Tứ quý > Cù lũ > Thùng > Sảnh > Sám cô > Hai đôi > Một đôi > Mậu thầu.

Các quy tắc đi kèm:

- **Chất không bao giờ dùng để phân thắng thua.** Hai tay giống hệt nhau về giá trị thì hòa.
- **Thùng phá sảnh lớn không cần `category` riêng.** Nó là thùng phá sảnh có lá cao nhất là A, nên ở trong mã số đã luôn mạnh nhất. Vì vậy `HandValue` chỉ dùng 9 `category` (0–8), còn `handRank(v)` tách riêng `royalFlush` để lớp hiển thị gọi đúng tên.
- **Lõi chỉ trả mã `HandRank`.** Tên tiếng Việt và tiếng Anh nằm trong `i18n` (Phase 2).

### Giá trị tay là một số, lớn hơn thì mạnh hơn

```ts
export type HandValue = number;
// (category << 20) | (k1 << 16) | (k2 << 12) | (k3 << 8) | (k4 << 4) | k5
// category: 0 high card, 1 pair, 2 two pair, 3 trips, 4 straight,
//           5 flush, 6 full house, 7 quads, 8 straight flush (incl. royal)
export function evaluate7(cards: readonly Card[]): HandValue;
export const compareHands = (a: HandValue, b: HandValue) => a - b; // >0: a thắng, 0: hòa
export const handCategory = (v: HandValue) => v >> 20;

export type HandRank =
  | 'royalFlush'
  | 'straightFlush'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeOfAKind'
  | 'twoPair'
  | 'onePair'
  | 'highCard';
export function handRank(v: HandValue): HandRank; // category 8 với k1 = A thì là 'royalFlush'
```

Nhờ vậy so tay chỉ là so số, và hòa bài nghĩa là hai số bằng nhau.

### Cách chấm 7 lá trực tiếp (không duyệt 21 tổ hợp)

1. Đếm số lá theo rank (`counts[13]`), lập bitmask rank theo từng chất (`suitMask[4]`) và bitmask rank chung.
2. **Flush:** có chất nào đủ ≥ 5 lá thì xét straight flush trên `suitMask` của chất đó, nếu không thì lấy 5 rank cao nhất của chất đó.
3. **Straight:** tìm 5 bit liên tiếp cao nhất trong mask. **Sảnh bánh xe A-2-3-4-5:** A tính là rank thấp, lá cao nhất là 5 (rank 3). Không có sảnh vòng như Q-K-A-2-3.
4. Từ `counts`, theo thứ tự ưu tiên: tứ quý, cù lũ, sám, hai đôi, một đôi, mậu thầu. Kicker luôn lấy từ **các lá còn lại có rank cao nhất**, kể cả lá thuộc đôi hoặc bộ ba thứ hai.

### Các trường hợp biên phải xử lý đúng

| Tình huống | Đúng là |
| --- | --- |
| A-2-3-4-5 | Sảnh, lá cao nhất là 5; thua 2-3-4-5-6 |
| A♠ 2♠ 3♠ 4♠ 5♠ | Thùng phá sảnh lá cao nhất là 5 |
| 10-J-Q-K-A | Sảnh cao nhất; Q-K-A-2-3 không phải sảnh |
| A♠ K♠ Q♠ J♠ 10♠ | `handRank` là `royalFlush`, thắng mọi thùng phá sảnh khác |
| Cùng giá trị, khác chất | Hòa, chất không phân thắng thua |
| Hai bộ ba trong 7 lá | Cù lũ: bộ ba cao, đôi lấy từ bộ ba thấp |
| Bộ ba + hai đôi | Cù lũ với đôi cao hơn |
| Ba đôi | Hai đôi cao nhất, kicker là lá cao nhất còn lại (có thể là lá của đôi thứ ba) |
| Tứ quý trên bàn | Kicker là lá cao nhất trong 3 lá còn lại |
| 6 hoặc 7 lá cùng chất | Thùng lấy 5 lá cao nhất của chất đó |
| Vừa có sảnh vừa có thùng | Thùng thắng, trừ khi có thùng phá sảnh |
| Bàn tự thắng (board plays) | Hai tay bằng nhau thì hòa |

Có thể thêm `bestFive(cards)` để lớp hiển thị tô sáng 5 lá thắng, nhưng không bắt buộc ở Phase 1.

## betting.ts

### Luật đã chốt

- Mức chung `level` bắt đầu ở `BETTING.startLevel` (1), tối đa `BETTING.maxLevel` (6). Lúc chia bài, cả hai coi như đã theo mức 1.
- 4 vòng: `preflop`, `flop` (lật 3 lá), `turn`, `river`. `firstActor` mở lời ở **cả 4 vòng** (quyết định #2).
- Mỗi người **tăng tối đa 1 lần mỗi vòng**; **Tất tay tính là lần tăng đó** (quyết định #3).
- **Bỏ bài:** người Bỏ thua poker và kéo `max(called[seat], BETTING.minPullOnFold)`, tức mức **mình đã theo**, không phải mức vừa bị tăng (quyết định #1). Ví dụ đang 2, đối thủ tăng lên 3, mình Bỏ thì kéo 2.
- **Tất tay được Theo:** tự lật hết lá chung còn lại rồi so bài. Tổng quát hơn: khi cả hai đã theo ở `maxLevel` thì không còn gì để cược, nên tự lật hết rồi so bài.

### State gợi ý

```ts
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export interface BettingState {
  street: Street;
  level: number;
  called: [number, number]; // mức mỗi ghế đã theo
  raisedThisStreet: [boolean, boolean];
  actedThisStreet: [boolean, boolean];
  toAct: Seat;
}
```

### Hành động hợp lệ (`legalActions`)

Với ghế `p` đang tới lượt, `facing = called[p] < level`:

| Hành động | Hợp lệ khi | Kết quả |
| --- | --- | --- |
| `check` (Xem bài) | `!facing` | Không đổi mức |
| `call` (Theo) | `facing` | `called[p] = level` |
| `raise` (Tăng) | `!raisedThisStreet[p] && level < maxLevel` | `level += raiseStep`, `called[p] = level` |
| `allIn` (Tất tay) | `!raisedThisStreet[p] && level < maxLevel` | `level = maxLevel`, `called[p] = level` |
| `fold` (Bỏ) | Luôn hợp lệ khi tới lượt | Kết thúc poker, `p` thua |

- Được tăng lại khi đang bị tăng, miễn là mình chưa tăng trong vòng này. Ví dụ A tăng lên 2, B tăng lên 3, thì A chỉ còn Theo hoặc Bỏ.
- Khi `level === maxLevel`, cả Tăng lẫn Tất tay đều không hợp lệ, nên ActionBar làm mờ hai nút đó.

### Khi nào hết một vòng

Hết vòng khi **cả hai đã hành động** trong vòng **và** `called[0] === called[1] === level`. Sang vòng mới thì lật lá (3, 1, 1), đặt lại `raisedThisStreet` và `actedThisStreet`, và `toAct = firstActor`. Hết vòng `river` thì so bài.

### Helper cho ActionBar

ActionBar cần hiện số cần sẽ phải kéo nếu thua:

- `foldPulls(betting, seat)`: số cần phải kéo nếu Bỏ ngay bây giờ.
- Nếu Theo rồi thua khi so bài thì kéo `level` (hoặc cao hơn nếu sau đó còn bị tăng).

Các helper này là hàm thuần trong `betting.ts`, scene chỉ gọi và hiển thị.

## Checklist trước khi xong

- [ ] Có test cho từng dòng trong bảng trường hợp biên và đối chiếu `pokersolver` trên khoảng 10.000 tay có hạt giống (xem skill `testing-vitest`).
- [ ] Có test `legalActions` cho: lượt đầu, bị tăng, bị tăng lại, mức đã là 6, đã dùng lượt tăng.
- [ ] Có test Bỏ sau khi bị tăng kéo đúng mức đã theo, và Bỏ ngay lượt đầu kéo 1.
- [ ] Không cấp phát mảng trong vòng lặp nóng của `evaluate7`.
