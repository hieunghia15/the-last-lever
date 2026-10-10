# Plan triển khai: The Last Lever

Oct 10, 2026 · Dựa trên [the-last-lever-thiet-ke.md](../the-last-lever-thiet-ke.md) và phiên grill cùng ngày.

Game chơi được từ cuối Phase 2 (bot ngẫu nhiên), đúng nghĩa từ cuối Phase 3 (bot thật). Không gắn ngày dự kiến. Mỗi phase là một nhánh `feat/phase-N-<tên>` và một PR vào `main`; Claude viết code, bạn review và chơi thử ở cuối mỗi phase.

## Quyết định bổ sung và thay đổi so với tài liệu thiết kế

Những điểm dưới đây ghi đè hoặc làm rõ tài liệu thiết kế. Mọi con số đặt trong `src/config.ts`.

| # | Chủ đề | Quyết định |
| --- | --- | --- |
| 1 | Bỏ bài sau Tăng/Tất tay | Kéo theo **mức mình đã theo**, không phải mức mới. Ví dụ đang 2, đối thủ tăng lên 3, bỏ → kéo 2. Tối thiểu 1. |
| 2 | Người đi trước | **Ngẫu nhiên mỗi ván**; người đi trước mở lời ở cả 4 vòng cược. |
| 3 | Tất tay | Tính là lần Tăng của vòng đó. Tất tay được Theo → tự lật hết lá chung và so bài. Tăng bị làm mờ khi mức đã là 6. |
| 4 | Chọn đối thủ | Menu chọn **Dễ / Vừa / Khó / Ngẫu nhiên**; cả ba dùng chung 1 nhân vật, khác tên và màu nhấn. Gán tính cách vào mức khó sau khi đo ở Phase 3. |
| 5 | Tiêu chí bot (mốc 3) | Thay "từng cặp 40–60%" bằng: mỗi tính cách thắng bot cơ sở ≥ 60% trên 1.000 trận, và mọi cặp tính cách nằm trong 35–65%. |
| 6 | m_cuối của bot | m_cuối = mức sau khi Theo + 0,5 × số vòng cược còn lại, làm tròn lên, tối đa 6. Công thức chỉ dùng khi bot phải chọn Theo hay Bỏ; Xem bài là miễn phí. |
| 7 | Lật bài bot | Lật khi so bài; không lật khi có người bỏ. |
| 8 | Biểu cảm nhân vật | **Bỏ các trạng thái biểu cảm.** Nhân vật là 1 hình tĩnh; khi trúng Nguy hiểm dùng hiệu ứng phủ (tia điện, rung, nháy màu). |
| 9 | Bong bóng thoại thay biểu cảm | Hiện ở ~30% lượt hành động của bot và một câu khi vào thử thách, 2 giây. Câu có nhãn mạnh/yếu/trung tính; tỉ lệ nói dối: Thận trọng 10%, Cân bằng 20%, Liều lĩnh 35%. ~8 câu mỗi nhãn mỗi ngôn ngữ. |
| 10 | Bộ xếp hạng bài | Tự viết, không dùng thư viện poker ngoài. Test đối chiếu với một bộ chấm tham chiếu chậm nhưng hiển nhiên, viết ngay trong test. 300 lần mô phỏng < 50 ms trên điện thoại. |
| 11 | Điện thoại | Lớp phủ "Hãy xoay ngang" khi cầm dọc; xin toàn màn hình ở lần chạm đầu (trừ iOS Safari). |
| 12 | Lưu trữ | localStorage: ngôn ngữ, âm thanh (để sẵn), thống kê thắng/thua theo mức khó; mọi truy cập bọc try/catch. |
| 13 | Ván hòa | Hòa do poker hòa bài và hòa do kéo toàn Safe gộp chung một con số. |
| 14 | Phông chữ | Saira Stencil (OFL), tự host, có bộ ký tự tiếng Việt. |
| 15 | Cách chơi | 3–4 trang tĩnh có hình minh họa. |
| 16 | Môi trường | Chỉ dev và chơi local (`vite`, `vite --host` để thử điện thoại qua LAN). Build ra web tĩnh, `base` cấu hình được, để sau deploy lên VPS. |
| 17 | Mốc 6 cũ | Bỏ phần SDK cổng game; thử điện thoại và giảm dung lượng nhập vào Phase 5. |

