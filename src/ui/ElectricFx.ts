import Phaser from 'phaser';
import { COLORS, LEVER_FX } from '../config';
import type { Rng } from '../core/rng';
import { bolt, type Point, type Segment } from './lightningModel';
import { sparkTexture } from './textures';

/** Bolts on a lever sit just above the board (depth 100); full-screen hits go over everything. */
export const FX_DEPTH = { board: 105, screen: 130 } as const;

/**
 * Electric arcs and sparks for the lever challenge. Shapes come from the seeded display Rng,
 * so ?seed= replays them too, and everything runs on the scene clock.
 */
export class ElectricFx {
  /** Finishers of the bolts still on screen, so stop() can clear them at once. */
  private readonly live = new Set<() => void>();
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rng: Rng,
  ) {
    const s = LEVER_FX.sparks;
    this.sparks = scene.add
      .particles(0, 0, sparkTexture(scene), {
        emitting: false,
        speed: s.speed,
        angle: { min: 0, max: 360 },
        lifespan: s.lifespanMs,
        gravityY: s.gravity,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(FX_DEPTH.board);
  }

  /**
   * Crackling bolts along every segment for `ms`, redrawn every flickerMs with a new shape,
   * then faded out. Resolves once they are gone (or when stop() clears them).
   */
  zap(
    segments: readonly Segment[],
    ms: number,
    opts: { color?: number; depth?: number } = {},
  ): Promise<void> {
    const { flickerMs, fadeMs, width, glowWidth } = LEVER_FX.bolt;
    const color = opts.color ?? COLORS.shock;
    const g = this.scene.add
      .graphics()
      .setDepth(opts.depth ?? FX_DEPTH.board)
      .setBlendMode(Phaser.BlendModes.ADD);
    const draw = () => {
      g.clear();
      for (const { from, to } of segments) {
        bolt(from, to, this.rng, LEVER_FX.bolt).forEach((line, i) => {
          const scale = i === 0 ? 1 : 0.5;
          stroke(g, line, glowWidth * scale, color, 0.3);
          stroke(g, line, width * scale, 0xffffff, 0.95);
        });
      }
    };
    draw();

    return new Promise((resolve) => {
      const flicker = this.scene.time.addEvent({ delay: flickerMs, loop: true, callback: draw });
      const hold = this.scene.time.delayedCall(ms, () => {
        flicker.remove();
        this.scene.tweens.add({ targets: g, alpha: 0, duration: fadeMs, onComplete: finish });
      });
      const finish = () => {
        flicker.remove();
        hold.remove();
        this.scene.tweens.killTweensOf(g);
        g.destroy();
        this.live.delete(finish);
        resolve();
      };
      this.live.add(finish);
    });
  }

  /** A shower of sparks from one point. */
  burst(at: Point, color: number = COLORS.shock): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(LEVER_FX.sparks.count, at.x, at.y);
  }

  /** Clears every bolt and spark at once, e.g. when a round starts or the scene shuts down. */
  stop(): void {
    for (const finish of [...this.live]) finish();
    this.sparks.killAll();
  }
}

function stroke(
  g: Phaser.GameObjects.Graphics,
  line: readonly Point[],
  width: number,
  color: number,
  alpha: number,
): void {
  const [first, ...rest] = line;
  if (!first) return;
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(first.x, first.y);
  for (const p of rest) g.lineTo(p.x, p.y);
  g.strokePath();
}
