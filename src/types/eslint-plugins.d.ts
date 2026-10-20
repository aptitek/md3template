declare module 'eslint-plugin-jsx-a11y' {
  import type { Linter } from 'eslint';

  const plugin: {
    readonly flatConfigs: {
      readonly recommended: Linter.Config;
    };
  };
  export default plugin;
}
