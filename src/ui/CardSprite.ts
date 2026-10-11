import Phaser from 'phaser';
import { COLORS, cssColor, LAYOUT, TIMING } from '../config';
import type { Card } from '../core/cards';
import { tweenAsync } from './anim';
import { cardFace } from './cardFace';
import { textStyle } from './text';

export type CardSize = keyof typeof LAYOUT.card;

/** A playing card drawn with shapes and text (no atlas yet), centred on (x, y). */
export class CardSprite extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly corner: Phaser.GameObjects.Text;
  private readonly pip: Phaser.GameObjects.Text;
  private readonly cardW: number;
  private readonly cardH: number;
  private card: Card | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, size: CardSize) {
    super(scene, x, y);
    ({ width: this.cardW, height: this.cardH } = LAYOUT.card[size]);
    const w = this.cardW;
    const h = this.cardH;

    this.bg = scene.add.graphics();
    this.corner = scene.add
      .text(
        -w / 2 + w * 0.1,
        -h / 2 + h * 0.05,
        '',
        textStyle(Math.round(h * 0.17), COLORS.cardBlack, true),
      )
      .setLineSpacing(-Math.round(h * 0.05));
    this.pip = scene.add.text(0, h * 0.08, '', textStyle(Math.round(h * 0.38))).setOrigin(0.5);
    this.add([this.bg, this.corner, this.pip]);
    this.showBack();
    scene.add.existing(this);
  }

  get shown(): Card | null {
    return this.card;
  }

  showFace(card: Card): this {
    this.card = card;
    const face = cardFace(card);
    const color = face.red ? COLORS.cardRed : COLORS.cardBlack;
    this.drawBase(COLORS.cardFace, 0xbdb6a8);
    this.corner.setText(`${face.rank}\n${face.suit}`).setColor(cssColor(color)).setVisible(true);
    this.pip.setText(face.suit).setColor(cssColor(color)).setVisible(true);
    return this;
  }

  showBack(): this {
    this.card = null;
    this.drawBase(COLORS.cardBack, COLORS.amber);
    const inset = Math.round(this.cardW * 0.12);
    this.bg.lineStyle(1, COLORS.amber, 0.6);
    this.bg.strokeRoundedRect(
      -this.cardW / 2 + inset,
      -this.cardH / 2 + inset,
      this.cardW - inset * 2,
      this.cardH - inset * 2,
      4,
    );
    this.corner.setVisible(false);
    this.pip.setVisible(false);
    return this;
  }

  /** Turns the card over by squashing it flat and opening it again on the other side. */
  async flip(card: Card | null): Promise<void> {
    const half = TIMING.flip / 2;
    await tweenAsync(this.scene, { targets: this, scaleX: 0, duration: half, ease: 'Quad.easeIn' });
    if (card === null) this.showBack();
    else this.showFace(card);
    await tweenAsync(this.scene, {
      targets: this,
      scaleX: 1,
      duration: half,
      ease: 'Quad.easeOut',
    });
  }

  private drawBase(fill: number, outline: number): void {
    const radius = Math.round(this.cardW * 0.08);
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.35);
    this.bg.fillRoundedRect(
      -this.cardW / 2 + 3,
      -this.cardH / 2 + 4,
      this.cardW,
      this.cardH,
      radius,
    );
    this.bg.fillStyle(fill, 1);
    this.bg.fillRoundedRect(-this.cardW / 2, -this.cardH / 2, this.cardW, this.cardH, radius);
    this.bg.lineStyle(2, outline, 1);
    this.bg.strokeRoundedRect(-this.cardW / 2, -this.cardH / 2, this.cardW, this.cardH, radius);
  }
}

/** Outline of an empty card slot on the felt. */
export function drawCardSlot(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: CardSize,
): void {
  const { width, height } = LAYOUT.card[size];
  g.lineStyle(2, COLORS.cream, 0.25);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, Math.round(width * 0.08));
}
