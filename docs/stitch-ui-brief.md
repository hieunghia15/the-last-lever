# The Last Lever — UI Brief for Google Stitch

> **Cách dùng (cho người đọc tiếng Việt):** Tạo project ở chế độ **Web** trong Stitch. Dán phần **Design System** trước, sau đó dán từng khối **Screen prompt** (mỗi lần một màn hình) để Stitch vẽ. Prompt viết bằng tiếng Anh vì Stitch hiểu tiếng Anh tốt nhất, còn chữ trên giao diện để tiếng Việt vì đó là ngôn ngữ chính của game. Nếu cần bản tiếng Anh, xem bảng **UI copy** ở cuối file.

---

## 1. Product summary

The Last Lever is a single-player browser game played in **landscape** on desktop and mobile. The player plays heads-up Texas Hold'em against one bot opponent. Instead of chips, the stake is a **number of levers (1 to 6)**. Whoever loses the poker hand must pull that many levers from a row of 6; each lever is secretly **Safe** or **Danger**. Pulling a Danger lever gives the opponent one win. Matches are Best of 3, 5 or 7.

The mood is a **dark, smoky underground tavern at night**, with tension and suspense. The scene is seen in **fake first person**: the player sits at the table, the opponent sits directly across, and the table is drawn in perspective.

**Hard constraints for every screen:**

