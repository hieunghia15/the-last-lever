import Phaser from 'phaser';
import { DISPLAY, LAYOUT, type MatchMode } from '../config';
import { textStyle } from '../ui/text';

export interface TableSceneData {
  mode: MatchMode;
  seed: number;
}

export class TableScene extends Phaser.Scene {
  private match!: TableSceneData;

  constructor() {
    super('TableScene');
  }

  init(data: TableSceneData): void {
    this.match = data;
  }

  create(): void {
    this.add
      .text(
        DISPLAY.width / 2,
        DISPLAY.height / 2,
        `${this.match.mode} · ${this.match.seed}`,
        textStyle(LAYOUT.fontSize.body),
      )
      .setOrigin(0.5);
  }
}
