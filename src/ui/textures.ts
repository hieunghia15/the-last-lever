import type Phaser from 'phaser';
import { COLORS, DISPLAY, LAYOUT } from '../config';

/**
 * Soft gradients from the Figma file (vignettes, glows, the felt, lever handles) painted once
 * with the Canvas 2D API and cached as textures. Graphics cannot draw radial gradients or blur.
 */

type Paint = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const rgba = (color: number, alpha: number): string =>
  `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${alpha})`;

function paintTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  scale: number,
  paint: Paint,
): string {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(
    key,
    Math.ceil(width * scale),
    Math.ceil(height * scale),
  );
  const ctx = texture?.getCanvas().getContext('2d');
  if (!texture || !ctx) return key;
  ctx.scale(scale, scale);
  paint(ctx, width, height);
  texture.refresh();
  return key;
}

/** Radial gradient stretched into an ellipse, like CSS `radial-gradient` on a wide box. */
function ellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  stops: [number, string][],
  area: { width: number; height: number },
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(-cx, -cy * (rx / ry), area.width, area.height * (rx / ry));
  ctx.restore();
}

/** Blurred blob; browsers without canvas filters (older Safari) just get a softer gradient. */
function blob(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  color: string,
  blur: number,
): void {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
    rect.width / 2,
    rect.height / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FRAME = { width: DISPLAY.width, height: DISPLAY.height };
// Full-screen gradients are smooth, so half resolution is plenty and saves GPU memory on phones.
const BACKDROP_SCALE = 0.5;

export type Backdrop = 'menu' | 'center' | 'result' | 'loading' | 'table' | 'lever' | 'rankings';

/** Full-screen background for a screen, drawn over the night colour. */
export function backdropTexture(scene: Phaser.Scene, kind: Backdrop): string {
  const { width, height } = FRAME;
  const amber = (a: number) => rgba(COLORS.amber, a);
  const night = (a: number) => rgba(COLORS.night, a);
  return paintTexture(scene, `bg-${kind}`, width, height, BACKDROP_SCALE, (ctx) => {
    // The lever overlay keeps a hint of the table showing through.
    ctx.fillStyle = night(kind === 'lever' ? LAYOUT.leverPanel.dim : 1);
    ctx.fillRect(0, 0, width, height);
    switch (kind) {
      case 'menu':
        ellipse(
          ctx,
          640,
          0,
          963,
          963,
          [
            [0, amber(0.1)],
            [0.5, amber(0)],
            [0.75, 'rgba(131, 93, 36, 0.5)'],
            [0.875, 'rgba(76, 54, 24, 0.75)'],
            [0.9375, 'rgba(48, 35, 18, 0.875)'],
            [1, night(1)],
          ],
          FRAME,
        );
        break;
      case 'center':
        ellipse(
          ctx,
          640,
          360,
          734,
          734,
          [
            [0, amber(0.08)],
            [0.7, amber(0)],
          ],
          FRAME,
        );
        break;
      case 'lever':
        ellipse(
          ctx,
          640,
          360,
          734,
          734,
          [
            [0, amber(0.08)],
            [0.7, amber(0)],
          ],
          FRAME,
        );
        blob(ctx, { x: 320, y: 180, width: 384, height: 384 }, amber(0.1), 32);
        blob(ctx, { x: 576, y: 156, width: 384, height: 384 }, rgba(COLORS.shock, 0.05), 32);
        break;
      case 'rankings':
        blob(ctx, { x: 240, y: 600, width: 800, height: 200 }, amber(0.1), 60);
        break;
      case 'result':
        ellipse(
          ctx,
          640,
          360,
          734,
          734,
          [
            [0, rgba(COLORS.plate, 0.4)],
            [0.5, night(1)],
          ],
          FRAME,
        );
        blob(ctx, { x: 290, y: 110, width: 700, height: 500 }, amber(0.1), 50);
        break;
      case 'loading': {
        const cone = ctx.createLinearGradient(0, 0, 0, 450);
        cone.addColorStop(0, amber(0.1));
        cone.addColorStop(0.5, amber(0.05));
        cone.addColorStop(1, amber(0));
        ctx.save();
        ctx.filter = 'blur(20px)';
        ctx.fillStyle = cone;
        ctx.fillRect(240, 0, 800, 450);
        ctx.restore();
        ellipse(
          ctx,
          640,
          360,
          905,
          509,
          [
            [0, night(0)],
            [0.5, night(0.9)],
            [1, night(1)],
          ],
          FRAME,
        );
        break;
      }
      case 'table': {
        // The upper half fades from a lit wall into the night, with lamp light on top.
        const wall = ctx.createLinearGradient(0, 56, 0, 316);
        wall.addColorStop(0, 'rgba(24, 18, 11, 0.6)');
        wall.addColorStop(0.5, night(1));
        ctx.fillStyle = wall;
        ctx.fillRect(0, 56, width, 260);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 56, width, 260);
        ctx.clip();
        ellipse(
          ctx,
          640,
          56,
          905,
          368,
          [
            [0, amber(0.1)],
            [0.5, amber(0)],
          ],
          FRAME,
        );
        ctx.restore();
        break;
      }
    }
  });
}

