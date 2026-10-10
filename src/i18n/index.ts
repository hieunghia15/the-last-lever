import { en } from './en';
import { vi, type MessageKey, type Messages } from './vi';

export type { MessageKey } from './vi';

export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

const catalogs: Record<Locale, Messages> = { vi, en };

let current: Locale = 'vi';

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Looks up a message and fills `{name}` placeholders; unknown placeholders are left as-is. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = catalogs[current][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
