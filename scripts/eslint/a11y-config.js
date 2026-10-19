/**
 * Anti-Gravity Accessibility (a11y) & ARIA Fortress ESLint Configuration
 * Enforces WCAG 2.2 AA compliance, W3C ARIA specifications, and component mappings.
 */
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

export const a11yComponentMapping = {
  // Panda CSS Layout Primitives mapped to semantic HTML elements
  Box: 'div',
  Flex: 'div',
  Stack: 'div',
  Grid: 'div',
  HStack: 'div',
  VStack: 'div',
  Center: 'div',
  Container: 'div',

  // Material Design 3 Primitives mapped to interactive and media elements
  M3eButton: 'button',
  M3eIconButton: 'button',
  M3eFab: 'button',
  M3eExtendedFab: 'button',
  M3eSegmentedButton: 'button',
  M3eCheckbox: 'input',
  M3eSwitch: 'input',
  M3eRadio: 'input',
  M3eTextField: 'input',
  M3eSelect: 'select',
  M3eDialog: 'dialog',
  M3eLink: 'a',

  // Media components
  Image: 'img',
  Thumbnail: 'img',
  Avatar: 'img',
};

export function createA11yConfig(plugin = jsxA11yPlugin) {
  return {
    ...plugin.flatConfigs.recommended,
    files: ['src/**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    settings: {
      'jsx-a11y': {
        components: a11yComponentMapping,
      },
    },
    rules: {
      ...plugin.flatConfigs.recommended.rules,

      // --- ARIA Specification & Property Enforcement ---
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
      'jsx-a11y/no-aria-hidden-on-focusable': 'error',

      // --- Alt Text & Text Alternatives Enforcement ---
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/img-redundant-alt': 'error',

      // --- Interactive Controls & Semantic Roles ---
      'jsx-a11y/control-has-associated-label': [
        'error',
        {
          ignoreElements: [
            'audio',
            'canvas',
            'embed',
            'input',
            'textarea',
            'tr',
            'video',
          ],
          ignoreRoles: [
            'grid',
            'listbox',
            'menu',
            'menubar',
            'radiogroup',
            'row',
            'tablist',
            'toolbar',
            'tree',
            'treegrid',
          ],
          includeRoles: [
            'button',
            'link',
            'checkbox',
            'menuitem',
            'menuitemcheckbox',
            'menuitemradio',
            'option',
            'radio',
            'switch',
            'tab',
          ],
        },
      ],
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
    },
  };
}

export const a11yConfig = createA11yConfig();
