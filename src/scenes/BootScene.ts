import Phaser from 'phaser';
import { COLORS, DISPLAY, LAYOUT, MATCH_MODES, type MatchMode } from '../config';
import { getLocale, t } from '../i18n';
import { Button } from '../ui/Button';
import { textStyle } from '../ui/text';
import type { TableSceneData } from './TableScene';

/** ?seed=123 replays a match; the same seed works with `npm run sim -- --seed`. */
function pickSeed(): number {
  const fromUrl = Number(new URLSearchParams(location.search).get('seed'));
  if (Number.isInteger(fromUrl) && fromUrl > 0) return fromUrl;
  // Presentation-side randomness is fine: the core only ever sees the resulting seed.
  return Math.floor(Math.random() * 1_000_000_000) + 1;
}

/** Temporary start screen until the Phase 5 menu: one button per match length. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const cx = DISPLAY.width / 2;
    const { fontSize } = LAYOUT;

    this.add
      .text(cx, 180, t('game.title'), textStyle(fontSize.title, COLORS.cream, true))
      .setOrigin(0.5);
    this.add.text(cx, 250, t('boot.tagline'), textStyle(fontSize.body)).setOrigin(0.5);
    this.add
      .text(cx, 340, t('boot.pickMode'), textStyle(fontSize.body, COLORS.muted))
      .setOrigin(0.5);

    const modes = Object.keys(MATCH_MODES) as MatchMode[];
    const width = 240;
    const gap = 32;
    const left = cx - ((modes.length - 1) * (width + gap)) / 2;
    modes.forEach((mode, i) => {
      const bestOf = MATCH_MODES[mode].winsNeeded * 2 - 1;
      new Button(
        this,
        left + i * (width + gap),
        430,
        { width, label: t('boot.mode', { n: bestOf }), variant: 'primary' },
        () => this.start(mode),
      );
    });

    this.add
      .text(cx, DISPLAY.height - 40, t('boot.locale', { locale: getLocale() }), {
        ...textStyle(fontSize.caption, COLORS.muted),
      })
      .setOrigin(0.5);
  }

  private start(mode: MatchMode): void {
    const seed = pickSeed();
    console.info(`[The Last Lever] ${mode}, seed ${seed}`);
    const data: TableSceneData = { mode, seed };
    this.scene.start('TableScene', data);
  }
}
