# Cân bằng bot

Kết quả `npm run balance` cho Phase 3 (task T10–T12 trong [tasks/phase-3.md](tasks/phase-3.md)). Tiêu chí theo quyết định #5 (đã sửa Oct 11, 2026): mỗi tính cách thắng bot ngẫu nhiên ≥ 60% và bot luôn-Theo ≥ 55% trên 1.000 trận, mọi cặp tính cách nằm trong 35–65%.

## Trạng thái

**Đạt** ở cả ba hạt giống 1, 2, 3 (1.000 trận mỗi cặp, BEST OF 3, 300 lần mô phỏng). Cặp sát mốc nhất là Liều lĩnh – luôn Theo: 56,9 / 59,2 / 57,9% (mốc 55%).

## Cấu hình cuối (`BOT.personalities` trong `src/config.ts`)

| Tính cách | fear | raiseAt | allInAt | bluffRaise | bluffAllIn | lieRate | Khác tài liệu thiết kế |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cautious | 0,9 | 0,70 | 0,90 | 0 | 0 | 10% | fear 1,3 → 0,9 |
| balanced | 0,75 | 0,60 | 0,80 | 0 | 0 | 20% | fear 1,0 → 0,75 |
| reckless | 0,6 | 0,55 | 0,70 | 15% | 5% | 35% | fear 0,7 → 0,6; raiseAt 0,5 → 0,55; allInAt 0,65 → 0,7 |

Điều chỉnh theo tỉ số giữ nguyên (+0,2 khi đối thủ còn 1 chiến thắng, −0,1 khi bot dẫn). `LEVERS` không đổi.

## Gán mức khó (T12)

| Mức | Tính cách | Lý do |
| --- | --- | --- |
| Dễ | Thận trọng | Yếu nhất ở mọi phép đo: thắng bot ngẫu nhiên 64–67%, thua Cân bằng (47–48%) và Liều lĩnh (41–44%) |
| Vừa | Cân bằng | Thắng bot ngẫu nhiên 73%, nhỉnh hơn Thận trọng, thua Liều lĩnh 45–48% |
| Khó | Liều lĩnh | Thắng bot ngẫu nhiên 76–79%, thắng cả hai tính cách kia; lừa và nói dối nhiều nhất |

Ba tính cách đấu nhau chỉ chênh vài điểm (tiêu chí 35–65% buộc vậy). Với người chơi, độ khó thấy rõ hơn ở cách chơi: Thận trọng hay bỏ và ít tăng, Liều lĩnh tất tay ở khoảng 1/3 số ván khi đấu tính cách khác và lừa ở 10–19% số ván.

## Nhật ký chỉnh

