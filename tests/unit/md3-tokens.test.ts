import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { token } from 'styled-system/tokens';
import pandaConfig from '../../panda.config.ts';
import {
  md3Breakpoints,
  md3Recipes,
  md3SemanticTokens,
  md3Tokens,
} from '../../src/tokens/md3.ts';

describe('MD3 Design Tokens & Recipes', () => {
  it('defines standard MD3 radii, spacing, durations, breakpoints, and easings synchronized with theme.css', () => {
    const themeCss = readFileSync('src/theme/theme.css', 'utf-8');
    expect(md3Tokens.radii.small.value).toBe('8px');
    expect(md3Tokens.radii.medium.value).toBe('12px');
    expect(md3Tokens.radii.large.value).toBe('16px');
    expect(md3Tokens.radii.extraLarge.value).toBe('28px');
    expect(md3Tokens.radii.full.value).toBe('9999px');
    expect(md3Tokens.spacing['4'].value).toBe('16px');
    expect(md3Tokens.durations.short3.value).toBe('150ms');
    expect(md3Tokens.durations.medium1.value).toBe('250ms');
    expect(md3Tokens.easings.standard.value).toContain('cubic-bezier');
    expect(md3Breakpoints.md).toBe('840px');

    expect(themeCss).toContain('--radius-sm: 8px;');
    expect(themeCss).toContain('--radius-md: 12px;');
    expect(themeCss).toContain('--motion-fast: 150ms;');
    expect(themeCss).toContain('--theme-background: #fdf6e3;');
  });

  it('defines light and dark semantic color tokens, elevations, and recipes', () => {
    expect(md3SemanticTokens.colors.primary.value._light).toBe('#859900');
    expect(md3SemanticTokens.colors.background.value._light).toBe('#fdf6e3');
    expect(md3SemanticTokens.colors.surface.value._light).toBe('#eee8d5');
    expect(md3SemanticTokens.colors.surface.value._dark).toBe('#073642');
    expect(md3SemanticTokens.shadows.elevation1.value).toContain('rgba');
    expect(md3Recipes.surfaceCard.defaultVariants.size).toBe('lg');
  });

  it('purges @pandacss/preset-panda and default Tailwind palette tokens (e.g. emerald.500)', () => {
    expect(pandaConfig.presets).toEqual(['@pandacss/preset-base']);
    expect(pandaConfig.strictTokens).toBe(true);
    expect(token('colors.primary')).toBe('var(--colors-primary)');
    expect(
      token.var('colors.emerald.500' as Parameters<typeof token.var>[0])
    ).toBeUndefined();
  });
});
