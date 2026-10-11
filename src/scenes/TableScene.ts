import Phaser from 'phaser';
import { COLORS, DISPLAY, LAYOUT, type MatchMode } from '../config';
import type { PlayerView } from '../core/gameState';
import { t } from '../i18n';
import { MatchSession } from '../session/matchSession';
import { BetMeter } from '../ui/BetMeter';
import { CardSprite, drawCardSlot } from '../ui/CardSprite';
import { ScoreBar } from '../ui/ScoreBar';
import { textStyle } from '../ui/text';

export interface TableSceneData {
  mode: MatchMode;
  seed: number;
}

const BOARD_SIZE = 5;

export class TableScene extends Phaser.Scene {
  private session!: MatchSession;
  private names!: [string, string];

  private scoreBar!: ScoreBar;
  private betMeter!: BetMeter;
  private streetLabel!: Phaser.GameObjects.Text;
  private botCards: CardSprite[] = [];
  private boardCards: CardSprite[] = [];
  private playerCards: CardSprite[] = [];

  constructor() {
    super('TableScene');
  }

  init(data: TableSceneData): void {
    this.session = new MatchSession({ mode: data.mode, seed: data.seed });
    this.names = [t('seat.you'), t('seat.bot')];
    this.botCards = [];
    this.boardCards = [];
    this.playerCards = [];
  }

  create(): void {
    this.drawRoom();
    this.drawTable();
    this.drawOpponent();
    this.drawPlayerCards();
    this.scoreBar = new ScoreBar(this, this.session.view.winsNeeded, this.names);

    this.session.deal();
    this.render(this.session.view);
  }

  /** Redraws the whole table from the human's view, so pictures never drift from the state. */
  private render(view: PlayerView): void {
    this.scoreBar.setScore(view.wins, view.draws);
    this.betMeter.setLevel(view.betting?.level ?? 0);
    this.streetLabel.setText(view.betting ? t(`street.${view.betting.street}`) : '');

    const dealt = view.hole.length > 0;
    this.playerCards.forEach((sprite, i) => {
      const card = view.hole[i];
      sprite.setVisible(card !== undefined);
      if (card !== undefined) sprite.showFace(card);
    });
    this.botCards.forEach((sprite, i) => {
      sprite.setVisible(dealt);
      const card = view.showdown?.opponentHole[i];
      if (card === undefined) sprite.showBack();
      else sprite.showFace(card);
    });
    this.boardCards.forEach((sprite, i) => {
      const card = view.board[i];
      sprite.setVisible(card !== undefined);
      if (card !== undefined) sprite.showFace(card);
    });
  }

  private drawRoom(): void {
    this.cameras.main.setBackgroundColor(COLORS.night);
    // A warm pool of lamp light over the table; the real tavern art arrives in Phase 5.
    const glow = this.add.graphics();
    for (let i = 6; i >= 1; i--) {
      glow.fillStyle(COLORS.amber, 0.025);
      glow.fillEllipse(DISPLAY.width / 2, 300, 220 * i, 110 * i);
    }
  }

  private drawOpponent(): void {
    const o = LAYOUT.opponent;
    const g = this.add.graphics();
    g.fillStyle(COLORS.woodMid, 1);
    g.fillRoundedRect(o.x - o.body.width / 2, o.body.y, o.body.width, o.body.height, 24);
    g.fillStyle(COLORS.muted, 1);
    g.fillCircle(o.x, o.headY, o.headRadius);

    this.add
      .text(
        o.x,
        o.nameY,
        this.names[1].toUpperCase(),
        textStyle(LAYOUT.fontSize.body, COLORS.cream, true),
      )
      .setOrigin(0.5);

    const { width } = LAYOUT.card.small;
    for (const dx of [-1, 1]) {
      const card = new CardSprite(this, o.x + dx * (width / 2 + o.cardGap / 2), o.cardsY, 'small');
      this.botCards.push(card.setVisible(false));
    }
  }

  private drawTable(): void {
    const tb = LAYOUT.table;
    const g = this.add.graphics();
    const corners = [
      new Phaser.Math.Vector2(tb.topLeft, tb.topY),
      new Phaser.Math.Vector2(tb.topRight, tb.topY),
      new Phaser.Math.Vector2(tb.bottomRight, tb.bottomY),
      new Phaser.Math.Vector2(tb.bottomLeft, tb.bottomY),
    ];
    g.fillStyle(COLORS.felt, 1);
    g.fillPoints(corners, true);
    g.lineStyle(10, COLORS.woodMid, 1);
    g.strokePoints(corners, true);

    const { width } = LAYOUT.card.medium;
    const { y, gap } = LAYOUT.board;
    const left = DISPLAY.width / 2 - (BOARD_SIZE * width + (BOARD_SIZE - 1) * gap) / 2 + width / 2;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = left + i * (width + gap);
      drawCardSlot(g, x, y, 'medium');
      this.boardCards.push(new CardSprite(this, x, y, 'medium').setVisible(false));
    }

    this.streetLabel = this.add
      .text(
        DISPLAY.width / 2,
        LAYOUT.streetLabelY,
        '',
        textStyle(LAYOUT.fontSize.caption, COLORS.muted),
      )
      .setOrigin(0.5);
    this.betMeter = new BetMeter(this, DISPLAY.width / 2 + 50, LAYOUT.betMeter.y);
  }

  private drawPlayerCards(): void {
    const { x, y, overlap } = LAYOUT.playerCards;
    const { width, height } = LAYOUT.card.large;
    [-4, 4].forEach((angle, i) => {
      const card = new CardSprite(
        this,
        x + width / 2 + i * (width - overlap),
        y + height / 2,
        'large',
      );
      this.playerCards.push(card.setAngle(angle).setVisible(false));
    });
  }
}
