import Phaser from 'phaser';
import { COLORS, LAYOUT, TIMING } from '../config';
import { t } from '../i18n';
import { textStyle } from './text';

/** Top strip: a pip per win needed for each side, and the shared draw counter in the middle. */
export class ScoreBar extends Phaser.GameObjects.Container {
  private readonly pips: [Phaser.GameObjects.Arc[], Phaser.GameObjects.Arc[]] = [[], []];
  private readonly draws: Phaser.GameObjects.Text;
  private wins: [number, number] = [0, 0];

  constructor(scene: Phaser.Scene, winsNeeded: number, names: [string, string]) {
    const bar = LAYOUT.topBar;
    super(scene, bar.x, bar.y);
    const cy = bar.height / 2;
    const margin = 24;
    const { radius, gap } = LAYOUT.pip;

    this.add(scene.add.rectangle(0, 0, bar.width, bar.height, COLORS.night, 0.85).setOrigin(0));
    this.add(
      scene.add.rectangle(0, bar.height - 1, bar.width, 2, COLORS.woodMid).setOrigin(0, 0.5),
    );

    const style = textStyle(LAYOUT.fontSize.body, COLORS.cream, true);
    const left = scene.add.text(margin, cy, names[0].toUpperCase(), style).setOrigin(0, 0.5);
    const right = scene.add
      .text(bar.width - margin, cy, names[1].toUpperCase(), style)
      .setOrigin(1, 0.5);
    this.add([left, right]);

    for (let i = 0; i < winsNeeded; i++) {
      const step = i * (radius * 2 + gap) + radius;
      this.pips[0].push(this.pip(left.x + left.width + 16 + step, cy));
      this.pips[1].push(this.pip(right.x - right.width - 16 - step, cy));
    }

    this.draws = scene.add
      .text(bar.width / 2, cy, '', textStyle(LAYOUT.fontSize.body, COLORS.muted))
      .setOrigin(0.5);
    this.add(this.draws);
    this.setScore([0, 0], 0);
    scene.add.existing(this);
  }

  setScore(wins: readonly [number, number], draws: number, animate = false): void {
    ([0, 1] as const).forEach((side) => {
      this.pips[side].forEach((pip, i) => {
        const filled = i < wins[side];
        pip.setFillStyle(COLORS.amber, filled ? 1 : 0);
        if (animate && filled && i >= this.wins[side]) {
          this.scene.tweens.add({
            targets: pip,
            scale: { from: 1.8, to: 1 },
            duration: TIMING.banner / 2,
            ease: 'Back.easeOut',
          });
        }
      });
    });
    this.wins = [wins[0], wins[1]];
    this.draws.setText(t('score.draws', { n: draws }));
  }

  private pip(x: number, y: number): Phaser.GameObjects.Arc {
    const arc = this.scene.add
      .circle(x, y, LAYOUT.pip.radius, COLORS.amber, 0)
      .setStrokeStyle(2, COLORS.amber);
    this.add(arc);
    return arc;
  }
}