/** The warm cone of light under the hanging lamp. */
export function lampConeTexture(scene: Phaser.Scene): string {
  const { width, height } = LAYOUT.lamp.cone;
  const pad = 40;
  return paintTexture(scene, 'fx-lamp-cone', width + pad * 2, height + pad * 2, 0.5, (ctx) => {
    const gradient = ctx.createLinearGradient(0, pad, 0, pad + height);
    gradient.addColorStop(0, rgba(COLORS.amber, 0.2));
    gradient.addColorStop(1, rgba(COLORS.amber, 0));
    ctx.filter = 'blur(20px)';
    ctx.fillStyle = gradient;
    ctx.fillRect(pad, pad, width, height);
  });
}

/** White radial falloff; tint it for coloured glows behind lamps, pips and buttons. */
export function glowTexture(scene: Phaser.Scene): string {
  return paintTexture(scene, 'fx-glow', 128, 128, 1, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** Felt surface with its centre highlight and the deep inset shadow from the design. */
export function feltTexture(scene: Phaser.Scene): string {
  const { width, height, radius } = LAYOUT.felt;
  return paintTexture(scene, 'fx-felt', width, height, 1, (ctx) => {
    roundRectPath(ctx, 0, 0, width, height, radius);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(COLORS.felt, 1);
    ctx.fillRect(0, 0, width, height);
    ellipse(
      ctx,
      width / 2,
      height / 2,
      631,
      141,
      [
        [0, rgba(COLORS.feltLight, 0.4)],
        [0.5, rgba(COLORS.feltLight, 0)],
      ],
      { width, height },
    );
    // Inset shadow: a thick dark frame outside the clip casts its blur inwards.
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.lineWidth = 40;
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    roundRectPath(ctx, -20, -20, width + 40, height + 40, radius + 20);
    ctx.stroke();
    ctx.restore();
  });
}

/** Lever handle: dark at the hinge end, amber at the grip. */
export function leverHandleTexture(scene: Phaser.Scene, pulled: boolean): string {
  const { width, height } = LAYOUT.leverPanel.handle;
  const key = pulled ? 'fx-handle-down' : 'fx-handle-up';
  return paintTexture(scene, key, width, height, DISPLAY.textResolution, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, rgba(pulled ? COLORS.amber : COLORS.woodMid, 1));
    gradient.addColorStop(1, rgba(pulled ? COLORS.woodMid : COLORS.amber, 1));
    ctx.fillStyle = gradient;
    roundRectPath(ctx, 0, 0, width, height, 6);
    ctx.fill();
  });
}

/** Red-to-amber wash behind the all-in button. */
export function allInFillTexture(scene: Phaser.Scene, width: number, height: number): string {
  const key = `fx-allin-${Math.round(width)}x${Math.round(height)}`;
  return paintTexture(scene, key, width, height, 1, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, rgba(COLORS.danger, 0.2));
    gradient.addColorStop(1, rgba(COLORS.amber, 0.2));
    ctx.fillStyle = gradient;
    roundRectPath(ctx, 0, 0, width, height, LAYOUT.radius);
    ctx.fill();
  });
}

/** Faint highlight band across the loading bar fill. */
export function shineTexture(scene: Phaser.Scene): string {
  return paintTexture(scene, 'fx-shine', 64, 4, 1, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 64, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 4);
  });
}

/** Faint warm wash rising from the bottom of an illustration box. */
export function riseTexture(scene: Phaser.Scene): string {
  return paintTexture(scene, 'fx-rise', 4, 64, 1, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 64, 0, 0);
    gradient.addColorStop(0, rgba(COLORS.amberLight, 0.05));
    gradient.addColorStop(0.5, rgba(COLORS.amberLight, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 64);
  });
}
