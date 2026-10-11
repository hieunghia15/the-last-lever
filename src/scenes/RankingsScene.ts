import Phaser from 'phaser';
import { COLORS, cssColor, DISPLAY, LAYOUT, TIMING, type Rect } from '../config';
import { parseCards } from '../core/cards';
import { t } from '../i18n';
import { Button } from '../ui/Button';
import { cardFace } from '../ui/cardFace';
import { CardSprite } from '../ui/CardSprite';
import { DECK_SUITS, suitCards, type SuitCode } from '../ui/deckModel';
import { addBackdrop, addGlow, addIcon, addLamp, drawPanel } from '../ui/decor';
import { ICONS } from '../ui/icons';
import { RANKINGS, type RankingRow, type StrengthStyle } from '../ui/rankingsModel';
import { SEGMENT_HEIGHT, SegmentedControl } from '../ui/SegmentedControl';
import { textStyle } from '../ui/text';

export type CardsTab = 'rankings' | 'deck';

export interface RankingsSceneData {
  tab?: CardsTab;
}

const TONE: Record<RankingRow['tone'], number> = {
  red: COLORS.danger,
  green: COLORS.safe,
  cream: COLORS.cream,
};

const TAG: Record<StrengthStyle, { color: number; bold: boolean; mono: boolean }> = {
  top: { color: COLORS.peach, bold: true, mono: false },
  high: { color: COLORS.peach, bold: false, mono: true },
  mid: { color: COLORS.rose, bold: false, mono: true },
  tier: { color: COLORS.muted, bold: false, mono: true },
  bottom: { color: COLORS.danger, bold: true, mono: false },
};

const SUIT_SYMBOL: Record<SuitCode, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const isRed = (suit: SuitCode) => suit === 'h' || suit === 'd';

const ROWS_PER_COLUMN = 5;
const TABS_WIDTH = 320;
/** Rows of other suits fade back while one suit is picked in the filter. */
const DIMMED = 0.25;

/**
 * The card reference, reached from the menu: the ten poker hands strongest first, and
 * the full 52-card deck by suit. The deck tab is built on first visit (52 cards of text).
 */
export class RankingsScene extends Phaser.Scene {
  private tab: CardsTab = 'rankings';
  private title!: Phaser.GameObjects.Text;
  private tag!: Phaser.GameObjects.Text;
  private tagChip!: Phaser.GameObjects.Graphics;
  private layers: Partial<Record<CardsTab, Phaser.GameObjects.Container>> = {};
  private layer!: Phaser.GameObjects.Container;
  private suitRows: Partial<Record<SuitCode, Phaser.GameObjects.Container>> = {};
  private chips: {
    suit: SuitCode | null;
    bg: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    rect: Rect;
  }[] = [];
  private filter: SuitCode | null = null;

  constructor() {
    super('RankingsScene');
  }

  init(data: RankingsSceneData): void {
    this.tab = data.tab ?? 'rankings';
    this.layers = {};
    this.suitRows = {};
    this.chips = [];
    this.filter = null;
  }

  create(): void {
    addBackdrop(this, 'rankings');
    addLamp(this);
    this.drawHeader();
    this.showTab(this.tab);
    this.cameras.main.fadeIn(TIMING.panelFade);
  }