**Để sau (ngoài các phase dưới):** âm thanh (nguồn CC0, ghi `CREDITS.md`), SDK cổng game (lớp `platform/` có adapter), deploy VPS, chơi online.

## Phase 0 – Thiết lập dự án

Nhánh: `feat/setup-project`.

- [x] Vite + TypeScript (strict) + Phaser 4.2, npm
- [x] ESLint + Prettier, script `lint`, `format`, `typecheck`
- [x] Vitest, script `test`
- [x] GitHub Actions: typecheck + lint + test cho PR vào `main`
- [x] Khung thư mục theo tài liệu: `src/core`, `src/ai`, `src/scenes`, `src/ui`, `src/i18n`, `src/config.ts`, `scripts/`
- [x] Quy tắc ESLint cấm `src/core` và `src/ai` import `phaser`
- [x] Khung i18n: `vi.ts`, `en.ts`, `t()` có kiểm tra khóa thiếu bằng kiểu
- [x] Phông Saira Stencil tự host
- [x] `vite.config.ts` có `base` cấu hình qua biến môi trường
- [x] Phaser khởi động một scene trống 1280×720, `Scale.FIT`, căn giữa

**Xong khi:** `npm run dev` mở được canvas trống; `npm run typecheck`, `lint`, `test` đều xanh trên CI.

## Phase 1 – Lõi luật chơi

Nhánh: `feat/core-game-mechanics`. Task chi tiết: [docs/tasks/phase-1.md](tasks/phase-1.md).

- [x] `rng.ts`: PRNG có hạt giống (ví dụ mulberry32), hàm `shuffle`, `int`, `pick`
- [x] `cards.ts`: kiểu lá bài, bộ 52 lá, xáo bằng `rng`
- [x] `handEvaluator.ts`: bộ 5 lá mạnh nhất từ 7 lá, so sánh hai tay theo 10 hạng (Thùng phá sảnh lớn > Thùng phá sảnh > Tứ quý > Cù lũ > Thùng > Sảnh > Sám cô > Hai đôi > Một đôi > Mậu thầu), tính cả sảnh A-2-3-4-5
- [x] Test `handEvaluator`: các trường hợp biên viết tay + đối chiếu bộ chấm tham chiếu viết trong test (duyệt 21 tổ hợp 5 lá, không dùng chung logic với `evaluate7`) trên ~10.000 cặp tay có hạt giống; benchmark tốc độ
- [x] `betting.ts`: mức chung 1–6, hành động Xem bài / Tăng / Theo / Bỏ / Tất tay, mỗi người tăng tối đa 1 lần mỗi vòng (Tất tay tính là tăng), hàm `legalActions`, ghi lại mức mỗi người đã theo
- [x] `levers.ts`: số cần Nguy hiểm ngẫu nhiên đều 1–5, xáo vị trí, kéo cần, mỗi cần kéo một lần, dừng khi trúng Nguy hiểm
- [x] `match.ts`: BEST OF 3/5/7, tỉ số, số ván hòa, điều kiện kết thúc
- [x] `gameState.ts` + `rules.ts`: các phase `deal`, `betting`, `challenge`, `roundResult`, `matchOver`; `applyAction(state, action)` trả `{ state, events }`
- [x] Luật: người đi trước ngẫu nhiên mỗi ván; Bỏ kéo theo mức mình đã theo (tối thiểu 1); Tất tay được Theo → lật hết lá chung; poker hòa bài → hòa ván, không kéo cần
- [x] Test chuyển trạng thái cho từng nhánh: bỏ ở lượt đầu, bỏ sau tăng, tất tay theo/bỏ, so bài hòa, kéo trúng Nguy hiểm, kéo toàn Safe, kết thúc trận
- [x] Test tái hiện: cùng hạt giống → cùng chuỗi sự kiện
- [x] `scripts/sim.ts`: hai bot ngẫu nhiên tự đấu, `--seed`, `--mode 3|5|7`, in log sự kiện
- [x] `scripts/play.ts`: chơi tương tác bằng readline với bot ngẫu nhiên
- [x] Chạy cả hai bằng `tsx` qua script npm

