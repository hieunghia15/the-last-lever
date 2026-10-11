import Phaser from 'phaser';
import { BETTING, COLORS, LAYOUT, LEVERS, OPPONENTS, TIMING, type Rect } from '../config';
import { parseCards } from '../core/cards';
import { t, type MessageKey } from '../i18n';
import { Button } from '../ui/Button';
import { CardSprite } from '../ui/CardSprite';
import { addBackdrop, addGlow, addIcon, drawGlowRect, drawPanel, drawPips } from '../ui/decor';
import { ICONS, type IconName } from '../ui/icons';
import { textStyle } from '../ui/text';
import { riseTexture } from '../ui/textures';

interface Rule {
  icon: IconName;
  key: MessageKey;
}

interface Page {
  caption: MessageKey;
  rules: Rule[];
  art: (scene: HowToScene, box: Rect, layer: Phaser.GameObjects.Container) => void;
}

const bullet = (key: MessageKey): Rule => ({ icon: 'bullet', key });

/** Four static pages (decision #15): the poker, the levers, the actions, winning the match. */
const PAGES: Page[] = [
  {
    caption: 'howTo.p1.caption',
    rules: [bullet('howTo.p1.r1'), bullet('howTo.p1.r2'), bullet('howTo.p1.r3')],
    art: (scene, box, layer) => scene.drawPokerArt(box, layer),
  },
  {
    caption: 'howTo.p2.caption',
    rules: [
      bullet('howTo.p2.r1'),
      bullet('howTo.p2.r2'),
      { icon: 'danger', key: 'howTo.p2.r3' },
      { icon: 'verified', key: 'howTo.p2.r4' },
    ],
    art: (scene, box, layer) => scene.drawLeverArt(box, layer),
  },
  {
    caption: 'howTo.p3.caption',
    rules: [
      bullet('howTo.p3.r1'),
      bullet('howTo.p3.r2'),
      bullet('howTo.p3.r3'),
      { icon: 'danger', key: 'howTo.p3.r4' },
      bullet('howTo.p3.r5'),
    ],
    art: (scene, box, layer) => scene.drawActionArt(box, layer),
  },
  {
    caption: 'howTo.p4.caption',
    rules: [{ icon: 'verified', key: 'howTo.p4.r1' }, bullet('howTo.p4.r2'), bullet('howTo.p4.r3')],
    art: (scene, box, layer) => scene.drawMatchArt(box, layer),
  },
];

const RULE_SIZE = 18;
const RULE_LINE = 29;
const RULE_GAP = 16;
const GRID_GAP = 32;

/** How to Play: a 960×560 panel with an illustration on the left and the rules on the right. */
export class HowToScene extends Phaser.Scene {
  private page = 0;
  private content!: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Graphics[] = [];
  private prev!: Button;
  private next!: Button;

  constructor() {
    super('HowToScene');
  }

  init(): void {
    this.page = 0;
    this.dots = [];
  }

  create(): void {
    addBackdrop(this, 'center');
    const h = LAYOUT.howTo;
    const rect = { x: h.x, y: h.y, width: h.width, height: h.height };
    const g = this.add.graphics();
    drawGlowRect(g, rect, 0x000000, 0.25, 24, 16);
    drawPanel(g, rect, {
      fill: COLORS.night,
      fillAlpha: 0.6,
      stroke: COLORS.woodMid,
      strokeWidth: 2,
      radius: 16,
    });

    const left = h.x + h.padding;
    const right = h.x + h.width - h.padding;
    const top = h.y + h.padding;
    const headerY = top + 32;
    addIcon(this, left + ICONS.gamepad.width / 2, headerY, 'gamepad');
    this.add
      .text(
        left + ICONS.gamepad.width + 16,
        headerY,
        t('howTo.title').toUpperCase(),
        textStyle(LAYOUT.fontSize.heading, COLORS.cream, true, { letterSpacing: 0.8 }),
      )
      .setOrigin(0, 0.5);
    new Button(
      this,
      right - 32,
      headerY,
      { width: 64, height: 64, label: '', icon: 'close', radius: 16 },
      () => this.close(),
    );

    this.content = this.add.container(0, 0);

    const navY = h.y + h.height - h.padding - 32;
    const navStyle = { height: 64, fontSize: LAYOUT.fontSize.button, bold: true };
    this.prev = new Button(
      this,
      left + 73,
      navY,
      {
        ...navStyle,
        width: 146,
        label: t('howTo.prev'),
        variant: 'secondary',
        textColor: COLORS.cream,
        icon: 'chevronLeft',
      },
      () => this.turn(-1),
    );
    this.next = new Button(
      this,
      right - 64,
      navY,
      {
        ...navStyle,
        width: 128,
        label: t('howTo.next'),
        variant: 'primary',
        icon: 'chevronRight',
        iconSide: 'right',
      },
      () => (this.page === PAGES.length - 1 ? this.close() : this.turn(1)),
    );
    const dotGap = 12;
    const dotSize = 20;
    const dotsLeft = 640 - (PAGES.length * dotSize + (PAGES.length - 1) * dotGap) / 2;
    PAGES.forEach((_, i) => {
      const dot = this.add.graphics({
        x: dotsLeft + i * (dotSize + dotGap) + dotSize / 2,
        y: navY,
      });
      this.dots.push(dot);
    });

    this.showPage();
  }

