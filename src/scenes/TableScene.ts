import Phaser from 'phaser';
import { BETTING, COLORS, DISPLAY, LAYOUT, TIMING, type MatchMode } from '../config';
import { STREETS, type BetMove } from '../core/betting';
import type { Card } from '../core/cards';
import type { GameEvent, PlayerView, Seat } from '../core/gameState';
import { t } from '../i18n';
import { EventQueue } from '../session/eventQueue';
import { BOT, HUMAN, MatchSession } from '../session/matchSession';
import { ActionBar } from '../ui/ActionBar';
import { actionBarModel } from '../ui/actionBarModel';
import { tweenAsync, wait } from '../ui/anim';
import { BetMeter } from '../ui/BetMeter';
import { Button } from '../ui/Button';
import { CardSprite, drawCardSlot } from '../ui/CardSprite';
import { LeverPanel } from '../ui/LeverPanel';
import { ScoreBar } from '../ui/ScoreBar';
import { textStyle } from '../ui/text';

export interface TableSceneData {
  mode: MatchMode;
  seed: number;
}

const BOARD_SIZE = 5;

/**
 * The whole match. Animation only: every move goes through MatchSession, and the scene
 * plays back the resulting events one by one, with input locked until the queue is idle.
 */
export class TableScene extends Phaser.Scene {
  private session!: MatchSession;
  private queue!: EventQueue<GameEvent>;
  private names!: [string, string];

  private scoreBar!: ScoreBar;
  private betMeter!: BetMeter;
  private streetLabel!: Phaser.GameObjects.Text;
  private thinking!: Phaser.GameObjects.Text;
  private toasts!: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private actionBar!: ActionBar;
  private leverPanel!: LeverPanel;
  private nextButton!: Button;
  private botCards: CardSprite[] = [];
  private boardCards: CardSprite[] = [];
  private playerCards: CardSprite[] = [];
  private revealed = 0;

  constructor() {
    super('TableScene');
  }

  init(data: TableSceneData): void {
    this.session = new MatchSession({ mode: data.mode, seed: data.seed });
    this.names = [t('seat.you'), t('seat.bot')];
    this.botCards = [];
    this.boardCards = [];
    this.playerCards = [];
    this.revealed = 0;
  }

  create(): void {
    this.drawRoom();
    this.drawTable();
    this.drawOpponent();
    this.drawPlayerCards();
    this.drawHud();

    this.queue = new EventQueue((event) => this.play(event));
    this.queue.onIdle(() => this.advance());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.queue.dispose());

