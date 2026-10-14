// Every balance and layout number lives here so playtesting only touches this file.

export const DISPLAY = {
  width: 1280,
  height: 720,
  backgroundColor: '#14100c',
  fontFamily: '"Saira Stencil", system-ui, sans-serif',
  /** Card corners use a serif face like the design; system fonts, so nothing to preload. */
  cardFontFamily: 'Georgia, "Times New Roman", serif',
  monoFontFamily: '"Courier New", ui-monospace, monospace',
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

/** Monte Carlo win-rate estimate, shared by the bot and the hand panel. */
export const EQUITY = {
  trials: 300,
} as const;

/** The player's hand card on the table. */
export const HAND_HINT = {
  /** Win rate at or above which the hand is tagged strong, or fair. Below fair it is weak. */
  strongAt: 0.65,
  fairAt: 0.45,
  /** Above this many distinct ranks the improve hint counts cards instead of naming ranks. */
  maxOutRanks: 3,
} as const;

/** Opponent difficulty. All three share one character (decision #4); Phase 3 maps personalities. */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type DifficultyChoice = Difficulty | 'random';

/** Bot behaviour (decisions #5, #6, #9). Equity trials come from EQUITY.trials. */
export const BOT = {
  /** Thinking pause before every bot move, drawn uniformly; the table animates it. */
  thinkMs: { min: 800, max: 2500 },
  /** Share of betting turns on which the bot says something. */
  talkChance: 0.3,
  /** Equity at or above which the honest line is "strong", and below which it is "weak". */
  talkStrongAt: 0.6,
  talkWeakAt: 0.4,
  talkMs: 2000,
  /** Added to the fear factor when the opponent is one win away, and when the bot leads. */
  fearWhenOpponentOneAway: 0.2,
  fearWhenLeading: -0.1,
  /**
   * fear scales the risk of playing on; raiseAt / allInAt are equity thresholds; bluffRaise /
   * bluffAllIn are per-round chances to force a raise; lieRate is how often a line is reversed.
   * Fear is below the design document's 1.3 / 1.0 / 0.7: its formula weighs only the bot's own
   * lever risk, so those values folded far too often. Reckless raises a little later than the
   * document's 0.5 / 0.65 to keep its bluffs affordable (docs/balance.md).
   */
  personalities: {
    cautious: {
      fear: 0.9,
      raiseAt: 0.7,
      allInAt: 0.9,
      bluffRaise: 0,
      bluffAllIn: 0,
      lieRate: 0.1,
    },
    balanced: {
      fear: 0.75,
      raiseAt: 0.6,
      allInAt: 0.8,
      bluffRaise: 0,
      bluffAllIn: 0,
      lieRate: 0.2,
    },
    reckless: {
      fear: 0.6,
      raiseAt: 0.55,
      allInAt: 0.7,
      bluffRaise: 0.15,
      bluffAllIn: 0.05,
      lieRate: 0.35,
    },
  },
} as const;

export type PersonalityId = keyof typeof BOT.personalities;
export const PERSONALITIES = Object.keys(BOT.personalities) as PersonalityId[];

/** Which personality plays each difficulty; set from the balance report (docs/balance.md). */
export const DIFFICULTY_PERSONALITY: Record<Difficulty, PersonalityId> = {
  easy: 'cautious',
  medium: 'balanced',
  hard: 'reckless',
};

// Palette from docs/stitch-ui-brief.md and the Figma file. Numbers for Graphics; cssColor() for Text.
export const COLORS = {
  night: 0x14100c,
  ink: 0x18120b,
  bottomBar: 0x130d07,
  leverCard: 0x211b13,
  plate: 0x251f17,
  woodDark: 0x2a1d14,
  slate: 0x302921,
  chip: 0x3b342b,
  dotOff: 0x40382f,
  woodMid: 0x4a3322,
  rivet: 0x514535,
  felt: 0x12312c,
  feltLight: 0x1d4a42,
  amber: 0xf2a93b,
  amberBright: 0xffb956,
  amberLight: 0xffca85,
  peach: 0xffddb5,
  rose: 0xe3c0a8,
  amberInk: 0x664000,
  amberInkDeep: 0x452b00,
  cream: 0xf3e6d0,
  creamSoft: 0xeee0d4,
  sand: 0xd6c3af,
  mutedLight: 0x9e8e7c,
  muted: 0x8a7a66,
  safe: 0x3ddc84,
  danger: 0xff3b30,
  shock: 0x7df9ff,
  cardBack: 0xff3b30,
} as const;

export const cssColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Every difficulty gets its own name and accent colour on the same portrait. */
export const OPPONENTS: Record<Difficulty, { name: string; accent: number }> = {
  easy: { name: 'MIO', accent: COLORS.safe },
  medium: { name: 'KAITO', accent: COLORS.amber },
  hard: { name: 'RYU', accent: COLORS.danger },
};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Layout on the 1280×720 design frame, measured from the Figma file. */
export const LAYOUT = {
  disabledAlpha: 0.3,
  radius: 12,
  fontSize: { title: 64, heading: 32, button: 24, body: 20, label: 16, caption: 12 },
  button: { height: 72, subtitleSize: 11 },

  /** Hanging lamp shared by every screen. */
  lamp: { x: 640, rodHeight: 64, rodWidth: 4, bulbRadius: 12, cone: { width: 500, height: 350 } },

  topBar: { x: 0, y: 0, width: 1280, height: 56, margin: 32 },
  /** Home button in the top bar's right corner; the opponent's name moves left to make room. */
  menuButton: { width: 48, height: 40, gap: 16, radius: 10 },
  pip: { radius: 10, gap: 8 },

  opponent: {
    x: 640,
    avatarY: 117,
    avatarRadius: 45,
    plateY: 185.5,
    plateHeight: 31,
    cardsY: 234,
    cardGap: 8,
    card: { width: 36, height: 50 },
  },
  bubble: { right: 1200, y: 80, maxWidth: 280 },

  /** "BỘ BÀI": the player's best hand, its win rate and what could improve it. */
  handPanel: {
    x: 24,
    y: 262,
    width: 150,
    pad: 10,
    gap: 7,
    rankBox: 50,
    cell: { height: 26, gap: 4 },
    meter: 4,
    drawBox: 50,
    font: { title: 11, badge: 10, rank: 14, small: 10, cell: 11, kicker: 9 },
  },

  felt: { x: 190, y: 336.5, width: 900, height: 207, rim: 4, radius: 16 },
  board: { y: 399, step: 72, tilt: [-3, -1, 1, 2, 3] },
  betMeter: { y: 477.5, cell: 40, gap: 6, labelGap: 16 },
  streetLabelY: 514.5,

  bottomBar: { y: 580, height: 140 },
  playerCards: { x: 87, y: 628, step: 78, tilt: 6 },
  playerToast: { x: 200, y: 548 },
  opponentToast: { x: 780, y: 234 },
  banner: { x: 320, y: 278, width: 640, height: 44 },

  actionBar: { x: 398, y: 614.5, width: 850, height: 72, gap: 16 },

  /** Card faces: corner index, the big centre suit, and (large only) a small suit top-right. */
  card: {
    large: { width: 110, height: 150, radius: 12, pad: 14, corner: 20, pip: 40, suit: 14 },
    medium: { width: 60, height: 85, radius: 8, pad: 9, corner: 14, pip: 24, suit: 0 },
    small: { width: 36, height: 50, radius: 4, pad: 4, corner: 10, pip: 16, suit: 0 },
  },

  leverPanel: {
    x: 160,
    y: 140,
    width: 960,
    height: 440,
    lever: { width: 135, height: 282, gap: 16, y: 226 },
    slot: { width: 80, height: 176, top: 40 },
    handle: { width: 48, height: 112, travel: 46 },
    titleY: 185,
    hintY: 541,
    dim: 0.9,
  },

  menu: {
    left: { x: 80, titleY: 167, taglineY: 245 },
    rig: { x: 80, y: 316, width: 529, height: 236 },
    panel: { x: 740, y: 124, width: 460, height: 473, padding: 36 },
  },

  howTo: { x: 160, y: 80, width: 960, height: 560, padding: 36 },

  result: { width: 720, height: 480 },

  confirm: { width: 560, height: 280, padding: 36, buttonWidth: 220, dim: 0.75 },

  rankings: { x: 48, top: 24, width: 1184, rowHeight: 62, rowGap: 8, colGap: 24, gridY: 104 },
  /** The 52-card tab: suit filter chips, then one row of thirteen cards per suit. */
  deck: { chipsY: 122, chipHeight: 30, rowsTop: 152, rowStep: 100, cardsX: 218, cardStep: 78 },
} as const;

/** Animation and pacing in milliseconds. */
export const TIMING = {
  deal: 180,
  flip: 240,
  toast: 700,
  banner: 1100,
  /** Extra time a banner stays readable after play moves on, before it fades away. */
  bannerHold: 1500,
  meterPulse: 180,
  panelFade: 220,
  /** Pause before a lever shows its colour; Phase 4 turns this into the real suspense beat. */
  leverReveal: 500,
  afterLever: 800,
  /** Shortest time the loading screen stays up, so it never just flashes. */
  bootMin: 600,
  leverPull: 260,
  pageTurn: 160,
} as const;
