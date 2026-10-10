import Phaser from 'phaser';
import { DISPLAY } from '../config';
import { getLocale, t } from '../i18n';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const cx = DISPLAY.width / 2;
    const cy = DISPLAY.height / 2;
    const font = { fontFamily: DISPLAY.fontFamily, color: '#f3e6d0' };

    this.add
      .text(cx, cy - 40, t('game.title'), { ...font, fontSize: '64px', fontStyle: '700' })
      .setOrigin(0.5);
    this.add.text(cx, cy + 30, t('boot.tagline'), { ...font, fontSize: '28px' }).setOrigin(0.5);
    this.add
      .text(cx, DISPLAY.height - 40, t('boot.locale', { locale: getLocale() }), {
        ...font,
        fontSize: '18px',
        color: '#8a7a66',
      })
      .setOrigin(0.5);
  }
}
