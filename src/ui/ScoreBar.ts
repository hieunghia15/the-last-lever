import Phaser from 'phaser';
import { COLORS, LAYOUT, TIMING } from '../config';
import { t } from '../i18n';
import { addGlow } from './decor';
import { textStyle } from './text';

interface Pip {
  ring: Phaser.GameObjects.Arc;
  dot: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Image;
}

export interface ScoreBarOptions {
  winsNeeded: number;
  bestOf: number;
  names: [string, string];
}

/** Top strip: a pip per win needed for each side, the draw counter and match format between. */
export class ScoreBar extends Phaser.GameObjects.Container {
  private readonly pips: [Pip[], Pip[]] = [[], []];
  private readonly draws: Phaser.GameObjects.Text;
  private wins: [number, number] = [0, 0];

  constructor(scene: Phaser.Scene, opts: ScoreBarOptions) {
    const bar = LAYOUT.topBar;
    super(scene, bar.x, bar.y);
    const cy = bar.height / 2;
    const { radius, gap } = LAYOUT.pip;

    this.add(scene.add.rectangle(0, 0, bar.width, bar.height, COLORS.ink, 0.8).setOrigin(0));
    this.add(scene.add.rectangle(0, bar.height - 1, bar.width, 1, COLORS.rivet, 0.1).setOrigin(0));

    const size = LAYOUT.fontSize.body;
    const left = scene.add
      .text(bar.margin, cy, opts.names[0].toUpperCase(), textStyle(size, COLORS.amberLight))
      .setOrigin(0, 0.5);
    const right = scene.add
      .text(
        bar.width - bar.margin,
        cy,
        opts.names[1].toUpperCase(),
        textStyle(size, COLORS.creamSoft),
      )
      .setOrigin(1, 0.5);
    this.add([left, right]);

    const nameGap = 16;
    for (let i = 0; i < opts.winsNeeded; i++) {
      const step = i * (radius * 2 + gap) + radius;
      this.pips[0].push(this.pip(left.x + left.width + nameGap + step, cy));
      this.pips[1].push(this.pip(right.x - right.width - nameGap - step, cy));
    }

    this.draws = scene.add
      .text(bar.width / 2, 19, '', textStyle(LAYOUT.fontSize.label, COLORS.muted))
      .setOrigin(0.5);
    const mode = scene.add
      .text(
        bar.width / 2,
        39,
        t('score.mode', { n: opts.bestOf }),
        textStyle(LAYOUT.fontSize.caption, COLORS.amberLight, false, { letterSpacing: 1.2 }),
      )
      .setOrigin(0.5);
    this.add([this.draws, mode]);
    this.setScore([0, 0], 0);
    scene.add.existing(this);
  }

  setScore(wins: readonly [number, number], draws: number, animate = false): void {
    ([0, 1] as const).forEach((side) => {
      this.pips[side].forEach((pip, i) => {
        const filled = i < wins[side];
        pip.dot.setVisible(filled);
        pip.glow.setVisible(filled);
        pip.ring.setVisible(!filled);
        if (animate && filled && i >= this.wins[side]) {
          this.scene.tweens.add({
            targets: pip.dot,
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

  private pip(x: number, y: number): Pip {
    const { radius } = LAYOUT.pip;
    const glow = addGlow(this.scene, x, y, radius * 5, COLORS.amber, 0.5);
    const dot = this.scene.add.circle(x, y, radius, COLORS.amber);
    const ring = this.scene.add
      .circle(x, y, radius - 1, COLORS.amber, 0)
      .setStrokeStyle(2, COLORS.mutedLight);
    this.add([glow, dot, ring]);
    return { ring, dot, glow };
  }
}
