import Phaser from 'phaser';
import { COLORS, cssColor, DISPLAY, LAYOUT, LEVERS, TIMING } from '../config';
import type { LeverView } from '../core/gameState';
import { t } from '../i18n';
import { tweenAsync, wait } from './anim';
import {
  addBackdrop,
  addGlow,
  addIcon,
  addLamp,
  drawGlowRect,
  drawPanel,
  drawRivets,
} from './decor';
import { ICONS, iconKey, type IconName } from './icons';
import { textStyle } from './text';
import { leverHandleTexture } from './textures';

type LeverState = LeverView | 'pulling';

interface LeverSprite {
  card: Phaser.GameObjects.Graphics;
  lamp: Phaser.GameObjects.Arc;
  lampGlow: Phaser.GameObjects.Image;
  handle: Phaser.GameObjects.Container;
  grip: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Rectangle;
  knob: Phaser.GameObjects.Arc;
  knobIcon: Phaser.GameObjects.Image;
  status: Phaser.GameObjects.Text;
  slotTop: number;
  state: LeverState;
}

const LAMP_COLOR: Record<LeverState, number> = {
  unknown: COLORS.ink,
  pulling: COLORS.amber,
  safe: COLORS.safe,
  danger: COLORS.danger,
};

const KNOB_ICON: Record<LeverState, IconName> = {
  unknown: 'power',
  pulling: 'pulling',
  safe: 'lock',
  danger: 'spark',
};

/**
 * The lever board: six levers in a riveted panel over the darkened table. Tapping a lever
 * pulls its handle down; the lamp then shows Safe or Danger. Phase 4 adds the electric effects.
 */
export class LeverPanel extends Phaser.GameObjects.Container {
  private readonly levers: LeverSprite[] = [];
  private readonly title: Phaser.GameObjects.Text;
  private readonly counterChip: Phaser.GameObjects.Graphics;
  private readonly counterDot: Phaser.GameObjects.Arc;
  private readonly counter: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly hintIcon: Phaser.GameObjects.Image;
  private pulls = 0;
  private accepting = false;

  constructor(
    scene: Phaser.Scene,
    private readonly onPull: (lever: number) => void,
  ) {
    super(scene, 0, 0);
    const p = LAYOUT.leverPanel;
    const panelRect = { x: p.x, y: p.y, width: p.width, height: p.height };

    // The backdrop is interactive so taps never fall through to the table underneath.
    const dim = addBackdrop(scene, 'lever').setInteractive();
    const lamp = addLamp(scene);
    const panel = scene.add.graphics();
    drawGlowRect(panel, panelRect, 0x000000, 0.25, 24, 16);
    drawPanel(panel, panelRect, {
      fill: COLORS.ink,
      fillAlpha: 0.92,
      stroke: COLORS.rivet,
      strokeWidth: 2,
      radius: 16,
    });
    drawRivets(panel, panelRect, { alpha: 1 });
    this.add([dim, lamp, panel]);

    const contentLeft = p.x + 2 + 24 + 8;
    const contentRight = p.x + p.width - 2 - 24 - 8;
    const warning = addIcon(scene, contentLeft + ICONS.warning.width / 2, p.titleY, 'warning');
    this.title = scene.add
      .text(
        contentLeft + ICONS.warning.width + 12,
        p.titleY,
        '',
        textStyle(LAYOUT.fontSize.heading, COLORS.cream, true, { letterSpacing: 1.6 }),
      )
      .setOrigin(0, 0.5);
    this.counterChip = scene.add.graphics();
    this.counterDot = scene.add.circle(0, p.titleY, 5, COLORS.amber);
    this.counter = scene.add
      .text(contentRight - 17, p.titleY, '', textStyle(LAYOUT.fontSize.label, COLORS.cream))
      .setOrigin(1, 0.5);
    this.hintIcon = addIcon(scene, 0, p.hintY, 'tap');
    this.hint = scene.add
      .text(
        DISPLAY.width / 2,
        p.hintY,
        '',
        textStyle(LAYOUT.fontSize.label, COLORS.muted, false, { letterSpacing: 0.4 }),
      )
      .setOrigin(0.5);
    this.add([warning, this.title, this.counterChip, this.counterDot, this.counter]);
    this.add([this.hintIcon, this.hint]);

    const { width, gap, y } = p.lever;
    const left = DISPLAY.width / 2 - (LEVERS.count * width + (LEVERS.count - 1) * gap) / 2;
    for (let i = 0; i < LEVERS.count; i++) {
      this.levers.push(this.buildLever(left + i * (width + gap), y, i));
    }

    this.setDepth(100).setVisible(false);
    scene.add.existing(this);
  }

