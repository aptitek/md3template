import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from './locales.ts';

export interface A11yDictionary {
  readonly appMain: string;
  readonly appTitle: string;
  readonly appDescription: string;
  readonly errorTitle: string;
  readonly errorBoundaryLabel: string;
  readonly notFoundTitle: string;
  readonly notFoundDetails: string;
  readonly unexpectedErrorDetails: string;
}

export const A11Y_STRINGS: Record<Locale, A11yDictionary> = {
  en: {
    appMain: 'Main application content',
    appTitle: 'MD3 Template',
    appDescription: 'Material Design 3 & React Router Template',
    errorTitle: 'Error',
    errorBoundaryLabel: 'Diagnostic error boundary',
    notFoundTitle: '404',
    notFoundDetails: 'The requested page could not be found.',
    unexpectedErrorDetails: 'An unexpected error occurred.',
  },
  fr: {
    appMain: 'Contenu principal de l’application',
    appTitle: 'Modèle MD3',
    appDescription: 'Modèle Material Design 3 et React Router',
    errorTitle: 'Erreur',
    errorBoundaryLabel: 'Frontière d’erreur diagnostique',
    notFoundTitle: '404',
    notFoundDetails: 'La page demandée est introuvable.',
    unexpectedErrorDetails: 'Une erreur inattendue est survenue.',
  },
} as const;

export type A11yStringKey = keyof A11yDictionary;

export const i18n = i18next.createInstance();

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: A11Y_STRINGS.en },
      fr: { translation: A11Y_STRINGS.fr },
    },
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
  });

export function resolveA11yString(locale: string, key: A11yStringKey): string {
  const validLocale: Locale = isSupportedLocale(locale)
    ? locale
    : DEFAULT_LOCALE;
  return i18n.getFixedT(validLocale)(key);
}
