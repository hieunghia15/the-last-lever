import Phaser from 'phaser';
import { COLORS, cssColor, LAYOUT } from '../config';
import { textStyle } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonOptions {
  width: number;
  height?: number;
  label: string;
  subtitle?: string;
  variant?: ButtonVariant;
  fontSize?: number;
}

const FILL: Record<ButtonVariant, number> = {
  primary: COLORS.amber,
  secondary: COLORS.woodDark,
  danger: COLORS.woodDark,
};
const OUTLINE: Record<ButtonVariant, number> = {
  primary: COLORS.amber,
  secondary: COLORS.amber,
  danger: COLORS.danger,
};

/** Rounded button centred on (x, y). Fires on pointer release so a drag-off cancels the tap. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Zone;
  private readonly boxW: number;
  private readonly boxH: number;
  private variant: ButtonVariant;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: ButtonOptions,
    private readonly onTap: () => void,
  ) {
    super(scene, x, y);
    this.boxW = opts.width;
    this.boxH = opts.height ?? LAYOUT.button.height;
    this.variant = opts.variant ?? 'secondary';

    this.bg = scene.add.graphics();
    this.label = scene.add.text(
      0,
      0,
      '',
      textStyle(opts.fontSize ?? LAYOUT.fontSize.button, COLORS.cream, true),
    );
    this.label.setOrigin(0.5);
    this.subtitle = scene.add.text(0, 0, '', textStyle(LAYOUT.button.subtitleSize, COLORS.cream));
    this.subtitle.setOrigin(0.5);
    this.hit = scene.add.zone(0, 0, this.boxW, this.boxH).setInteractive({ useHandCursor: true });
    this.add([this.bg, this.label, this.subtitle, this.hit]);

    this.hit.on('pointerdown', () => this.enabled && this.setScale(0.97));
    this.hit.on('pointerout', () => this.setScale(1));
    this.hit.on('pointerup', () => {
      this.setScale(1);
      if (this.enabled) this.onTap();
    });

    this.setLabel(opts.label, opts.subtitle);
    scene.add.existing(this);
  }

  setLabel(label: string, subtitle = ''): this {
    this.label.setText(label);
    this.subtitle.setText(subtitle);
    const lift = subtitle ? LAYOUT.button.subtitleSize * 0.6 : 0;
    this.label.setY(-lift);
    this.subtitle.setY(this.boxH / 2 - LAYOUT.button.subtitleSize - 2).setVisible(subtitle !== '');
    return this.redraw();
  }

  setVariant(variant: ButtonVariant): this {
    this.variant = variant;
    return this.redraw();
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : LAYOUT.disabledAlpha);
    if (enabled) this.hit.setInteractive();
    else this.hit.disableInteractive();
    return this;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  private redraw(): this {
    const textColor = this.variant === 'primary' ? COLORS.night : COLORS.cream;
    this.label.setColor(cssColor(textColor));
    this.subtitle.setColor(cssColor(textColor));
    this.bg.clear();
    this.bg.fillStyle(FILL[this.variant], 1);
    this.bg.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, LAYOUT.radius);
    this.bg.lineStyle(2, OUTLINE[this.variant], 1);
    this.bg.strokeRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, LAYOUT.radius);
    return this;
  }
}