**Xong khi:** chạy hết được một trận bằng dòng lệnh ở cả hai chế độ, toàn bộ test lõi xanh.

## Phase 2 – Bàn chơi bản nháp

- [ ] `BootScene` tối giản → `TableScene` (Menu/Result tạm là nút bắt đầu và dòng kết quả)
- [ ] Bố cục bằng hình khối theo tài liệu: tỉ số chấm tròn + số ván hòa, chỗ đối thủ + 2 lá úp, bàn hình thang, 5 ô lá chung, 6 ô mức cược, 2 lá của người chơi
- [ ] `CardSprite` vẽ lá bằng hình + chữ (chưa cần atlas)
- [ ] `ActionBar`: 5 nút, làm mờ nút không hợp lệ, Bỏ và Theo hiện số cần sẽ phải kéo; cao ≥ 64 px
- [ ] `ScoreBar`
- [ ] Hàng đợi sự kiện: `TableScene` phát lần lượt các sự kiện từ lõi bằng tween, khóa input khi đang diễn
- [ ] `LeverPanel` bản thô: 6 hình chữ nhật, chạm để kéo, đổi màu xanh/đỏ (chưa có hiệu ứng)
- [ ] Bot ngẫu nhiên trong các hành động hợp lệ, kéo cần ngẫu nhiên
- [ ] Lớp phủ "Hãy xoay ngang"
- [ ] Mọi chuỗi qua `t()`

**Xong khi:** bấm nút chơi hết một trận trên máy tính và trên điện thoại qua `vite --host`.

## Phase 3 – Bot

- [ ] `equity.ts`: mô phỏng 300 ván (cấu hình được) từ bài riêng + lá chung đã lật, đối thủ bài ngẫu nhiên; dùng `rng` riêng của bot
- [ ] Benchmark `equity` < 50 ms; nếu chậm thì tối ưu evaluator hoặc chạy trong Web Worker
- [ ] `personalities.ts`: Thận trọng / Cân bằng / Liều lĩnh với hệ số sợ, ngưỡng tăng, ngưỡng tất tay, tỉ lệ lừa (bảng trong tài liệu)
- [ ] `botBrain.ts`: L(m) tính từ cấu hình (không gõ cứng bảng); m_cuối theo quyết định #6; điều chỉnh theo tỉ số (+0,2 khi đối thủ còn 1 chiến thắng, −0,1 khi bot dẫn)
- [ ] Bot không đọc bài người chơi hay trạng thái cần: test kiểm tra bot chỉ nhận góc nhìn đã lọc (`PlayerView`)
- [ ] Độ trễ suy nghĩ 0,8–2,5 giây ở lớp hiển thị
- [ ] Bong bóng thoại: chọn câu theo nhãn mạnh/yếu/trung tính, tỉ lệ nói dối theo tính cách, ~8 câu mỗi nhãn ở `vi.ts` và `en.ts`
- [ ] `scripts/balance.ts`: 1.000 trận cho mỗi cặp (kể cả với bot cơ sở ngẫu nhiên và luôn-Theo), in tỉ lệ thắng, tỉ lệ hòa, số ván trung bình mỗi trận, tần suất Tất tay và Bỏ
- [ ] Chỉnh `config.ts` theo báo cáo; ghi kết quả cuối vào `docs/balance.md`
- [ ] Gán Dễ / Vừa / Khó cho ba tính cách theo kết quả; tạm thêm chọn mức khó vào màn bắt đầu