    this.render(this.session.view);
    this.submit(() => this.session.deal());
  }

  // ── Driving the match ──────────────────────────────────────────────────────

  /** Runs one session move and queues its events; input stays locked until they finish. */
  private submit(move: () => GameEvent[]): void {
    this.lockInput();
    let events: GameEvent[];
    try {
      events = move();
    } catch (error) {
      // A stale tap (e.g. out of turn) must not wedge the table: report it and resync.
      console.error(error);
      this.advance();
      return;
    }
    this.queue.push(events);
  }

  /** Called whenever playback goes idle: decide who moves next and unlock the right input. */
  private advance(): void {
    const view = this.session.view;
    this.render(view);
    switch (this.session.turn) {
      case 'human':
        if (view.phase === 'betting') this.actionBar.setLocked(false);
        else this.leverPanel.setAccepting(true);
        break;
      case 'bot':
        this.thinking.setVisible(view.phase === 'betting');
        this.time.delayedCall(TIMING.botThink, () => {
          this.thinking.setVisible(false);
          this.submit(() => this.session.botAct());
        });
        break;
      case 'deal':
        this.actionBar.setVisible(false);
        this.nextButton.setVisible(true).setEnabled(true);
        break;
      case 'over':
        this.showResult(view);
        break;
    }
  }

  private lockInput(): void {
    this.actionBar.setLocked(true);
    this.leverPanel.setAccepting(false);
    this.nextButton.setVisible(false);
  }

  private onBet(move: BetMove): void {
    this.submit(() => this.session.humanBet(move));
  }

  private onPull(lever: number): void {
    this.submit(() => this.session.humanPull(lever));
  }

  private onNextRound(): void {
    this.nextButton.setEnabled(false);
    this.actionBar.setVisible(true);
    this.submit(() => this.session.deal());
  }

  // ── Event playback ─────────────────────────────────────────────────────────

  private async play(event: GameEvent): Promise<void> {
    switch (event.type) {
      case 'roundStarted':
        this.clearRound();
        await this.showBanner(
          t('banner.round', { n: event.round, name: this.names[event.firstActor] }),
        );
        break;
      case 'holeCardsDealt':
        await this.dealHoles(event.holes[HUMAN]);
        break;
      case 'betPlaced':
        this.betMeter.setLevel(event.level, true);
        if (event.move !== 'fold') await this.toast(event.seat, toastText(event.move, event.level));
        break;
      case 'streetRevealed':
        this.streetLabel.setText(t(`street.${event.street}`));
        for (const card of event.cards) await this.revealBoardCard(card);
        break;
      case 'showdown':
        await Promise.all(
          this.botCards.map((sprite, i) => sprite.flip(event.holes[BOT][i] ?? null)),
        );
        await this.showBanner(this.showdownText(event));
        break;
      case 'folded':
        await this.showBanner(t('banner.folded', { name: this.names[event.seat], n: event.pulls }));
        break;
      case 'challengeStarted':
        await this.leverPanel.open(this.names[event.loser], event.pulls, event.loser === HUMAN);
        break;
      case 'leverPulled':
        await this.leverPanel.reveal(event.lever, event.danger);
        break;
      case 'roundEnded':
        await this.leverPanel.close();
        this.scoreBar.setScore(event.wins, event.draws, true);
        if (event.result.kind === 'win') {
          await this.showBanner(t('banner.danger', { name: this.names[event.result.winner] }));
        } else if (event.result.reason === 'allSafe') {
          await this.showBanner(t('banner.allSafe'));
        }
        break;
      case 'matchEnded':
        break;
    }
  }

  private showdownText(event: Extract<GameEvent, { type: 'showdown' }>): string {
    const hand = (seat: Seat) => t(`hand.${event.ranks[seat]}`);
    if (event.winner === null) return t('banner.showdownTie', { hand: hand(HUMAN) });
    const loser: Seat = event.winner === HUMAN ? BOT : HUMAN;
    return t('banner.showdown', {
      name: this.names[event.winner],
      winner: hand(event.winner),
      loser: hand(loser),
    });
  }

  private clearRound(): void {
    this.revealed = 0;
    [...this.boardCards, ...this.botCards, ...this.playerCards].forEach((c) => c.setVisible(false));
    this.betMeter.setLevel(BETTING.startLevel);
    this.streetLabel.setText(t('street.preflop'));
  }

  private async dealHoles(mine: readonly Card[]): Promise<void> {
    const deal = (sprite: CardSprite, delay: number) => {
      const { x, y } = sprite;
      sprite
        .setVisible(true)
        .setAlpha(0)
        .setPosition(DISPLAY.width / 2, LAYOUT.table.topY);
      return tweenAsync(this, { targets: sprite, x, y, alpha: 1, delay, duration: TIMING.deal });
    };
    this.playerCards.forEach((sprite, i) => {
      const card = mine[i];
      if (card !== undefined) sprite.showFace(card);
    });
    // The bot's cards are only ever drawn face down here; they turn over at showdown.
    this.botCards.forEach((sprite) => sprite.showBack());
    await Promise.all([
      ...this.playerCards.map((s, i) => deal(s, i * TIMING.deal)),
      ...this.botCards.map((s, i) => deal(s, (i + 0.5) * TIMING.deal)),
    ]);
  }

  private async revealBoardCard(card: Card): Promise<void> {
    const sprite = this.boardCards[this.revealed++];
    if (!sprite) return;
    sprite.showBack().setVisible(true);
    await sprite.flip(card);
  }

  private async toast(seat: Seat, text: string): Promise<void> {
    const toast = this.toasts[seat];
    const home = seat === HUMAN ? LAYOUT.playerToast : LAYOUT.opponentToast;
    toast.setText(text).setPosition(home.x, home.y).setAlpha(1).setVisible(true);
    await tweenAsync(this, {
      targets: toast,
      y: home.y - 24,
      alpha: 0,
      delay: TIMING.toast * 0.6,
      duration: TIMING.toast * 0.4,
    });
  }

  private async showBanner(text: string): Promise<void> {
    this.bannerText.setText(text);
    this.banner.setAlpha(0).setVisible(true);
    await tweenAsync(this, { targets: this.banner, alpha: 1, duration: TIMING.panelFade });
    await wait(this, TIMING.banner);
  }

  private showResult(view: PlayerView): void {
    const won = view.wins[HUMAN] > view.wins[BOT];
    const r = LAYOUT.result;
    const cx = DISPLAY.width / 2;
    const cy = DISPLAY.height / 2;
    this.actionBar.setVisible(false);

    const dim = this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0x000000, LAYOUT.leverPanel.dim)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.woodDark, 0.95);
    panel.fillRoundedRect(cx - r.width / 2, cy - r.height / 2, r.width, r.height, 16);
    panel.lineStyle(2, won ? COLORS.amber : COLORS.danger, 1);
    panel.strokeRoundedRect(cx - r.width / 2, cy - r.height / 2, r.width, r.height, 16);
    const { fontSize } = LAYOUT;
    const headline = this.add
      .text(cx, cy - 110, t(won ? 'match.won' : 'match.lost'), {
        ...textStyle(fontSize.title, won ? COLORS.amber : COLORS.danger, true),
      })
      .setOrigin(0.5);
    const score = this.add
      .text(
        cx,
        cy - 30,
        t('match.score', {
          you: this.names[HUMAN],
          a: view.wins[HUMAN],
          b: view.wins[BOT],
          bot: this.names[BOT],
        }),
        textStyle(fontSize.heading, COLORS.cream, true),
      )
      .setOrigin(0.5);
    const draws = this.add
      .text(
        cx,
        cy + 20,
        t('match.draws', { n: view.draws }),
        textStyle(fontSize.body, COLORS.muted),
      )
      .setOrigin(0.5);
    const again = new Button(
      this,
      cx,
      cy + 100,
      { width: 320, label: t('match.again'), variant: 'primary' },
      () => this.scene.start('BootScene'),
    );
    const overlay = this.add
      .container(0, 0, [dim, panel, headline, score, draws, again])
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: TIMING.panelFade });
  }

  // ── Rendering from state ───────────────────────────────────────────────────

  /** Redraws the table from the human's view, so pictures never drift from the state. */
  private render(view: PlayerView): void {
    this.scoreBar.setScore(view.wins, view.draws);
    this.betMeter.setLevel(view.betting?.level ?? 0);
    // From the board, not betting.street: an all-in runout deals the river without new streets.
    if (view.round > 0) this.streetLabel.setText(t(`street.${streetOf(view.board.length)}`));
    this.actionBar.setModel(actionBarModel(view));
    if (view.challenge) this.leverPanel.sync(view.challenge.levers);

    const dealt = view.hole.length > 0;
    this.playerCards.forEach((sprite, i) => {
      const card = view.hole[i];
      sprite.setVisible(card !== undefined).setAlpha(1);
      if (card !== undefined) sprite.showFace(card);
    });
    this.botCards.forEach((sprite, i) => {
      sprite.setVisible(dealt).setAlpha(1);
      const card = view.showdown?.opponentHole[i];
      if (card === undefined) sprite.showBack();
      else sprite.showFace(card);
    });
    this.revealed = view.board.length;
    this.boardCards.forEach((sprite, i) => {
      const card = view.board[i];
      sprite.setVisible(card !== undefined);
      if (card !== undefined) sprite.showFace(card);
    });
  }

  // ── Static layout ──────────────────────────────────────────────────────────

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

    const name = this.add
      .text(
        o.x,
        o.nameY,
        this.names[BOT].toUpperCase(),
        textStyle(LAYOUT.fontSize.body, COLORS.cream, true),
      )
      .setOrigin(0.5);
    this.thinking = this.add
      .text(
        name.x + name.width / 2 + 12,
        o.nameY,
        t('bot.thinking'),
        textStyle(LAYOUT.fontSize.caption, COLORS.amber),
      )
      .setOrigin(0, 0.5)
      .setVisible(false);

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

  private drawHud(): void {
    this.scoreBar = new ScoreBar(this, this.session.view.winsNeeded, this.names);

    const toastStyle = textStyle(LAYOUT.fontSize.heading, COLORS.amber, true);
    const toast = () => this.add.text(0, 0, '', toastStyle).setOrigin(0.5).setVisible(false);
    this.toasts = [toast(), toast()];

    const b = LAYOUT.banner;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.woodDark, 0.92);
    bg.fillRoundedRect(0, 0, b.width, b.height, LAYOUT.radius);
    bg.lineStyle(2, COLORS.amber, 1);
    bg.strokeRoundedRect(0, 0, b.width, b.height, LAYOUT.radius);
    this.bannerText = this.add
      .text(b.width / 2, b.height / 2, '', textStyle(LAYOUT.fontSize.body, COLORS.cream, true))
      .setOrigin(0.5);
    this.banner = this.add.container(b.x, b.y, [bg, this.bannerText]).setVisible(false);

    this.actionBar = new ActionBar(this, (move) => this.onBet(move));
    const bar = LAYOUT.actionBar;
    this.nextButton = new Button(
      this,
      bar.x + bar.width / 2,
      bar.y + bar.height / 2,
      { width: 360, label: t('round.next'), variant: 'primary' },
      () => this.onNextRound(),
    ).setVisible(false);

    this.leverPanel = new LeverPanel(this, (lever) => this.onPull(lever));
  }
}

function streetOf(boardLength: number) {
  return STREETS[Math.max(0, boardLength - 2)] ?? 'preflop';
}

function toastText(move: Exclude<BetMove, 'fold'>, level: number): string {
  switch (move) {
    case 'check':
      return t('toast.check');
    case 'raise':
      return t('toast.raise', { n: level });
    case 'call':
      return t('toast.call');
    case 'allIn':
      return t('toast.allIn');
  }
}
