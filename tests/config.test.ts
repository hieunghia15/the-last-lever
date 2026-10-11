import { describe, expect, it } from 'vitest';
import { BET_MOVES } from '../src/core/betting';
import {
  BETTING,
  BOT,
  DIFFICULTIES,
  DIFFICULTY_PERSONALITY,
  DISPLAY,
  LAYOUT,
  LEVERS,
  MATCH_MODES,
  PERSONALITIES,
  type Rect,
} from '../src/config';

describe('config', () => {
  it('always leaves at least one Safe and one Danger lever', () => {
    expect(LEVERS.minDanger).toBeGreaterThanOrEqual(1);
    expect(LEVERS.minDanger).toBeLessThanOrEqual(LEVERS.maxDanger);
    expect(LEVERS.maxDanger).toBeLessThanOrEqual(LEVERS.count - 1);
  });

  it('never asks a player to pull more levers than exist', () => {
    expect(BETTING.maxLevel).toBeLessThanOrEqual(LEVERS.count);
  });

  it('has a sane betting range', () => {
    expect(BETTING.startLevel).toBeGreaterThanOrEqual(1);
    expect(BETTING.startLevel).toBeLessThanOrEqual(BETTING.maxLevel);
    expect(BETTING.raiseStep).toBeGreaterThanOrEqual(1);
    expect(BETTING.minPullOnFold).toBeGreaterThanOrEqual(1);
    expect(BETTING.minPullOnFold).toBeLessThanOrEqual(BETTING.maxLevel);
    expect(BETTING.maxRaisesPerPlayerPerStreet).toBeGreaterThanOrEqual(1);
  });

  it('maps BEST OF 3/5/7 to 2/3/4 wins', () => {
    expect(MATCH_MODES.bo3.winsNeeded).toBe(2);
    expect(MATCH_MODES.bo5.winsNeeded).toBe(3);
    expect(MATCH_MODES.bo7.winsNeeded).toBe(4);
  });

  describe('bot', () => {
    it('thinks for a positive, ordered range of time', () => {
      expect(BOT.thinkMs.min).toBeGreaterThan(0);
      expect(BOT.thinkMs.min).toBeLessThanOrEqual(BOT.thinkMs.max);
      expect(BOT.talkMs).toBeGreaterThan(0);
    });

    it('keeps talk thresholds ordered and chances in [0, 1]', () => {
      expect(BOT.talkWeakAt).toBeLessThan(BOT.talkStrongAt);
      for (const value of [BOT.talkChance, BOT.talkWeakAt, BOT.talkStrongAt]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it.each(PERSONALITIES)('gives %s sane thresholds', (id) => {
      const p = BOT.personalities[id];
      expect(p.fear).toBeGreaterThan(0);
      expect(p.raiseAt).toBeLessThan(p.allInAt);
      for (const value of [p.raiseAt, p.allInAt, p.bluffRaise, p.bluffAllIn, p.lieRate]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('plays a different personality at each difficulty', () => {
      const picked = DIFFICULTIES.map((d) => DIFFICULTY_PERSONALITY[d]);
      expect(new Set(picked).size).toBe(DIFFICULTIES.length);
    });
  });

  describe('layout', () => {
    const inFrame = (r: Rect) =>
      r.x >= 0 && r.y >= 0 && r.x + r.width <= DISPLAY.width && r.y + r.height <= DISPLAY.height;

    it('keeps every zone inside the 1280×720 frame', () => {
      const { playerCards, card, leverPanel } = LAYOUT;
      const zones: Record<string, Rect> = {
        topBar: LAYOUT.topBar,
        banner: LAYOUT.banner,
        actionBar: LAYOUT.actionBar,
        felt: LAYOUT.felt,
        leverPanel,
        menuPanel: LAYOUT.menu.panel,
        howTo: LAYOUT.howTo,
        // Hole cards may dip below the bottom edge (they are cropped in the design), but
        // their faces must start on screen.
        playerCards: {
          x: playerCards.x - card.large.width / 2,
          y: playerCards.y - card.large.height / 2,
          width: playerCards.step + card.large.width,
          height: DISPLAY.height - (playerCards.y - card.large.height / 2),
        },
      };
      for (const [name, zone] of Object.entries(zones)) expect(inFrame(zone), name).toBe(true);
    });

    it('makes every tap target at least the minimum touch size', () => {
      const bar = LAYOUT.actionBar;
      const buttonWidth = (bar.width - bar.gap * (BET_MOVES.length - 1)) / BET_MOVES.length;
      expect(LAYOUT.button.height).toBeGreaterThanOrEqual(DISPLAY.minTouchSize);
      expect(bar.height).toBeGreaterThanOrEqual(LAYOUT.button.height);
      expect(buttonWidth).toBeGreaterThanOrEqual(DISPLAY.minTouchSize);
      expect(LAYOUT.leverPanel.lever.width).toBeGreaterThanOrEqual(DISPLAY.minTouchSize);
      expect(LAYOUT.leverPanel.lever.height).toBeGreaterThanOrEqual(DISPLAY.minTouchSize);
    });

    it('fits six levers in the panel and six stake cells on the table', () => {
      const { leverPanel, betMeter, felt } = LAYOUT;
      const levers =
        LEVERS.count * leverPanel.lever.width + (LEVERS.count - 1) * leverPanel.lever.gap;
      expect(levers).toBeLessThanOrEqual(leverPanel.width);
      const cells = BETTING.maxLevel * betMeter.cell + (BETTING.maxLevel - 1) * betMeter.gap;
      expect(cells).toBeLessThanOrEqual(felt.width);
    });

    it('keeps the action bar clear of the player cards', () => {
      const { playerCards, card, actionBar } = LAYOUT;
      const cardsRight = playerCards.x + playerCards.step + card.large.width / 2;
      expect(cardsRight).toBeLessThanOrEqual(actionBar.x);
    });
  });
});