**Xong khi:** mỗi tính cách thắng bot cơ sở ≥ 60%, mọi cặp tính cách trong 35–65%, đã gán mức khó, và chơi tay với bot thấy được nó lừa.

## Phase 4 – Khoảnh khắc kéo cần

- [ ] Bảng 6 cần trượt ra giữa màn hình khi vào `challenge`, nền phía sau tối đi
- [ ] Bộ đếm "đã kéo x / n"
- [ ] Hoạt ảnh kéo cần, ngừng ~1 giây (cấu hình được) rồi mới lộ kết quả
- [ ] Safe: đèn xanh; Nguy hiểm: đèn đỏ + tia điện (particles/graphics)
- [ ] Người chơi trúng Nguy hiểm: lóe trắng, rung camera, tia điện tỏa ra mép màn hình
- [ ] Bot trúng Nguy hiểm: hiệu ứng phủ lên hình nhân vật (tia điện, rung, nháy màu)
- [ ] Bot kéo cần có nhịp chần chừ trước mỗi cần
- [ ] Kiểm tra 60 fps trên điện thoại trong lúc phát hiệu ứng

**Xong khi:** bạn chơi thử và thấy khoảnh khắc kéo cần đủ căng; không tụt khung hình trên điện thoại.

## Phase 5 – Hình ảnh thật, các màn phụ, hoàn thiện điện thoại

- [ ] Nhân vật anime 1 tư thế: Claude vẽ SVG, xuất PNG (độ phân giải đủ cho khung 1280×720 trên màn hình mật độ cao)
- [ ] Nền quán rượu tối, bàn phối cảnh, đèn treo
- [ ] Bảng cần gạt và cần ở 3 trạng thái (chưa kéo, Safe, Nguy hiểm)
- [ ] Atlas bài 52 lá + mặt sau từ Kenney (CC0), ghi `CREDITS.md`
- [ ] Nút, ô mức cược, chấm tỉ số vẽ thật
- [ ] `BootScene` có thanh tiến độ tải
- [ ] `MenuScene`: BEST OF 3/5/7, Dễ/Vừa/Khó/Ngẫu nhiên, Cách chơi, đổi ngôn ngữ; nút âm thanh ẩn cho tới khi có âm thanh
- [ ] Màn Cách chơi: 3–4 trang tĩnh có hình
- [ ] `ResultScene`: thắng/thua, tỉ số, số ván hòa, chơi lại, về menu
- [ ] localStorage: ngôn ngữ, thống kê thắng/thua theo mức khó (bọc try/catch)
- [ ] Xin toàn màn hình ở lần chạm đầu (bỏ qua trên iOS Safari)
- [ ] Thử trên một điện thoại thật: chạm, xoay màn hình, tỉ lệ, chữ có dấu
- [ ] Tối ưu dung lượng: nén PNG, atlas, kiểm tra kích thước build

**Xong khi:** chơi trọn vẹn từ Menu tới Kết quả bằng hai ngôn ngữ, chạy mượt trên điện thoại thật, bản build gzip < 5 MB.

## Rủi ro cần theo dõi

- **Cân bằng:** mức 1 đã 50% thua ván. Báo cáo ở Phase 3 sẽ cho biết có cần thu hẹp số cần Nguy hiểm (ví dụ 1–3) hay không; chỉ cần đổi `config.ts`.
- **Tất tay quá mạnh:** theo dõi tần suất Tất tay và Bỏ trong báo cáo cân bằng.
- **Bot dễ đoán khi không có biểu cảm:** bong bóng thoại nói dối và các ván lừa là hai công cụ chính; chỉnh tỉ lệ sau khi chơi thử.
- **Hiệu năng equity trên điện thoại:** có phương án Web Worker hoặc giảm số lần mô phỏng.
- **Chất lượng hình anime:** hình có thể thay sau mà không đổi code.
