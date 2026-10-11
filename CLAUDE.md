# The Last Lever

Game trình duyệt một người chơi. Người chơi đấu Texas Hold'em tay đôi với một bot và cược bằng số cần gạt, từ 1 đến 6. Người thua ván poker phải kéo đúng số cần đã cược. Kéo trúng cần Nguy hiểm thì đối thủ được một chiến thắng. Trận đấu theo thể thức BEST OF 3, 5 hoặc 7. Game chạy trên máy tính và điện thoại, màn hình ngang, khung thiết kế 1280×720. Không dùng tiền thật.

Công nghệ: Phaser 4.2, TypeScript 6.0 (strict), Vite 8, Vitest, ESLint (có kiểm tra kiểu) và Prettier.

## Tài liệu nguồn

- `the-last-lever-thiet-ke.md`: tài liệu thiết kế gốc, gồm luật chơi, bot, bố cục màn hình và kiến trúc.
- `docs/plan.md`: các phase kèm checklist, cùng **bảng quyết định ghi đè tài liệu thiết kế**. Khi hai tài liệu mâu thuẫn, `docs/plan.md` được ưu tiên.
- Làm xong một task thì đánh dấu `[x]` cho task đó trong `docs/plan.md`.

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy dev server |
| `npm run dev:host` | Chạy dev server có mở mạng LAN để thử trên điện thoại |
| `npm run typecheck` | Kiểm tra kiểu với `tsconfig.json` (src) và `tsconfig.node.json` (config, scripts) |
| `npm run lint` | Chạy ESLint |
| `npm run format` / `format:check` | Định dạng hoặc kiểm tra định dạng bằng Prettier (bỏ qua `*.md`) |
| `npm test` | Chạy Vitest một lần |
| `npm run build` | Typecheck rồi build ra thư mục `dist/` (web tĩnh) |

Một việc chỉ được coi là xong khi `typecheck`, `lint`, `format:check` và `test` đều qua. CI (`.github/workflows/ci.yml`) chạy cùng các bước đó cho PR vào `main`.

## Kiến trúc

```text
src/
  core/      luật chơi, TypeScript thuần
  ai/        bot: equity, botBrain, personalities
  scenes/    Phaser scenes, chỉ diễn hoạt
  ui/        component Phaser: CardSprite, ActionBar, LeverPanel...
  i18n/      vi.ts (bản gốc), en.ts, t()
  config.ts  mọi tham số cân bằng và bố cục
scripts/     script chạy bằng dòng lệnh (sim, play, balance)
tests/       test Vitest, phản chiếu cấu trúc src/ (tests/core, tests/ai...), helper ở tests/testing.ts
```

Các quy tắc bắt buộc:

- **`core/` và `ai/` không import Phaser, `scenes/`, `ui/` hay `i18n/`.** ESLint đã chặn việc này. Lõi phải chạy được trên Node để sau này chuyển lên server.
- **Lõi là hàm thuần.** `applyAction(state, action)` trả về `{ state, events }` và không thay đổi trạng thái đầu vào. Các phase gồm `deal`, `betting`, `challenge`, `roundResult`, `matchOver`.
- **Scene chỉ diễn hoạt.** Scene phát lần lượt `events` bằng tween và không tự quyết định luật.
- **Ngẫu nhiên phải có hạt giống.** Trong `core/` và `ai/`, mọi số ngẫu nhiên đi qua `core/rng.ts`, không dùng `Math.random`. Cùng hạt giống phải cho ra cùng chuỗi sự kiện.
- **Bot chỉ được nhận góc nhìn đã lọc** (`PlayerView`). Bot không bao giờ thấy bài của người chơi hay trạng thái ẩn của cần gạt.
- **Không gõ cứng con số cân bằng.** Mức cược, số cần, tỉ lệ, độ trễ, ngưỡng của bot đều nằm trong `src/config.ts`. Bảng xác suất L(m) phải được tính từ config, không viết tay.
- **Mọi chuỗi hiển thị đi qua `t()`.** Thêm khóa vào `vi.ts` trước. `en.ts` có kiểu `Messages`, nên thiếu khóa là TypeScript báo lỗi.

## Luật dễ làm sai

Các luật này đã được chốt trong `docs/plan.md`:

- **Bỏ bài:** kéo theo mức người đó **đã theo**, không phải mức vừa bị tăng lên, và tối thiểu 1 cần. Ví dụ: mức đang là 2, đối thủ tăng lên 3, người chơi bỏ bài thì kéo 2 cần.
- **Người đi trước:** mỗi ván chọn ngẫu nhiên. Người đi trước mở lời ở cả 4 vòng cược. Luật này không có blind.
- **Giới hạn tăng:** mỗi người tăng tối đa 1 lần mỗi vòng, và Tất tay cũng tính là lần tăng đó. Tất tay lên thẳng mức 6. Nếu Tất tay được Theo thì tự lật hết lá chung và so bài.
- **Thứ tự hạng tay (mạnh → yếu):** Thùng phá sảnh lớn > Thùng phá sảnh > Tứ quý > Cù lũ > Thùng > Sảnh > Sám cô > Hai đôi > Một đôi > Mậu thầu. Chất không bao giờ phân thắng thua. Cách so khi cùng hạng nằm trong skill `poker-engine`.
- **Poker hòa bài:** ván hòa, không ai phải kéo cần.
- **Cần gạt:** số cần Nguy hiểm được chọn ngẫu nhiên đều từ 1 đến 5 trong 6 cần. Gặp Nguy hiểm thì dừng kéo ngay. Kéo đủ số mà toàn Safe thì ván hòa. Hai loại hòa gộp chung một con số.
- **Bot không có biểu cảm.** Nhân vật là một hình tĩnh. Bot gây nhiễu bằng bong bóng thoại có thể nói dối và bằng những ván lừa.

## Quy ước code

- **Cấu hình TypeScript:** bật `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Vì `verbatimModuleSyntax`, import kiểu phải viết `import type`.
- **Import Phaser** bằng default import: `import Phaser from 'phaser'`.
- **Test** nằm trong `tests/`, phản chiếu cấu trúc `src/` (`src/core/betting.ts` ↔ `tests/core/betting.test.ts`), đặt tên `*.test.ts`. Helper dùng chung ở `tests/testing.ts`. Code trong `src/` không được import từ `tests/` (ESLint chặn). Ưu tiên test bộ xếp hạng bài và các chuyển trạng thái của lõi.
- **Định dạng Prettier:** nháy đơn, có dấu chấm phẩy, `trailingComma: all`, độ rộng dòng 100.
- **Comment:** viết bằng tiếng Anh và ít, chỉ giải thích "vì sao". Thông báo lỗi lint và chuỗi giao diện có thể là tiếng Việt.
- **Font:** Saira Stencil, tự host qua `@fontsource/saira-stencil`. `main.ts` chờ `document.fonts.load` xong mới tạo game, vì Phaser vẽ chữ một lần. Đổi font thì phải sửa cả `main.ts` lẫn `DISPLAY.fontFamily`.
- **Phụ thuộc:** TypeScript được ghim ở `~6.0` vì `typescript-eslint` chưa hỗ trợ TypeScript 7. Đừng nâng lên 7.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **the-last-lever** (14 symbols, 13 relationships, 0 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "master"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "master" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/the-last-lever/context` | Codebase overview, check index freshness |
| `gitnexus://repo/the-last-lever/clusters` | All functional areas |
| `gitnexus://repo/the-last-lever/processes` | All execution flows |
| `gitnexus://repo/the-last-lever/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
