import Phaser from 'phaser';
import { COLORS, cssColor, LAYOUT, TIMING } from '../config';
import type { Card } from '../core/cards';
import { tweenAsync } from './anim';
import { cardFace } from './cardFace';
import { drawPanel } from './decor';
import { textStyle } from './text';

export type CardSize = keyof typeof LAYOUT.card;

const BACK_EMBLEM = '⚜';

/** A dark playing card drawn with shapes and serif text, centred on (x, y). */
export class CardSprite extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly cornerTop: Phaser.GameObjects.Text;
  private readonly cornerBottom: Phaser.GameObjects.Text;
  private readonly suitTop: Phaser.GameObjects.Text;
  private readonly suitBottom: Phaser.GameObjects.Text;
  private readonly pip: Phaser.GameObjects.Text;
  private readonly emblem: Phaser.GameObjects.Text;
  private readonly spec: (typeof LAYOUT.card)[CardSize];
  private readonly size: CardSize;
  private card: Card | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, size: CardSize) {
    super(scene, x, y);
    this.size = size;
    this.spec = LAYOUT.card[size];
    const { width: w, height: h, pad, corner, pip, suit } = this.spec;
    // Large cards use the regular serif weight; the small board cards need bold to stay legible.
    const cornerBold = size !== 'large';

    this.bg = scene.add.graphics();
    const cornerStyle = textStyle(corner, COLORS.cream, cornerBold, { font: 'card' });
    this.cornerTop = scene.add.text(-w / 2 + pad, -h / 2 + pad, '', cornerStyle).setOrigin(0, 0);
    this.cornerBottom = scene.add
      .text(w / 2 - pad, h / 2 - pad, '', cornerStyle)
      .setOrigin(0, 0)
      .setAngle(180);
    const suitStyle = textStyle(suit || corner, COLORS.cream, false, { font: 'card' });
    this.suitTop = scene.add.text(w / 2 - pad, -h / 2 + pad - 2, '', suitStyle).setOrigin(1, 0);
    this.suitBottom = scene.add
      .text(-w / 2 + pad, h / 2 - pad + 2, '', suitStyle)
      .setOrigin(1, 0)
      .setAngle(180);
    this.pip = scene.add
      .text(0, 0, '', textStyle(pip, COLORS.cream, false, { font: 'card' }))
      .setOrigin(0.5);
    this.emblem = scene.add
      .text(
        0,
        0,
        BACK_EMBLEM,
        textStyle(Math.round(h * 0.2), COLORS.amberLight, false, { font: 'card' }),
      )
      .setOrigin(0.5);
    this.add([
      this.bg,
      this.cornerTop,
      this.cornerBottom,
      this.suitTop,
      this.suitBottom,
      this.pip,
      this.emblem,
    ]);
    this.showBack();
    scene.add.existing(this);
  }

  get shown(): Card | null {
    return this.card;
  }

  showFace(card: Card): this {
    this.card = card;
    const face = cardFace(card);
    const color = cssColor(face.red ? COLORS.danger : COLORS.creamSoft);
    const large = this.size === 'large';
    const index = `${face.rank}${face.suit}`;
    this.drawBase(COLORS.ink, large ? COLORS.amberLight : COLORS.rivet, large ? 0.4 : 0.3);
    this.cornerTop.setText(index).setColor(color).setVisible(true);
    this.cornerBottom
      .setText(index)
      .setColor(color)
      .setVisible(this.size !== 'small');
    this.suitTop.setText(face.suit).setColor(color).setVisible(large);
    this.suitBottom.setText(face.suit).setColor(color).setVisible(large);
    this.pip.setText(face.suit).setColor(color).setVisible(true);
    this.pip.setY(this.size === 'small' ? this.spec.height * 0.12 : 0);
    this.emblem.setVisible(false);
    return this;
  }

  showBack(): this {
    this.card = null;
    this.drawBase(COLORS.cardBack, COLORS.amber, 0.6);
    for (const text of [
      this.cornerTop,
      this.cornerBottom,
      this.suitTop,
      this.suitBottom,
      this.pip,
    ]) {
      text.setVisible(false);
    }
    this.emblem.setVisible(true);
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

  private drawBase(fill: number, outline: number, outlineAlpha: number): void {
    const { width, height, radius } = this.spec;
    const rect = { x: -width / 2, y: -height / 2, width, height };
    this.bg.clear();
    // Soft drop shadow under the card.
    this.bg.fillStyle(0x000000, 0.25);
    this.bg.fillRoundedRect(rect.x + 2, rect.y + 6, width, height, radius);
    drawPanel(this.bg, rect, {
      fill,
      stroke: outline,
      strokeAlpha: outlineAlpha,
      strokeWidth: this.size === 'large' ? 2 : 1,
      radius,
    });
  }
}

/** Dashed outline of an empty board slot, with a faint "?" — tilted like the cards. */
export function addCardSlot(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: CardSize,
  angle: number,
): Phaser.GameObjects.Container {
  const { width, height, radius } = LAYOUT.card[size];
  const g = scene.add.graphics();
  g.fillStyle(COLORS.night, 0.2);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  g.lineStyle(2, COLORS.mutedLight, 0.4);
  strokeDashedRect(g, -width / 2 + 1, -height / 2 + 1, width - 2, height - 2, radius);
  const mark = scene.add
    .text(0, 0, '?', textStyle(LAYOUT.fontSize.caption, COLORS.mutedLight))
    .setOrigin(0.5);
  return scene.add.container(x, y, [g, mark]).setAngle(angle);
}

/** Graphics has no dash style, so dash the straight edges and keep the corners solid. */
function strokeDashedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const dash = 5;
  const gap = 4;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / length;
    const dy = (y2 - y1) / length;
    for (let d = 0; d < length; d += dash + gap) {
      const end = Math.min(d + dash, length);
      g.lineBetween(x1 + dx * d, y1 + dy * d, x1 + dx * end, y1 + dy * end);
    }
  };
  line(x + r, y, x + w - r, y);
  line(x + w, y + r, x + w, y + h - r);
  line(x + w - r, y + h, x + r, y + h);
  line(x, y + h - r, x, y + r);
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -90],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, 90],
    [x + r, y + r, 180],
  ];
  for (const [cx, cy, start] of corners) {
    g.beginPath();
    g.arc(cx, cy, r, Phaser.Math.DegToRad(start), Phaser.Math.DegToRad(start + 90));
    g.strokePath();
  }
}
