import Phaser from 'phaser';
import { COLORS, LAYOUT } from '../config';
import { drawPanel } from './decor';
import { textStyle } from './text';

const PAD = 18;
const ARROW = 11;
/** Distance from the bubble's right edge to the tip of its tail. */
const ARROW_INSET = 40;

/**
 * The opponent's speech bubble, anchored by its top-right corner: the thinking state and the
 * bot's (possibly lying) lines.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly line: Phaser.GameObjects.Text;
  private readonly note: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const b = LAYOUT.bubble;
    super(scene, b.right, b.y);
    this.bg = scene.add.graphics();
    this.line = scene.add
      .text(0, PAD, '', {
        ...textStyle(LAYOUT.fontSize.label, COLORS.cream),
        wordWrap: { width: b.maxWidth - PAD * 2 },
      })
      .setOrigin(0, 0);
    this.note = scene.add.text(0, 0, '', textStyle(10, COLORS.muted)).setOrigin(0, 0);
    this.add([this.bg, this.line, this.note]);
    // Above the lever panel (depth 100), so the opponent can talk over its dimmer.
    this.setDepth(110).setVisible(false);
    scene.add.existing(this);
  }

  /** Shows a line, with an optional small note under it (e.g. "… đang suy nghĩ"). */
  say(line: string, note = ''): this {
    this.line.setText(line);
    this.note.setText(note).setVisible(note !== '');
    const width = Math.max(this.line.width, this.note.visible ? this.note.width : 0) + PAD * 2;
    const height = PAD * 2 + this.line.height + (this.note.visible ? this.note.height + 4 : 0);
    this.line.setX(-width + PAD);
    this.note.setPosition(-width + PAD, PAD + this.line.height + 4);

    this.bg.clear();
    drawPanel(
      this.bg,
      { x: -width, y: 0, width, height },
      {
        fill: COLORS.slate,
        fillAlpha: 0.95,
        stroke: COLORS.rivet,
        strokeAlpha: 0.4,
        strokeWidth: 2,
      },
    );
    const tipX = -ARROW_INSET;
    this.bg.fillStyle(COLORS.slate, 0.95);
    this.bg.fillTriangle(tipX - ARROW, height - 2, tipX + ARROW, height - 2, tipX, height + ARROW);
    this.bg.lineStyle(2, COLORS.rivet, 0.4);
    this.bg.lineBetween(tipX - ARROW, height - 1, tipX, height + ARROW);
    this.bg.lineBetween(tipX, height + ARROW, tipX + ARROW, height - 1);
    return this.setVisible(true);
  }

  hide(): this {
    return this.setVisible(false);
  }
}
