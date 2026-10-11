import { setLocale, t, type Locale } from './i18n';
import { browserStore, saveLocale } from './session/profile';

/** Switches the UI language everywhere outside Phaser too (page lang, rotate overlay). */
export function applyLocale(locale: Locale, opts: { save?: boolean } = {}): void {
  setLocale(locale);
  document.documentElement.lang = locale;
  // The rotate overlay is plain DOM so it works even before Phaser boots.
  const rotateMessage = document.getElementById('rotate-message');
  if (rotateMessage) rotateMessage.textContent = t('rotate.message');
  if (opts.save) saveLocale(browserStore(), locale);
}
