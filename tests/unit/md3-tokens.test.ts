import { describe, expect, it } from 'vitest';
import { md3SemanticTokens, md3Tokens } from '../../src/tokens/md3.ts';

describe('MD3 Design Tokens', () => {
  it('defines standard MD3 radii, spacing, durations, and easings', () => {
    expect(md3Tokens.radii.medium.value).toBe('12px');
    expect(md3Tokens.radii.full.value).toBe('9999px');
    expect(md3Tokens.spacing['4'].value).toBe('16px');
    expect(md3Tokens.durations.medium1.value).toBe('250ms');
    expect(md3Tokens.easings.standard.value).toContain('cubic-bezier');
  });

  it('defines light and dark semantic color tokens and elevations', () => {
    expect(md3SemanticTokens.colors.primary.value._light).toBe('#859900');
    expect(md3SemanticTokens.colors.surface.value._light).toBe('#eee8d5');
    expect(md3SemanticTokens.colors.surface.value._dark).toBe('#073642');
    expect(md3SemanticTokens.shadows.elevation1.value).toContain('rgba');
  });
});
