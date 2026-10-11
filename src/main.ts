import '@fontsource/saira-stencil/400.css';
import '@fontsource/saira-stencil/700.css';
import './style.css';
import Phaser from 'phaser';
import { DISPLAY } from './config';
import { isLocale } from './i18n';
import { applyLocale } from './locale';
import { BootScene } from './scenes/BootScene';
import { ConfirmScene } from './scenes/ConfirmScene';
import { HowToScene } from './scenes/HowToScene';
import { MenuScene } from './scenes/MenuScene';
import { RankingsScene } from './scenes/RankingsScene';
import { ResultScene } from './scenes/ResultScene';
import { TableScene } from './scenes/TableScene';
import { browserStore, loadLocale } from './session/profile';

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

// ?lang=en wins for a quick check; otherwise the language picked in the menu last time.
const fromUrl = new URLSearchParams(location.search).get('lang');
const saved = loadLocale(browserStore());
applyLocale(isLocale(fromUrl) ? fromUrl : isLocale(saved) ? saved : 'vi');

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
  scene: [BootScene, MenuScene, HowToScene, RankingsScene, TableScene, ResultScene, ConfirmScene],
});
