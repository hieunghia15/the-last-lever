import Phaser from 'phaser';
import { LAYOUT } from '../config';
import { BET_MOVES, type BetMove } from '../core/betting';
import type { ActionItem } from './actionBarModel';
import { Button, type ButtonVariant } from './Button';

const VARIANT: Record<BetMove, ButtonVariant> = {
  check: 'secondary',
  raise: 'secondary',
  call: 'primary',
  fold: 'danger',
  allIn: 'allIn',
};

const FONT_SIZE = 18;
/** Call is the expected move, so it is set larger and bold like the design. */
const CALL_FONT_SIZE = 20;

/** The five bet buttons. Locks itself on tap so a double tap can never send two moves. */
export class ActionBar extends Phaser.GameObjects.Container {
  private readonly buttons: Button[];
  private items: ActionItem[] = [];
  private locked = true;

  constructor(
    scene: Phaser.Scene,
    private readonly onMove: (move: BetMove) => void,
  ) {
    const bar = LAYOUT.actionBar;
    super(scene, bar.x, bar.y);
    const width = (bar.width - bar.gap * (BET_MOVES.length - 1)) / BET_MOVES.length;
    this.buttons = BET_MOVES.map((move, i) => {
      const button = new Button(
        scene,
        i * (width + bar.gap) + width / 2,
        bar.height / 2,
        {
          width,
          height: bar.height,
          label: '',
          variant: VARIANT[move],
          fontSize: move === 'call' ? CALL_FONT_SIZE : FONT_SIZE,
        },
        () => this.tap(move),
      );
      this.add(button);
      return button;
    });
    this.refresh();
    scene.add.existing(this);
  }

  setModel(items: ActionItem[]): void {
    this.items = items;
    items.forEach((item, i) => this.buttons[i]?.setLabel(item.label, item.subtitle));
    this.refresh();
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    this.refresh();
  }

  private tap(move: BetMove): void {
    if (this.locked) return;
    this.setLocked(true);
    this.onMove(move);
  }

  private refresh(): void {
    this.buttons.forEach((button, i) => {
      button.setEnabled(!this.locked && (this.items[i]?.enabled ?? false));
    });
  }
}
