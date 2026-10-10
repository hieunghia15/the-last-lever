// Every balance and layout number lives here so playtesting only touches this file.

export const DISPLAY = {
  width: 1280,
  height: 720,
  backgroundColor: '#14100c',
  fontFamily: '"Saira Stencil", system-ui, sans-serif',
  minTouchSize: 64,
} as const;

export const MATCH_MODES = {
  bo3: { winsNeeded: 2 },
  bo5: { winsNeeded: 3 },
  bo7: { winsNeeded: 4 },
} as const;

export type MatchMode = keyof typeof MATCH_MODES;

export const BETTING = {
  startLevel: 1,
  maxLevel: 6,
  raiseStep: 1,
  maxRaisesPerPlayerPerStreet: 1,
  minPullOnFold: 1,
} as const;

export const LEVERS = {
  count: 6,
  minDanger: 1,
  maxDanger: 5,
} as const;
