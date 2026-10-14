import Phaser from 'phaser';
import { COLORS, LAYOUT, LEVER_FX } from '../config';
import type { Rng } from '../core/rng';
import { tweenAsync } from './anim';
import { addGlow } from './decor';
import { FX_DEPTH, type ElectricFx } from './ElectricFx';
import { ringBolts } from './lightningModel';
import { textStyle } from './text';

/**
 * The opponent's picture: a placeholder disc with the name's initial until Phase 5 swaps in
 * the drawn character. Always still (decision #8); only shock() moves it.
 */
export class OpponentPortrait extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Image;
  /** Coloured disc over the picture, flashed when the opponent is shocked. */
  private readonly overlay: Phaser.GameObjects.Arc;
  private readonly glowScale: number;

  constructor(scene: Phaser.Scene, name: string, accent: number) {
    const o = LAYOUT.opponent;
    super(scene, o.x, o.avatarY);
    this.glow = addGlow(scene, 0, 0, o.avatarRadius * 3, accent, 0.35);
    this.glowScale = this.glow.scale;
    const disc = scene.add.graphics();
    disc.fillStyle(COLORS.woodDark, 1).fillCircle(0, 0, o.avatarRadius);
    disc.lineStyle(2, accent, 1).strokeCircle(0, 0, o.avatarRadius - 1);
    const initial = scene.add
      .text(0, 0, name.charAt(0), textStyle(LAYOUT.fontSize.heading, COLORS.amberLight))
      .setOrigin(0.5);
    this.overlay = scene.add.circle(0, 0, o.avatarRadius, COLORS.shock).setAlpha(0);
    this.add([this.glow, disc, initial, this.overlay]);
    scene.add.existing(this);
  }

  /**
   * The opponent pulled a Danger lever: the picture judders, flashes between electric blue and
   * red, its halo flares, and arcs crawl round its rim. Resolves with everything back in place.
   */
  async shock(fx: ElectricFx, rng: Rng): Promise<void> {
    const { shakeMs, shakePx, flashes, flashMs, flashAlpha, bolts } = LEVER_FX.botHit;
    const home = { x: this.x, y: this.y };
    const radius = LAYOUT.opponent.avatarRadius;
    const judder = 40;
    const colors = [COLORS.shock, COLORS.danger];
    let flash = 0;
    this.overlay.setFillStyle(COLORS.shock).setAlpha(0);
    await Promise.all([
      tweenAsync(this.scene, {
        targets: this,
        x: { from: home.x - shakePx, to: home.x + shakePx },
        duration: judder,
        yoyo: true,
        repeat: Math.max(0, Math.round(shakeMs / (judder * 2)) - 1),
        ease: 'Sine.easeInOut',
      }),
      tweenAsync(this.scene, {
        targets: this.overlay,
        alpha: flashAlpha,
        duration: flashMs,
        yoyo: true,
        repeat: flashes - 1,
        onRepeat: () => this.overlay.setFillStyle(colors[++flash % colors.length]),
      }),
      tweenAsync(this.scene, {
        targets: this.glow,
        scale: this.glowScale * 1.6,
        duration: flashMs,
        yoyo: true,
        repeat: flashes - 1,
      }),
      fx.zap(ringBolts(home, radius * 1.1, bolts, rng), shakeMs, { depth: FX_DEPTH.screen }),
    ]);
    this.reset();
    this.setPosition(home.x, home.y);
  }

  /** Clears any leftover shock state, e.g. when a new round starts mid-effect. */
  reset(): void {
    this.scene.tweens.killTweensOf([this, this.overlay, this.glow]);
    const o = LAYOUT.opponent;
    this.setPosition(o.x, o.avatarY);
    this.overlay.setAlpha(0);
    this.glow.setScale(this.glowScale);
  }
}
