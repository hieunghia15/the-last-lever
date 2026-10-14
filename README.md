# The Last Lever

Game trình duyệt một người chơi: đấu **Texas Hold'em tay đôi** với một bot, nhưng thay vì cược tiền, hai bên cược bằng **số cần gạt**. Ai thua ván poker phải kéo đúng số cần đã cược, và chỉ cần trúng một cần **Nguy hiểm** là đối thủ có thêm một chiến thắng.

- Chạy trên trình duyệt máy tính và điện thoại, màn hình ngang (khung thiết kế 1280×720).
- Hai ngôn ngữ: Tiếng Việt và English.
- Không dùng tiền thật, không có đơn vị quy đổi ra tiền.

## Cách chơi

Poker chỉ quyết định **ai** phải kéo cần và kéo **bao nhiêu**. Chiến thắng chỉ được ghi khi người thua kéo trúng cần Nguy hiểm.

1. **Chọn trận:** thể thức BEST OF 3, 5 hoặc 7 (cần 2, 3 hoặc 4 chiến thắng) và đối thủ Dễ, Vừa, Khó hoặc Ngẫu nhiên.
2. **Đánh poker:** mỗi ván gồm 4 vòng cược chuẩn (trước flop, flop, turn, river). Hai bên dùng chung một mức cược, bắt đầu ở 1 và tối đa 6 cần. Các hành động gồm Xem bài, Tăng (+1 mức), Theo, Bỏ và Tất tay (lên thẳng 6).
3. **Kéo cần:** người thua poker chọn và kéo lần lượt từng cần trong 6 cần. Mỗi lần có từ 1 đến 5 cần Nguy hiểm, vị trí bị xáo trộn và không ai biết trước.
   - Trúng **Nguy hiểm**: dừng ngay, đối thủ được một chiến thắng.
   - Kéo đủ số mà toàn **Safe**: ván hòa.
4. Sáu cần được thiết lập lại cho ván sau. Trận kết thúc khi một bên đạt đủ số chiến thắng.

Một vài luật đáng chú ý:

- **Bỏ bài** cũng tính là thua poker. Người bỏ kéo theo mức mình **đã theo**, tối thiểu 1 cần.
- **Người đi trước** được chọn ngẫu nhiên mỗi ván. Luật này không có blind.
- **Mỗi người chỉ được tăng một lần mỗi vòng**, và Tất tay cũng tính là lần tăng đó.
- **Poker hòa bài** thì ván hòa, không ai phải kéo cần.

## Màn hình

| Màn hình | Nội dung |
| --- | --- |
| Tải | Thanh tiến độ khi nạp tài nguyên |
| Menu | Chọn BEST OF, chọn đối thủ, xem cách chơi, đổi ngôn ngữ |
| Cách chơi | Vài trang hướng dẫn có hình minh họa |
| Bàn chơi | Toàn bộ trận đấu, kể cả thử thách kéo cần |
| Kết quả | Thắng hoặc thua, tỉ số, số ván hòa, chơi lại |

Trên bàn chơi, tỉ số hai bên hiện bằng chấm tròn ở trên cùng. Đối thủ ngồi đối diện, mặt bàn vẽ theo phối cảnh, có 5 ô lá chung và 6 ô mức cược. Hai lá bài của bạn nằm ở phía dưới, còn thanh hành động nằm ở đáy màn hình. Khi vào thử thách, bảng 6 cần gạt hiện ra giữa màn hình. Kéo trúng cần Safe thì đèn xanh, trúng cần Nguy hiểm thì đèn đỏ kèm hiệu ứng điện giật. Đây là khoảnh khắc chính của game.

## Tính năng

- Bàn chơi đầy đủ: tỉ số, số ván hòa, lá chung, thanh mức cược, thanh hành động hiện trước số cần phải kéo.
- Thẻ **"BỘ BÀI"** cho biết bộ bài hiện tại của bạn, 5 lá tốt nhất, sức mạnh ước tính và lá có thể nâng bộ.
- Ba mức khó, mỗi mức là một tính cách bot riêng.
- Màn Menu, Cách chơi, Kết quả và thống kê thắng/thua theo mức khó (lưu trong trình duyệt).
- Lớp phủ "Hãy xoay ngang" khi cầm điện thoại dọc.
- Có thể chơi lại đúng một trận bằng hạt giống ngẫu nhiên.
- Nút bấm và cần gạt cao tối thiểu 64 px, mọi thao tác chỉ cần một chạm.

## Hình ảnh và tài nguyên

- **Đối thủ:** một nhân vật 2D phong cách anime, vẽ bằng SVG rồi xuất ra PNG. Hình có thể thay sau mà không phải sửa code.
- **Bối cảnh:** quán rượu tối, mặt bàn phối cảnh, đèn treo.
- **Bài:** dự kiến dùng bộ bài CC0 của Kenney. Hiện bài được vẽ bằng hình và chữ.
- **Âm thanh:** chưa có. Khi thêm sẽ dùng nguồn CC0 và ghi công trong `CREDITS.md`.

Cơ chế chơi lấy cảm hứng từ Liar's Bar. Tên, nhân vật, hình ảnh và âm thanh đều là của riêng dự án này.

## Công nghệ

- [Phaser 4.2](https://phaser.io/) cho phần hiển thị
- TypeScript 6.0 (strict)
- Vite 8 để chạy dev và build ra web tĩnh
- Vitest để kiểm thử
- ESLint (có kiểm tra kiểu) và Prettier
- Phông Saira Stencil, tự host qua `@fontsource/saira-stencil`

## Bắt đầu

Cần Node.js **22.12** trở lên.

```bash
npm install
npm run dev
```

Muốn thử trên điện thoại cùng mạng LAN thì chạy `npm run dev:host` rồi mở địa chỉ mạng mà Vite in ra.

### Các lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy dev server |
| `npm run dev:host` | Chạy dev server, mở cho mạng LAN |
| `npm run build` | Kiểm tra kiểu rồi build ra `dist/` (web tĩnh) |
| `npm run preview` | Xem thử bản build |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run lint` | Chạy ESLint |
| `npm run format` / `format:check` | Định dạng hoặc kiểm tra định dạng bằng Prettier |
| `npm test` | Chạy toàn bộ test một lần |
| `npm run sim` | Cho hai bot tự đấu trên dòng lệnh |
| `npm run play` | Chơi với bot ngay trên dòng lệnh |
| `npm run balance` | In báo cáo cân bằng giữa các bot |

### Tham số URL

- `?seed=123`: chơi lại đúng một trận với cùng hạt giống.
- `?debug=bot`: in lý do hành động của bot ra console.
- `?debug=fps`: hiện số khung hình mỗi giây ở góc màn hình. Dùng cả hai: `?debug=bot,fps`.

## Cấu trúc dự án

```text
src/
  core/      luật chơi, TypeScript thuần
  ai/        bot và các tính cách
  session/   điều phối một trận, không phụ thuộc Phaser
  scenes/    các màn Phaser, chỉ lo diễn hoạt
  ui/        component giao diện
  i18n/      bản dịch tiếng Việt và tiếng Anh
  config.ts  mọi tham số cân bằng và bố cục
scripts/     script dòng lệnh (sim, play, balance)
tests/       test Vitest, phản chiếu cấu trúc src/
docs/        kế hoạch, báo cáo cân bằng, task từng phase
```

## Giấy phép

[MIT](LICENSE)
