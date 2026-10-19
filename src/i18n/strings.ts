import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from './locales.ts';

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

export function resolveA11yString(locale: string, key: A11yStringKey): string {
  const validLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  return A11Y_STRINGS[validLocale][key];
}
