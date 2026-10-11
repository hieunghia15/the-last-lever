# Phase 2 – Bàn chơi bản nháp: danh sách task

Nhánh: `feat/drafting-table`. Nguồn: `docs/plan.md` (Phase 2 và bảng quyết định), bố cục trong `the-last-lever-thiet-ke.md` và `docs/stitch-ui-brief.md` (mục 3.4, 3.5, 3.7). Skill nên đọc: `game-rules-core`, `scenes`, `tweens`, `graphics-and-shapes`, `text-and-bitmaptext`, `input-keyboard-mouse-touch`, `scale-and-responsive`.

**Mục tiêu của phase:** bấm nút chơi hết một trận với bot ngẫu nhiên, trên máy tính và trên điện thoại qua `npm run dev:host`. Mọi thứ vẽ bằng hình khối và chữ, chưa có hình thật hay hiệu ứng.

**Quy ước cho mọi task:**
- Scene chỉ diễn hoạt: mọi thay đổi trạng thái đi qua `applyAction`, scene phát lại `events`. Scene không tự tính luật (ví dụ không tự tính số cần khi Bỏ, dùng `foldPulls`).
- Phần nào không cần Phaser thì tách ra file không import Phaser để test được trên Node (`tests/` chạy với `environment: 'node'`).
- Mọi chuỗi hiển thị đi qua `t()`; thêm khóa vào `vi.ts` trước rồi `en.ts`.
- Mọi kích thước, tọa độ, màu, thời lượng tween nằm trong `src/config.ts`.
- Người chơi luôn ngồi ghế 0, bot ghế 1 (giống `scripts/play.ts`).
- Một task chỉ xong khi `npm run typecheck`, `lint`, `format:check` và `test` đều qua. Mỗi task nên là một commit riêng.

## Thứ tự và phụ thuộc

```mermaid
flowchart LR
    T1[T1 Chuẩn bị] --> T2[T2 Chuỗi i18n]
    T1 --> T3[T3 MatchSession]
    T1 --> T4[T4 EventQueue]
    T2 --> T5[T5 Button + màn bắt đầu]
    T1 --> T6[T6 CardSprite]
    T5 & T6 --> T7[T7 Bố cục bàn]
    T5 --> T8[T8 ScoreBar]
    T5 --> T9[T9 ActionBar]
    T5 --> T10[T10 LeverPanel]
    T3 & T4 & T7 & T8 & T9 & T10 --> T11[T11 Phát sự kiện + vòng lặp trận]
    T11 --> T12[T12 Kết thúc trận, chơi lại]
    T2 --> T13[T13 Lớp phủ xoay ngang]
    T12 & T13 --> T14[T14 Thử trên thiết bị]
    T14 --> T15[T15 Tổng kết]
    T15 --> T16[T16 Thẻ BỘ BÀI]
    T16 --> T17[T17 Lá người chơi hiện trọn]
    T15 --> T18[T18 Nút về menu + popup]
    T15 --> T19[T19 Banner tự ẩn]
```

