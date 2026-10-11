import Phaser from 'phaser';
import { COLORS, DISPLAY, LAYOUT, TIMING } from '../config';
import { t } from '../i18n';
import { addBackdrop, addLamp, drawGlowRect, drawPanel } from '../ui/decor';
import { ICONS, iconKey, type IconName } from '../ui/icons';
import { textStyle } from '../ui/text';
import { shineTexture } from '../ui/textures';

const BAR = { width: 480, height: 16, y: 398.6 };

/** Loading screen: draws itself from code, then loads the icon set with a real progress bar. */
export class BootScene extends Phaser.Scene {
  private barFill!: Phaser.GameObjects.Graphics;
  private shine!: Phaser.GameObjects.Image;
  private percent!: Phaser.GameObjects.Text;
  private shown = 0;
  private startedAt = 0;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.startedAt = this.time.now;
    this.drawScreen();
    this.load.setPath(`${import.meta.env.BASE_URL}assets/icons/`);
    for (const [name, icon] of Object.entries(ICONS)) {
      // Rasterised larger than shown so icons stay crisp when Scale.FIT enlarges the canvas.
      this.load.svg(iconKey(name as IconName), icon.file, { scale: DISPLAY.textResolution });
    }
    // update() does not run while loading, so the bar follows the loader directly up to 90%.
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.shown = Math.max(this.shown, value * 0.9);
      this.setProgress(this.shown);
    });
  }

  override update(_time: number, delta: number): void {
    // Loading is done; ease the rest so a fast load still reads as a fill.
    this.shown = Math.min(1, this.shown + delta / TIMING.bootMin);
    this.setProgress(this.shown);
    if (this.shown >= 1 && this.time.now - this.startedAt >= TIMING.bootMin) {
      this.scene.start('MenuScene');
    }
  }

  private drawScreen(): void {
    const cx = DISPLAY.width / 2;
    addBackdrop(this, 'loading');
    addLamp(this);
    // The loading fixture: a ring around the bulb.
    const ring = this.add.graphics();
    ring.lineStyle(2, COLORS.amber, 1);
    ring.strokeCircle(cx, LAYOUT.lamp.rodHeight + 16, 15);

    this.drawTitle(cx, 301.6);
    this.add
      .text(
        cx,
        355,
        t('loading.edition').toUpperCase(),
        textStyle(LAYOUT.fontSize.label, COLORS.muted, false, { letterSpacing: 1.6 }),
      )
      .setOrigin(0.5);

    const left = cx - BAR.width / 2;
    const track = this.add.graphics();
    drawPanel(
      track,
      { x: left, y: BAR.y, width: BAR.width, height: BAR.height },
      { fill: COLORS.slate, radius: BAR.height / 2 },
    );
    // Inset shadow along the top edge of the track.
    track.fillStyle(0x000000, 0.45);
    track.fillRoundedRect(left + 2, BAR.y + 1, BAR.width - 4, 4, 2);
    this.barFill = this.add.graphics();
    this.shine = this.add
      .image(left + 2, BAR.y + BAR.height / 2, shineTexture(this))
      .setOrigin(0, 0.5);

    const captionY = BAR.y + BAR.height + 8 + 11.2;
    this.add
      .text(
        left + 4,
        captionY,
        t('loading.caption'),
        textStyle(LAYOUT.fontSize.label, COLORS.muted),
      )
      .setOrigin(0, 0.5);
    this.percent = this.add
      .text(
        left + BAR.width - 4,
        captionY,
        '0%',
        textStyle(LAYOUT.fontSize.label, COLORS.amberBright, true),
      )
      .setOrigin(1, 0.5);

    this.drawBadges(cx, captionY + 11.2 + 32 + 10.5);
  }

  /** "THE LAST L⟷EVER": the second word is amber, with a lever toggle standing in for a letter. */
  private drawTitle(cx: number, y: number): void {
    const style = (color: number) =>
      textStyle(LAYOUT.fontSize.title, color, true, { letterSpacing: 3.2 });
    const glow = (text: Phaser.GameObjects.Text) =>
      text.setShadow(0, 4, 'rgba(242, 169, 59, 0.2)', 10, false, true).setOrigin(0, 0.5);
    const first = glow(this.add.text(0, y, 'THE LAST', style(COLORS.cream)));
    const l = glow(this.add.text(0, y, 'L', style(COLORS.amber)));
    const toggle = this.add.image(0, y - 2, iconKey('leverToggle'));
    const rest = glow(this.add.text(0, y, 'EVER', style(COLORS.amber)));
    const toggleW = ICONS.leverToggle.width;
    const total = first.width + 8 + l.width + toggleW + 4 + rest.width;
    let x = cx - total / 2;
    first.setX(x);
    x += first.width + 8;
    l.setX(x);
    x += l.width;
    // The icon texture is loaded in preload, so place it once the loader has it.
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      toggle
        .setTexture(iconKey('leverToggle'))
        .setDisplaySize(toggleW, ICONS.leverToggle.height)
        .setVisible(true);
    });
    toggle.setPosition(x + toggleW / 2, y - 2).setVisible(false);
    x += toggleW + 4;
    rest.setX(x);
  }

  private drawBadges(cx: number, y: number): void {
    const style = textStyle(14, COLORS.muted);
    const kernel = this.add.text(0, y, t('loading.kernel'), style).setOrigin(0, 0.5);
    const slash = this.add
      .text(0, y, '/', textStyle(LAYOUT.fontSize.label, COLORS.rivet))
      .setOrigin(0, 0.5);
    const table = this.add.text(0, y, t('loading.table'), style).setOrigin(0, 0.5);
    const lock = this.add.image(0, y, iconKey('lockCyan')).setVisible(false);
    const total =
      8 + 8 + kernel.width + 24 + slash.width + 24 + ICONS.lockCyan.width + 8 + table.width;
    let x = cx - total / 2;
    const dot = this.add.circle(x + 4, y, 4, COLORS.safe);
    x += 16;
    kernel.setX(x);
    x += kernel.width + 24;
    slash.setX(x);
    x += slash.width + 24;
    lock.setPosition(x + ICONS.lockCyan.width / 2, y);
    x += ICONS.lockCyan.width + 8;
    table.setX(x);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      lock
        .setTexture(iconKey('lockCyan'))
        .setDisplaySize(ICONS.lockCyan.width, ICONS.lockCyan.height)
        .setVisible(true);
    });
    for (const item of [dot, kernel, slash, table, lock]) item.setAlpha(0.6);
  }

  private setProgress(value: number): void {
    const left = DISPLAY.width / 2 - BAR.width / 2 + 2;
    const inner = BAR.width - 4;
    const width = Math.max(BAR.height - 4, inner * value);
    const rect = { x: left, y: BAR.y + 2, width, height: BAR.height - 4 };
    this.barFill.clear();
    drawGlowRect(this.barFill, rect, COLORS.amber, 0.35, 6, rect.height / 2);
    drawPanel(this.barFill, rect, { fill: COLORS.amber, radius: rect.height / 2 });
    this.shine.setDisplaySize(width, 4);
    this.percent.setText(`${Math.round(value * 100)}%`);
  }
}
