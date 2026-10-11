import type Phaser from 'phaser';

/** A tween as a promise, so event playback can simply await each step. */
export function tweenAsync(
  scene: Phaser.Scene,
  config: Phaser.Types.Tweens.TweenBuilderConfig,
): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: () => resolve() });
  });
}

/** Waits on the scene clock (not setTimeout) so pausing or stopping the scene stops it too. */
export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => {
    scene.time.delayedCall(ms, resolve);
  });
}