| # | Task | Tệp chính | Phụ thuộc |
| --- | --- | --- | --- |
| T1 | Chuẩn bị: config bố cục, màu, thời lượng; khung thư mục | `src/config.ts`, `eslint.config.js`, `tests/config.test.ts` | – |
| T2 | Chuỗi giao diện | `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/i18n/i18n.test.ts` | T1 |
| T3 | Phiên trận (người chơi + bot) | `src/session/matchSession.ts` | T1 |
| T4 | Hàng đợi sự kiện | `src/session/eventQueue.ts` | T1 |
| T5 | Nút dùng chung và màn bắt đầu | `src/ui/Button.ts`, `src/scenes/BootScene.ts`, `src/main.ts` | T2 |
| T6 | Lá bài | `src/ui/cardFace.ts`, `src/ui/CardSprite.ts` | T1 |
| T7 | Bố cục bàn bằng hình khối | `src/scenes/TableScene.ts`, `src/ui/BetMeter.ts` | T5, T6 |
| T8 | Thanh tỉ số | `src/ui/ScoreBar.ts` | T5 |
| T9 | Thanh hành động | `src/ui/actionBarModel.ts`, `src/ui/ActionBar.ts` | T5 |
| T10 | Bảng cần gạt bản thô | `src/ui/LeverPanel.ts` | T5 |
| T11 | Phát sự kiện và vòng lặp trận | `src/scenes/TableScene.ts` | T3, T4, T7–T10 |
| T12 | Kết thúc trận và chơi lại | `src/scenes/TableScene.ts` | T11 |
| T13 | Lớp phủ "Hãy xoay ngang" | `index.html`, `src/style.css`, `src/main.ts` | T2 |
| T14 | Thử trên máy tính và điện thoại | – | T12, T13 |
| T15 | Tổng kết phase | `docs/plan.md`, skill, PR | T14 |
| T16 | Thẻ "BỘ BÀI" | `src/ai/equity.ts`, `src/ui/handPanelModel.ts`, `src/ui/HandPanel.ts` | T15 |
| T17 | Lá người chơi hiện trọn | `src/config.ts` | T16 |
| T18 | Nút về menu và popup xác nhận | `src/scenes/ConfirmScene.ts`, `src/scenes/TableScene.ts`, `src/ui/ScoreBar.ts` | T15 |
| T19 | Banner tự ẩn | `src/scenes/TableScene.ts` | T15 |

---

## T1 – Chuẩn bị

- [x] Thêm vào `src/config.ts`:
  - `COLORS`: bảng màu theo design system trong `docs/stitch-ui-brief.md` (nền đêm, gỗ, nỉ bàn, hổ phách, chữ kem, chữ mờ, Safe xanh, Nguy hiểm đỏ). Lưu dạng số `0xRRGGBB` cho Graphics, kèm hàm nhỏ đổi sang chuỗi `'#rrggbb'` cho Text.
  - `LAYOUT`: các vùng của màn Bàn chơi theo bảng mục 3.4 của UI brief (thanh trên y 0–56, đối thủ y 56–330, bàn y 300–540, bài người chơi x 24–330 y 470–700, thanh hành động x 360–1256 y 620–704), kích thước lá bài (lá người chơi ~130×180, lá chung và lá đối thủ nhỏ hơn), ô mức cược 40 px, bán kính bo góc, cỡ chữ.
  - `TIMING`: thời lượng chia bài, lật lá, hiện hành động cược, banner, lộ kết quả cần (bản thô), độ trễ suy nghĩ tạm của bot. Phase 3 sẽ thay độ trễ bot bằng khoảng 0,8–2,5 giây.
- [x] Tạo thư mục `src/session/` cho phần điều phối trận không phụ thuộc Phaser. Thêm luật ESLint: `src/session/` không import `phaser`, `scenes/`, `ui/`.
- [x] Cập nhật khối kiến trúc trong `CLAUDE.md` thêm dòng `session/`.
- [x] Mở rộng `tests/config.test.ts`:
  - Mọi vùng trong `LAYOUT` nằm trọn trong 1280×720.
  - Chiều cao nút hành động và cần gạt ≥ `DISPLAY.minTouchSize`.
  - 6 ô mức cược và 5 nút hành động vừa trong vùng của chúng.

## T2 – Chuỗi giao diện

- [x] Thêm khóa vào `vi.ts` rồi `en.ts`, lấy bản dịch từ bảng UI copy cuối `docs/stitch-ui-brief.md`:
  - Màn bắt đầu: `BEST OF {n}`, nút bắt đầu.
  - Tên hai bên: "Bạn", tên bot tạm.
  - Vòng cược: Trước flop / Flop / Turn / River.
  - 5 hành động và phụ đề: "lên {n}", "thua: kéo {n} cần", "kéo {n} cần".
  - 10 tên hạng tay `hand.royalFlush` … `hand.highCard` (Phase 1 để dành cho Phase 2).
  - Banner: ai đi trước, hành động của mỗi bên, so bài, bỏ bài, "{name} phải kéo {n} cần", An toàn, Nguy hiểm, ván hòa (hòa bài, kéo toàn An toàn), +1 chiến thắng, "Đang suy nghĩ…".
  - Kết thúc: thắng/thua trận, tỉ số, số ván hòa, "Ván tiếp", "Chơi lại".
  - Lớp phủ: "Hãy xoay ngang điện thoại để chơi".
