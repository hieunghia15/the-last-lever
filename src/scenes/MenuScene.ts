import Phaser from 'phaser';
import {
  COLORS,
  DIFFICULTIES,
  LAYOUT,
  MATCH_MODES,
  TIMING,
  type DifficultyChoice,
  type MatchMode,
} from '../config';
import { getLocale, t } from '../i18n';
import { applyLocale } from '../locale';
import { Button } from '../ui/Button';
import { addBackdrop, addGlow, addLamp, drawGlowRect, drawPanel, drawRivets } from '../ui/decor';
import type { IconName } from '../ui/icons';
import { SEGMENT_HEIGHT, SegmentedControl } from '../ui/SegmentedControl';
import { textStyle } from '../ui/text';
import { bestOf, getMenuChoice, setMenuChoice, startMatch } from './flow';

const LEVER_COUNT = 6;
/** The rig illustration lights the third lever, as in the design. */
const LIT_LEVER = 2;

/** Main menu: title and a decorative lever rig on the left, the match setup panel on the right. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    addBackdrop(this, 'menu');
    addLamp(this);
    this.drawTitle();
    this.drawRig();
    this.drawPanel();
    this.cameras.main.fadeIn(TIMING.panelFade);
  }

  private drawTitle(): void {
    const { x, titleY, taglineY } = LAYOUT.menu.left;
    this.add
      .text(
        x,
        titleY + 35,
        t('game.title').toUpperCase(),
        textStyle(LAYOUT.fontSize.title, COLORS.cream, true, { letterSpacing: 1.6 }),
      )
      .setOrigin(0, 0.5)
      .setShadow(0, 4, 'rgba(242, 169, 59, 0.3)', 10, false, true);
    this.add
      .text(
        x,
        taglineY + 11,
        t('menu.tagline'),
        textStyle(LAYOUT.fontSize.label, COLORS.muted, false, { letterSpacing: 0.8 }),
      )
      .setOrigin(0, 0.5);
  }

  /** A row of six small levers, one lit red: decoration that previews the challenge. */
  private drawRig(): void {
    const r = LAYOUT.menu.rig;
    const g = this.add.graphics();
    drawGlowRect(g, r, 0x000000, 0.2, 16);
    drawPanel(g, r, {
      fill: COLORS.woodDark,
      fillAlpha: 0.6,
      stroke: COLORS.woodMid,
      strokeAlpha: 0.4,
      strokeWidth: 1,
    });

    const headerY = r.y + 25 + 11;
    g.fillStyle(COLORS.danger, 1);
    g.fillCircle(r.x + 33 + 4, headerY, 4);
    this.add
      .text(
        r.x + 33 + 16,
        headerY,
        t('menu.rigStatus').toUpperCase(),
        textStyle(LAYOUT.fontSize.label, COLORS.muted),
      )
      .setOrigin(0, 0.5);

    const inner = { x: r.x + 25, width: r.width - 50 };
    const gap = 12;
    const column = (inner.width - gap * (LEVER_COUNT - 1)) / LEVER_COUNT;
    const top = r.y + 63 + 16;
    for (let i = 0; i < LEVER_COUNT; i++) {
      const cx = inner.x + column / 2 + i * (column + gap);
      const lit = i === LIT_LEVER;
      g.fillStyle(COLORS.woodMid, 1);
      g.fillRoundedRect(cx - 4, top + 24, 8, 64, 2);
      if (lit) {
        const lamp = addGlow(this, cx, top + 6, 40, COLORS.danger, 0.9);
        this.tweens.add({ targets: lamp, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
        this.add.circle(cx, top + 6, 6, COLORS.danger);
        addGlow(this, cx, top + 12, 36, COLORS.amber, 0.7);
        const knob = this.add.graphics();
        drawPanel(
          knob,
          { x: cx - 4, y: top, width: 8, height: 24 },
          { fill: COLORS.amber, stroke: COLORS.amberLight, strokeWidth: 1, radius: 4 },
        );
      } else {
        g.fillStyle(COLORS.rivet, 1);
        g.fillCircle(cx, top + 6, 6);
        drawPanel(
          g,
          { x: cx - 5, y: top + 24 - 9, width: 10, height: 26 },
          { fill: COLORS.woodDark, stroke: COLORS.rivet, strokeWidth: 1, radius: 5 },
        );
      }
      this.add
        .text(
          cx,
          top + 108,
          String(i + 1).padStart(2, '0'),
          textStyle(LAYOUT.fontSize.caption, lit ? COLORS.amberLight : COLORS.muted, lit),
        )
        .setOrigin(0.5);
    }
  }

  private drawPanel(): void {
    const p = LAYOUT.menu.panel;
    const rect = { x: p.x, y: p.y, width: p.width, height: p.height };
    const g = this.add.graphics();
    drawGlowRect(g, rect, 0x000000, 0.25, 24, 16);
    drawPanel(g, rect, {
      fill: COLORS.woodDark,
      fillAlpha: 0.45,
      stroke: COLORS.woodMid,
      strokeWidth: 2,
      radius: 16,
    });
    drawRivets(g, rect);

    const x = p.x + p.padding;
    const width = p.width - p.padding * 2;
    let y = p.y + p.padding;
    const choice = getMenuChoice(this);

    y = this.label(x, y, width, t('menu.format'), t('menu.formatTag'));
    const modes = Object.keys(MATCH_MODES) as MatchMode[];
    new SegmentedControl<MatchMode>(
      this,
      x,
      y,
      width,
      modes.map((mode) => ({ value: mode, label: t('menu.mode', { n: bestOf(mode) }) })),
      choice.mode,
      8,
      (mode) => setMenuChoice(this, { ...getMenuChoice(this), mode }),
    );
    y += SEGMENT_HEIGHT + 24;

    y = this.label(x, y, width, t('menu.opponent'), t('menu.opponentTag'));
    const choices: DifficultyChoice[] = [...DIFFICULTIES, 'random'];
    new SegmentedControl<DifficultyChoice>(
      this,
      x,
      y,
      width,
      choices.map((value) => ({
        value,
        label: t(`difficulty.${value}`),
        ...(value === 'random' ? { fontSize: 11 } : {}),
      })),
      choice.difficulty,
      6,
      (difficulty) => setMenuChoice(this, { ...getMenuChoice(this), difficulty }),
    );
    y += SEGMENT_HEIGHT + 32;

    new Button(
      this,
      x + width / 2,
      y + 36,
      {
        width,
        height: 72,
        label: t('menu.start'),
        variant: 'primary',
        icon: 'bolt',
        iconGap: 12,
      },
      () => {
        const { mode, difficulty } = getMenuChoice(this);
        startMatch(this, mode, difficulty);
      },
    );
    y += 72 + 16;

    const gap = 12;
    // Three buttons share the row, so the label is a point smaller than the design's two-button row.
    const small = { height: 64, variant: 'ghost' as const, fontSize: LAYOUT.fontSize.label - 1 };
    const secondary: { label: string; icon: IconName; onTap: () => void }[] = [
      { label: t('menu.howTo'), icon: 'help', onTap: () => this.scene.start('HowToScene') },
      { label: t('menu.cards'), icon: 'cards', onTap: () => this.scene.start('RankingsScene') },
      { label: t('menu.language'), icon: 'language', onTap: () => this.toggleLanguage() },
    ];
    const third = (width - gap * (secondary.length - 1)) / secondary.length;
    secondary.forEach((item, i) => {
      new Button(
        this,
        x + third / 2 + i * (third + gap),
        y + 32,
        { ...small, width: third, label: item.label, icon: item.icon },
        item.onTap,
      );
    });
  }

  /** "Thể thức ........ MATCH FORMAT" heading row; returns the y below it. */
  private label(x: number, y: number, width: number, text: string, tag: string): number {
    const cy = y + 11;
    this.add.text(x, cy, text, textStyle(LAYOUT.fontSize.label, COLORS.sand)).setOrigin(0, 0.5);
    this.add
      .text(x + width, cy, tag, textStyle(LAYOUT.fontSize.caption, COLORS.amberLight))
      .setOrigin(1, 0.5);
    return y + 22 + 8;
  }

  private toggleLanguage(): void {
    applyLocale(getLocale() === 'vi' ? 'en' : 'vi', { save: true });
    this.scene.restart();
  }
}
