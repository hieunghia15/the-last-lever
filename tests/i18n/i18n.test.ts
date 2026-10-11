import { afterEach, describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { getLocale, isLocale, setLocale, t } from '../../src/i18n';
import { vi } from '../../src/i18n/vi';

afterEach(() => setLocale('vi'));

describe('i18n', () => {
  it('has the same keys in every language', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
  });

  it('has no empty messages', () => {
    for (const catalog of [vi, en]) {
      for (const message of Object.values(catalog)) {
        expect(message.trim()).not.toBe('');
      }
    }
  });

  it('defaults to Vietnamese and switches language', () => {
    expect(getLocale()).toBe('vi');
    expect(t('boot.tagline')).toBe(vi['boot.tagline']);
    setLocale('en');
    expect(t('boot.tagline')).toBe(en['boot.tagline']);
  });

  it('fills placeholders and keeps unknown ones', () => {
    expect(t('boot.locale', { locale: 'vi' })).toBe('Ngôn ngữ: vi');
    expect(t('boot.locale', {})).toBe('Ngôn ngữ: {locale}');
  });

  it('recognises supported locales only', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
