import Phaser from 'phaser';
import { BETTING, COLORS, DISPLAY, LAYOUT, OPPONENTS, TIMING, type Difficulty } from '../config';
import { STREETS, type BetMove } from '../core/betting';
import type { Card } from '../core/cards';
import type { GameEvent, PlayerView, Seat } from '../core/gameState';
import { t } from '../i18n';
import { EventQueue } from '../session/eventQueue';
import { BOT, HUMAN, MatchSession } from '../session/matchSession';
import { browserStore, recordMatch } from '../session/profile';
import { ActionBar } from '../ui/ActionBar';
import { actionBarModel } from '../ui/actionBarModel';
import { tweenAsync, wait } from '../ui/anim';
import { BetMeter } from '../ui/BetMeter';
import { Button } from '../ui/Button';
import { addCardSlot, CardSprite } from '../ui/CardSprite';
import { addBackdrop, addGlow, addLamp, drawGlowRect, drawPanel } from '../ui/decor';
import { HandPanel } from '../ui/HandPanel';
import { LeverPanel } from '../ui/LeverPanel';
import { ScoreBar } from '../ui/ScoreBar';
import { SpeechBubble } from '../ui/SpeechBubble';
import { textStyle } from '../ui/text';
import { feltTexture } from '../ui/textures';
import type { ConfirmSceneData } from './ConfirmScene';
import { bestOf, type ResultSceneData, type TableSceneData } from './flow';

export type { TableSceneData } from './flow';

const BOARD_SIZE = 5;

/**
 * The whole match. Animation only: every move goes through MatchSession, and the scene
 * plays back the resulting events one by one, with input locked until the queue is idle.
 */
export class TableScene extends Phaser.Scene {
  private session!: MatchSession;
  private queue!: EventQueue<GameEvent>;
  private setup!: TableSceneData;
  private names!: [string, string];

  private scoreBar!: ScoreBar;
  private betMeter!: BetMeter;
  private streetLabel!: Phaser.GameObjects.Text;
  private bubble!: SpeechBubble;
  private toasts!: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerTimer: Phaser.Time.TimerEvent | null = null;
  private actionBar!: ActionBar;
  private leverPanel!: LeverPanel;
  private handPanel!: HandPanel;
  private nextButton!: Button;
  private menuButton!: Button;
  private botCards: CardSprite[] = [];
  private boardCards: CardSprite[] = [];
  private playerCards: CardSprite[] = [];
  private revealed = 0;
  /** Cards played back so far, which can trail the session's view while events animate. */
  private hole: readonly Card[] = [];
  private board: Card[] = [];

  constructor() {
    super('TableScene');
  }

  init(data: TableSceneData): void {
    this.setup = data;
    this.session = new MatchSession({ mode: data.mode, seed: data.seed });
    this.names = [t('seat.you'), OPPONENTS[data.difficulty].name];
    this.botCards = [];
    this.boardCards = [];
    this.playerCards = [];
    this.revealed = 0;
    this.bannerTimer = null;
    this.hole = [];
    this.board = [];
  }

  create(): void {
    addBackdrop(this, 'table');
    this.drawTable();
    this.drawOpponent(this.setup.difficulty);
    // The lamp hangs in front of the opponent, as in the design.
    addLamp(this);
    this.drawBottomBar();
    // Before the HUD, so the lever panel's dimmer covers it.
    this.handPanel = new HandPanel(this);
    this.drawHud();

    this.queue = new EventQueue((event) => this.play(event));
    this.queue.onIdle(() => this.advance());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.queue.dispose());

    this.render(this.session.view);
    this.cameras.main.fadeIn(TIMING.panelFade);
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
        if (view.phase === 'betting') this.bubble.say(t('bot.thinking'));
        this.time.delayedCall(TIMING.botThink, () => {
          this.bubble.hide();
          this.submit(() => this.session.botAct());
        });
        break;
      case 'deal':
        this.actionBar.setVisible(false);
        this.nextButton.setVisible(true).setEnabled(true);
        break;
      case 'over':
        this.finish(view);
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

  /** Freezes the table under a yes/no popup; leaving drops the match without recording it. */
  private confirmQuit(): void {
    const data: ConfirmSceneData = {
      title: t('quit.title'),
      message: t('quit.message'),
      confirmLabel: t('match.menu'),
      cancelLabel: t('quit.stay'),
      onConfirm: () => this.scene.start('MenuScene'),
      onCancel: () => this.scene.resume(),
    };
    this.scene.pause();
    this.scene.launch('ConfirmScene', data);
  }

