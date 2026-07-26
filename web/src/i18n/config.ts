/** Supported languages. English is the source; the rest fall back to it until translated. */
export const locales = ['en', 'nl', 'fr', 'de', 'zh', 'it', 'tr'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Native names shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  it: 'Italiano',
  tr: 'Türkçe',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
