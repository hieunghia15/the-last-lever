import '@fontsource/saira-stencil/400.css';
import '@fontsource/saira-stencil/700.css';
import './style.css';
import Phaser from 'phaser';
import { DISPLAY } from './config';
import { isLocale, setLocale } from './i18n';
import { BootScene } from './scenes/BootScene';

// Phaser rasterises text once, so the web font must be ready before the first scene draws.
async function loadFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('400 16px "Saira Stencil"', 'Đâyệ'),
      document.fonts.load('700 16px "Saira Stencil"', 'Đâyệ'),
    ]);
  } catch {
    // Fall back to the system font rather than block the game.
  }
}

// ?lang=en lets us try the English UI before the Phase 5 menu has a language switch.
const lang = new URLSearchParams(location.search).get('lang');
if (isLocale(lang)) {
  setLocale(lang);
  document.documentElement.lang = lang;
}

await loadFonts();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.backgroundColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
});