  private turn(step: number): void {
    const target = Phaser.Math.Clamp(this.page + step, 0, PAGES.length - 1);
    if (target === this.page) return;
    this.page = target;
    this.tweens.add({
      targets: this.content,
      alpha: 0,
      duration: TIMING.pageTurn / 2,
      onComplete: () => {
        this.showPage();
        this.tweens.add({ targets: this.content, alpha: 1, duration: TIMING.pageTurn / 2 });
      },
    });
  }

  private close(): void {
    this.scene.start('MenuScene');
  }

  private showPage(): void {
    const page = PAGES[this.page];
    if (!page) return;
    this.content.removeAll(true);

    const h = LAYOUT.howTo;
    const left = h.x + h.padding;
    const inner = h.width - h.padding * 2;
    const column = (inner - GRID_GAP * 11) / 12;
    const areaTop = h.y + h.padding + 64 + 22.8;
    const box = { x: left, y: areaTop, width: column * 5 + GRID_GAP * 4, height: 310 };

    const g = this.add.graphics();
    drawPanel(g, box, {
      fill: COLORS.bottomBar,
      fillAlpha: 0.8,
      stroke: COLORS.rivet,
      strokeAlpha: 0.35,
      strokeWidth: 1,
    });
    const rise = this.add
      .image(box.x + 1, box.y + 1, riseTexture(this))
      .setOrigin(0)
      .setDisplaySize(box.width - 2, box.height - 2);
    const caption = this.add
      .text(
        box.x + box.width / 2,
        box.y + 25 + 11,
        t(page.caption).toUpperCase(),
        textStyle(LAYOUT.fontSize.label, COLORS.muted, false, { letterSpacing: 0.8 }),
      )
      .setOrigin(0.5);
    this.content.add([g, rise, caption]);
    page.art(this, box, this.content);

    this.drawRules(page.rules, box.x + box.width + GRID_GAP + 16, box.y + box.height / 2);

    this.prev.setEnabled(this.page > 0);
    this.next.setLabel(t(this.page === PAGES.length - 1 ? 'howTo.done' : 'howTo.next'));
    this.dots.forEach((dot, i) => {
      dot.clear();
      if (i === this.page) {
        drawGlowRect(dot, { x: -10, y: -10, width: 20, height: 20 }, COLORS.amber, 0.4, 8, 10);
        dot.fillStyle(COLORS.amber, 1).fillCircle(0, 0, 10);
      } else {
        dot.fillStyle(COLORS.dotOff, 1).fillCircle(0, 0, 10);
        dot.lineStyle(1, COLORS.mutedLight, 1).strokeCircle(0, 0, 9.5);
      }
    });
  }

  /** Icon + wrapped sentence per rule, the whole list centred on `centerY`. */
  private drawRules(rules: Rule[], x: number, centerY: number): void {
    const h = LAYOUT.howTo;
    const right = h.x + h.width - h.padding;
    const iconColumn = 22;
    const textX = x + iconColumn + 12;
    const items = rules.map((rule) => {
      const text = this.add.text(textX, 0, t(rule.key), {
        ...textStyle(RULE_SIZE, COLORS.cream),
        wordWrap: { width: right - textX, useAdvancedWrap: true },
        lineSpacing: RULE_LINE - RULE_SIZE * 1.25,
      });
      const icon = addIcon(this, x + iconColumn / 2, 0, rule.icon);
      return { text, icon };
    });
    const total =
      items.reduce((sum, item) => sum + item.text.height, 0) + RULE_GAP * (items.length - 1);
    let y = centerY - total / 2;
    for (const { text, icon } of items) {
      text.setY(y);
      icon.setY(y + RULE_LINE / 2);
      y += text.height + RULE_GAP;
      this.content.add([icon, text]);
    }
  }

