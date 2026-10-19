/**
 * Anti-Gravity Architectural Guardrails & Restricted Rules
 *
 * Enforces:
 * 1. Deprecation & prohibition of MUI (@mui/*) and Emotion (@emotion/*) in favor of MD3 (@m3e/react) + Panda CSS.
 * 2. Prohibition of Tailwind CSS directives and utility classes.
 * 3. Total ban on inline style attributes and document.createElement.
 * 4. Total ban on intrinsic lowercase HTML tags (div, span, button, etc.).
 * 5. Total ban on thin wrapper components and styled factories.
 * 6. Total ban on legacy wildcard barrel exports (export * from '...').
 * 7. Total ban on hardcoded text literals in JSX and default props (forcing i18n).
 * 8. Total ban on textual content in CSS styles.
 */

export const restrictedImportsRule = [
  'error',
  {
    paths: [
      {
        name: '@mui/material',
        message:
          'MUI is deprecated. Use Material Design 3 components from @m3e/react and Panda CSS atomic layout.',
      },
      {
        name: '@mui/system',
        message:
          'MUI is deprecated. Use Material Design 3 components from @m3e/react and Panda CSS atomic layout.',
      },
      {
        name: '@mui/icons-material',
        message:
          'MUI is deprecated. Use Material Design 3 icons from @m3e/icons.',
      },
      {
        name: '@emotion/react',
        message:
          'Emotion is prohibited. Use Panda CSS compile-time atomic styles.',
      },
      {
        name: '@emotion/styled',
        message:
          'Emotion is prohibited. Use Panda CSS compile-time atomic styles.',
      },
      {
        name: '@tailwindcss/vite',
        message:
          'Tailwind CSS is disallowed in favor of Material Design 3 tokens and Panda CSS.',
      },
      {
        name: 'tailwindcss',
        message:
          'Tailwind CSS is disallowed in favor of Material Design 3 tokens and Panda CSS.',
      },
      {
        name: 'styled-system/patterns',
        message:
          'Importing pattern functions from styled-system/patterns is prohibited to prevent bypassing JSX style limits. Use Panda JSX layout primitives (<Box>, <Flex>, <Grid>, <Stack>, <HStack>, <VStack>, <Center>, <Container>) from "styled-system/jsx" or cva()/sva() recipes.',
      },
    ],
    patterns: [
      {
        group: ['@mui/*'],
        message:
          'MUI is deprecated in this ecosystem. Migrate to @m3e/react and Panda CSS.',
      },
      {
        group: ['@emotion/*'],
        message: 'Emotion is prohibited. Migrate to Panda CSS.',
      },
      {
        group: ['*/styled-system/patterns', '*/styled-system/patterns/*'],
        message:
          'Importing pattern functions from styled-system/patterns is prohibited. Use Panda JSX layout primitives from "styled-system/jsx" or cva()/sva() recipes.',
      },
    ],
  },
];

