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

  it('uses the same placeholders in every language', () => {
    const placeholders = (message: string) =>
      [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(vi) as (keyof typeof vi)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(vi[key]));
    }
  });

  it('defaults to Vietnamese and switches language', () => {
    expect(getLocale()).toBe('vi');
    expect(t('menu.tagline')).toBe(vi['menu.tagline']);
    setLocale('en');
    expect(t('menu.tagline')).toBe(en['menu.tagline']);
  });

  it('fills placeholders and keeps unknown ones', () => {
    expect(t('menu.mode', { n: 5 })).toBe('BEST OF 5');
    expect(t('lever.counter', { a: 1 })).toBe('Đã kéo 1 / {b}');
  });

  it('recognises supported locales only', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
