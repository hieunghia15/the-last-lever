/**
 * SVG icons exported from the Figma file, with their native size in design pixels.
 * They are rasterised at DISPLAY.textResolution so they stay sharp when Scale.FIT enlarges them.
 */
export const ICONS = {
  arrowBack: { file: 'arrow-back.svg', width: 16, height: 16 },
  bolt: { file: 'bolt.svg', width: 20, height: 25 },
  bulb: { file: 'bulb.svg', width: 15, height: 20 },
  /** Not in the Figma file: drawn to match the other menu icons for the Cards entry. */
  cards: { file: 'cards.svg', width: 17, height: 18 },
  bullet: { file: 'bullet.svg', width: 20, height: 24 },
  chevronLeft: { file: 'chevron-left.svg', width: 8.63, height: 14 },
  chevronRight: { file: 'chevron-right.svg', width: 8.63, height: 14 },
  close: { file: 'close.svg', width: 18.67, height: 18.67 },
  crown: { file: 'crown.svg', width: 9.33, height: 12.25 },
  danger: { file: 'danger.svg', width: 22, height: 23 },
  gamepad: { file: 'gamepad.svg', width: 26.63, height: 18.67 },
  help: { file: 'help.svg', width: 16.67, height: 16.67 },
  home: { file: 'home.svg', width: 16, height: 18 },
  language: { file: 'language.svg', width: 18.42, height: 16.67 },
  leverToggle: { file: 'lever-toggle.svg', width: 44, height: 24 },
  lock: { file: 'lock.svg', width: 9.33, height: 12.25 },
  lockCyan: { file: 'lock-cyan.svg', width: 9.33, height: 12.25 },
  person: { file: 'person.svg', width: 20, height: 20 },
  power: { file: 'power.svg', width: 11.67, height: 11.67 },
  pulling: { file: 'pulling.svg', width: 11.73, height: 11.67 },
  replay: { file: 'replay.svg', width: 18, height: 21 },
  robot: { file: 'robot.svg', width: 27.5, height: 23.75 },
  spark: { file: 'spark.svg', width: 12, height: 13.33 },
  tap: { file: 'tap.svg', width: 11.55, height: 14 },
  trend: { file: 'trend.svg', width: 16.5, height: 12.75 },
  verified: { file: 'verified.svg', width: 22, height: 25 },
  warning: { file: 'warning.svg', width: 22, height: 19 },
} as const;

export type IconName = keyof typeof ICONS;

export const iconKey = (name: IconName): string => `icon-${name}`;