export const restrictedSyntaxRules = [
  // Rule 1: Prohibition of Intrinsic HTML Elements (except document root shell html/head/meta and M3 custom elements md-*/m3e-*) and Generic Panda HTML Wrappers
  {
    selector:
      'JSXOpeningElement > JSXIdentifier[name=/^[a-z]/][name!=/^(html|head|meta)$/][name!=/^(md|m3e)-/]',
    message:
      'Direct usage of intrinsic HTML element "<{{name}}>" is strictly forbidden. Use Panda CSS atomic layout components (<Box>, <Flex>, <Stack>, etc. from "styled-system/jsx") for layout, and Material Design 3 components (@m3e/react: <M3eButton>, <M3eCard>, <M3eTextField>, or <md-*>/<m3e-*> custom elements) for UI primitives.',
  },
  {
    selector:
      'JSXOpeningElement > JSXMemberExpression[property.name=/^(div|span|p|button|a|img|input|html|head|meta|link|script|style|title)$/]',
    message:
      'Direct usage of generic <panda.*> HTML/metadata wrappers (<panda.div>, <panda.span>, <panda.p>, <panda.button>, <panda.meta>, etc.) is strictly forbidden. Use dedicated Panda CSS layout primitives (<Box>, <Flex>, <Grid>, <Stack>, <HStack>, <VStack>, <Center>, etc.), Material Design 3 components, or native <html/>/<head/>/<meta/> in the document shell.',
  },
  {
    selector: 'JSXOpeningElement > JSXMemberExpression[object.name!="panda"]',
    message:
      'Aliased or non-panda JSX member expressions (<{{object.name}}.{{property.name}}>) are forbidden. Use canonical <panda.main>, <panda.header>, <panda.section>, <panda.h1> or Panda layout components.',
  },
  // Rule 2: Prohibition of Direct DOM Element Creation
  {
    selector:
      'CallExpression[callee.object.name="document"][callee.property.name="createElement"]',
    message:
      'Direct DOM manipulation via document.createElement is prohibited. Use Panda CSS layout components or MD3 elements.',
  },
  // Rule 3: Absolute Ban on Inline Style Attributes
  {
    selector: "JSXAttribute[name.name='style']",
    message:
      'Inline `style` attributes are prohibited altogether. Raw styles must be placed in clean CSS files, tokens, or Panda CSS utilities.',
  },
  // Rule 4: Prohibition of Tailwind Utility Classes in className
  {
    selector:
      "JSXAttribute[name.name='className'] > Literal[value=/(?:^|\\s)(?:!size-|flex-col|items-center|justify-between|p-\\d|m-\\d|text-[a-z0-9]|bg-[a-z0-9])/]",
    message:
      'Tailwind utility syntax is forbidden in className. Use Panda CSS atomic components or MD3 component tokens.',
  },
  // Rule 5: Prohibition of Thin Wrapper Factories
  {
    selector: 'MemberExpression[object.name="styled"][property.name=/^[a-z]/]',
    message:
      'Creating styled elements via styled.tag is prohibited. Use Panda CSS atomic components (<Box>, <Flex>, etc. from "styled-system/jsx") or MD3 primitives.',
  },
  {
    selector:
      'CallExpression[callee.name="styled"][arguments.0.type="Literal"]',
    message:
      'Creating styled elements via styled("tag") is prohibited. Use Panda CSS atomic layout components or MD3 primitives.',
  },
  // Rule 6: Prohibition of Thin Wrapper Component Names
  {
    selector:
      'VariableDeclarator[id.name=/^(Div|Span|ButtonWrapper|CustomButton|BoxWrapper|TextWrapper|HeadingWrapper)$/]',
    message:
      'Creating thin wrapper components named "{{id.name}}" is prohibited. Consume Panda CSS atomic layout or MD3 primitives directly.',
  },
  // Rule 7: Prohibition of Legacy Wildcard Barrel Exports
  {
    selector: 'ExportAllDeclaration',
    message:
      'Legacy wildcard barrel exports (export * from "...") are strictly prohibited. Import and export symbols explicitly and canonically.',
  },
  // Rule 8: Prohibition of Hardcoded Content in JSX & Component Variables (Separation of Concerns)
  {
    selector: 'JSXElement > JSXText[value=/[a-zA-Z0-9]/]',
    message:
      'Raw text literal detected in JSX. Separation of Concerns violation: all user-facing content must originate from i18n MDX content files.',
  },
  {
    selector:
      'JSXElement > JSXExpressionContainer > Literal[value=/[a-zA-Z0-9]/]',
    message:
      'Hardcoded string literal in JSX is prohibited. Separation of Concerns violation: content must be imported from i18n MDX files.',
  },
  {
    selector: 'JSXElement > JSXExpressionContainer > TemplateLiteral',
    message:
      'Hardcoded template literal in JSX is prohibited. Separation of Concerns violation: content must be imported from i18n MDX files.',
  },
  {
    selector:
      'JSXElement > JSXExpressionContainer :matches(BinaryExpression, LogicalExpression, ArrayExpression, CallExpression[callee.name="String"]) > Literal[value=/[a-zA-Z\u00C0-\u024F]/]',
    message:
      'Hardcoded string literal inside JSX expression (concatenation, array, or String() call) is prohibited. All user-facing content must originate from i18n resources.',
  },
  {
    selector:
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) VariableDeclarator > Literal[value=/[a-zA-Z\u00C0-\u024F]{2,}\\s+[a-zA-Z\u00C0-\u024F]{2,}/]',
    message:
      'Hardcoded prose string assigned to a variable inside a function is prohibited. All user-facing content must originate from i18n resources.',
  },
  {
    selector:
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) VariableDeclarator[id.name=/^(label|text|title|heading|subtitle|message|description|caption|content|copy|placeholder|buttonText|cta|errorText|emptyText|helperText)$/] > Literal[value=/[a-zA-Z\u00C0-\u024F]/]',
    message:
      'Hardcoded UI string assigned to a local variable inside a function is prohibited. All user-facing content must originate from i18n resources.',
  },
  {
    selector:
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) VariableDeclarator > TemplateLiteral[expressions.length=0]',
    message:
      'Static template literal assigned to a variable inside a function is prohibited. All user-facing content must originate from i18n resources.',
  },
  // Rule 9: Prohibition of Text Content in Styles
  {
    selector:
      'Property[key.name="content"][value.type="Literal"][value.value!=""][value.value!="none"]',
    message:
      'Presentation layers must not declare textual content in CSS/styles.',
  },
  // Rule 10: Hardcoded Localized String in Component Default Props
  {
    selector:
      'AssignmentPattern[left.name=/^(label|title|ariaLabel|placeholder|alt|helperText|description|pdfLabel)$/] > Literal[value=/[a-zA-Z\u00C0-\u024F]/]',
    message:
      'Hardcoded localized string detected in component default prop value. Content must originate from i18n MDX files.',
  },
  // Rule 11: Hardcoded Localized String in Fallback Expressions
  {
    selector:
      'VariableDeclarator[id.name=/^(label|title|ariaLabel|placeholder|alt|helperText|description|pdfLabel)$/] LogicalExpression[operator=/(?:\\|\\||\\?\\?)/] > Literal[value=/[a-zA-Z\u00C0-\u024F]/]',
    message:
      'Hardcoded localized string detected in fallback expression. Content must originate from i18n MDX files.',
  },
  // Rule 12: Hardcoded Localized String in Accessibility and Alt Attributes (Direct Literal)
  {
    selector:
      'JSXAttribute[name.name=/^(alt|aria-label|aria-placeholder|aria-roledescription|aria-valuetext|title)$/] > Literal[value=/[a-zA-Z\u00C0-\u024F]/]',
    message:
      'Hardcoded localized string detected in attribute "{{name.name}}". Separation of Concerns violation: all user-facing alt text and accessibility labels must originate from i18n content.',
  },
  // Rule 13: Hardcoded Localized String in Accessibility and Alt Attributes (Expression Literal)
  {
    selector:
      'JSXAttribute[name.name=/^(alt|aria-label|aria-placeholder|aria-roledescription|aria-valuetext|title)$/] > JSXExpressionContainer > Literal[value=/[a-zA-Z\u00C0-\u024F]/]',
    message:
      'Hardcoded localized string detected in attribute "{{name.name}}". Separation of Concerns violation: all user-facing alt text and accessibility labels must originate from i18n content.',
  },
];