  // ── Illustrations ──────────────────────────────────────────────────────────

  drawPokerArt(box: Rect, layer: Phaser.GameObjects.Container): void {
    const cx = box.x + box.width / 2;
    const cards = parseCards('As Kh');
    cards.forEach((card, i) => {
      const sprite = new CardSprite(this, cx + (i - 0.5) * 70, box.y + 150, 'medium')
        .showFace(card)
        .setAngle(i === 0 ? -6 : 6)
        .setScale(1.3);
      layer.add(sprite);
    });
    const g = this.add.graphics();
    layer.add(g);
    const cell = 28;
    const gap = 6;
    const width = BETTING.maxLevel * cell + (BETTING.maxLevel - 1) * gap;
    const y = box.y + 236;
    for (let i = 0; i < BETTING.maxLevel; i++) {
      const lit = i < 2;
      const x = cx - width / 2 + i * (cell + gap);
      if (lit) drawGlowRect(g, { x, y, width: cell, height: cell }, COLORS.amber, 0.4, 5, 2);
      drawPanel(
        g,
        { x, y, width: cell, height: cell },
        {
          fill: lit ? COLORS.amber : COLORS.slate,
          stroke: COLORS.rivet,
          strokeAlpha: lit ? 0 : 0.4,
          strokeWidth: 1,
          radius: 2,
        },
      );
      layer.add(
        this.add
          .text(
            x + cell / 2,
            y + cell / 2,
            String(i + 1),
            textStyle(12, lit ? COLORS.amberInkDeep : COLORS.muted, lit),
          )
          .setOrigin(0.5),
      );
    }
    layer.add(
      this.add
        .text(
          cx,
          y + cell + 18,
          t('table.stake').toUpperCase(),
          textStyle(12, COLORS.muted, false, { letterSpacing: 0.8 }),
        )
        .setOrigin(0.5),
    );
  }

  /** Six levers: some pulled, green or red with a cyan spark, as in the design. */
  drawLeverArt(box: Rect, layer: Phaser.GameObjects.Container): void {
    type Art = { lamp: 'off' | 'safe' | 'danger'; down: boolean };
    const levers: Art[] = [
      { lamp: 'safe', down: false },
      { lamp: 'danger', down: true },
      { lamp: 'safe', down: true },
      { lamp: 'off', down: false },
      { lamp: 'danger', down: true },
      { lamp: 'off', down: false },
    ];
    const g = this.add.graphics();
    layer.add(g);
    const width = 32;
    const gap = 12;
    const left = box.x + box.width / 2 - (LEVERS.count * width + (LEVERS.count - 1) * gap) / 2;
    const top = box.y + 25 + 18.4 + 23.5 + 16;
    levers.forEach((lever, i) => {
      const cx = left + i * (width + gap) + width / 2;
      const lampY = top + 8;
      if (lever.lamp === 'off') {
        g.fillStyle(COLORS.dotOff, 1).fillCircle(cx, lampY, 8);
        g.lineStyle(1, COLORS.mutedLight, 1).strokeCircle(cx, lampY, 7.5);
      } else {
        const color = lever.lamp === 'safe' ? COLORS.safe : COLORS.danger;
        layer.add(addGlow(this, cx, lampY, 44, color, 0.8));
        layer.add(this.add.circle(cx, lampY, 8, color));
      }
      if (lever.lamp === 'danger') layer.add(addIcon(this, cx + 16 + 2, top - 12 + 6.7, 'spark'));
      const trackY = top + 24;
      g.fillStyle(COLORS.woodMid, 1).fillRoundedRect(cx - 16, trackY, 32, 96, 6);
      const handle = this.add.rectangle(cx, 0, 24, 48, COLORS.amber).setOrigin(0.5);
      handle.setY(lever.down ? trackY + 96 - 8 - 24 : trackY + 8 + 24);
      // The second lever is caught mid-pull, tilted.
      if (i === 1) handle.setAngle(12);
      layer.add(handle);
      layer.add(
        this.add
          .text(cx, top + 136, String(i + 1), textStyle(LAYOUT.fontSize.caption, COLORS.muted))
          .setOrigin(0.5),
      );
    });

    const legendY = box.y + box.height - 25 - 9;
    const safe = this.add
      .text(0, legendY, t('howTo.p2.safe'), textStyle(LAYOUT.fontSize.caption, COLORS.muted))
      .setOrigin(0, 0.5);
    const danger = this.add
      .text(0, legendY, t('howTo.p2.danger'), textStyle(LAYOUT.fontSize.caption, COLORS.muted))
      .setOrigin(0, 0.5);
    const total = 12 + safe.width + 16 + 12 + danger.width;
    let x = box.x + box.width / 2 - total / 2;
    g.fillStyle(COLORS.safe, 1).fillCircle(x + 4, legendY, 4);
    safe.setX(x + 12);
    x += 12 + safe.width + 16;
    g.fillStyle(COLORS.danger, 1).fillCircle(x + 4, legendY, 4);
    danger.setX(x + 12);
    layer.add([safe, danger]);
  }

