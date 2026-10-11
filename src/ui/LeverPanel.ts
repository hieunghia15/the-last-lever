import Phaser from 'phaser';
import { COLORS, cssColor, DISPLAY, LAYOUT, LEVERS, TIMING } from '../config';
import type { LeverView } from '../core/gameState';
import { t } from '../i18n';
import { tweenAsync, wait } from './anim';
import { textStyle } from './text';

interface LeverSprite {
  body: Phaser.GameObjects.Rectangle;
  lamp: Phaser.GameObjects.Arc;
  status: Phaser.GameObjects.Text;
  state: LeverView;
}

/**
 * Rough Phase 2 lever board: six tappable rectangles that turn green or red. The slide-in,
 * pull counter and electric effects come in Phase 4.
 */
export class LeverPanel extends Phaser.GameObjects.Container {
  private readonly levers: LeverSprite[] = [];
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private accepting = false;

  constructor(
    scene: Phaser.Scene,
    private readonly onPull: (lever: number) => void,
  ) {
    super(scene, 0, 0);
    const p = LAYOUT.leverPanel;

    // The dim layer is interactive so taps never fall through to the table underneath.
    const dim = scene.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0x000000, p.dim)
      .setOrigin(0)
      .setInteractive();
    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.woodDark, 0.95);
    panel.fillRoundedRect(p.x, p.y, p.width, p.height, 16);
    panel.lineStyle(2, COLORS.woodMid, 1);
    panel.strokeRoundedRect(p.x, p.y, p.width, p.height, 16);
    this.title = scene.add
      .text(DISPLAY.width / 2, p.titleY, '', textStyle(LAYOUT.fontSize.heading, COLORS.cream, true))
      .setOrigin(0.5);
    this.hint = scene.add
      .text(DISPLAY.width / 2, p.hintY, '', textStyle(LAYOUT.fontSize.body, COLORS.muted))
      .setOrigin(0.5);
    this.add([dim, panel, this.title, this.hint]);

    const { width, height, gap, y } = p.lever;
    const left = DISPLAY.width / 2 - (LEVERS.count * width + (LEVERS.count - 1) * gap) / 2;
    for (let i = 0; i < LEVERS.count; i++) {
      const cx = left + i * (width + gap) + width / 2;
      const body = scene.add
        .rectangle(cx, y + height / 2, width, height, COLORS.leverIdle)
        .setStrokeStyle(2, COLORS.woodMid)
        .setInteractive({ useHandCursor: true });
      const lamp = scene.add.circle(cx, y + 28, 14, COLORS.night).setStrokeStyle(2, COLORS.muted);
      const number = scene.add
        .text(
          cx,
          y + height - 30,
          String(i + 1),
          textStyle(LAYOUT.fontSize.heading, COLORS.cream, true),
        )
        .setOrigin(0.5);
      const status = scene.add
        .text(cx, y + height + 22, '', textStyle(LAYOUT.fontSize.caption, COLORS.cream, true))
        .setOrigin(0.5);
      body.on('pointerup', () => this.tap(i));
      this.add([body, lamp, number, status]);
      this.levers.push({ body, lamp, status, state: 'unknown' });
    }

    this.setDepth(100).setVisible(false);
    scene.add.existing(this);
  }

  /** Shows the board for a new challenge; `mine` decides the hint and whether taps count. */
  async open(name: string, pulls: number, mine: boolean): Promise<void> {
    this.title.setText(t('lever.title', { name, n: pulls }));
    this.hint.setText(mine ? t('lever.hint') : t('lever.botChoosing', { name }));
    this.levers.forEach((_, i) => this.paint(i, 'unknown'));
    this.setAlpha(0).setVisible(true);
    await tweenAsync(this.scene, { targets: this, alpha: 1, duration: TIMING.panelFade });
  }

  async close(): Promise<void> {
    this.accepting = false;
    if (!this.visible) return;
    await tweenAsync(this.scene, { targets: this, alpha: 0, duration: TIMING.panelFade });
    this.setVisible(false);
  }

  /** Lamp blinks amber for a beat, then shows Safe or Danger. */
  async reveal(lever: number, danger: boolean): Promise<void> {
    const sprite = this.levers[lever];
    if (!sprite) return;
    sprite.lamp.setFillStyle(COLORS.amber);
    sprite.body.setFillStyle(COLORS.woodMid);
    await wait(this.scene, TIMING.leverReveal);
    this.paint(lever, danger ? 'danger' : 'safe');
    await wait(this.scene, TIMING.afterLever);
  }

  /** Brings every lever in line with the view (used when re-rendering from state). */
  sync(levers: readonly LeverView[]): void {
    levers.forEach((state, i) => this.paint(i, state));
  }

  setAccepting(accepting: boolean): void {
    this.accepting = accepting;
  }

  private tap(lever: number): void {
    if (!this.accepting || this.levers[lever]?.state !== 'unknown') return;
    this.accepting = false;
    this.onPull(lever);
  }

  private paint(lever: number, state: LeverView): void {
    const sprite = this.levers[lever];
    if (!sprite) return;
    sprite.state = state;
    const color =
      state === 'safe' ? COLORS.safe : state === 'danger' ? COLORS.danger : COLORS.leverIdle;
    sprite.body.setFillStyle(color);
    sprite.lamp.setFillStyle(state === 'unknown' ? COLORS.night : color);
    sprite.status
      .setText(state === 'safe' ? t('lever.safe') : state === 'danger' ? t('lever.danger') : '')
      .setColor(cssColor(color));
  }
}
