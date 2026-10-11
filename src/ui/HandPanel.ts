import Phaser from 'phaser';
import { COLORS, cssColor, LAYOUT, type Rect } from '../config';
import type { Card } from '../core/cards';
import { t } from '../i18n';
import { cardFace } from './cardFace';
import { addGlow, drawGlowRect, drawPanel } from './decor';
import { handPanelModel, type HandPanelModel, type Strength } from './handPanelModel';
import { textStyle } from './text';

const SLOTS = 5;
const DRAW_LINE = 13;

const STRENGTH_COLOR: Record<Strength, number> = {
  strong: COLORS.safe,
  fair: COLORS.amber,
  weak: COLORS.danger,
};

interface Slot {
  rect: Rect;
  bg: Phaser.GameObjects.Graphics;
  card: Phaser.GameObjects.Text;
  kicker: Phaser.GameObjects.Text;
}

/**
 * "BỘ BÀI" card left of the table: my best hand, its place in the rankings, the five cards
 * that make it, an estimated win rate and the best hand one more card could bring.
 */
export class HandPanel extends Phaser.GameObjects.Container {
  private readonly badge: Phaser.GameObjects.Text;
  private readonly rankLabel: Phaser.GameObjects.Text;
  private readonly strengthDot: Phaser.GameObjects.Arc;
  private readonly strengthLabel: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly slots: Slot[] = [];
  private readonly power: Phaser.GameObjects.Text;
  private readonly meter: Phaser.GameObjects.Graphics;
  /** Prefix, hand name and outs, flowed over two lines like inline spans. */
  private readonly drawParts: [
    Phaser.GameObjects.Text,
    Phaser.GameObjects.Text,
    Phaser.GameObjects.Text,
  ];
  private readonly inner: number;
  private readonly meterY: number;
  private readonly drawTextY: number;
  private key = '';

