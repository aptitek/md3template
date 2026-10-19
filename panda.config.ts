import { defineConfig } from '@pandacss/dev';
import {
  md3Breakpoints,
  md3Recipes,
  md3SemanticTokens,
  md3Tokens,
} from './src/tokens/md3.ts';

export default defineConfig({
  presets: ['@pandacss/preset-base'],
  preflight: true,
  strictTokens: true,
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  theme: {
    breakpoints: md3Breakpoints,
    tokens: md3Tokens,
    semanticTokens: md3SemanticTokens,
    recipes: md3Recipes,
  },
  outdir: 'styled-system',
  jsxFramework: 'react',
  jsxFactory: 'panda',
});
