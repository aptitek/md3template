/**
 * Typed AST Helpers for Material Design 3 CSS Token & Native Preservation Plugin
 */

export interface CssAstNode {
  readonly type: string;
  readonly name?: string | { readonly name?: string };
  readonly value?: string | { readonly children?: readonly CssAstNode[] };
  readonly property?: string;
  readonly important?: boolean;
  readonly prelude?: { readonly children?: readonly CssAstNode[] };
  readonly children?: readonly CssAstNode[];
}

export interface CssRuleContext {
  readonly sourceCode: {
    getText(node?: CssAstNode | object): string;
  };
  report(descriptor: {
    readonly node: CssAstNode;
    readonly messageId: string;
    readonly data?: Readonly<Record<string, string>>;
  }): void;
}

export const COLOR_FUNCS: ReadonlySet<string> = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
]);

export const COLOR_PROPS: ReadonlySet<string> = new Set([
  'color',
  'background-color',
  'border-color',
  'outline-color',
  'fill',
  'stroke',
]);

export const ALLOWED_COLOR_IDS: ReadonlySet<string> = new Set([
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'none',
]);

const THEME_TOKEN_PREFIXES: readonly string[] = [
  '--theme-',
  '--colors-',
  '--md-sys-color-',
  '--m3e-',
  '--fancy-switch-',
  '--switch-',
  '--vertical-nav-bar-',
  '--vertical-app-bar-',
  '--map-pin-',
  '--ticker-',
  '--print-page-',
  '--shape-',
  '--number-picker-',
  '--email-field-',
  '--segmented-chip-',
  '--pill-chip-',
  '--hold-button-',
  '--hold-',
  '--mesh-',
  '--holo-',
  '--aurora-',
  '--color-',
  '--social-',
  '--shadows-',
];

export function getNodeName(node: CssAstNode): string {
  if (typeof node.name === 'string') return node.name;
  return node.name?.name ?? '';
}

function isOverrideSelectorChild(child: CssAstNode): boolean {
  if (child.type === 'ClassSelector') {
    const n = getNodeName(child);
    return (
      n === 'override' || n.startsWith('override-') || n.endsWith('-override')
    );
  }
  if (child.type === 'AttributeSelector') {
    const attr = getNodeName(child);
    return attr === 'data-override' || attr === 'override';
  }
  return false;
}

export function isOverrideSelector(selector?: CssAstNode): boolean {
  return selector?.children?.some(isOverrideSelectorChild) ?? false;
}

export function isNativeComponent(name: string): boolean {
  return name.startsWith('m3e-') || name.startsWith('md-');
}

function checkSelectorChild(child: CssAstNode, context: CssRuleContext): void {
  const childName = getNodeName(child);
  if (child.type === 'TypeSelector' && isNativeComponent(childName)) {
    context.report({
      node: child,
      messageId: 'unscopedComponent',
      data: { name: childName },
    });
    return;
  }
  if (child.type === 'PseudoElementSelector' && childName === 'part') {
    const firstArg = child.children?.[0];
    const rawPart =
      typeof firstArg?.value === 'string' ? firstArg.value : 'unknown';
    context.report({
      node: child,
      messageId: 'unscopedPart',
      data: { name: rawPart.trim() },
    });
  }
}

export function checkRuleSelectors(
  node: CssAstNode,
  context: CssRuleContext
): void {
  for (const selector of node.prelude?.children ?? []) {
    if (selector.type !== 'Selector' || isOverrideSelector(selector)) continue;
    for (const child of selector.children ?? []) {
      checkSelectorChild(child, context);
    }
  }
}

export function isUniversalSelector(selector: CssAstNode): boolean {
  return (
    selector.children?.some(
      (c) => c.type === 'TypeSelector' && getNodeName(c) === '*'
    ) ?? false
  );
}

export function isThemeTokenVar(varName: string): boolean {
  return THEME_TOKEN_PREFIXES.some((prefix) => varName.startsWith(prefix));
}

export function isColorProperty(prop: string): boolean {
  return (
    COLOR_PROPS.has(prop) ||
    prop.endsWith('-color') ||
    prop.startsWith('border') ||
    prop.startsWith('outline') ||
    prop === 'box-shadow' ||
    prop === 'background'
  );
}

export function getDeclarationValueChildren(
  node: CssAstNode
): readonly CssAstNode[] {
  if (node.value && typeof node.value === 'object' && node.value.children) {
    return node.value.children;
  }
  return [];
}

function parseCssVarText(
  varText: string
): { readonly varName: string; readonly fallback: string } | null {
  const trimmed = varText.trim();
  if (!trimmed.startsWith('var(') || !trimmed.endsWith(')')) return null;
  const inner = trimmed.slice(4, -1).trim();
  const commaIdx = inner.indexOf(',');
  const varName = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
  const fallback = commaIdx === -1 ? '' : inner.slice(commaIdx + 1).trim();
  return varName.startsWith('--') ? { varName, fallback } : null;
}

function isRawFallbackColor(fallback: string): boolean {
  return Boolean(
    fallback && (fallback.startsWith('#') || /^(rgb|hsl)/i.test(fallback))
  );
}

function reportVarViolations(
  child: CssAstNode,
  prop: string,
  context: CssRuleContext
): void {
  const parsed = parseCssVarText(context.sourceCode.getText(child));
  if (!parsed) return;

  const isStrictColor = COLOR_PROPS.has(prop) || prop.endsWith('-color');
  if (!isThemeTokenVar(parsed.varName) && isStrictColor) {
    context.report({
      node: child,
      messageId: 'invalidThemeColor',
      data: { value: parsed.varName },
    });
  }
  if (isRawFallbackColor(parsed.fallback)) {
    context.report({
      node: child,
      messageId: 'rawColorFallback',
      data: { value: parsed.fallback },
    });
  }
}

export function checkThemeFunctionNode(
  child: CssAstNode,
  prop: string,
  context: CssRuleContext
): void {
  const rawName = getNodeName(child);
  const funcName = rawName.toLowerCase();
  if (COLOR_FUNCS.has(funcName)) {
    context.report({
      node: child,
      messageId: 'invalidThemeColor',
      data: { value: `${rawName}(...)` },
    });
    return;
  }
  if (funcName === 'var') {
    reportVarViolations(child, prop, context);
  }
}

export function checkThemeChildNode(
  child: CssAstNode,
  prop: string,
  context: CssRuleContext
): void {
  if (child.type === 'Hash') {
    const hashVal = typeof child.value === 'string' ? child.value : '';
    context.report({
      node: child,
      messageId: 'invalidThemeColor',
      data: { value: `#${hashVal}` },
    });
    return;
  }
  if (child.type === 'Function') {
    checkThemeFunctionNode(child, prop, context);
    return;
  }
  if (child.type === 'Identifier') {
    const rawName = getNodeName(child);
    if (
      COLOR_PROPS.has(prop) &&
      !ALLOWED_COLOR_IDS.has(rawName.toLowerCase())
    ) {
      context.report({
        node: child,
        messageId: 'invalidThemeColor',
        data: { value: rawName },
      });
    }
  }
}
