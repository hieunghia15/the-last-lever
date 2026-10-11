// Every balance and layout number lives here so playtesting only touches this file.

export const DISPLAY = {
  width: 1280,
  height: 720,
  backgroundColor: '#14100c',
  fontFamily: '"Saira Stencil", system-ui, sans-serif',
  minTouchSize: 64,
  /** Text is rasterised at this multiple so it stays sharp when Scale.FIT enlarges the canvas. */
  textResolution: 2,
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

// Palette from docs/stitch-ui-brief.md. Numbers for Graphics; use cssColor() for Text styles.
export const COLORS = {
  night: 0x14100c,
  woodDark: 0x2a1d14,
  woodMid: 0x4a3322,
  felt: 0x12312c,
  feltLight: 0x1d4a42,
  amber: 0xf2a93b,
  cream: 0xf3e6d0,
  muted: 0x8a7a66,
  safe: 0x3ddc84,
  danger: 0xff3b30,
  shock: 0x7df9ff,
  cardFace: 0xfbf7ef,
  cardRed: 0xc62828,
  cardBlack: 0x1b1b1b,
  cardBack: 0x6b1a1a,
  leverIdle: 0x5a5148,
} as const;

export const cssColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Table screen layout on the 1280×720 design frame, far to near (docs/stitch-ui-brief.md 3.4). */
export const LAYOUT = {
  disabledAlpha: 0.3,
  radius: 12,
  fontSize: { title: 64, heading: 32, button: 24, body: 20, caption: 16 },
  button: { height: 72, subtitleSize: 16 },

  topBar: { x: 0, y: 0, width: 1280, height: 56 },
  pip: { radius: 10, gap: 10 },

  opponent: {
    x: 640,
    headY: 116,
    headRadius: 46,
    body: { width: 200, height: 70, y: 168 },
    nameY: 250,
    cardsY: 290,
    cardGap: 8,
  },

  table: {
    topY: 300,
    bottomY: 548,
    topLeft: 330,
    topRight: 950,
    bottomLeft: 110,
    bottomRight: 1170,
  },
  board: { y: 384, gap: 12 },
  streetLabelY: 320,
  betMeter: { y: 482, cell: 40, gap: 8, labelGap: 16 },

  playerCards: { x: 40, y: 486, overlap: 20 },
  playerToast: { x: 175, y: 462 },
  opponentToast: { x: 790, y: 230 },
  banner: { x: 360, y: 556, width: 896, height: 52 },

  actionBar: { x: 360, y: 620, width: 896, height: 84, gap: 12 },

  card: {
    large: { width: 130, height: 180 },
    medium: { width: 80, height: 112 },
    small: { width: 56, height: 78 },
  },

  leverPanel: {
    x: 160,
    y: 140,
    width: 960,
    height: 440,
    lever: { width: 110, height: 240, gap: 30, y: 230 },
    titleY: 186,
    hintY: 530,
    dim: 0.7,
  },

  result: { width: 720, height: 360 },
} as const;

/** Animation and pacing in milliseconds. */
export const TIMING = {
  deal: 180,
  flip: 240,
  toast: 700,
  banner: 1100,
  meterPulse: 180,
  panelFade: 220,
  /** Pause before a lever shows its colour; Phase 4 turns this into the real suspense beat. */
  leverReveal: 500,
  afterLever: 400,
  /** Fixed for the random bot; Phase 3 replaces it with a 0.8–2.5 s range. */
  botThink: 900,
} as const;
