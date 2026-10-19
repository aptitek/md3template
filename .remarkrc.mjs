import remarkLint from 'remark-lint';
import remarkPresetLintConsistent from 'remark-preset-lint-consistent';
import remarkPresetLintRecommended from 'remark-preset-lint-recommended';

export default {
  plugins: [
    remarkLint,
    remarkPresetLintRecommended,
    remarkPresetLintConsistent,
  ],
};