  constructor(scene: Phaser.Scene) {
    const p = LAYOUT.handPanel;
    super(scene, p.x, p.y);
    const { pad, gap, font } = p;
    const inner = p.width - pad * 2;
    this.inner = inner;
    const bg = scene.add.graphics();
    this.add(bg);

    // Header: lamp dot, title, rank position badge, divider.
    const headerY = pad + 8;
    this.add(addGlow(scene, pad + 3, headerY, 18, COLORS.amber, 0.6));
    this.add(scene.add.circle(pad + 3, headerY, 3, COLORS.amber));
    this.add(
      scene.add
        .text(
          pad + 10,
          headerY,
          t('handPanel.title').toUpperCase(),
          textStyle(font.title, COLORS.cream, true, { letterSpacing: 1 }),
        )
        .setOrigin(0, 0.5),
    );
    const badgeBg = scene.add.graphics();
    this.badge = scene.add
      .text(
        pad + inner - 4,
        headerY,
        '',
        textStyle(font.badge, COLORS.amberLight, false, { font: 'mono' }),
      )
      .setOrigin(1, 0.5);
    this.add([badgeBg, this.badge]);
    const dividerY = pad + 22;
    this.add(scene.add.rectangle(pad, dividerY, inner, 1, COLORS.rivet, 0.3).setOrigin(0));

    // Hand name with its strength tag, and the short description under it.
    const rankTop = dividerY + gap - 1;
    const rankBox = scene.add.graphics();
    drawPanel(
      rankBox,
      { x: pad, y: rankTop, width: inner, height: p.rankBox },
      {
        fill: COLORS.bottomBar,
        fillAlpha: 0.8,
        stroke: COLORS.rivet,
        strokeAlpha: 0.2,
        strokeWidth: 1,
        radius: 8,
      },
    );
    this.rankLabel = scene.add
      .text(pad + 8, rankTop + 16, '', textStyle(font.rank, COLORS.amberLight, true))
      .setOrigin(0, 0.5);
    this.strengthLabel = scene.add
      .text(
        pad + inner - 6,
        rankTop + 16,
        '',
        textStyle(font.small, COLORS.safe, true, { letterSpacing: 0.8 }),
      )
      .setOrigin(1, 0.5);
    this.strengthDot = scene.add.circle(0, rankTop + 16, 2.5, COLORS.safe);
    this.detail = scene.add
      .text(pad + inner / 2, rankTop + 36, '', textStyle(font.small, COLORS.muted))
      .setOrigin(0.5);
    this.add([rankBox, this.rankLabel, this.strengthDot, this.strengthLabel, this.detail]);

    // Five card cells: two rows of two, then one full-width row.
    const { height: cellH, gap: cellGap } = p.cell;
    const half = (inner - cellGap) / 2;
    const cellsTop = rankTop + p.rankBox + gap;
    for (let i = 0; i < SLOTS; i++) {
      const row = Math.floor(i / 2);
      const full = i === SLOTS - 1;
      const rect = {
        x: pad + (full ? 0 : (i % 2) * (half + cellGap)),
        y: cellsTop + row * (cellH + cellGap),
        width: full ? inner : half,
        height: cellH,
      };
      const slotBg = scene.add.graphics();
      const card = scene.add
        .text(
          0,
          rect.y + cellH / 2,
          '',
          textStyle(font.cell, COLORS.creamSoft, true, { font: 'card' }),
        )
        .setOrigin(0, 0.5);
      const kicker = scene.add
        .text(0, rect.y + cellH / 2, t('handPanel.kicker'), textStyle(font.kicker, COLORS.muted))
        .setOrigin(0, 0.5);
      this.slots.push({ rect, bg: slotBg, card, kicker });
      this.add([slotBg, card, kicker]);
    }
    const cellsBottom = cellsTop + 3 * cellH + 2 * cellGap;

    // Win-rate meter.
    const meterTop = cellsBottom + gap;
    this.add(scene.add.rectangle(pad, meterTop, inner, 1, COLORS.rivet, 0.2).setOrigin(0));
    const labelY = meterTop + 10;
    this.add(
      scene.add
        .text(pad, labelY, t('handPanel.power'), textStyle(font.small, COLORS.muted))
        .setOrigin(0, 0.5),
    );
    this.power = scene.add
      .text(pad + inner, labelY, '', textStyle(font.small, COLORS.amberLight, true))
      .setOrigin(1, 0.5);
    this.meterY = labelY + 10;
    this.meter = scene.add.graphics();
    this.add([this.power, this.meter]);

    // "Cơ hội" box.
    const drawTop = this.meterY + p.meter + gap;
    const drawBox = scene.add.graphics();
    drawPanel(
      drawBox,
      { x: pad, y: drawTop, width: inner, height: p.drawBox },
      {
        fill: COLORS.plate,
        fillAlpha: 0.6,
        stroke: COLORS.rivet,
        strokeAlpha: 0.2,
        strokeWidth: 1,
        radius: 4,
      },
    );
    const chance = scene.add
      .text(
        pad + 6,
        drawTop + 6,
        `✦ ${t('handPanel.chance').toUpperCase()}`,
        textStyle(font.small, COLORS.shock, true, { font: 'mono' }),
      )
      .setOrigin(0);
    this.drawTextY = drawTop + 6 + DRAW_LINE + 2;
    const part = (color: number, bold: boolean) =>
      scene.add.text(0, 0, '', textStyle(font.small, color, bold)).setOrigin(0);
    this.drawParts = [
      part(COLORS.muted, false),
      part(COLORS.cream, true),
      part(COLORS.muted, false),
    ];
    this.add([drawBox, chance, ...this.drawParts]);

    const height = drawTop + p.drawBox + pad;
    const frame = { x: 0, y: 0, width: p.width, height };
    drawGlowRect(bg, frame, 0x000000, 0.35, 14, LAYOUT.radius);
    drawPanel(bg, frame, {
      fill: COLORS.slate,
      fillAlpha: 0.95,
      stroke: COLORS.amber,
      strokeAlpha: 0.4,
      strokeWidth: 1,
    });
    // The badge background is sized once: "10/10" is the widest it ever gets.
    this.badge.setText(t('handPanel.position', { n: 10, total: 10 }));
    drawPanel(
      badgeBg,
      {
        x: this.badge.x - this.badge.width - 4,
        y: headerY - 8,
        width: this.badge.width + 8,
        height: 16,
      },
      {
        fill: COLORS.bottomBar,
        stroke: COLORS.rivet,
        strokeAlpha: 0.3,
        strokeWidth: 1,
        radius: 3,
      },
    );

    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Shows my hand for these cards, or hides the card when nothing is dealt. */
  setCards(hole: readonly Card[], board: readonly Card[]): this {
    const key = [...hole, ...board].join(',');
    if (key === this.key) return this;
    this.key = key;
    const model = handPanelModel(hole, board);
    if (!model) return this.setVisible(false);
    this.show(model);
    return this.setVisible(true);
  }

  private show(model: HandPanelModel): void {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    this.badge.setText(
      t('handPanel.position', { n: pad2(model.position), total: pad2(model.total) }),
    );
    this.rankLabel.setText(t(`hand.${model.rank}`).toUpperCase());

    const color = STRENGTH_COLOR[model.strength];
    this.strengthLabel
      .setText(t(`handPanel.${model.strength}`).toUpperCase())
      .setColor(cssColor(color));
    this.strengthDot.setFillStyle(color).setX(this.strengthLabel.x - this.strengthLabel.width - 5);
    this.detail.setText(model.detail);
    this.fitWidth(this.rankLabel, this.strengthDot.x - 6 - this.rankLabel.x);
    this.fitWidth(this.detail, this.inner);

    this.slots.forEach((slot, i) => this.showSlot(slot, model.cells[i]));

    const percent = Math.round(model.equity * 100);
    this.power.setText(`${percent}%`);
    const { pad, meter } = LAYOUT.handPanel;
    this.meter.clear();
    this.meter
      .fillStyle(COLORS.bottomBar, 1)
      .fillRoundedRect(pad, this.meterY, this.inner, meter, meter / 2);
    const fill = Math.max(meter, (this.inner * percent) / 100);
    if (percent > 0)
      this.meter
        .fillStyle(COLORS.amber, 1)
        .fillRoundedRect(pad, this.meterY, fill, meter, meter / 2);

    const [prefix, hand, outs] = this.drawParts;
    if (model.draw.kind === 'improve') {
      prefix.setText(t('handPanel.wait'));
      hand.setText(t(`hand.${model.draw.hand}`));
      outs.setText(`(${model.draw.outs})`);
    } else {
      prefix.setText(t(`handPanel.${model.draw.kind}`));
      hand.setText('');
      outs.setText('');
    }
    this.flowDraw();
  }

  private showSlot(slot: Slot, cell: HandPanelModel['cells'][number] | undefined): void {
    const { rect, bg, card, kicker } = slot;
    bg.clear();
    if (!cell) {
      // Before the flop only two cells are filled; the rest stay as faint placeholders.
      drawPanel(bg, rect, { stroke: COLORS.rivet, strokeAlpha: 0.25, strokeWidth: 1, radius: 4 });
      card.setVisible(false);
      kicker.setVisible(false);
      return;
    }
    drawPanel(bg, rect, {
      fill: COLORS.ink,
      fillAlpha: cell.kicker ? 0.7 : 1,
      stroke: COLORS.rivet,
      strokeAlpha: cell.kicker ? 0.2 : 0.4,
      strokeWidth: 1,
      radius: 4,
    });
    const face = cardFace(cell.card);
    card
      .setText(`${face.rank}${face.suit}`)
      .setColor(cssColor(face.red ? COLORS.danger : COLORS.creamSoft))
      .setAlpha(cell.kicker ? 0.8 : 1)
      .setVisible(true);
    kicker.setVisible(cell.kicker);
    const width = card.width + (cell.kicker ? 3 + kicker.width : 0);
    card.setX(rect.x + (rect.width - width) / 2);
    kicker.setX(card.x + card.width + 3);
  }

  /** Lays the hint out like inline text: a part that does not fit starts the next line. */
  private flowDraw(): void {
    const left = LAYOUT.handPanel.pad + 6;
    const width = this.inner - 12;
    let x = 0;
    let line = 0;
    for (const part of this.drawParts) {
      part.setScale(1);
      if (part.text === '') continue;
      if (x > 0 && x + part.width > width) {
        x = 0;
        line++;
      }
      this.fitWidth(part, width);
      part.setPosition(left + x, this.drawTextY + line * DRAW_LINE);
      x += part.displayWidth + 4;
    }
  }

  private fitWidth(text: Phaser.GameObjects.Text, max: number): void {
    text.setScale(1);
    if (text.width > max) text.setScale(max / text.width);
  }
}
