import Phaser from 'phaser';
import { COLORS, cssColor, DISPLAY, LAYOUT, LEVER_FX, LEVERS } from '../config';
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
import type { ElectricFx } from './ElectricFx';
import { ICONS, iconKey, type IconName } from './icons';
import type { Point } from './lightningModel';
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
 * The lever board: six levers in a riveted panel that rises over the darkened table. Tapping a
 * lever pulls its handle down; after a pause the lamp shows Safe, or Danger with sparks.
 */
export class LeverPanel extends Phaser.GameObjects.Container {
  private readonly levers: LeverSprite[] = [];
  /** The dimmer and lamp stay put while the board slides, so they live outside it. */
  private readonly shade: Phaser.GameObjects.Container;
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
    private readonly fx: ElectricFx,
  ) {
    super(scene, 0, 0);
    const p = LAYOUT.leverPanel;
    const panelRect = { x: p.x, y: p.y, width: p.width, height: p.height };

    // The backdrop is interactive so taps never fall through to the table underneath, the
    // home button included: nobody walks away mid-challenge (decision #19).
    const dim = addBackdrop(scene, 'lever').setInteractive();
    this.shade = scene.add
      .container(0, 0, [dim, addLamp(scene)])
      .setDepth(100)
      .setVisible(false);
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
    this.add(panel);

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

    // Just above the dimmer, below the speech bubble (110) and the bolts (ElectricFx).
    this.setDepth(101).setVisible(false);
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
    const { slide, dimMs } = LEVER_FX;
    this.shade.setAlpha(0).setVisible(true);
    this.setPosition(0, slide.offsetY).setAlpha(0).setVisible(true);
    await Promise.all([
      tweenAsync(this.scene, { targets: this.shade, alpha: 1, duration: dimMs }),
      tweenAsync(this.scene, {
        targets: this,
        y: 0,
        alpha: 1,
        duration: slide.ms,
        ease: slide.ease,
      }),
    ]);
  }

  async close(): Promise<void> {
    this.accepting = false;
    if (!this.visible) return;
    const { slide, dimMs } = LEVER_FX;
    await Promise.all([
      tweenAsync(this.scene, { targets: this.shade, alpha: 0, duration: dimMs }),
      tweenAsync(this.scene, {
        targets: this,
        y: slide.offsetY,
        alpha: 0,
        duration: slide.ms * 0.6,
        ease: 'Quad.easeIn',
      }),
    ]);
    this.setVisible(false).setPosition(0, 0);
    this.shade.setVisible(false);
  }

  /**
   * Pull, pause, reveal. The handle travels down and shivers while the lamp blinks amber; that
   * beat is the same for Safe and Danger, so nothing gives the result away. Only then does the
   * lamp light. Danger sparks and arcs keep going after this resolves.
   */
  async reveal(lever: number, danger: boolean): Promise<void> {
    const sprite = this.levers[lever];
    if (!sprite) return;
    const { pull, suspenseMs, tremble } = LEVER_FX;
    this.paint(lever, 'pulling');
    const blink = this.scene.tweens.add({
      targets: [sprite.lamp, sprite.lampGlow],
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: -1,
    });
    await tweenAsync(this.scene, {
      targets: sprite.handle,
      y: this.handleY(sprite, true),
      duration: pull.ms,
      ease: 'Quad.easeIn',
    });
    const home = sprite.handle.x;
    const shiver = this.scene.tweens.add({
      targets: sprite.handle,
      x: { from: home - tremble.px, to: home + tremble.px },
      duration: tremble.ms,
      yoyo: true,
      repeat: -1,
    });
    await wait(this.scene, suspenseMs);
    shiver.stop();
    blink.stop();
    sprite.handle.setX(home);
    sprite.lamp.setAlpha(1);
    sprite.lampGlow.setAlpha(0.8);
    this.paint(lever, danger ? 'danger' : 'safe');
    this.setCounter(this.levers.filter((l) => l.state === 'safe' || l.state === 'danger').length);
    this.scene.tweens.add({
      targets: sprite.status,
      scale: { from: 1.35, to: 1 },
      duration: 220,
      ease: 'Back.easeOut',
    });
    if (danger) this.shock(sprite);
    else this.flare(sprite);
  }

  /**
   * The bot's hand drifts over a few levers, nudging each as if about to pull, then settles on
   * the last one in `path`, which is the lever it pulls next.
   */
  async hesitate(path: readonly number[]): Promise<void> {
    const { hoverMs, nudgePx, settleMs } = LEVER_FX.hesitate;
    for (const [step, lever] of path.entries()) {
      const sprite = this.levers[lever];
      if (!sprite) continue;
      this.highlight(sprite, true);
      if (step === path.length - 1) {
        await wait(this.scene, settleMs);
        break;
      }
      const rest = sprite.handle.y;
      await tweenAsync(this.scene, {
        targets: sprite.handle,
        y: rest + nudgePx,
        duration: hoverMs / 2,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      sprite.handle.setY(rest);
      this.highlight(sprite, false);
    }
  }

  /** What the board shows right now, for working out the bot's hesitation. */
  shown(): LeverView[] {
    return this.levers.map((l) => (l.state === 'pulling' ? 'unknown' : l.state));
  }

  /** A lever's lamp on the 1280×720 frame, where full-screen bolts start. */
  leverPoint(lever: number): Point {
    const sprite = this.levers[lever];
    if (!sprite) return { x: DISPLAY.width / 2, y: DISPLAY.height / 2 };
    return { x: sprite.lamp.x + this.x, y: sprite.lamp.y + this.y };
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

  /** Safe: the green lamp blooms and settles. */
  private flare(sprite: LeverSprite): void {
    const scale = sprite.lampGlow.scale;
    this.scene.tweens.add({
      targets: sprite.lampGlow,
      scale: scale * 1.8,
      duration: 220,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => sprite.lampGlow.setScale(scale),
    });
  }

  /** Danger: sparks from the lamp, arcs down the handle, and the whole board jolts. */
  private shock(sprite: LeverSprite): void {
    const { lever } = LAYOUT.leverPanel;
    const lamp = { x: sprite.lamp.x + this.x, y: sprite.lamp.y + this.y };
    const knob = { x: sprite.handle.x + this.x, y: sprite.handle.y + sprite.knob.y + this.y };
    const left = lamp.x - lever.width / 2 + 8;
    const right = lamp.x + lever.width / 2 - 8;
    this.fx.burst(lamp, COLORS.danger);
    this.fx.burst(knob, COLORS.shock);
    void this.fx.zap(
      [
        { from: lamp, to: knob },
        { from: knob, to: { x: left, y: knob.y + 30 } },
        { from: knob, to: { x: right, y: knob.y + 50 } },
      ],
      LEVER_FX.bolt.ms,
    );
    const { px, ms, repeats } = LEVER_FX.jolt;
    this.scene.tweens.add({
      targets: this,
      x: { from: -px, to: px },
      duration: ms,
      yoyo: true,
      repeat: repeats,
      ease: 'Sine.easeInOut',
      onComplete: () => this.setX(0),
    });
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
    // Pulled, nudged or shivering, the handle stays inside its slot, so no clipping mask is needed.
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

  private highlight(sprite: LeverSprite, active: boolean): void {
    const { lever } = LAYOUT.leverPanel;
    this.drawCard(sprite, sprite.handle.x - lever.width / 2, lever.y, active);
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
    const { handle } = LAYOUT.leverPanel;
    this.highlight(sprite, state === 'pulling');

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
