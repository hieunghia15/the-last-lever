import type Phaser from 'phaser';
import { COLORS, cssColor, DISPLAY } from '../config';

export function textStyle(
  size: number,
  color: number = COLORS.cream,
  bold = false,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: DISPLAY.fontFamily,
    fontSize: `${size}px`,
    fontStyle: bold ? '700' : '400',
    color: cssColor(color),
    resolution: DISPLAY.textResolution,
  };
}
