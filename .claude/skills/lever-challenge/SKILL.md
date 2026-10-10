---
name: lever-challenge
description: "Dùng khi viết hoặc sửa thử thách cần gạt của The Last Lever: levers.ts, tạo 6 cần với số cần Nguy hiểm ngẫu nhiên, kéo cần, dừng khi trúng Nguy hiểm, hòa khi kéo đủ toàn Safe, bảng xác suất L(m) tính từ config. Triggers on: levers.ts, lever, cần gạt, Nguy hiểm, danger, Safe, challenge, kéo cần, L(m), dangerProbability."
---

# Thử thách cần gạt (src/core/levers.ts)

Poker chỉ quyết định ai phải kéo và kéo bao nhiêu cần. Thắng thua của ván được quyết định ở đây. Đọc skill `game-rules-core` trước để biết quy tắc hàm thuần, RNG và `PlayerView`.

## Luật

- Có `LEVERS.count` cần (6). Mỗi cần ẩn trạng thái Safe hoặc Nguy hiểm.
- Số cần Nguy hiểm `d` được chọn **ngẫu nhiên đều** trong `[LEVERS.minDanger, LEVERS.maxDanger]` (1–5), nên luôn có ít nhất 1 Safe và 1 Nguy hiểm. Vị trí các cần được xáo trộn.
- Thiết lập cần **khi vào `challenge`**, mỗi ván một bộ mới. Thứ tự rút RNG: `d` trước, xáo vị trí sau.
- Chỉ **người thua poker** kéo, kéo đúng `pulls` cần, mỗi lần chọn một cần chưa kéo. Người chơi tự chọn; bot chọn ngẫu nhiên bằng RNG riêng của bot (skill `bot-ai`).
- Kéo trúng Nguy hiểm thì **dừng ngay**, đối thủ của người kéo được +1 thắng.
- Kéo đủ `pulls` cần mà toàn Safe thì **hòa**, `draws + 1` (gộp chung với hòa poker, quyết định #13).

## API gợi ý

```ts
export interface LeverBoard {
  danger: boolean[]; // ẩn, không bao giờ vào PlayerView khi chưa kéo
  pulled: boolean[];
}
export interface ChallengeState {
  loser: Seat;
  pulls: number; // số cần phải kéo
  pulledCount: number;
  board: LeverBoard;
}

export function setupLevers(rng: Rng, cfg = LEVERS): LeverBoard;
export function pullLever(board: LeverBoard, index: number): { board: LeverBoard; danger: boolean };
export function dangerProbability(m: number, cfg = LEVERS): number; // L(m)
```

- `pullLever` throw `IllegalActionError` khi `index` ngoài khoảng hoặc cần đã kéo. Trong `rules.ts`, kéo bởi ghế không phải `loser` cũng throw.
- `setupLevers`: tạo mảng `d` giá trị `true` và `count - d` giá trị `false`, rồi `rng.shuffle`.

## L(m): xác suất trúng ít nhất một cần Nguy hiểm khi kéo m cần

Bot dùng L(m) và bảng trong tài liệu thiết kế cũng là L(m). Quy tắc của dự án: **tính từ config, không viết tay bảng số.**

Với `n = count` và `d` đều trong `[min, max]`, ta có P(m cần đầu đều Safe | d) = C(n−d, m) / C(n, m). Suy ra:

```text
L(m) = 1 − (1 / (max − min + 1)) · Σ_{d=min..max} C(n−d, m) / C(n, m)
```

Việc dừng sớm khi trúng Nguy hiểm không đổi xác suất "có trúng hay không", nên công thức trên đúng.

Giá trị với config mặc định (n = 6, d từ 1 đến 5), dùng để kiểm tra:

| m | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| L(m) | 1/2 | 11/15 ≈ 0,733 | 17/20 = 0,85 | 23/25 = 0,92 | 29/30 ≈ 0,967 | 1 |

`dangerProbability(0)` = 0. Với `m > n − min` thì L = 1.

Khi cân bằng game (rủi ro ở `docs/plan.md`), chỉ đổi `LEVERS.minDanger` và `LEVERS.maxDanger`, ví dụ 1–3. L(m), bot và bảng hiển thị phải tự đổi theo.

## Ràng buộc config

Kiểm tra bằng test, không bằng `if` lúc chạy:

- `1 <= minDanger <= maxDanger <= count - 1`, để luôn có ít nhất 1 Safe và 1 Nguy hiểm.
- `BETTING.maxLevel <= LEVERS.count`, để không bao giờ phải kéo nhiều hơn số cần đang có.

## Hiển thị (ngoài lõi, chỉ để biết)

`LeverPanel` nhận sự kiện `challengeStarted` và `leverPulled { seat, lever, danger }`. Nhịp ngừng khoảng 1 giây trước khi lộ kết quả là việc của scene, đọc độ dài từ `config.ts`. Lõi trả kết quả ngay lập tức.

## Checklist trước khi xong

- [ ] Có test L(m) khớp bảng trên (sai số 1e-9) và khớp mô phỏng 100.000 lần có hạt giống (sai số ±0,01).
- [ ] Có test phân phối `d` đều trên 1–5, mọi vị trí đều có thể là Nguy hiểm.
- [ ] Có test dừng ngay khi trúng Nguy hiểm (không cho kéo tiếp), hòa khi toàn Safe, throw khi kéo lại cần đã kéo hoặc sai người.
- [ ] `viewFor` chỉ lộ trạng thái của các cần đã kéo.