  /** Saves the result to the per-difficulty record, then hands over to the result screen. */
  private finish(view: PlayerView): void {
    const won = view.wins[HUMAN] > view.wins[BOT];
    const { difficulty, mode, choice } = this.setup;
    const stats = recordMatch(browserStore(), difficulty, won);
    const data: ResultSceneData = {
      won,
      wins: [view.wins[HUMAN], view.wins[BOT]],
      draws: view.draws,
      mode,
      difficulty,
      choice,
      names: this.names,
      record: stats[difficulty],
    };
    this.actionBar.setVisible(false);
    // The match is decided; pausing now would only stall the hand-over to the result screen.
    this.menuButton.setEnabled(false);
    this.time.delayedCall(TIMING.banner / 2, () => {
      this.cameras.main.fadeOut(TIMING.panelFade);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start('ResultScene', data),
      );
    });
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
        this.setStreet(event.street);
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
    this.showHand([], []);
    [...this.boardCards, ...this.botCards, ...this.playerCards].forEach((c) => c.setVisible(false));
    this.betMeter.setLevel(BETTING.startLevel);
    this.setStreet('preflop');
  }

  private setStreet(street: (typeof STREETS)[number]): void {
    this.streetLabel.setText(t('table.street', { street: t(`street.${street}`) }).toUpperCase());
  }

  private showHand(hole: readonly Card[], board: Card[]): void {
    this.hole = hole;
    this.board = board;
    this.handPanel.setCards(hole, board);
  }

  private async dealHoles(mine: readonly Card[]): Promise<void> {
    const deal = (sprite: CardSprite, delay: number) => {
      const { x, y } = sprite;
      sprite
        .setVisible(true)
        .setAlpha(0)
        .setPosition(DISPLAY.width / 2, LAYOUT.felt.y);
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
    this.showHand(mine, []);
  }

  private async revealBoardCard(card: Card): Promise<void> {
    const sprite = this.boardCards[this.revealed++];
    if (!sprite) return;
    sprite.showBack().setVisible(true);
    await sprite.flip(card);
    this.showHand(this.hole, [...this.board, card]);
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

  /** Holds play for TIMING.banner, then lets the banner linger and fade without blocking. */
  private async showBanner(text: string): Promise<void> {
    // Banners never overlap in the queue, so the only tween this can cut short is a fade-out.
    this.bannerTimer?.remove();
    this.tweens.killTweensOf(this.banner);
    this.bannerText.setText(text);
    this.banner.setAlpha(0).setVisible(true);
    await tweenAsync(this, { targets: this.banner, alpha: 1, duration: TIMING.panelFade });
    await wait(this, TIMING.banner);
    this.bannerTimer = this.time.delayedCall(TIMING.bannerHold, () => {
      this.tweens.add({
        targets: this.banner,
        alpha: 0,
        duration: TIMING.panelFade,
        onComplete: () => this.banner.setVisible(false),
      });
    });
  }

  // ── Rendering from state ───────────────────────────────────────────────────

  /** Redraws the table from the human's view, so pictures never drift from the state. */
  private render(view: PlayerView): void {
    this.scoreBar.setScore(view.wins, view.draws);
    this.betMeter.setLevel(view.betting?.level ?? 0);
    // From the board, not betting.street: an all-in runout deals the river without new streets.
    if (view.round > 0) this.setStreet(streetOf(view.board.length));
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
    this.showHand(view.hole, [...view.board]);
    this.boardCards.forEach((sprite, i) => {
      const card = view.board[i];
      sprite.setVisible(card !== undefined);
      if (card !== undefined) sprite.showFace(card);
    });
  }

  // ── Static layout ──────────────────────────────────────────────────────────

  /** Portrait placeholder, name plate with difficulty, and the two face-down cards. */
  private drawOpponent(difficulty: Difficulty): void {
    const o = LAYOUT.opponent;
    const { name, accent } = OPPONENTS[difficulty];
    addGlow(this, o.x, o.avatarY, o.avatarRadius * 3, accent, 0.35);
    const g = this.add.graphics();
    g.fillStyle(COLORS.woodDark, 1).fillCircle(o.x, o.avatarY, o.avatarRadius);
    g.lineStyle(2, accent, 1).strokeCircle(o.x, o.avatarY, o.avatarRadius - 1);
    this.add
      .text(o.x, o.avatarY, name.charAt(0), textStyle(LAYOUT.fontSize.heading, COLORS.amberLight))
      .setOrigin(0.5);

    const plate = this.add.graphics();
    const nameText = this.add
      .text(0, o.plateY, name, textStyle(14, COLORS.creamSoft))
      .setOrigin(0, 0.5);
    const level = this.add
      .text(
        0,
        o.plateY,
        t(`difficulty.${difficulty}`),
        textStyle(LAYOUT.fontSize.caption, COLORS.muted),
      )
      .setOrigin(0, 0.5);
    const width = 17 + nameText.width + 8 + 6 + 8 + level.width + 17;
    let x = o.x - width / 2;
    drawPanel(
      plate,
      { x, y: o.plateY - o.plateHeight / 2, width, height: o.plateHeight },
      {
        fill: COLORS.plate,
        fillAlpha: 0.9,
        stroke: COLORS.rivet,
        strokeAlpha: 0.3,
        strokeWidth: 1,
        radius: o.plateHeight / 2,
      },
    );
    x += 17;
    nameText.setX(x);
    x += nameText.width + 8;
    plate.fillStyle(COLORS.safe, 1).fillCircle(x + 3, o.plateY, 3);
    level.setX(x + 6 + 8);

    const step = o.card.width + o.cardGap;
    for (const dx of [-0.5, 0.5]) {
      const card = new CardSprite(this, o.x + dx * step, o.cardsY, 'small');
      this.botCards.push(card.setVisible(false));
    }
    this.bubble = new SpeechBubble(this);
  }

  private drawTable(): void {
    const f = LAYOUT.felt;
    const rect = { x: f.x, y: f.y, width: f.width, height: f.height };
    const shadow = this.add.graphics();
    drawGlowRect(shadow, { ...rect, y: rect.y + 10 }, 0x000000, 0.25, 15, f.radius);
    this.add.image(f.x, f.y, feltTexture(this)).setOrigin(0);
    const rim = this.add.graphics();
    drawPanel(rim, rect, { stroke: COLORS.woodDark, strokeWidth: f.rim, radius: f.radius });

    const { y, step, tilt } = LAYOUT.board;
    const left = DISPLAY.width / 2 - ((BOARD_SIZE - 1) * step) / 2;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = left + i * step;
      const angle = tilt[i] ?? 0;
      addCardSlot(this, x, y, 'medium', angle);
      this.boardCards.push(new CardSprite(this, x, y, 'medium').setAngle(angle).setVisible(false));
    }

    this.betMeter = new BetMeter(this, DISPLAY.width / 2, LAYOUT.betMeter.y);
    this.streetLabel = this.add
      .text(
        DISPLAY.width / 2,
        LAYOUT.streetLabelY,
        '',
        textStyle(LAYOUT.fontSize.caption, COLORS.shock, false, {
          font: 'mono',
          letterSpacing: 1.2,
        }),
      )
      .setOrigin(0.5);
  }

  /** The dark strip at the bottom holding the player's hole cards and the action bar. */
  private drawBottomBar(): void {
    const b = LAYOUT.bottomBar;
    this.add.rectangle(0, b.y, DISPLAY.width, b.height, COLORS.bottomBar).setOrigin(0);
    this.add.rectangle(0, b.y, DISPLAY.width, 1, COLORS.rivet, 0.2).setOrigin(0);

    const { x, y, step, tilt } = LAYOUT.playerCards;
    [-tilt, tilt].forEach((angle, i) => {
      const card = new CardSprite(this, x + i * step, y, 'large');
      this.playerCards.push(card.setAngle(angle).setVisible(false));
    });
  }

  private drawHud(): void {
    const m = LAYOUT.menuButton;
    const top = LAYOUT.topBar;
    this.scoreBar = new ScoreBar(this, {
      winsNeeded: this.session.view.winsNeeded,
      bestOf: bestOf(this.setup.mode),
      names: this.names,
      rightInset: m.width + m.gap,
    });
    this.menuButton = new Button(
      this,
      top.x + top.width - top.margin - m.width / 2,
      top.y + top.height / 2,
      {
        width: m.width,
        height: m.height,
        label: '',
        icon: 'home',
        variant: 'ghost',
        radius: m.radius,
        hitHeight: top.height,
      },
      () => this.confirmQuit(),
    );

    const toastStyle = textStyle(LAYOUT.fontSize.button, COLORS.amber, true);
    const toast = () =>
      this.add
        .text(0, 0, '', toastStyle)
        .setOrigin(0.5)
        .setShadow(0, 2, 'rgba(0, 0, 0, 0.8)', 6, false, true)
        .setVisible(false);
    this.toasts = [toast(), toast()];

    const b = LAYOUT.banner;
    const bg = this.add.graphics();
    drawPanel(
      bg,
      { x: 0, y: 0, width: b.width, height: b.height },
      {
        fill: COLORS.slate,
        fillAlpha: 0.95,
        stroke: COLORS.amber,
        strokeAlpha: 0.6,
        strokeWidth: 2,
      },
    );
    this.bannerText = this.add
      .text(b.width / 2, b.height / 2, '', textStyle(LAYOUT.fontSize.label, COLORS.cream, true))
      .setOrigin(0.5);
    this.banner = this.add.container(b.x, b.y, [bg, this.bannerText]).setVisible(false);

    this.actionBar = new ActionBar(this, (move) => this.onBet(move));
    const bar = LAYOUT.actionBar;
    this.nextButton = new Button(
      this,
      bar.x + bar.width / 2,
      bar.y + bar.height / 2,
      { width: 360, label: t('round.next'), variant: 'primary', fontSize: 20 },
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
