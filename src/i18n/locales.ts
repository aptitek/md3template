export const SUPPORTED_LOCALES = ['en', 'fr'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isSupportedLocale(value: string): boolean {
  return value === 'en' || value === 'fr';
}

export function resolveLocale(value: string): Locale {
  return value === 'fr' ? 'fr' : DEFAULT_LOCALE;
}
