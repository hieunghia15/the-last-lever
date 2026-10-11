import Phaser from 'phaser';
import { COLORS, DISPLAY, LAYOUT, TIMING } from '../config';
import { Button } from '../ui/Button';
import { addIcon, drawGlowRect, drawPanel, drawRivets } from '../ui/decor';
import { textStyle } from '../ui/text';

export interface ConfirmSceneData {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Yes/no popup launched over a paused scene. Running as its own scene means the paused one
 * keeps no timers or tweens going behind the dim, and gets no taps.
 */
export class ConfirmScene extends Phaser.Scene {
  private setup!: ConfirmSceneData;
  private closed = false;

  constructor() {
    super('ConfirmScene');
  }

  init(data: ConfirmSceneData): void {
    this.setup = data;
    this.closed = false;
  }

  create(): void {
    const c = LAYOUT.confirm;
    const cx = DISPLAY.width / 2;
    const panel = { x: cx - c.width / 2, y: (DISPLAY.height - c.height) / 2, ...c };

    // Swallows every tap outside the panel; tapping the dim does not count as an answer.
    this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, COLORS.night, c.dim)
      .setOrigin(0)
      .setInteractive();

    const g = this.add.graphics();
    drawGlowRect(g, panel, 0x000000, 0.35, 24);
    drawPanel(g, panel, {
      fill: COLORS.woodDark,
      fillAlpha: 0.97,
      stroke: COLORS.woodMid,
      strokeWidth: 2,
    });
    drawRivets(g, panel, { size: 10 });

    const titleY = panel.y + c.padding + 16;
    const title = this.add
      .text(
        cx,
        titleY,
        this.setup.title.toUpperCase(),
        textStyle(LAYOUT.fontSize.heading, COLORS.amber, true),
      )
      .setOrigin(0.5);
    const icon = addIcon(this, 0, titleY, 'warning');
    const iconGap = 12;
    const groupLeft = cx - (icon.displayWidth + iconGap + title.width) / 2;
    icon.setX(groupLeft + icon.displayWidth / 2);
    title.setX(groupLeft + icon.displayWidth + iconGap + title.width / 2);

    this.add
      .text(cx, titleY + 64, this.setup.message, {
        ...textStyle(LAYOUT.fontSize.body, COLORS.cream),
        align: 'center',
        wordWrap: { width: c.width - c.padding * 2 },
      })
      .setOrigin(0.5);

    const buttonY = panel.y + c.height - c.padding - LAYOUT.button.height / 2;
    const offset = c.buttonWidth / 2 + 8;
    new Button(
      this,
      cx - offset,
      buttonY,
      { width: c.buttonWidth, label: this.setup.cancelLabel, variant: 'dark' },
      () => this.close(this.setup.onCancel),
    );
    new Button(
      this,
      cx + offset,
      buttonY,
      { width: c.buttonWidth, label: this.setup.confirmLabel, variant: 'danger', icon: 'home' },
      () => this.close(this.setup.onConfirm),
    );
    this.input.keyboard?.once('keydown-ESC', () => this.close(this.setup.onCancel));

    this.cameras.main.fadeIn(TIMING.panelFade);
  }

  /** Stops this popup first, so the callback may start or resume any scene. */
  private close(then: () => void): void {
    if (this.closed) return;
    this.closed = true;
    this.scene.stop();
    then();
  }
}
