/**
 * Material Design 3 Design System Tokens
 * Mathematical definitions for MD3 color roles, motion physics, elevation lattices, and spacing.
 * Calibrated strictly to Solarized color harmonies with zero pure white/black or M3e fallbacks.
 */

export const md3Breakpoints = {
  sm: '600px',
  md: '840px',
  lg: '1200px',
  xl: '1600px',
  '2xl': '1920px',
} as const;

export const md3Tokens = {
  radii: {
    none: { value: '0px' },
    extraSmall: { value: '4px' },
    small: { value: '8px' },
    medium: { value: '12px' },
    large: { value: '16px' },
    extraLarge: { value: '28px' },
    full: { value: '9999px' },
  },
  borderWidths: {
    none: { value: '0px' },
    thin: { value: '1px' },
    medium: { value: '2px' },
    thick: { value: '3px' },
    heavy: { value: '4px' },
  },
  spacing: {
    '0': { value: '0px' },
    '0.5': { value: '2px' },
    '1': { value: '4px' },
    '1.5': { value: '6px' },
    '2': { value: '8px' },
    '2.5': { value: '10px' },
    '3': { value: '12px' },
    '4': { value: '16px' },
    '5': { value: '20px' },
    '6': { value: '24px' },
    '7': { value: '28px' },
    '8': { value: '32px' },
    '10': { value: '40px' },
    '12': { value: '48px' },
    '14': { value: '56px' },
    '16': { value: '64px' },
  },
  durations: {
    short1: { value: '50ms' },
    short2: { value: '100ms' },
    short3: { value: '150ms' },
    short4: { value: '200ms' },
    medium1: { value: '250ms' },
    medium2: { value: '300ms' },
    medium3: { value: '350ms' },
    medium4: { value: '400ms' },
    long1: { value: '450ms' },
    long2: { value: '500ms' },
    long3: { value: '550ms' },
    long4: { value: '600ms' },
    extraLong1: { value: '700ms' },
    extraLong2: { value: '800ms' },
    extraLong3: { value: '900ms' },
    extraLong4: { value: '1000ms' },
  },
  easings: {
    linear: { value: 'cubic-bezier(0, 0, 1, 1)' },
    standard: { value: 'cubic-bezier(0.2, 0, 0, 1)' },
    standardAccelerate: { value: 'cubic-bezier(0.3, 0, 1, 1)' },
    standardDecelerate: { value: 'cubic-bezier(0, 0, 0, 1)' },
    emphasized: { value: 'cubic-bezier(0.2, 0, 0, 1)' },
    emphasizedAccelerate: { value: 'cubic-bezier(0.3, 0, 0.8, 0.15)' },
    emphasizedDecelerate: { value: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
  },
} as const;

const c = (light: string, dark: string) => ({
  value: {
    base: light,
    _light: light,
    _dark: dark,
  },
});

export const md3SemanticTokens = {
  colors: {
    primary: c('#859900', '#859900'),
    onPrimary: c('#002b36', '#002b36'),
    primaryContainer: c('rgba(133, 153, 0, 0.14)', 'rgba(133, 153, 0, 0.20)'),
    onPrimaryContainer: c('#073642', '#fdf6e3'),
    secondary: c('#d33682', '#d33682'),
    onSecondary: c('#fdf6e3', '#fdf6e3'),
    secondaryContainer: c('#d33682', '#d33682'),
    onSecondaryContainer: c('#fdf6e3', '#fdf6e3'),
    tertiary: c('#268bd2', '#268bd2'),
    onTertiary: c('#002b36', '#002b36'),
    tertiaryContainer: c(
      'rgba(38, 139, 210, 0.14)',
      'rgba(38, 139, 210, 0.20)'
    ),
    onTertiaryContainer: c('#073642', '#fdf6e3'),
    error: c('#dc322f', '#dc322f'),
    onError: c('#fdf6e3', '#fdf6e3'),
    errorContainer: c('rgba(220, 50, 47, 0.14)', 'rgba(220, 50, 47, 0.20)'),
    onErrorContainer: c('#073642', '#fdf6e3'),
    surface: c('#eee8d5', '#073642'),
    onSurface: c('#073642', '#fdf6e3'),
    surfaceVariant: c('#eee8d5', '#073642'),
    onSurfaceVariant: c('#586e75', '#93a1a1'),
    surfaceDim: c('#eee8d5', '#002b36'),
    surfaceBright: c('#fdf6e3', 'rgba(147, 161, 161, 0.12)'),
    surfaceContainerLowest: c('#fdf6e3', '#002b36'),
    surfaceContainerLow: c('#eee8d5', '#002b36'),
    surfaceContainer: c('#eee8d5', '#073642'),
    surfaceContainerHigh: c(
      'rgba(7, 54, 66, 0.06)',
      'rgba(147, 161, 161, 0.08)'
    ),
    surfaceContainerHighest: c(
      'rgba(7, 54, 66, 0.10)',
      'rgba(147, 161, 161, 0.14)'
    ),
    outline: c('rgba(7, 54, 66, 0.20)', 'rgba(147, 161, 161, 0.22)'),
    outlineVariant: c('rgba(7, 54, 66, 0.10)', 'rgba(147, 161, 161, 0.12)'),
    shadow: c('rgba(7, 54, 66, 0.25)', 'rgba(0, 43, 54, 0.70)'),
    scrim: c('rgba(0, 43, 54, 0.60)', 'rgba(0, 43, 54, 0.85)'),
    inverseSurface: c('#073642', '#eee8d5'),
    inverseOnSurface: c('#fdf6e3', '#073642'),
    inversePrimary: c('#859900', '#859900'),
    background: c('#fdf6e3', '#002b36'),
    onBackground: c('#073642', '#fdf6e3'),
    surfaceTint: c('#859900', '#859900'),
  },
  shadows: {
    elevation0: { value: 'none' },
    elevation1: {
      value:
        '0px 1px 2px rgba(7, 54, 66, 0.12), 0px 1px 3px 1px rgba(7, 54, 66, 0.08)',
    },
    elevation2: {
      value:
        '0px 1px 2px rgba(7, 54, 66, 0.14), 0px 2px 6px 2px rgba(7, 54, 66, 0.10)',
    },
    elevation3: {
      value:
        '0px 1px 3px rgba(7, 54, 66, 0.16), 0px 4px 8px 3px rgba(7, 54, 66, 0.12)',
    },
    elevation4: {
      value:
        '0px 2px 3px rgba(7, 54, 66, 0.18), 0px 6px 10px 4px rgba(7, 54, 66, 0.14)',
    },
    elevation5: {
      value:
        '0px 4px 4px rgba(7, 54, 66, 0.20), 0px 8px 12px 6px rgba(7, 54, 66, 0.16)',
    },
  },
} as const;

export const md3Recipes = {
  surfaceCard: {
    className: 'md3-surface-card',
    base: {
      display: 'flex',
      flexDirection: 'column',
      bg: 'surfaceContainer',
      color: 'onSurface',
    },
    variants: {
      size: {
        md: {
          gap: '4',
          padding: '6',
          borderRadius: 'medium',
        },
        lg: {
          gap: '4',
          padding: '6',
          borderRadius: 'large',
        },
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  },
} as const;