- [x] Thêm test vào `tests/i18n/i18n.test.ts`: mỗi khóa có cùng tập placeholder `{...}` ở `vi` và `en`.
- [x] Đọc `?lang=en` trên URL (qua `isLocale`) để thử bản tiếng Anh trước khi có menu ở Phase 5.

## T3 – Phiên trận (`matchSession.ts`)

Lớp mỏng giữ `GameState` hiện tại và nối người chơi với bot. Không import Phaser, để test được và để `TableScene` chỉ còn việc diễn hoạt.

- [x] `createSession({ mode, seed, bot? })`: tạo trận bằng `createMatch`. Bot mặc định là `createRandomBot(seed + 1)`.
- [x] Các thành phần:
  - `view`: `viewFor(state, 0)`, thứ duy nhất UI đọc để vẽ trạng thái.
  - `turn`: `'deal' | 'human' | 'bot' | 'over'`, suy ra từ `currentActor` và `phase`.
  - `deal()`, `humanBet(move)`, `humanPull(lever)`, `botAct()`: mỗi hàm gọi `applyAction`, cập nhật state, trả `GameEvent[]`.
- [x] `botAct()` chỉ đưa cho bot `viewFor(state, 1)`. Hành động của bot vẫn đi qua `applyAction` nên luật vẫn được kiểm.
- [x] Gọi sai lượt (ví dụ `humanBet` khi đang là lượt bot) thì throw và state không đổi.
- [x] Test (`tests/session/matchSession.test.ts`):
  - Người chơi chọn ngẫu nhiên có hạt giống, chạy tới `'over'` ở cả bo3, bo5, bo7.
  - Bot giả ghi lại tham số: mọi lần gọi đều nhận `PlayerView` có `me === 1`, không có `holes`, `rngState`, `board` đầy đủ.
  - Cùng hạt giống và cùng chuỗi lựa chọn cho cùng chuỗi sự kiện.
  - Gọi sai lượt thì throw.

## T4 – Hàng đợi sự kiện (`eventQueue.ts`)

- [x] `EventQueue<E>` nhận hàm `play(event) => Promise<void>`, có `push(events)`, `busy`, `onIdle(cb)`, `dispose()`.
- [x] Phát lần lượt: sự kiện sau chỉ bắt đầu khi promise của sự kiện trước xong. `push` trong lúc đang phát thì nối vào cuối.
- [x] `onIdle` chạy một lần mỗi khi hàng đợi cạn; scene dùng nó để mở khóa input hoặc cho bot đi.
- [x] `dispose()` bỏ các sự kiện còn chờ và ngừng gọi `onIdle`; scene gọi khi `shutdown` để không chạy tween trên scene đã hủy.
- [x] Test (`tests/session/eventQueue.test.ts`) với `play` giả (promise tự resolve thủ công):
  - Đúng thứ tự, không chồng nhau.
  - `busy` đúng trong và sau khi phát.
  - `push` lúc đang phát thì nối tiếp.
  - Một lần `play` lỗi không làm kẹt hàng đợi (ghi lỗi ra console rồi phát tiếp).

## T5 – Nút dùng chung và màn bắt đầu

- [x] `src/ui/Button.ts`: Container gồm hình chữ nhật bo góc, nhãn, phụ đề tùy chọn. Có `setEnabled(bool)` (mờ 30%, tắt input), kiểu chính (nền hổ phách) và phụ (nền gỗ, viền hổ phách). Vùng chạm cao ≥ 64 px. Dùng lại ở ActionBar, màn bắt đầu và nút "Ván tiếp".
- [x] `BootScene` tối giản: tên game, khẩu hiệu, 3 nút BEST OF 3 / 5 / 7. Bấm nút thì `scene.start('TableScene', { mode, seed })`.
- [x] Hạt giống: lấy từ `?seed=` nếu có, không thì sinh ngẫu nhiên ở lớp hiển thị. Ghi hạt giống ra `console.info` để tái hiện lỗi bằng `npm run sim -- --seed`.
- [x] Đăng ký `TableScene` (khung rỗng) trong `main.ts`.

