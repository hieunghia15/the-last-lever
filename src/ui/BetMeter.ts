import Phaser from 'phaser';
import { BETTING, COLORS, cssColor, LAYOUT, TIMING } from '../config';
import { t } from '../i18n';
import { drawGlowRect } from './decor';
import { textStyle } from './text';

interface Cell {
  box: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Graphics;
  number: Phaser.GameObjects.Text;
}

/** "Mức cược" label plus one cell per stake level; the row is centred on x. */
export class BetMeter extends Phaser.GameObjects.Container {
  private readonly cells: Cell[] = [];
  private level = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const { cell, gap, labelGap } = LAYOUT.betMeter;
    const label = scene.add
      .text(
        0,
        0,
        t('table.stake').toUpperCase(),
        textStyle(LAYOUT.fontSize.label, COLORS.cream, false, { letterSpacing: 0.8 }),
      )
      .setOrigin(0, 0.5);
    const cellsWidth = BETTING.maxLevel * cell + (BETTING.maxLevel - 1) * gap;
    const left = -(label.width + labelGap + cellsWidth) / 2;
    label.setX(left);
    this.add(label);

    const first = left + label.width + labelGap;
    for (let i = 0; i < BETTING.maxLevel; i++) {
      const cx = first + i * (cell + gap) + cell / 2;
      const glow = scene.add.graphics();
      drawGlowRect(
        glow,
        { x: cx - cell / 2, y: -cell / 2, width: cell, height: cell },
        COLORS.amber,
        0.5,
        6,
        2,
      );
      const box = scene.add.rectangle(cx, 0, cell, cell, COLORS.slate);
      const number = scene.add
        .text(cx, 0, String(i + 1), textStyle(14, COLORS.muted))
        .setOrigin(0.5);
      this.cells.push({ box, glow, number });
      this.add([glow, box, number]);
    }
    scene.add.existing(this);
  }

  setLevel(level: number, animate = false): void {
    const previous = this.level;
    this.level = level;
    this.cells.forEach(({ box, glow, number }, i) => {
      const lit = i < level;
      box.setFillStyle(lit ? COLORS.amber : COLORS.slate);
      if (lit) box.setStrokeStyle();
      else box.setStrokeStyle(1, COLORS.rivet, 0.4);
      glow.setVisible(lit);
      number
        .setColor(cssColor(lit ? COLORS.amberInkDeep : COLORS.muted))
        .setFontStyle(lit ? '700' : '400');
      if (animate && lit && i >= previous) {
        this.scene.tweens.add({
          targets: box,
          scale: { from: 1.35, to: 1 },
          duration: TIMING.meterPulse,
          ease: 'Back.easeOut',
        });
      }
    });
  }
}