  /** Shows the board for a new challenge; `mine` decides the hint and whether taps count. */
  async open(name: string, pulls: number, mine: boolean): Promise<void> {
    this.pulls = pulls;
    this.title.setText(t('lever.title', { name, n: pulls }).toUpperCase());
    this.hint.setText(mine ? t('lever.hint') : t('lever.botChoosing', { name }));
    this.hintIcon.setVisible(mine);
    if (mine) {
      const total = ICONS.tap.width + 8 + this.hint.width;
      this.hintIcon.setX(DISPLAY.width / 2 - total / 2 + ICONS.tap.width / 2);
      this.hint.setX(DISPLAY.width / 2 + (ICONS.tap.width + 8) / 2);
    } else {
      this.hint.setX(DISPLAY.width / 2);
    }
    this.levers.forEach((_, i) => this.paint(i, 'unknown'));
    this.setCounter(0);
    this.setAlpha(0).setVisible(true);
    await tweenAsync(this.scene, { targets: this, alpha: 1, duration: TIMING.panelFade });
  }

  async close(): Promise<void> {
    this.accepting = false;
    if (!this.visible) return;
    await tweenAsync(this.scene, { targets: this, alpha: 0, duration: TIMING.panelFade });
    this.setVisible(false);
  }

  /** The handle travels down while the lamp blinks amber, then the lamp shows the result. */
  async reveal(lever: number, danger: boolean): Promise<void> {
    const sprite = this.levers[lever];
    if (!sprite) return;
    this.paint(lever, 'pulling');
    const blink = this.scene.tweens.add({
      targets: [sprite.lamp, sprite.lampGlow],
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: -1,
    });
    const pulled = this.handleY(sprite, true);
    await tweenAsync(this.scene, {
      targets: sprite.handle,
      y: (sprite.handle.y + pulled) / 2,
      angle: 6,
      duration: TIMING.leverPull,
      ease: 'Quad.easeIn',
    });
    await wait(this.scene, TIMING.leverReveal);
    blink.stop();
    sprite.lamp.setAlpha(1);
    sprite.lampGlow.setAlpha(0.8);
    this.paint(lever, danger ? 'danger' : 'safe');
    this.setCounter(this.levers.filter((l) => l.state === 'safe' || l.state === 'danger').length);
    await wait(this.scene, TIMING.afterLever);
  }

  /** Brings every lever in line with the view (used when re-rendering from state). */
  sync(levers: readonly LeverView[]): void {
    levers.forEach((state, i) => this.paint(i, state));
    this.setCounter(levers.filter((state) => state !== 'unknown').length);
  }

  setAccepting(accepting: boolean): void {
    this.accepting = accepting;
  }

  private tap(lever: number): void {
    if (!this.accepting || this.levers[lever]?.state !== 'unknown') return;
    this.accepting = false;
    this.onPull(lever);
  }

  private setCounter(pulled: number): void {
    const p = LAYOUT.leverPanel;
    this.counter.setText(t('lever.counter', { a: pulled, b: this.pulls }));
    const right = this.counter.x + 17;
    const width = 17 + 10 + 8 + this.counter.width + 17;
    const height = 36;
    this.counterDot.setX(right - width + 17 + 5);
    this.counterChip.clear();
    drawPanel(
      this.counterChip,
      { x: right - width, y: p.titleY - height / 2, width, height },
      { fill: COLORS.chip, stroke: COLORS.rivet, strokeWidth: 1, radius: height / 2 },
    );
  }