**Xong khi:** bấm một nút ở màn bắt đầu thì sang được `TableScene` trống, có chế độ và hạt giống đúng.

## T6 – Lá bài (`CardSprite`)

- [x] `src/ui/cardFace.ts` (không import Phaser): `cardFace(card)` trả `{ rank: 'A' | 'K' | … | '10' | … , suit: '♠' | '♥' | '♦' | '♣', red: boolean }`.
- [x] `CardSprite`: Container vẽ mặt ngửa (nền trắng bo góc, giá trị và chất ở góc, chất lớn ở giữa, đỏ cho ♥♦) và mặt úp (nền đỏ sẫm, viền). Có các kích thước theo `LAYOUT`.
- [x] Hàm `flip(card)` lật bằng tween co `scaleX` về 0 rồi mở ra, trả `Promise`.
- [x] Kiểm tra Saira Stencil có ký tự ♠♥♦♣ không. Nếu không có, để `DISPLAY.fontFamily` rơi về font hệ thống cho riêng ký tự chất, hoặc vẽ chất bằng Graphics.
- [x] Test `cardFace` cho cả 52 lá: không trùng, `T` thành `10`, đúng màu.

## T7 – Bố cục bàn bằng hình khối

- [x] `TableScene.create` vẽ tĩnh theo `LAYOUT`, từ xa đến gần:
  - Nền tối, chỗ đối thủ là hình khối giữ chỗ (đầu tròn, thân chữ nhật) kèm biển tên và 2 lá úp.
  - Mặt bàn hình thang (hẹp ở xa, rộng ở gần) màu nỉ, viền gỗ.
  - 5 ô lá chung (viền đứt khi chưa lật) và nhãn vòng cược hiện tại.
  - `BetMeter` (`src/ui/BetMeter.ts`): nhãn "Mức cược" và 6 ô vuông, ô ≤ mức hiện tại sáng hổ phách. Có `setLevel(n)` kèm tween nhẹ.
  - Hai lá của người chơi ở góc dưới trái.
- [x] Viết hàm `render(view: PlayerView)` vẽ lại toàn bộ bàn từ view. T11 dùng nó để đồng bộ lại sau mỗi chuỗi sự kiện, tránh lệch giữa hình và state.

**Xong khi:** gọi `render` với view giả ở các vòng preflop, flop, river trông đúng bố cục trong UI brief.

## T8 – Thanh tỉ số (`ScoreBar`)

- [x] Dải trên cùng: bên trái "Bạn" với số chấm tròn bằng `winsNeeded`, bên phải tên bot, giữa là "Hòa: {n}". Chấm đặc = đã thắng, rỗng = chưa.
- [x] `setScore(wins, draws)` có tween nhẹ ở chấm vừa đặc.

## T9 – Thanh hành động (`ActionBar`)

- [x] `src/ui/actionBarModel.ts` (không import Phaser): `actionBarModel(view)` trả 5 mục theo thứ tự `BET_MOVES`, mỗi mục gồm `move`, `enabled` (có trong `view.legal`), khóa nhãn, phụ đề đã điền số:
  - Tăng: "lên {level + raiseStep}".
  - Theo: "thua: kéo {level} cần".
  - Bỏ: "kéo {foldPulls(betting, me)} cần".
  - Tất tay: "lên {maxLevel}".
  - Xem bài: không phụ đề.
- [x] `ActionBar`: 5 `Button` chia đều vùng `LAYOUT`, cao ≥ 64 px. `setModel(model)`, `setLocked(bool)`, gọi `onMove(move)` khi bấm. Bấm xong tự khóa ngay để không gửi hai lần.
- [x] Test `actionBarModel`:
  - Lượt đầu vòng: Xem bài, Tăng, Bỏ, Tất tay bật; Theo tắt.
  - Bị tăng từ 2 lên 3: Theo hiện "kéo 3", Bỏ hiện "kéo 2".
  - Mức đã là 6: Tăng và Tất tay tắt.
  - Không phải lượt mình: cả 5 tắt.

