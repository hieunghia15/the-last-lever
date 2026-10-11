import Phaser from 'phaser';
import { COLORS, DISPLAY, LAYOUT, type Rect } from '../config';
import { ICONS, iconKey, type IconName } from './icons';
import { backdropTexture, glowTexture, lampConeTexture, type Backdrop } from './textures';

/** Shared drawing helpers for the Figma look: panels, rivets, glows, the hanging lamp. */

export interface PanelStyle {
  fill?: number;
  fillAlpha?: number;
  stroke?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  radius?: number;
}

/** Rounded box whose border sits inside the rect, like CSS `box-sizing: border-box`. */
export function drawPanel(g: Phaser.GameObjects.Graphics, rect: Rect, style: PanelStyle): void {
  const { x, y, width, height } = rect;
  const radius = style.radius ?? LAYOUT.radius;
  if (style.fill !== undefined) {
    g.fillStyle(style.fill, style.fillAlpha ?? 1);
    g.fillRoundedRect(x, y, width, height, radius);
  }
  const line = style.strokeWidth ?? 0;
  if (line > 0 && style.stroke !== undefined) {
    g.lineStyle(line, style.stroke, style.strokeAlpha ?? 1);
    g.strokeRoundedRect(
      x + line / 2,
      y + line / 2,
      width - line,
      height - line,
      Math.max(0, radius - line / 2),
    );
  }
}

/** Four corner rivets, the industrial detail on every big panel. */
export function drawRivets(
  g: Phaser.GameObjects.Graphics,
  rect: Rect,
  opts: { inset?: number; size?: number; alpha?: number } = {},
): void {
  const inset = opts.inset ?? 12;
  const r = (opts.size ?? 8) / 2;
  g.fillStyle(COLORS.rivet, opts.alpha ?? 0.6);
  for (const x of [rect.x + inset + r, rect.x + rect.width - inset - r]) {
    for (const y of [rect.y + inset + r, rect.y + rect.height - inset - r]) g.fillCircle(x, y, r);
  }
}

/**
 * CSS box-shadow glow approximated by fading rings around the box. Only the outside is
 * painted, so translucent buttons are not tinted. Cheap enough for phones, unlike a blur filter.
 */
export function drawGlowRect(
  g: Phaser.GameObjects.Graphics,
  rect: Rect,
  color: number,
  alpha: number,
  spread: number,
  radius: number = LAYOUT.radius,
): void {
  const steps = 6;
  const band = spread / steps;
  for (let i = 0; i < steps; i++) {
    const grow = band * (i + 0.5);
    g.lineStyle(band + 0.5, color, alpha * (1 - i / steps));
    g.strokeRoundedRect(
      rect.x - grow,
      rect.y - grow,
      rect.width + grow * 2,
      rect.height + grow * 2,
      radius + grow,
    );
  }
}

/** Soft round glow centred on (x, y); `size` is the full diameter of the halo. */
export function addGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha = 1,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, glowTexture(scene))
    .setDisplaySize(size, size)
    .setTint(color)
    .setAlpha(alpha);
}

export function addIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: IconName,
): Phaser.GameObjects.Image {
  const { width, height } = ICONS[name];
  return scene.add.image(x, y, iconKey(name)).setDisplaySize(width, height);
}

export function addBackdrop(scene: Phaser.Scene, kind: Backdrop): Phaser.GameObjects.Image {
  scene.cameras.main.setBackgroundColor(COLORS.night);
  return scene.add
    .image(0, 0, backdropTexture(scene, kind))
    .setOrigin(0)
    .setDisplaySize(DISPLAY.width, DISPLAY.height);
}

/** The amber lamp hanging over every screen: wire, bulb with halo, and its cone of light. */
export function addLamp(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const { x, rodHeight, rodWidth, bulbRadius, cone } = LAYOUT.lamp;
  const bulbY = rodHeight + bulbRadius;
  const pad = 40;
  const light = scene.add
    .image(x - cone.width / 2 - pad, bulbY - 4 - pad, lampConeTexture(scene))
    .setOrigin(0)
    .setDisplaySize(cone.width + pad * 2, cone.height + pad * 2);
  const rod = scene.add.rectangle(x, 0, rodWidth, rodHeight, COLORS.rivet).setOrigin(0.5, 0);
  const halo = addGlow(scene, x, bulbY, bulbRadius * 7, COLORS.amber, 0.9);
  const bulb = scene.add.circle(x, bulbY, bulbRadius, COLORS.amber);
  return scene.add.container(0, 0, [light, rod, halo, bulb]);
}

/** A row of small round score pips, filled from the left. */
export function drawPips(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  total: number,
  filled: number,
  opts: { size?: number; gap?: number; align?: 'left' | 'right' | 'center' } = {},
): void {
  const size = opts.size ?? LAYOUT.pip.radius * 2;
  const gap = opts.gap ?? LAYOUT.pip.gap;
  const width = total * size + (total - 1) * gap;
  const start = opts.align === 'right' ? x - width : opts.align === 'center' ? x - width / 2 : x;
  for (let i = 0; i < total; i++) {
    const cx = start + i * (size + gap) + size / 2;
    if (i < filled) {
      g.fillStyle(COLORS.amber, 1);
      g.fillCircle(cx, y, size / 2);
    } else {
      g.lineStyle(2, COLORS.mutedLight, 1);
      g.strokeCircle(cx, y, size / 2 - 1);
    }
  }
}