  private buildLever(x: number, y: number, index: number): LeverSprite {
    const scene = this.scene;
    const { lever, slot, handle } = LAYOUT.leverPanel;
    const cx = x + lever.width / 2;

    const card = scene.add.graphics();
    const lampY = y + 12 + 8;
    const lampGlow = addGlow(scene, cx, lampY, 52, COLORS.safe, 0.8);
    const lamp = scene.add.circle(cx, lampY, 8, COLORS.ink);

    const slotRect = {
      x: cx - slot.width / 2,
      y: y + slot.top,
      width: slot.width,
      height: slot.height,
    };
    const slotBg = scene.add.graphics();
    drawPanel(slotBg, slotRect, {
      fill: COLORS.chip,
      stroke: COLORS.rivet,
      strokeAlpha: 0.5,
      strokeWidth: 1,
      radius: 8,
    });

    const grip = scene.add.image(0, 0, leverHandleTexture(scene, false));
    grip.setDisplaySize(handle.width, handle.height);
    const bar = scene.add.rectangle(0, 0, 32, 12, COLORS.rivet);
    const knob = scene.add.circle(0, 0, 20, COLORS.amber);
    const knobIcon = scene.add.image(0, 0, iconKey('power'));
    // Even tilted mid-pull the handle stays inside its slot, so no clipping mask is needed.
    const handleBox = scene.add.container(cx, 0, [grip, bar, knob, knobIcon]);

    const status = scene.add
      .text(cx, y + 216 + 11 + 11, '', textStyle(LAYOUT.fontSize.label, COLORS.safe, true))
      .setOrigin(0.5);
    const number = scene.add
      .text(
        cx,
        y + 216 + 11 + 24 + 8,
        `#${index + 1}`,
        textStyle(LAYOUT.fontSize.caption, COLORS.muted),
      )
      .setOrigin(0.5);
    const hit = scene.add
      .zone(cx, y + lever.height / 2, lever.width, lever.height)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.tap(index));

    this.add([card, lampGlow, lamp, slotBg, handleBox, status, number, hit]);
    const sprite: LeverSprite = {
      card,
      lamp,
      lampGlow,
      handle: handleBox,
      grip,
      bar,
      knob,
      knobIcon,
      status,
      slotTop: slotRect.y,
      state: 'unknown',
    };
    this.drawCard(sprite, x, y, false);
    return sprite;
  }

  private drawCard(sprite: LeverSprite, x: number, y: number, active: boolean): void {
    const { lever } = LAYOUT.leverPanel;
    const rect = { x, y, width: lever.width, height: lever.height };
    sprite.card.clear();
    if (active) drawGlowRect(sprite.card, rect, COLORS.amber, 0.15, 8);
    drawPanel(sprite.card, rect, {
      fill: COLORS.leverCard,
      stroke: active ? COLORS.amber : COLORS.rivet,
      strokeAlpha: active ? 0.4 : 0.3,
      strokeWidth: 1,
    });
  }

  /** Centre y of the handle inside its slot, up (resting) or pulled down. */
  private handleY(sprite: LeverSprite, pulled: boolean): number {
    const { slot, handle } = LAYOUT.leverPanel;
    const inset = 9;
    return pulled
      ? sprite.slotTop + slot.height - inset - handle.height / 2
      : sprite.slotTop + inset + handle.height / 2;
  }

  private paint(lever: number, state: LeverState): void {
    const sprite = this.levers[lever];
    if (!sprite) return;
    sprite.state = state;
    const { lever: size, handle } = LAYOUT.leverPanel;
    const x = sprite.handle.x - size.width / 2;
    const y = LAYOUT.leverPanel.lever.y;
    this.drawCard(sprite, x, y, state === 'pulling');

    const lit = state !== 'unknown';
    sprite.lamp
      .setFillStyle(LAMP_COLOR[state])
      .setStrokeStyle(lit ? 0 : 1, COLORS.rivet, lit ? 0 : 0.5);
    sprite.lampGlow.setVisible(lit).setTint(LAMP_COLOR[state]);

    // Grip end of the handle: the knob sits at the top when resting and at the bottom once pulled.
    const down = state !== 'unknown';
    const half = handle.height / 2;
    sprite.grip.setTexture(leverHandleTexture(this.scene, down));
    sprite.grip.setDisplaySize(handle.width, handle.height);
    sprite.knob.setY(down ? half - 8 - 20 : -half + 8 + 20);
    sprite.bar.setY(down ? -half + 8 + 6 : half - 8 - 6);
    sprite.knob.setFillStyle(state === 'danger' ? COLORS.danger : COLORS.amber);
    const icon = KNOB_ICON[state];
    sprite.knobIcon
      .setTexture(iconKey(icon))
      .setDisplaySize(ICONS[icon].width, ICONS[icon].height)
      .setY(sprite.knob.y);
    if (state !== 'pulling') {
      sprite.handle.setAngle(0).setY(this.handleY(sprite, down));
    }

    const label =
      state === 'safe'
        ? t('lever.safe')
        : state === 'danger'
          ? t('lever.danger')
          : state === 'pulling'
            ? t('lever.pulling')
            : '';
    sprite.status.setText(label).setColor(cssColor(LAMP_COLOR[state]));
  }
}
