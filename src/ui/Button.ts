import Phaser from 'phaser';
import { COLORS, cssColor, LAYOUT } from '../config';
import { drawGlowRect, drawPanel, type PanelStyle } from './decor';
import { ICONS, iconKey, type IconName } from './icons';
import { textStyle } from './text';
import { allInFillTexture } from './textures';

/** Button looks from the Figma file; `ghost` is the menu's translucent secondary button. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'allIn' | 'ghost' | 'dark';

export interface ButtonOptions {
  width: number;
  height?: number;
  label: string;
  subtitle?: string;
  variant?: ButtonVariant;
  fontSize?: number;
  bold?: boolean;
  /** Overrides the variant's label colour. */
  textColor?: number;
  icon?: IconName;
  iconSide?: 'left' | 'right';
  iconGap?: number;
  radius?: number;
  /** Taller tap zone than the drawn box, for compact buttons that must stay easy to hit. */
  hitHeight?: number;
}

interface Look {
  panel: PanelStyle;
  text: number;
  subtitle: number;
  subtitleAlpha?: number;
  glow?: { color: number; alpha: number; spread: number };
  gradient?: boolean;
}

const LOOKS: Record<ButtonVariant, Look> = {
  primary: {
    panel: { fill: COLORS.amber, stroke: COLORS.amberLight, strokeWidth: 1 },
    text: COLORS.amberInk,
    subtitle: COLORS.amberInk,
    subtitleAlpha: 0.8,
    glow: { color: COLORS.amber, alpha: 0.35, spread: 12 },
  },
  secondary: {
    panel: { fill: COLORS.woodMid, stroke: COLORS.amber, strokeWidth: 2 },
    text: COLORS.amberLight,
    subtitle: COLORS.muted,
  },
  danger: {
    panel: { fill: COLORS.slate, stroke: COLORS.danger, strokeWidth: 2 },
    text: COLORS.danger,
    subtitle: COLORS.muted,
  },
  allIn: {
    panel: { stroke: COLORS.amber, strokeWidth: 2 },
    text: COLORS.peach,
    subtitle: COLORS.muted,
    glow: { color: COLORS.danger, alpha: 0.3, spread: 15 },
    gradient: true,
  },
  ghost: {
    panel: {
      fill: COLORS.woodMid,
      fillAlpha: 0.6,
      stroke: COLORS.amber,
      strokeAlpha: 0.6,
      strokeWidth: 2,
    },
    text: COLORS.cream,
    subtitle: COLORS.muted,
  },
  dark: {
    panel: { fill: COLORS.woodDark, stroke: COLORS.amber, strokeWidth: 2 },
    text: COLORS.cream,
    subtitle: COLORS.muted,
  },
};

/** A disabled button is drawn flat, then faded as a whole, as in the design. */
const DISABLED: Look = {
  panel: {
    fill: COLORS.woodDark,
    fillAlpha: 0.3,
    stroke: COLORS.rivet,
    strokeAlpha: 0.1,
    strokeWidth: 1,
  },
  text: COLORS.creamSoft,
  subtitle: COLORS.creamSoft,
};

/** Rounded button centred on (x, y). Fires on pointer release so a drag-off cancels the tap. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly fillImage: Phaser.GameObjects.Image | null;
  private readonly label: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly icon: Phaser.GameObjects.Image | null;
  private readonly hit: Phaser.GameObjects.Zone;
  private readonly boxW: number;
  private readonly boxH: number;
  private readonly radius: number;
  private readonly textColor: number | undefined;
  private variant: ButtonVariant;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly opts: ButtonOptions,
    private readonly onTap: () => void,
  ) {
    super(scene, x, y);
    this.boxW = opts.width;
    this.boxH = opts.height ?? LAYOUT.button.height;
    this.radius = opts.radius ?? LAYOUT.radius;
    this.variant = opts.variant ?? 'secondary';
    this.textColor = opts.textColor;

    this.bg = scene.add.graphics();
    this.fillImage =
      this.variant === 'allIn'
        ? scene.add.image(0, 0, allInFillTexture(scene, this.boxW, this.boxH))
        : null;
    const bold = opts.bold ?? (this.variant === 'primary' || this.variant === 'dark');
    this.label = scene.add
      .text(0, 0, '', textStyle(opts.fontSize ?? LAYOUT.fontSize.button, COLORS.cream, bold))
      .setOrigin(0.5);
    this.subtitle = scene.add
      .text(0, 0, '', textStyle(LAYOUT.button.subtitleSize, COLORS.cream))
      .setOrigin(0.5);
    this.icon = opts.icon ? addButtonIcon(scene, opts.icon) : null;
    this.hit = scene.add
      .zone(0, 0, this.boxW, Math.max(this.boxH, opts.hitHeight ?? 0))
      .setInteractive({ useHandCursor: true });
    this.add(
      [this.fillImage, this.bg, this.icon, this.label, this.subtitle, this.hit].filter(
        (o): o is NonNullable<typeof o> => o !== null,
      ),
    );

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
    this.subtitle.setText(subtitle.toUpperCase()).setVisible(subtitle !== '');
    this.layout();
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
    return this.redraw();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Centres icon + label as one group, and stacks the subtitle under the label. */
  private layout(): void {
    const hasSubtitle = this.subtitle.visible;
    const labelY = hasSubtitle ? -8 : 0;
    this.subtitle.setY(hasSubtitle ? 15 : 0);
    if (!this.icon) {
      this.label.setPosition(0, labelY);
      return;
    }
    if (this.label.text === '') {
      this.icon.setPosition(0, 0);
      return;
    }
    const gap = this.opts.iconGap ?? 8;
    const iconW = this.icon.displayWidth;
    const total = iconW + gap + this.label.width;
    const left = -total / 2;
    if ((this.opts.iconSide ?? 'left') === 'left') {
      this.icon.setPosition(left + iconW / 2, labelY);
      this.label.setPosition(left + iconW + gap + this.label.width / 2, labelY);
    } else {
      this.label.setPosition(left + this.label.width / 2, labelY);
      this.icon.setPosition(left + this.label.width + gap + iconW / 2, labelY);
    }
  }

  private redraw(): this {
    const look = this.enabled ? LOOKS[this.variant] : DISABLED;
    const rect = { x: -this.boxW / 2, y: -this.boxH / 2, width: this.boxW, height: this.boxH };
    this.label.setColor(cssColor(this.enabled ? (this.textColor ?? look.text) : look.text));
    this.subtitle.setColor(cssColor(look.subtitle)).setAlpha(look.subtitleAlpha ?? 1);
    this.fillImage?.setVisible(this.enabled && look.gradient === true);
    this.bg.clear();
    if (look.glow) drawGlowRect(this.bg, rect, look.glow.color, look.glow.alpha, look.glow.spread);
    drawPanel(this.bg, rect, { ...look.panel, radius: this.radius });
    return this;
  }
}

function addButtonIcon(scene: Phaser.Scene, name: IconName): Phaser.GameObjects.Image {
  const { width, height } = ICONS[name];
  return scene.add.image(0, 0, iconKey(name)).setDisplaySize(width, height);
}