  /** Adds an object to the tab being built, so switching tabs is one visibility flip. */
  private put<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.layer.add(object);
    return object;
  }

  private showTab(tab: CardsTab): void {
    this.tab = tab;
    let layer = this.layers[tab];
    if (!layer) {
      layer = this.add.container(0, 0);
      this.layers[tab] = layer;
      this.layer = layer;
      if (tab === 'rankings') {
        RANKINGS.forEach((row, i) => this.drawRow(row, i));
        this.drawTip();
      } else {
        this.drawDeck();
      }
    }
    for (const [key, container] of Object.entries(this.layers)) container.setVisible(key === tab);

    const deck = tab === 'deck';
    this.title.setText(t(deck ? 'deck.title' : 'rankings.title').toUpperCase());
    this.tag.setText(t(deck ? 'deck.tag' : 'rankings.tag').toUpperCase());
    this.tag.setX(this.title.x + this.title.width + 16 + 8);
    this.tagChip.clear();
    drawPanel(
      this.tagChip,
      { x: this.tag.x - 8, y: this.tag.y - 12, width: this.tag.width + 16, height: 24 },
      { fill: COLORS.plate, radius: 4 },
    );
  }

  private drawHeader(): void {
    const r = LAYOUT.rankings;
    const cy = r.top + 23;
    addGlow(this, r.x + 6, cy, 42, COLORS.amber, 0.7);
    this.add.circle(r.x + 6, cy, 6, COLORS.amber);
    this.title = this.add
      .text(
        r.x + 28,
        cy,
        '',
        textStyle(LAYOUT.fontSize.heading, COLORS.cream, true, { letterSpacing: 1.6 }),
      )
      .setOrigin(0, 0.5);
    // Created before the tag text so the chip sits behind it.
    this.tagChip = this.add.graphics();
    this.tag = this.add
      .text(0, cy, '', textStyle(LAYOUT.fontSize.caption, COLORS.muted))
      .setOrigin(0, 0.5);

    const label = t('rankings.back');
    const probe = this.add.text(0, 0, label, textStyle(LAYOUT.fontSize.label));
    const width = 22 * 2 + 4 + ICONS.arrowBack.width + 8 + probe.width;
    probe.destroy();
    const backX = r.x + r.width - width;
    new Button(
      this,
      backX + width / 2,
      cy,
      {
        width,
        height: 46,
        hitHeight: DISPLAY.minTouchSize,
        label,
        variant: 'secondary',
        textColor: COLORS.cream,
        fontSize: LAYOUT.fontSize.label,
        bold: false,
        icon: 'arrowBack',
      },
      () => this.scene.start('MenuScene'),
    );
    new SegmentedControl<CardsTab>(
      this,
      backX - 16 - TABS_WIDTH,
      cy - SEGMENT_HEIGHT / 2,
      TABS_WIDTH,
      [
        { value: 'rankings', label: t('cards.tabRankings'), fontSize: 14 },
        { value: 'deck', label: t('cards.tabDeck'), fontSize: 14 },
      ],
      this.tab,
      8,
      (tab) => this.showTab(tab),
    );
    this.add.rectangle(r.x, r.top + 46 + 17, r.width, 1, COLORS.rivet, 0.3).setOrigin(0, 0.5);
  }

  // ── Hand rankings tab ──────────────────────────────────────────────────────

  private drawRow(row: RankingRow, index: number): void {
    const r = LAYOUT.rankings;
    const columnWidth = (r.width - r.colGap) / 2;
    const column = Math.floor(index / ROWS_PER_COLUMN);
    const rect: Rect = {
      x: r.x + column * (columnWidth + r.colGap),
      y: r.gridY + (index % ROWS_PER_COLUMN) * (r.rowHeight + r.rowGap),
      width: columnWidth,
      height: r.rowHeight,
    };
    const cy = rect.y + rect.height / 2;
    const g = this.put(this.add.graphics());
    drawPanel(g, rect, {
      fill: COLORS.plate,
      fillAlpha: 0.9,
      stroke: COLORS.rivet,
      strokeAlpha: 0.4,
      strokeWidth: 1,
    });
    // The strongest and the weakest hand get a coloured marker on the left edge.
    if (row.style === 'top' || row.style === 'bottom') {
      g.fillStyle(row.style === 'top' ? COLORS.amber : COLORS.mutedLight, 1);
      g.fillRoundedRect(rect.x - 4, rect.y + 14, 8, 32, { tl: 0, bl: 0, tr: 4, br: 4 });
    }

    const numberColor = index === 0 ? COLORS.amber : index < 5 ? COLORS.amberBright : COLORS.muted;
    this.put(
      this.add
        .text(
          rect.x + 17,
          cy,
          String(index + 1).padStart(2, '0'),
          textStyle(LAYOUT.fontSize.body, numberColor),
        )
        .setOrigin(0, 0.5),
    );
    this.put(
      this.add
        .text(rect.x + 53, cy - 8, t(`rankings.name.${row.rank}`), textStyle(18, COLORS.cream))
        .setOrigin(0, 0.5),
    );
    this.put(
      this.add
        .text(
          rect.x + 53,
          cy + 14,
          t(`rankings.desc.${row.rank}`),
          textStyle(LAYOUT.fontSize.caption, COLORS.muted),
        )
        .setOrigin(0, 0.5),
    );

    const look = TAG[row.style];
    const tagText = row.style === 'tier' ? t('rankings.tier', { n: index + 1 }) : t(row.strength);
    const tag = this.put(
      this.add
        .text(
          rect.x + rect.width - 17,
          cy,
          tagText,
          textStyle(
            LAYOUT.fontSize.caption,
            look.color,
            look.bold,
            look.mono ? { font: 'mono' } : {},
          ),
        )
        .setOrigin(1, 0.5),
    );
    let chipRight = tag.x - tag.width - 8;
    if (row.style === 'top') {
      this.put(addIcon(this, chipRight + 4 - ICONS.crown.width / 2, cy, 'crown'));
      chipRight -= ICONS.crown.width + 4;
    }

    const example = parseCards(row.example)
      .map((card) => {
        const face = cardFace(card);
        return `${face.rank}${face.suit}`;
      })
      .join(' ');
    const chipText = this.put(
      this.add
        .text(chipRight - 9, cy, example, textStyle(LAYOUT.fontSize.caption, TONE[row.tone], true))
        .setOrigin(1, 0.5),
    );
    drawPanel(
      g,
      { x: chipText.x - chipText.width - 9, y: cy - 13, width: chipText.width + 18, height: 26 },
      { fill: COLORS.dotOff, stroke: COLORS.rivet, strokeAlpha: 0.3, strokeWidth: 1, radius: 4 },
    );
  }

  private drawTip(): void {
    const r = LAYOUT.rankings;
    const y = r.gridY + ROWS_PER_COLUMN * r.rowHeight + (ROWS_PER_COLUMN - 1) * r.rowGap + 24;
    const rect = { x: r.x, y, width: r.width, height: 80 };
    const cy = y + rect.height / 2;
    const g = this.put(this.add.graphics());
    drawPanel(g, rect, {
      fill: COLORS.woodDark,
      stroke: COLORS.amber,
      strokeAlpha: 0.3,
      strokeWidth: 2,
    });
    drawPanel(
      g,
      { x: r.x + 20, y: cy - 20, width: 40, height: 40 },
      { fill: COLORS.amber, fillAlpha: 0.2, radius: 8 },
    );
    this.put(addIcon(this, r.x + 40, cy, 'bulb'));
    this.put(
      this.add
        .text(
          r.x + 72,
          cy - 9,
          t('rankings.tipTitle').toUpperCase(),
          textStyle(LAYOUT.fontSize.caption, COLORS.amber, true, { letterSpacing: 0.6 }),
        )
        .setOrigin(0, 0.5),
    );
    const order = RANKINGS.map((row) => t(`hand.${row.rank}`)).join(' > ');
    this.put(
      this.add
        .text(
          r.x + 72,
          cy + 9,
          order,
          textStyle(LAYOUT.fontSize.caption, COLORS.cream, false, { font: 'mono' }),
        )
        .setOrigin(0, 0.5),
    );

    const ready = this.put(
      this.add
        .text(
          r.x + r.width - 20,
          cy,
          t('rankings.ready'),
          textStyle(LAYOUT.fontSize.caption, COLORS.muted),
        )
        .setOrigin(1, 0.5),
    );
    g.fillStyle(COLORS.safe, 1).fillCircle(ready.x - ready.width - 8 - 4, cy, 4);
  }

  // ── 52-card tab ────────────────────────────────────────────────────────────

  private drawDeck(): void {
    const r = LAYOUT.rankings;
    const d = LAYOUT.deck;
    this.drawSuitChips();

    DECK_SUITS.forEach((suit, i) => {
      const top = d.rowsTop + i * d.rowStep;
      const row = this.put(this.add.container(0, 0));
      this.suitRows[suit] = row;
      const color = isRed(suit) ? COLORS.danger : COLORS.creamSoft;
      const cy = top + LAYOUT.card.medium.height / 2;
      row.add(
        this.add
          .text(r.x + 12, cy, SUIT_SYMBOL[suit], textStyle(28, color, false, { font: 'card' }))
          .setOrigin(0.5),
      );
      row.add(
        this.add
          .text(
            r.x + 32,
            cy,
            t(`deck.row.${suit}`).toUpperCase(),
            textStyle(14, COLORS.muted, false, { letterSpacing: 0.4 }),
          )
          .setOrigin(0, 0.5),
      );
      suitCards(suit).forEach((card, j) => {
        const x = d.cardsX + LAYOUT.card.medium.width / 2 + j * d.cardStep;
        row.add(new CardSprite(this, x, cy, 'medium').showFace(card));
      });
      if (i < DECK_SUITS.length - 1) {
        const lineY = top + LAYOUT.card.medium.height + (d.rowStep - LAYOUT.card.medium.height) / 2;
        row.add(this.add.rectangle(r.x, lineY, r.width, 1, COLORS.rivet, 0.3).setOrigin(0, 0.5));
      }
    });

    // Strength scale under the rows: the ace column is the strongest, the two the weakest.
    const scaleY = d.rowsTop + DECK_SUITS.length * d.rowStep + 8;
    const first = d.cardsX;
    const last = d.cardsX + 12 * d.cardStep + LAYOUT.card.medium.width;
    const style = textStyle(LAYOUT.fontSize.caption, COLORS.amberLight, true, { letterSpacing: 1 });
    const strong = this.put(
      this.add
        .text(first, scaleY, `A · ${t('deck.strong').toUpperCase()}`, style)
        .setOrigin(0, 0.5),
    );
    const weak = this.put(
      this.add
        .text(last, scaleY, `${t('deck.weak').toUpperCase()} · 2`, {
          ...style,
          color: cssColor(COLORS.muted),
        })
        .setOrigin(1, 0.5),
    );
    const g = this.put(this.add.graphics());
    g.lineStyle(1, COLORS.rivet, 0.6);
    g.lineBetween(strong.x + strong.width + 12, scaleY, weak.x - weak.width - 12, scaleY);
    g.fillStyle(COLORS.rivet, 0.8);
    const tip = weak.x - weak.width - 12;
    g.fillTriangle(tip, scaleY, tip - 7, scaleY - 4, tip - 7, scaleY + 4);

    this.put(
      this.add
        .text(
          r.x,
          scaleY + 40,
          t('deck.total', { n: 52 }),
          textStyle(LAYOUT.fontSize.label, COLORS.muted),
        )
        .setOrigin(0, 0.5),
    );
    this.put(
      this.add
        .text(r.x, scaleY + 66, t('deck.note'), textStyle(LAYOUT.fontSize.caption, COLORS.muted))
        .setOrigin(0, 0.5),
    );
  }

  /** "Tất cả · ♠ Bích · ♥ Cơ · ♦ Rô · ♣ Chuồn": picking a suit brings its row forward. */
  private drawSuitChips(): void {
    const d = LAYOUT.deck;
    const options: (SuitCode | null)[] = [null, ...DECK_SUITS];
    let x = LAYOUT.rankings.x;
    for (const suit of options) {
      const bg = this.put(this.add.graphics());
      const text = suit === null ? t('deck.all') : `${SUIT_SYMBOL[suit]} ${t(`deck.suit.${suit}`)}`;
      const label = this.put(
        this.add
          .text(0, d.chipsY, text, textStyle(LAYOUT.fontSize.label, COLORS.cream))
          .setOrigin(0.5),
      );
      const rect = {
        x,
        y: d.chipsY - d.chipHeight / 2,
        width: label.width + 48,
        height: d.chipHeight,
      };
      label.setX(x + rect.width / 2);
      const hit = this.put(
        this.add
          .zone(x + rect.width / 2, d.chipsY, rect.width + 8, d.chipHeight + 14)
          .setInteractive({ useHandCursor: true }),
      );
      hit.on('pointerup', () => this.setFilter(suit));
      this.chips.push({ suit, bg, label, rect });
      x += rect.width + 8;
    }
    this.setFilter(null);
  }

  private setFilter(suit: SuitCode | null): void {
    this.filter = suit;
    for (const chip of this.chips) {
      const on = chip.suit === this.filter;
      chip.bg.clear();
      drawPanel(chip.bg, chip.rect, {
        fill: on ? COLORS.amber : COLORS.plate,
        stroke: COLORS.rivet,
        strokeAlpha: on ? 0 : 0.4,
        strokeWidth: 1,
        radius: chip.rect.height / 2,
      });
      const color = on
        ? COLORS.amberInk
        : chip.suit !== null && isRed(chip.suit)
          ? COLORS.danger
          : COLORS.cream;
      chip.label.setColor(cssColor(color)).setFontStyle(on ? '700' : '400');
    }
    for (const [key, row] of Object.entries(this.suitRows)) {
      row.setAlpha(this.filter === null || key === this.filter ? 1 : DIMMED);
    }
  }
}
