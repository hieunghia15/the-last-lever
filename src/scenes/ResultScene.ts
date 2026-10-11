import Phaser from 'phaser';
import { COLORS, DISPLAY, LAYOUT, TIMING } from '../config';
import { t } from '../i18n';
import { Button } from '../ui/Button';
import {
  addBackdrop,
  addGlow,
  addIcon,
  addLamp,
  drawGlowRect,
  drawPanel,
  drawPips,
  drawRivets,
} from '../ui/decor';
import { ICONS, type IconName } from '../ui/icons';
import { textStyle } from '../ui/text';
import { startMatch, type ResultSceneData } from './flow';

/** Spacing between the two players and the score, from the design's 48 px gap. */
const SIDE_OFFSET = 156;

/** Match result: headline, final score with both portraits, the difficulty record, and next steps. */
export class ResultScene extends Phaser.Scene {
  private result!: ResultSceneData;

  constructor() {
    super('ResultScene');
  }

  init(data: ResultSceneData): void {
    this.result = data;
  }

  create(): void {
    const r = this.result;
    const cx = DISPLAY.width / 2;
    const { width, height } = LAYOUT.result;
    const panel = { x: cx - width / 2, y: DISPLAY.height / 2 - height / 2, width, height };
    const accent = r.won ? COLORS.amber : COLORS.danger;

    addBackdrop(this, 'result');
    addLamp(this);
    const g = this.add.graphics();
    drawGlowRect(g, panel, 0x000000, 0.25, 24);
    drawPanel(g, panel, {
      fill: COLORS.woodDark,
      fillAlpha: 0.35,
      stroke: COLORS.woodMid,
      strokeWidth: 2,
    });
    drawRivets(g, panel, { size: 12 });

    const top = panel.y + 36 + 8;
    this.add
      .text(
        cx,
        top + 35,
        t(r.won ? 'match.won' : 'match.lost'),
        textStyle(LAYOUT.fontSize.title, accent, true, { letterSpacing: 3.2 }),
      )
      .setOrigin(0.5)
      .setShadow(
        0,
        0,
        r.won ? 'rgba(242, 169, 59, 0.5)' : 'rgba(255, 59, 48, 0.5)',
        10,
        false,
        true,
      );
    g.fillStyle(accent, 0.4).fillRoundedRect(cx - 48, top + 74, 96, 4, 2);

    const rowTop = top + 106;
    this.drawSide(cx - SIDE_OFFSET, rowTop, r.names[0], r.wins[0], 'person', true);
    this.drawSide(cx + SIDE_OFFSET, rowTop, r.names[1], r.wins[1], 'robot', false);
    this.add
      .text(
        cx,
        rowTop + 46,
        `${r.wins[0]} – ${r.wins[1]}`,
        textStyle(48, COLORS.cream, true, { letterSpacing: 4.8 }),
      )
      .setOrigin(0.5)
      .setShadow(0, 3, 'rgba(0, 0, 0, 0.12)', 2, false, true);
    this.add
      .text(
        cx,
        rowTop + 88,
        t('match.draws', { n: r.draws }),
        textStyle(LAYOUT.fontSize.label, COLORS.muted),
      )
      .setOrigin(0.5);

    this.drawRecord(cx, rowTop + 122 + 24 + 20);

    const buttonY = panel.y + panel.height - 36 - 8 - 36;
    new Button(
      this,
      cx - 8 - 160,
      buttonY,
      { width: 320, label: t('match.menu'), variant: 'dark', icon: 'home' },
      () => this.scene.start('MenuScene'),
    );
    new Button(
      this,
      cx + 8 + 158,
      buttonY,
      { width: 316, label: t('match.again'), variant: 'primary', icon: 'replay' },
      () => startMatch(this, r.mode, r.choice),
    );
    this.cameras.main.fadeIn(TIMING.panelFade);
  }

  /** Name, round portrait and one pip per round won. */
  private drawSide(
    x: number,
    top: number,
    name: string,
    wins: number,
    icon: IconName,
    me: boolean,
  ): void {
    this.add
      .text(
        x,
        top + 11,
        name.toUpperCase(),
        textStyle(LAYOUT.fontSize.label, COLORS.cream, false, { letterSpacing: 1.6 }),
      )
      .setOrigin(0.5);
    const cy = top + 26 + 32;
    if (me) addGlow(this, x, cy, 104, COLORS.amberLight, 0.35);
    const g = this.add.graphics();
    g.fillStyle(me ? COLORS.amberLight : COLORS.chip, me ? 0.2 : 1).fillCircle(x, cy, 32);
    g.lineStyle(2, me ? COLORS.amberLight : COLORS.rivet, 1).strokeCircle(x, cy, 31);
    addIcon(this, x, cy, icon);
    if (wins > 0) drawPips(g, x, cy + 32 + 12 + 10, wins, wins, { gap: 4, align: 'center' });
  }

  /** "Thành tích mức Vừa: 5 thắng / 3 thua", with the win count picked out in cream. */
  private drawRecord(cx: number, cy: number): void {
    const r = this.result;
    // Created first so the chip sits behind the text.
    const chip = this.add.graphics();
    const style = textStyle(LAYOUT.fontSize.label, COLORS.muted);
    const parts = [
      this.add.text(
        0,
        cy,
        `${t('match.record', { level: t(`difficulty.${r.difficulty}`) })} `,
        style,
      ),
      this.add.text(
        0,
        cy,
        t('match.recordWins', { n: r.record.wins }),
        textStyle(LAYOUT.fontSize.label, COLORS.cream),
      ),
      this.add.text(0, cy, ' / ', style),
      this.add.text(0, cy, t('match.recordLosses', { n: r.record.losses }), style),
    ];
    const iconW = ICONS.trend.width;
    const textW = parts.reduce((sum, part) => sum + part.width, 0);
    const width = 17 + iconW + 8 + textW + 17;
    drawPanel(
      chip,
      { x: cx - width / 2, y: cy - 20, width, height: 40 },
      {
        fill: COLORS.plate,
        fillAlpha: 0.6,
        stroke: COLORS.rivet,
        strokeAlpha: 0.3,
        strokeWidth: 1,
        radius: 8,
      },
    );
    let x = cx - width / 2 + 17;
    addIcon(this, x + iconW / 2, cy, 'trend');
    x += iconW + 8;
    for (const part of parts) {
      part.setOrigin(0, 0.5).setX(x);
      x += part.width;
    }
  }
}
