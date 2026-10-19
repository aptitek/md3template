import { defineConfig } from '@pandacss/dev';
import { md3Recipes, md3SemanticTokens, md3Tokens } from './src/tokens/md3.ts';

export default defineConfig({
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
  preflight: true,
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  theme: {
    extend: {
      tokens: md3Tokens,
      semanticTokens: md3SemanticTokens,
      recipes: md3Recipes,
    },
  },
  outdir: 'styled-system',
  jsxFramework: 'react',
  jsxFactory: 'panda',
});