  /** The five action buttons in miniature, styled like the table's action bar. */
  drawActionArt(box: Rect, layer: Phaser.GameObjects.Container): void {
    const rows: {
      key: MessageKey;
      fill: number;
      fillAlpha: number;
      stroke: number;
      text: number;
    }[] = [
      {
        key: 'action.check',
        fill: COLORS.woodMid,
        fillAlpha: 1,
        stroke: COLORS.amber,
        text: COLORS.amberLight,
      },
      {
        key: 'action.raise',
        fill: COLORS.woodMid,
        fillAlpha: 1,
        stroke: COLORS.amber,
        text: COLORS.amberLight,
      },
      {
        key: 'action.call',
        fill: COLORS.amber,
        fillAlpha: 1,
        stroke: COLORS.amber,
        text: COLORS.amberInk,
      },
      {
        key: 'action.fold',
        fill: COLORS.slate,
        fillAlpha: 1,
        stroke: COLORS.danger,
        text: COLORS.danger,
      },
      {
        key: 'action.allIn',
        fill: COLORS.danger,
        fillAlpha: 0.2,
        stroke: COLORS.amber,
        text: COLORS.peach,
      },
    ];
    const g = this.add.graphics();
    layer.add(g);
    const width = 200;
    const height = 36;
    const gap = 10;
    const top = box.y + 70;
    rows.forEach((row, i) => {
      const rect = {
        x: box.x + box.width / 2 - width / 2,
        y: top + i * (height + gap),
        width,
        height,
      };
      drawPanel(g, rect, {
        fill: row.fill,
        fillAlpha: row.fillAlpha,
        stroke: row.stroke,
        strokeWidth: 2,
        radius: 8,
      });
      layer.add(
        this.add
          .text(
            rect.x + width / 2,
            rect.y + height / 2,
            t(row.key),
            textStyle(14, row.text, row.key === 'action.call'),
          )
          .setOrigin(0.5),
      );
    });
  }

  /** A miniature score bar, plus the way into the full hand rankings. */
  drawMatchArt(box: Rect, layer: Phaser.GameObjects.Container): void {
    const g = this.add.graphics();
    layer.add(g);
    const cx = box.x + box.width / 2;
    const names = [t('seat.you').toUpperCase(), OPPONENTS.medium.name];
    names.forEach((name, i) => {
      const y = box.y + 92 + i * 44;
      layer.add(
        this.add
          .text(
            cx - 20,
            y,
            name,
            textStyle(LAYOUT.fontSize.body, i === 0 ? COLORS.amberLight : COLORS.creamSoft),
          )
          .setOrigin(1, 0.5),
      );
      drawPips(g, cx + 4, y, 2, i === 0 ? 2 : 1);
    });
    layer.add(
      this.add
        .text(
          cx,
          box.y + 184,
          t('score.mode', { n: 3 }),
          textStyle(LAYOUT.fontSize.caption, COLORS.amberLight, false, { letterSpacing: 1.2 }),
        )
        .setOrigin(0.5),
    );
    layer.add(
      new Button(
        this,
        cx,
        box.y + box.height - 25 - 32,
        {
          width: box.width - 50,
          height: 64,
          label: t('howTo.p4.rankings'),
          variant: 'ghost',
          fontSize: LAYOUT.fontSize.label,
        },
        () => this.scene.start('RankingsScene'),
      ),
    );
  }
}