- Canvas is **1280 × 720 px, landscape (16:9)**. This is a game screen, not a scrolling web page and not a portrait mobile app. Nothing scrolls.
- **No money anywhere**: no poker chips, no coins, no currency symbols, no dollar amounts. The only stake is levers.
- No guns, no blood, no gore. Danger is shown as a **cartoon electric shock**.
- Use original art only. Do not use names, logos or characters from other games (for example Liar's Bar).
- Every tappable element is **at least 64 px tall** and works with a single tap. There is no hover-only information.
- Text is Vietnamese with full diacritics, so the font must render characters such as ệ, ấ, ổ, ữ, Đ.

---

## 2. Design system

Paste this block first so that every generated screen shares one look.

```text
DESIGN SYSTEM — The Last Lever (landscape game UI, 1280x720)

Mood: dark underground tavern at night, warm amber lamp light over a dark table,
deep shadows at the edges, tense and cinematic. Flat vector illustration with
soft gradients, not photorealistic. Anime-style character art.

Colors:
- Background / night:      #14100C
- Wood dark:                #2A1D14
- Wood mid:                 #4A3322
- Table felt (dark teal):   #12312C, felt highlight #1D4A42
- Lamp amber (primary):     #F2A93B
- Text cream:               #F3E6D0
- Text muted:               #8A7A66
- Safe green:               #3DDC84
- Danger red:               #FF3B30
- Electric cyan (shock):    #7DF9FF
- Disabled:                 #F3E6D0 at 30% opacity

Typography:
- One typeface for everything: "Saira Stencil" (stencil, military/industrial feel).
- Title: 64px bold. Headings: 32px bold. Buttons: 24px bold, uppercase allowed.
  Body / captions: 18-20px regular. Never go below 16px.

Shapes and components:
- Buttons: rounded rectangles (radius 12px), min height 64px, amber fill with
  dark text for primary; dark wood fill with cream text and 2px amber outline
  for secondary; disabled = 30% opacity, no glow.
- Panels: dark wood (#2A1D14) at 92% opacity, radius 16px, 2px border #4A3322,
  subtle inner shadow, like a metal-riveted control box.
- Score pips: circles 20px; filled amber = win earned, hollow outline = not yet.
- Bet level: a row of 6 square cells (40px); lit cells glow amber, unlit are dark.
- Playing cards: classic clean white face cards with rounded corners; card back
  is dark red with a thin gold lever-shaped emblem.
- Levers: industrial wall levers on a riveted metal panel; each has a round
  indicator lamp above it.

Language of UI text: Vietnamese.
```

---

## 3. Screens

There are 4 main screens plus 3 states or overlays. Generate them in this order.

| # | Screen | Purpose |
| --- | --- | --- |
| 1 | Loading | Load assets |
| 2 | Main Menu | Pick match length, difficulty, language; open How to Play |
| 3 | How to Play | 3–4 static pages explaining the rules |
| 4 | Table — Betting | The whole match happens here (poker phase) |
| 5 | Table — Lever Challenge | Overlay on the table when someone must pull levers |
| 6 | Result | Win or lose, final score, play again |
| 7 | Rotate Device | Shown when a phone is held in portrait |

### 3.1 Loading

```text
Screen: Loading. Landscape 1280x720 game screen using the design system.
Full dark background (#14100C) with a faint warm vignette and a single hanging
tavern lamp at top center casting a soft amber cone of light.
Center: the game title "THE LAST LEVER" in Saira Stencil, 64px, cream, with a
small industrial lever icon integrated into the letter "L".
Below the title: a horizontal progress bar 480px wide, 16px tall, rounded,
dark wood track with an amber fill at 60%, and the caption "Đang tải… 60%"
in muted text under it.
No buttons.
```

### 3.2 Main Menu

```text
Screen: Main Menu. Landscape 1280x720 game screen using the design system.
Background: dim tavern interior (wooden walls, shelves of bottles, a hanging lamp),
blurred and darkened so the menu reads clearly.
Left half: the title "THE LAST LEVER" (64px) and the tagline
"Cần gạt cuối cùng — kéo hay không kéo?" (20px, muted). Below the tagline is an
illustration of a row of 6 industrial levers with one red lamp lit.
Right half: one vertical dark-wood panel (width ~460px) containing, top to bottom:
  1. Label "Thể thức" and a 3-option segmented control: "BEST OF 3" | "BEST OF 5" | "BEST OF 7"
     (BEST OF 3 selected, amber).
  2. Label "Đối thủ" and a 4-option segmented control: "Dễ" | "Vừa" | "Khó" | "Ngẫu nhiên"
     ("Vừa" selected).
  3. Large primary button "BẮT ĐẦU" (full panel width, 72px tall).
  4. A row of two secondary buttons: "Cách chơi" and a language toggle "VI | EN"
     (VI active).
All controls at least 64px tall. No sound button. No login, no shop, no leaderboard.
```

### 3.3 How to Play

```text
Screen: How to Play, page 2 of 4. Landscape 1280x720 game screen using the design system.
Dark tavern background, blurred. A centered dark-wood panel 960x560.
Top of panel: heading "Cách chơi" and a close "X" button (64x64) at the top right.
Inside: left side shows a simple flat illustration of a row of 6 levers, 3 pulled down,
with 2 green lamps and 1 red lamp sparking with cyan electricity.
Right side text (20px, cream):
  "Người thua ván poker phải kéo đúng số cần đã cược.
   Mỗi cần là An toàn hoặc Nguy hiểm — không ai biết trước.
   Trúng cần Nguy hiểm: đối thủ được 1 chiến thắng.
   Kéo đủ mà toàn An toàn: ván hòa."
Bottom of panel: "‹ Trước" secondary button, 4 page dots (2nd active, amber),
"Tiếp ›" primary button.
```

The other pages use the same layout with these contents:

- **Page 1:** "Đấu Texas Hold'em tay đôi với bot. Không cược tiền — cược bằng số cần gạt, từ 1 đến 6."
- **Page 3:** the actions "Xem bài, Tăng (+1), Theo, Bỏ, Tất tay (lên 6)". Folding means you pull the number of levers you had already matched, at least 1.
- **Page 4:** "Thắng đủ số ván của thể thức (2/3/4) để thắng trận."

### 3.4 Table — Betting (main game screen)

This is the most important screen. Layout from far to near:

| Zone | Area (approx.) | Content |
| --- | --- | --- |
| Top bar | y 0–56 | Score pips for each side, draw counter in the center |
| Opponent | y 56–330, centered | Large anime opponent (bust), name plate, 2 face-down cards, speech bubble |
| Table | y 300–540 | Perspective trapezoid table, 5 community card slots, 6-cell bet level |
| Player cards | bottom-left, x 24–330, y 470–700 | Player's 2 hole cards, large and face up |
| Action bar | bottom, x 360–1256, y 620–704 | 5 action buttons |

```text
Screen: Table — Betting phase. Landscape 1280x720 game screen using the design system.
Fake first-person view: the player sits at a table in a dark tavern, the opponent sits
directly across.

Top bar (full width, 56px, dark translucent strip):
  left "BẠN" with 2 score pips (1 filled amber, 1 hollow);
  center "Hòa: 1" in muted text;
  right "KAITO" with 2 score pips (0 filled, 2 hollow). This is BEST OF 3.

Upper half: dark tavern background (wooden wall, bottle shelves, a hanging amber
lamp above the table). Centered, large: an anime-style young man with sharp eyes,
messy dark hair, open-collar dark shirt and rolled sleeves, sitting with his forearms
on the table, a calm unreadable face (one static pose). Below him, a small name
plate "KAITO · Vừa". In front of his hands, 2 face-down cards (dark red backs).
To his upper right, a white comic speech bubble: "Bài này… cũng được đấy."
Next to his name plate, a small "…" thinking indicator.

Middle: the table drawn as a wide trapezoid in perspective (narrow at the far edge,
wide at the bottom), dark teal felt with a wooden rim and warm lamp light pooling
in the center. On the felt, 5 card slots in a row: 3 face-up cards (flop) and
2 empty dashed outlines. Under the cards, the label "Mức cược" with a row of
6 square cells: cells 1–2 lit amber, 3–6 dark. Small text "Vòng: Flop".

Bottom-left: the player's 2 hole cards, large (about 130x180 each), face up,
slightly fanned and overlapping, e.g. A♠ and K♥.

Bottom action bar (to the right of the player's cards, 5 equal buttons, 72px tall):
  "XEM BÀI" (disabled, 30% opacity),
  "TĂNG +1" (secondary),
  "THEO" (primary amber) with a small subtitle "thua: kéo 2 cần",
  "BỎ" (secondary, red outline) with a small subtitle "kéo 1 cần",
  "TẤT TAY" (secondary, red-amber gradient outline) with subtitle "lên 6".
No chips, no money, no pot amount anywhere.
```

**Other states of the same screen** (generate them as variations if needed):

- **Opponent's turn:** all 5 buttons disabled. The opponent's name plate pulses and shows "Đang suy nghĩ…".
- **Showdown:** the opponent's 2 cards are flipped face up. A banner in the middle of the table reads "KAITO thắng ván bài — Bạn phải kéo 2 cần", or "Hòa bài — không ai kéo cần".

### 3.5 Table — Lever Challenge (overlay)

This is the key moment of the game, so give it the most dramatic lighting.

```text
Screen: Lever Challenge overlay on top of the Table screen. Landscape 1280x720,
design system. The table scene behind is darkened to 30% brightness.
Center: a large riveted metal control panel (about 960x440) that looks like it slid
up from below the table. Top of panel: heading "BẠN PHẢI KÉO 3 CẦN" (32px) and a
counter chip on the right "Đã kéo 1 / 3".
Inside: 6 big industrial levers in a row, evenly spaced, each about 120px wide and
260px tall, each with a round indicator lamp above it and a number plate 1–6 below.
States shown in this mockup:
  lever 1: pulled down, lamp GREEN (#3DDC84) glowing, small label "AN TOÀN";
  lever 4: being pulled, handle halfway down, lamp blinking amber;
  levers 2, 3, 5, 6: up / not pulled, lamps off (dark glass).
Hint text under the panel: "Chạm vào một cần để kéo" (muted, 18px).
Mood: tense, hard rim light from the lamp, dust particles in the light beam.
```

**Danger variation** (generate it separately):

```text
Same overlay, but lever 4 is now fully pulled and its lamp is bright RED (#FF3B30).
Jagged cyan-white electric bolts (#7DF9FF) burst from the lever toward the screen
edges, a white flash vignette at the edges, slight camera-shake motion lines.
Big red label over the panel: "NGUY HIỂM!". Below it: "KAITO +1 chiến thắng".
```

**Opponent pulling variation:** the heading reads "KAITO PHẢI KÉO 2 CẦN" and the hint text is replaced by "KAITO đang chọn…". If the opponent hits Danger, electric bolts wrap around the opponent's portrait, seen above the panel.

### 3.6 Result

```text
Screen: Match Result. Landscape 1280x720 game screen using the design system.
Darkened tavern background. Centered dark-wood panel 720x480.
Big headline "CHIẾN THẮNG" in amber (64px) with a soft glow
(alternate losing version: "THẤT BẠI" in danger red).
Below: final score "2 – 1" (48px) with labels "BẠN" and "KAITO" on each side,
and "Số ván hòa: 3" in muted text.
A small stats line: "Thành tích mức Vừa: 5 thắng / 3 thua".
Buttons: primary "CHƠI LẠI" and secondary "VỀ MENU", side by side, 72px tall.
```

### 3.7 Rotate Device (portrait phones)

```text
Screen: Rotate device overlay, PORTRAIT phone 390x844 (the only portrait screen).
Solid dark background #14100C. Center: a simple line icon of a phone rotating 90°
to landscape, in amber. Text below: "Hãy xoay ngang điện thoại để chơi" (20px, cream).
Nothing else.
```

---

## 4. UI copy (Vietnamese → English)

| Key | Vietnamese | English |
| --- | --- | --- |
| Title | THE LAST LEVER | THE LAST LEVER |
| Tagline | Cần gạt cuối cùng — kéo hay không kéo? | The last lever — pull it or not? |
| Loading | Đang tải… | Loading… |
| Match length | Thể thức | Match |
| Opponent | Đối thủ | Opponent |
| Difficulty | Dễ / Vừa / Khó / Ngẫu nhiên | Easy / Medium / Hard / Random |
| Start | BẮT ĐẦU | START |
| How to play | Cách chơi | How to play |
| You | BẠN | YOU |
| Draws | Hòa | Draws |
| Bet level | Mức cược | Stake |
| Streets | Trước flop / Flop / Turn / River | Pre-flop / Flop / Turn / River |
| Actions | XEM BÀI / TĂNG +1 / THEO / BỎ / TẤT TAY | CHECK / RAISE +1 / CALL / FOLD / ALL-IN |
| Pull hint | kéo {n} cần | pull {n} levers |
| Thinking | Đang suy nghĩ… | Thinking… |
| Must pull | BẠN PHẢI KÉO {n} CẦN | YOU MUST PULL {n} LEVERS |
| Counter | Đã kéo {a} / {b} | Pulled {a} / {b} |
| Tap hint | Chạm vào một cần để kéo | Tap a lever to pull it |
| Safe | AN TOÀN | SAFE |
| Danger | NGUY HIỂM! | DANGER! |
| Win | CHIẾN THẮNG | VICTORY |
| Lose | THẤT BẠI | DEFEAT |
| Play again | CHƠI LẠI | PLAY AGAIN |
| Back to menu | VỀ MENU | MAIN MENU |
| Rotate | Hãy xoay ngang điện thoại để chơi | Rotate your phone to landscape to play |

---

## 5. What not to generate

- Chips, money, a pot, a dealer, other players: the game is strictly 1 vs 1.
- Multiple facial expressions for the opponent. There is one static pose, and the speech bubble carries the bluffing.
- Shop, coins, ads, login, leaderboard, settings gear, sound buttons (not in this version).
- Portrait layouts for the game screens. Only the Rotate Device overlay is portrait.
- Scrollbars, browser chrome, website navigation bars or footers.
