import type Phaser from 'phaser';
import { COLORS, cssColor, DISPLAY } from '../config';

// Phaser sizes a Text from this sample. The default lacks Vietnamese stacked accents, so
// capitals like Ấ or Ế would have their top mark clipped.
const METRICS_SAMPLE = '|MÉqgyẤẾỔỮĐ';

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
    testString: METRICS_SAMPLE,
  };
}