## T10 – Bảng cần gạt bản thô (`LeverPanel`)

- [x] Bảng giữa màn hình, nền phía sau tối đi. Tiêu đề "{name} phải kéo {n} cần".
- [x] 6 hình chữ nhật đánh số 1–6 (cao ≥ 64 px): xám khi chưa kéo, xanh khi An toàn, đỏ khi Nguy hiểm.
- [x] `open(loser, pulls)`, `reveal(lever, danger)` trả `Promise` (ngừng `TIMING` ngắn rồi đổi màu), `close()`.
- [x] Chỉ nhận chạm khi người chơi là người thua và hàng đợi rảnh; cần đã kéo không nhận chạm. Gọi `onPull(lever)`.
- [x] Chưa làm: trượt vào, bộ đếm "đã kéo x / n", tia điện, rung (để Phase 4).

## T11 – Phát sự kiện và vòng lặp trận

- [x] `TableScene.init({ mode, seed })` tạo `MatchSession` và `EventQueue`. Tự `deal()` ván đầu.
- [x] Ánh xạ mỗi `GameEvent` sang một hoạt ảnh trả `Promise` (dùng `tweens` và `time.delayedCall` của scene, không dùng `setTimeout`):
  - `roundStarted`: dọn bàn, banner "Ván {n} — {name} đi trước".
  - `holeCardsDealt`: chia 2 lá ngửa cho người chơi, 2 lá úp cho bot. Không bao giờ vẽ mặt bài bot ở bước này.
  - `betPlaced`: chữ ngắn cạnh người vừa đi ("Tăng lên 3"), `BetMeter.setLevel`.
  - `streetRevealed`: lật từng lá vào ô chung, đổi nhãn vòng.
  - `showdown`: lật bài bot, banner tên hạng tay hai bên và người thắng; hòa bài thì "không ai kéo cần".
  - `folded`: banner "{name} Bỏ bài — kéo {n} cần". Bài bot giữ úp (quyết định #7).
  - `challengeStarted`: `LeverPanel.open`.
  - `leverPulled`: `LeverPanel.reveal`.
  - `roundEnded`: đóng bảng cần, banner kết quả (+1 chiến thắng / hòa), `ScoreBar.setScore`.
  - `matchEnded`: chuyển sang T12.
- [x] Khóa input: `ActionBar` và `LeverPanel` chỉ mở khi `queue.busy === false` và `session.turn === 'human'`.
- [x] Khi hàng đợi rảnh (`onIdle`), xem `session.turn`:
  - `'human'`: `render(view)`, mở input.
  - `'bot'`: hiện "Đang suy nghĩ…", chờ `TIMING.botThinkMs`, gọi `botAct()`, đẩy sự kiện vào hàng đợi. Bot kéo cần cũng đi đường này, mỗi cần một lần.
  - `'deal'`: hiện nút "Ván tiếp"; bấm thì `deal()`.
  - `'over'`: không làm gì (T12 lo).
- [x] Khi scene `shutdown`: `queue.dispose()`, gỡ listener.

**Xong khi:** chơi được nhiều ván liên tiếp, bấm loạn hay bấm nhanh liên tục không gây lỗi hoặc gửi hành động sai lượt (xem console không có `IllegalActionError`).

## T12 – Kết thúc trận và chơi lại

- [x] Khi `matchEnded`: khóa toàn bộ input, hiện dòng kết quả "Bạn thắng trận 2–1" hoặc "Bạn thua trận", số ván hòa.
- [x] Nút "Chơi lại" về `BootScene`. Kiểm tra chơi lại 2–3 lần liên tiếp không nhân đôi listener hay tween (log số listener nếu cần).
- [x] `ResultScene` thật để Phase 5.

**Xong khi:** chơi hết một trận BEST OF 3 từ màn bắt đầu tới dòng kết quả rồi chơi lại được.

## T13 – Lớp phủ "Hãy xoay ngang"

- [x] Làm bằng DOM và CSS, không cần Phaser: thêm `<div id="rotate-overlay">` vào `index.html`, hiện bằng `@media (orientation: portrait) and (pointer: coarse)` trong `style.css`.
- [x] `main.ts` điền chữ bằng `t('rotate.message')`. Ở Phase 2 ngôn ngữ chỉ đổi lúc tải trang (`?lang=`); menu đổi ngôn ngữ ở Phase 5 cần điền lại chữ này.
- [x] Biểu tượng điện thoại xoay vẽ bằng CSS hoặc SVG nội tuyến, màu hổ phách.
- [x] Không hiện trên máy tính kể cả khi cửa sổ hẹp và cao.

## T14 – Thử trên máy tính và điện thoại

- [x] Máy tính: chơi hết một trận ở mỗi chế độ BEST OF 3, 5, 7. Gặp đủ các nhánh: bỏ bài, tất tay, so bài hòa, kéo trúng Nguy hiểm, kéo toàn An toàn. (Các lượt tự chơi chưa gặp so bài hòa; nhánh này có test ở lõi và banner riêng `banner.showdownTie`.)
- [x] Thử `?lang=en` một trận.
- [ ] Điện thoại qua `npm run dev:host` (đã giả lập khung 844×390 có chạm trong Edge headless; còn cần thử trên máy thật):
  - Chạm được mọi nút và cần bằng một lần chạm.
  - Cầm dọc hiện lớp phủ, xoay ngang thì biến mất và game vẫn đúng tỉ lệ.
  - Chữ có dấu (ệ, ấ, ổ, ữ, Đ) và ký tự chất hiển thị đúng.
- [x] Rà chuỗi gõ cứng: tìm chuỗi literal truyền vào `add.text`, `setText`, `Button` trong `src/scenes` và `src/ui`; mọi chuỗi hiển thị phải đi qua `t()`.
- [x] Ghi lỗi tìm được kèm hạt giống; tái hiện bằng `npm run sim -- --seed` nếu lỗi nằm ở lõi.

## T15 – Tổng kết phase

- [x] Đánh dấu `[x]` các mục Phase 2 trong `docs/plan.md`.
- [x] Nếu đổi API lõi hoặc thêm quy ước mới (thư mục `session/`, cách phát sự kiện), cập nhật `CLAUDE.md` và skill `game-rules-core`.
- [x] Chạy đủ `typecheck`, `lint`, `format:check`, `test`, và `npm run build` để chắc bản build không lỗi.
- [x] Chạy GitNexus `detect_changes` trước khi commit (theo `CLAUDE.md`).
- [x] Mở PR từ `feat/drafting-table` vào `main`.

---

## Bổ sung sau tổng kết

Các task dưới làm thêm trên nhánh `feat/drafting-table` sau khi chơi thử. Nguồn thiết kế: `stitch/screen.png`, `stitch/code.html`, `stitch/DESIGN.md`.

## T16 – Thẻ "BỘ BÀI"

- [x] `src/ai/equity.ts`: `estimateEquity(hole, board, rng, trials = EQUITY.trials)` mô phỏng Monte Carlo với bài đối thủ ngẫu nhiên và các lá chung còn thiếu; hòa tính nửa. Không import Phaser hay i18n. Bot dùng lại ở Phase 3.
- [x] `src/ui/handPanelModel.ts` (không import Phaser): `handPanelModel(hole, board)` trả hạng tay, vị trí trong `RANKINGS` (`01` mạnh nhất … `10`), dòng mô tả ("Đôi Át & Đôi K"), 5 lá tốt nhất (bộ trước, lá phụ sau; A đứng cuối trong sảnh A-2-3-4-5), equity và nhãn Mạnh / Khá / Yếu, gợi ý "Cơ hội". Trả `null` khi chưa chia bài.
  - Equity dùng `Rng` có hạt giống lấy từ bộ lá, nên cùng tình huống luôn ra cùng con số.
  - "Cơ hội": xét từng lá chưa lộ, lấy bộ mạnh nhất mà một lá nữa có thể tạo ra; ≤ `HAND_HINT.maxOutRanks` giá trị thì liệt kê ("A, K"), nhiều hơn thì đếm số lá. Trước flop: "Chờ 3 lá flop"; đủ 5 lá chung: "Đã đủ 5 lá chung".
- [x] `src/ui/HandPanel.ts`: vẽ thẻ theo `stitch/` (đèn + "BỘ BÀI" + huy hiệu `xx/10`, ô hạng tay, lưới 5 ô lá, thanh Sức mạnh, hộp "✦ CƠ HỘI"). `setCards(hole, board)` có cache theo bộ lá; ẩn khi chưa có bài.
- [x] `TableScene` cập nhật thẻ sau khi chia bài, sau từng lá chung lật ra và trong `render(view)`; dọn khi bắt đầu ván mới. Tạo thẻ trước HUD để bảng cần gạt phủ lên trên.
- [x] Config: `EQUITY`, `HAND_HINT` (ngưỡng Mạnh/Khá), `LAYOUT.handPanel` (kể cả cỡ chữ). Chuỗi `handPanel.*` ở `vi.ts` và `en.ts`.
- [x] Test: `tests/ai/equity.test.ts` (AA ≈ 85%, bài chung hòa = 0,5, cùng hạt giống cùng kết quả), `tests/ui/handPanelModel.test.ts` (đúng ví dụ trong thiết kế, chọn 5 lá từ 7, sảnh A-2-3-4-5, đếm lá thùng, đổi ngôn ngữ).

**Lưu ý:** cỡ chữ của thẻ theo bản `stitch/` (9–14 px), nhỏ hơn mức tối thiểu 16 px trong `DESIGN.md`; cần xem lại khi thử trên điện thoại thật (T14).

## T17 – Lá người chơi hiện trọn

- [x] Lá lớn 110×150 nghiêng 6° cao khoảng 161 px; ở `y: 650` mép dưới tràn khỏi khung 720. Đổi `LAYOUT.playerCards.y` thành 628 (mép dưới ≈ 706).
- [x] Nâng `LAYOUT.handPanel.y` từ 277 lên 262 để lá không đè lên đáy thẻ "BỘ BÀI".

## T18 – Nút về menu và popup xác nhận

- [x] Nút biểu tượng nhà (`ghost`, 48×40, vùng chạm cao bằng thanh trên) ở góc phải thanh tỉ số. `ScoreBar` có tùy chọn `rightInset` để dời tên bot và chấm tỉ số sang trái.
- [x] `src/scenes/ConfirmScene.ts`: popup có/không dùng chung, chạy như scene phủ trên. Nền tối nuốt mọi chạm; Esc = hủy. Đóng chính nó trước rồi mới gọi callback.
- [x] `TableScene.confirmQuit()`: `scene.pause()` rồi `scene.launch('ConfirmScene')`, nên bot, tween và đồng hồ đều dừng. "Ở LẠI" → `scene.resume()`; "VỀ MENU" → `scene.start('MenuScene')`, không ghi thống kê.
- [x] Khóa nút khi trận đã kết thúc và đang chuyển sang `ResultScene`.
- [x] Chuỗi `quit.title`, `quit.message`, `quit.stay`; config `LAYOUT.menuButton`, `LAYOUT.confirm`.
- [x] Thử tay trên Edge: mở popup, chờ (bàn đứng yên), Ở lại rồi chơi tiếp, Về menu rồi vào trận mới, lặp 2 lần, có cả phím Esc.

## T19 – Banner tự ẩn

- [x] `showBanner` vẫn giữ nhịp chơi `TIMING.banner` như cũ, sau đó để banner nằm thêm `TIMING.bannerHold` (1,5 giây) rồi mờ dần mà không chặn hàng đợi.
- [x] Banner mới hủy hẹn giờ và tween mờ của banner cũ. Vì các banner không bao giờ chồng nhau trong hàng đợi, tween bị hủy chỉ có thể là tween mờ, không phải tween đang được `await`.
