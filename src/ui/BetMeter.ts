import Phaser from 'phaser';
import { BETTING, COLORS, LAYOUT, TIMING } from '../config';
import { t } from '../i18n';
import { textStyle } from './text';

/** "Mức cược" label plus one cell per stake level; cells up to the current level glow. */
export class BetMeter extends Phaser.GameObjects.Container {
  private readonly cells: Phaser.GameObjects.Rectangle[] = [];
  private level = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const { cell, gap, labelGap } = LAYOUT.betMeter;
    const total = BETTING.maxLevel * cell + (BETTING.maxLevel - 1) * gap;
    const left = -total / 2;

    const label = scene.add
      .text(left - labelGap, 0, t('table.stake'), textStyle(LAYOUT.fontSize.body, COLORS.cream))
      .setOrigin(1, 0.5);
    this.add(label);

    for (let i = 0; i < BETTING.maxLevel; i++) {
      const rect = scene.add
        .rectangle(left + i * (cell + gap) + cell / 2, 0, cell, cell, COLORS.woodDark)
        .setStrokeStyle(2, COLORS.woodMid);
      const number = scene.add
        .text(rect.x, 0, String(i + 1), textStyle(LAYOUT.fontSize.caption, COLORS.muted, true))
        .setOrigin(0.5);
      this.cells.push(rect);
      this.add([rect, number]);
    }
    scene.add.existing(this);
  }

  setLevel(level: number, animate = false): void {
    const previous = this.level;
    this.level = level;
    this.cells.forEach((rect, i) => {
      const lit = i < level;
      rect.setFillStyle(lit ? COLORS.amber : COLORS.woodDark);
      rect.setStrokeStyle(2, lit ? COLORS.cream : COLORS.woodMid);
      if (animate && lit && i >= previous) {
        this.scene.tweens.add({
          targets: rect,
          scale: { from: 1.35, to: 1 },
          duration: TIMING.meterPulse,
          ease: 'Back.easeOut',
        });
      }
    });
  }
}
