import { defineConfig } from '@pandacss/dev';
import { md3Tokens, md3SemanticTokens } from './src/tokens/md3.ts';

export default defineConfig({
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
  preflight: true,
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  theme: {
    extend: {
      tokens: md3Tokens,
      semanticTokens: md3SemanticTokens,
    },
  },
  outdir: 'styled-system',
  jsxFramework: 'react',
  jsxFactory: 'panda',
});