| Lần | Thay đổi | Kết quả |
| --- | --- | --- |
| 0 | Cấu hình gốc theo tài liệu thiết kế (fear 1,3 / 1,0 / 0,7) | Thận trọng thắng bot ngẫu nhiên 43%, thua Liều lĩnh 23%: bỏ bài ở 58–64% số ván |
| 1 | Hạ fear: 0,9 / 0,75 / 0,6 | Mọi tiêu chí đạt, trừ Liều lĩnh – luôn Theo ≈ 59% (mốc lúc đó 60%) |
| 2 | Dò ngưỡng Tăng/Tất tay của Liều lĩnh (fear không có tác dụng với bot luôn Theo vì nó không bao giờ tăng) | Bề mặt phẳng: mọi ngưỡng cho 62–63% khi **không** lừa; có lừa thì về ≈ 60% |
| 3 | Thử mức sàn equity cho ván lừa | +0,5–1 điểm, không đủ; đã gỡ |
| 4 | Bạn chọn hạ mốc với bot luôn Theo xuống 55% (quyết định #5) | – |
| 5 | Đưa Liều lĩnh về số thiết kế (0,5 / 0,65) | Đạt cả 3 hạt giống nhưng sát mốc: luôn Theo 55,8%, Thận trọng – Liều lĩnh 38,9% |
| 6 | Liều lĩnh 0,55 / 0,70, giữ tỉ lệ lừa 15% / 5% | Cấu hình cuối, đạt cả 3 hạt giống với khoảng dư ≥ 1,9 điểm |

## Vì sao bot luôn Theo khó bị vượt xa

- Công thức trong tài liệu thiết kế chỉ tính rủi ro **của bot** phải kéo, không tính lợi khi đối thủ phải kéo. Vì thế fear ≥ 1 làm bot bỏ bài quá nhiều, và phải hạ fear ở lần 1.
- Bot luôn Theo không bao giờ bỏ. Với nó, mức cược không đổi được ai thắng một ván phân thắng bại (người thắng poker luôn là người thắng ván, nếu có người trúng Nguy hiểm); mức cược chỉ đổi **ván nào** thành hòa. Bot hơn được nhờ đẩy cược khi bài mạnh và giữ cược thấp khi bài yếu.
- Vì vậy mọi tính cách chỉ đạt quanh 62–64% với bot luôn Theo, và mỗi ván lừa là thiệt thuần. Với người chơi thật (biết bỏ bài), ván lừa mới có tác dụng.

## Chơi thử (T13)

Chưa làm. Cần chơi tay với từng mức khó (bật `?debug=bot` để xem equity, rủi ro, ván lừa và câu nói dối trong console) và đo thời gian equity trên điện thoại thật.

## Báo cáo đầy đủ, seed 1

`npm run balance -- --matches 1000 --mode 3 --seed 1 --trials 300` · 55 giây

### Tỉ lệ thắng trận

| A | B | A thắng | ±95% | Ván / trận | Tỉ lệ ván hòa | Mức cược TB khi kéo |
| --- | --- | --- | --- | --- | --- | --- |
| cautious | balanced | 47.9% | 3.1% | 3.79 | 33.7% | 2.58 |
| cautious | reckless | 40.5% | 3.0% | 3.50 | 29.6% | 2.97 |
| balanced | reckless | 45.1% | 3.1% | 3.17 | 20.5% | 3.87 |
| cautious | random | 63.7% | 3.0% | 3.56 | 32.2% | 2.72 |
| cautious | calling | 62.8% | 3.0% | 4.01 | 38.4% | 2.18 |
| balanced | random | 73.0% | 2.8% | 3.31 | 26.5% | 3.25 |
| balanced | calling | 64.6% | 3.0% | 3.67 | 32.4% | 2.79 |
| reckless | random | 78.6% | 2.5% | 3.16 | 23.5% | 3.52 |
| reckless | calling | 56.9% | 3.1% | 3.29 | 23.8% | 3.55 |

### Hành vi mỗi bên (trên số ván đã chơi)

| Cặp | Bên | Tất tay | Bỏ bài | Lừa | Thua thử thách | Nói | Nói dối / nói |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cautious – balanced | cautious | 8.8% | 19.5% | 0.0% | 33.7% | 4283 | 10.1% |
| cautious – balanced | balanced | 19.4% | 7.0% | 0.0% | 32.6% | 4108 | 19.2% |
| cautious – reckless | cautious | 7.5% | 28.1% | 0.0% | 39.2% | 3612 | 10.3% |
| cautious – reckless | reckless | 32.7% | 2.3% | 16.8% | 31.2% | 3370 | 34.0% |
| balanced – reckless | balanced | 17.2% | 13.4% | 0.0% | 42.0% | 3348 | 20.2% |
| balanced – reckless | reckless | 33.6% | 3.1% | 17.2% | 37.5% | 3115 | 35.4% |
| cautious – random | cautious | 1.9% | 23.3% | 0.0% | 26.5% | 2127 | 10.5% |
| cautious – random | random | 43.0% | 43.0% | 0.0% | 41.3% | 0 | – |
| cautious – calling | cautious | 13.4% | 0.0% | 0.0% | 25.7% | 4700 | 9.7% |
| cautious – calling | calling | 0.0% | 0.0% | 0.0% | 35.8% | 0 | – |
| balanced – random | balanced | 5.7% | 9.5% | 0.0% | 24.6% | 1948 | 18.4% |
| balanced – random | random | 43.3% | 47.1% | 0.0% | 48.9% | 0 | – |
| balanced – calling | balanced | 24.1% | 0.0% | 0.0% | 27.4% | 4208 | 19.2% |
| balanced – calling | calling | 0.0% | 0.0% | 0.0% | 40.2% | 0 | – |
| reckless – random | reckless | 12.6% | 2.5% | 9.8% | 22.8% | 1759 | 35.1% |
| reckless – random | random | 40.3% | 49.9% | 0.0% | 53.7% | 0 | – |
| reckless – calling | reckless | 39.3% | 0.0% | 18.8% | 34.5% | 3227 | 35.6% |
| reckless – calling | calling | 0.0% | 0.0% | 0.0% | 41.7% | 0 | – |

### Tiêu chí (quyết định #5)

- ĐẠT: cautious – balanced 47.9% (cần 35–65%)
- ĐẠT: cautious – reckless 40.5% (cần 35–65%)
- ĐẠT: balanced – reckless 45.1% (cần 35–65%)
- ĐẠT: cautious thắng random 63.7% (cần ≥ 60.0%)
- ĐẠT: cautious thắng calling 62.8% (cần ≥ 55.0%)
- ĐẠT: balanced thắng random 73.0% (cần ≥ 60.0%)
- ĐẠT: balanced thắng calling 64.6% (cần ≥ 55.0%)
- ĐẠT: reckless thắng random 78.6% (cần ≥ 60.0%)
- ĐẠT: reckless thắng calling 56.9% (cần ≥ 55.0%)

**ĐẠT tất cả tiêu chí**

## Tóm tắt seed 2

`npm run balance -- --matches 1000 --mode 3 --seed 2 --trials 300` · 55 giây

### Tỉ lệ thắng trận

| A | B | A thắng | ±95% | Ván / trận | Tỉ lệ ván hòa | Mức cược TB khi kéo |
| --- | --- | --- | --- | --- | --- | --- |
| cautious | balanced | 48.3% | 3.1% | 3.86 | 34.1% | 2.58 |
| cautious | reckless | 43.3% | 3.1% | 3.43 | 28.5% | 3.08 |
| balanced | reckless | 48.1% | 3.1% | 3.24 | 22.2% | 3.81 |
| cautious | random | 65.3% | 3.0% | 3.50 | 30.5% | 2.70 |
| cautious | calling | 62.5% | 3.0% | 3.98 | 37.4% | 2.10 |
| balanced | random | 73.2% | 2.7% | 3.30 | 26.5% | 3.24 |
| balanced | calling | 61.4% | 3.0% | 3.66 | 31.1% | 2.73 |
| reckless | random | 75.9% | 2.7% | 3.22 | 23.5% | 3.59 |
| reckless | calling | 59.2% | 3.0% | 3.25 | 23.7% | 3.50 |

## Tóm tắt seed 3

`npm run balance -- --matches 1000 --mode 3 --seed 3 --trials 300` · 60 giây

### Tỉ lệ thắng trận

| A | B | A thắng | ±95% | Ván / trận | Tỉ lệ ván hòa | Mức cược TB khi kéo |
| --- | --- | --- | --- | --- | --- | --- |
| cautious | balanced | 46.7% | 3.1% | 3.87 | 35.0% | 2.55 |
| cautious | reckless | 43.9% | 3.1% | 3.41 | 28.0% | 3.09 |
| balanced | reckless | 48.0% | 3.1% | 3.14 | 20.8% | 3.89 |
| cautious | random | 66.6% | 2.9% | 3.43 | 30.6% | 2.74 |
| cautious | calling | 62.4% | 3.0% | 4.03 | 38.2% | 2.14 |
| balanced | random | 73.4% | 2.7% | 3.26 | 26.0% | 3.23 |
| balanced | calling | 57.6% | 3.1% | 3.58 | 31.1% | 2.75 |
| reckless | random | 76.6% | 2.6% | 3.17 | 23.1% | 3.65 |
| reckless | calling | 57.9% | 3.1% | 3.26 | 23.4% | 3.49 |
