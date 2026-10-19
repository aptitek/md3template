const ESLINT_CACHE_ARGS =
  '--cache --cache-location node_modules/.cache/eslint/ --cache-strategy metadata';
const PRETTIER_CACHE_ARGS =
  '--cache --cache-location node_modules/.cache/prettier/.prettiercache --cache-strategy metadata';

export default {
  '*.{js,mjs,cjs,jsx,ts,tsx}': (filenames) => {
    const files = filenames.filter(
      (f) => !f.includes('.agents/') && !f.endsWith('worker-configuration.d.ts')
    );
    if (!files.length) return [];

    const commands = [
      `eslint --fix ${ESLINT_CACHE_ARGS} --max-warnings=0 ${files.join(' ')}`,
      `prettier --write ${PRETTIER_CACHE_ARGS} ${files.join(' ')}`,
    ];

    if (files.some((f) => f.includes('src/'))) {
      commands.push('node scripts/lint-error-boundaries.mjs');
    }

    return commands;
  },
  '*.css': (filenames) => {
    const files = filenames.filter((f) => !f.includes('.agents/'));
    return files.length
      ? [
          `eslint --fix ${ESLINT_CACHE_ARGS} --max-warnings=0 ${files.join(' ')}`,
          `prettier --write ${PRETTIER_CACHE_ARGS} ${files.join(' ')}`,
        ]
      : [];
  },
  '*.md': (filenames) => {
    const files = filenames.filter((f) => !f.includes('.agents/'));
    return files.length
      ? [
          `remark --frail ${files.join(' ')}`,
          `node scripts/lint-markdown-structure.mjs ${files.join(' ')}`,
          `prettier --write ${PRETTIER_CACHE_ARGS} ${files.join(' ')}`,
        ]
      : [];
  },
  '*.mdx': (filenames) => {
    const files = filenames.filter((f) => !f.includes('.agents/'));
    return files.length
      ? [
          `node scripts/lint-mdx-purity.mjs ${files.join(' ')}`,
          `prettier --write ${PRETTIER_CACHE_ARGS} ${files.join(' ')}`,
        ]
      : [];
  },
  '*.{json,jsonc,yml,yaml}': (filenames) => {
    const files = filenames.filter((f) => !f.includes('.agents/'));
    return files.length
      ? [`prettier --write ${PRETTIER_CACHE_ARGS} ${files.join(' ')}`]
      : [];
  },
};
