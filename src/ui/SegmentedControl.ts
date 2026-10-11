import Phaser from 'phaser';
import { COLORS, cssColor } from '../config';
import { drawGlowRect, drawPanel } from './decor';
import { textStyle } from './text';

export interface Segment<T> {
  value: T;
  label: string;
  /** Long labels (e.g. "Ngẫu nhiên") shrink a little, as in the design. */
  fontSize?: number;
}

const HEIGHT = 66;
const INSET = 7;
const RADIUS = 8;
const FONT = 12;

interface Option<T> {
  segment: Segment<T>;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

/** One-of-n picker from the menu. Each option's tap zone spans the full 66 px height. */
export class SegmentedControl<T> extends Phaser.GameObjects.Container {
  private readonly options: Option<T>[] = [];
  private readonly cellWidth: number;
  private selected: T;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    segments: readonly Segment<T>[],
    initial: T,
    gap: number,
    private readonly onChange: (value: T) => void,
  ) {
    super(scene, x, y);
    this.selected = initial;
    const frame = scene.add.graphics();
    drawPanel(
      frame,
      { x: 0, y: 0, width, height: HEIGHT },
      { fill: COLORS.ink, fillAlpha: 0.8, stroke: COLORS.woodMid, strokeWidth: 1 },
    );
    this.add(frame);

    const inner = width - INSET * 2;
    const cell = (inner - gap * (segments.length - 1)) / segments.length;
    segments.forEach((segment, i) => {
      const left = INSET + i * (cell + gap);
      const bg = scene.add.graphics();
      bg.setPosition(left, INSET);
      const label = scene.add
        .text(left + cell / 2, HEIGHT / 2, segment.label, textStyle(segment.fontSize ?? FONT))
        .setOrigin(0.5);
      const hit = scene.add
        .zone(left + cell / 2, HEIGHT / 2, cell + gap, HEIGHT)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.select(segment.value));
      this.add([bg, label, hit]);
      this.options.push({ segment, bg, label });
    });
    this.cellWidth = cell;
    this.refresh();
    scene.add.existing(this);
  }

  get value(): T {
    return this.selected;
  }

  private select(value: T): void {
    if (value === this.selected) return;
    this.selected = value;
    this.refresh();
    this.onChange(value);
  }

  private refresh(): void {
    const height = HEIGHT - INSET * 2;
    for (const { segment, bg, label } of this.options) {
      const on = segment.value === this.selected;
      bg.clear();
      if (on) {
        const rect = { x: 0, y: 0, width: this.cellWidth, height };
        drawGlowRect(bg, rect, 0x000000, 0.15, 4, RADIUS);
        drawPanel(bg, rect, { fill: COLORS.amber, radius: RADIUS });
      }
      label
        .setColor(cssColor(on ? COLORS.amberInk : COLORS.cream))
        .setFontStyle(on ? '700' : '400');
    }
  }
}

export const SEGMENT_HEIGHT = HEIGHT;
