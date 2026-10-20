/**
 * Shared TypeScript Compiler API AST Helpers for Guardian Scripts
 */
import ts from 'typescript';

export interface StoryAstCollection {
  readonly topLevelVars: Map<string, ts.Expression>;
  defaultExportExpr: ts.Expression | null;
  readonly named: string[];
  csfError: string | null;
}

export function unwrapExpression(expr: ts.Expression): ts.Expression {
  let current = expr;
  while (
    ts.isSatisfiesExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

export function findDefaultExportArray(
  sf: ts.SourceFile
): ts.ArrayLiteralExpression | null {
  let defaultArray: ts.ArrayLiteralExpression | null = null;
  ts.forEachChild(sf, (node) => {
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const unwrapped = unwrapExpression(node.expression);
      if (ts.isArrayLiteralExpression(unwrapped)) {
        defaultArray = unwrapped;
      }
    }
  });
  return defaultArray;
}

export function moduleRendersOutlet(
  sourceText: string,
  fileName = 'layout.tsx'
): boolean {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  let hasOutletJsx = false;
  function visit(node: ts.Node): void {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === 'Outlet'
    ) {
      hasOutletJsx = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return hasOutletJsx;
}

export function hasModifierKind(node: ts.Node, kind: ts.SyntaxKind): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return ts.getModifiers(node)?.some((m) => m.kind === kind) ?? false;
}

export function hasJsxSyntax(sourceFile: ts.SourceFile): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function hasPascalNamedExport(node: ts.ExportDeclaration): boolean {
  if (!node.exportClause || !ts.isNamedExports(node.exportClause)) {
    return false;
  }
  return node.exportClause.elements.some((spec) =>
    /^[A-Z]/.test(spec.name.text)
  );
}

function hasPascalDeclarationExport(node: ts.Node): boolean {
  if (!hasModifierKind(node, ts.SyntaxKind.ExportKeyword)) return false;
  if (ts.isFunctionDeclaration(node) && node.name) {
    return /^[A-Z]/.test(node.name.text);
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.some(
      (decl) => ts.isIdentifier(decl.name) && /^[A-Z]/.test(decl.name.text)
    );
  }
  return false;
}

export function hasExportedComponent(sourceFile: ts.SourceFile): boolean {
  let found = false;
  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isExportAssignment(node) ||
      (ts.isExportDeclaration(node) && hasPascalNamedExport(node)) ||
      hasPascalDeclarationExport(node)
    ) {
      found = true;
    }
  });
  return found;
}

function checkCallForLegacyStory(node: ts.CallExpression): string | null {
  if (
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'storiesOf'
  ) {
    return 'Legacy storiesOf() API is prohibited; use Component Story Format (CSF3)';
  }
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'bind'
  ) {
    return 'Legacy CSF2 Template.bind({}) format is prohibited; use CSF3 StoryObj object notation';
  }
  return null;
}

export function detectLegacyCalls(sourceFile: ts.SourceFile): string | null {
  let legacyError: string | null = null;
  function visit(node: ts.Node): void {
    if (legacyError) return;
    if (ts.isCallExpression(node)) {
      legacyError = checkCallForLegacyStory(node);
      if (legacyError) return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return legacyError;
}

function validateExportedStoryDecl(
  declName: string,
  initializer: ts.Expression
): string | null {
  const unwrapped = unwrapExpression(initializer);
  if (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)) {
    return `Story export '${declName}' uses legacy CSF1/CSF2 function format; stories must be CSF3 objects`;
  }
  if (!ts.isObjectLiteralExpression(unwrapped)) {
    return `Story export '${declName}' must be a CSF3 story object literal`;
  }
  if (!/^[A-Z]/.test(declName)) {
    return `Story export '${declName}' must use PascalCase naming in CSF3`;
  }
  return null;
}

function inspectVariableStatement(
  node: ts.VariableStatement,
  state: StoryAstCollection
): void {
  const isExportedNamed =
    hasModifierKind(node, ts.SyntaxKind.ExportKeyword) &&
    !hasModifierKind(node, ts.SyntaxKind.DefaultKeyword);

  for (const decl of node.declarationList.declarations) {
    if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
    const varName = decl.name.text;
    state.topLevelVars.set(varName, decl.initializer);
    if (isExportedNamed) {
      const err = validateExportedStoryDecl(varName, decl.initializer);
      if (err) {
        state.csfError = err;
        return;
      }
      state.named.push(varName);
    }
  }
}

function isExportedFunctionDeclaration(
  node: ts.Node
): node is ts.FunctionDeclaration {
  return (
    ts.isFunctionDeclaration(node) &&
    hasModifierKind(node, ts.SyntaxKind.ExportKeyword)
  );
}

function inspectStoryStatement(node: ts.Node, state: StoryAstCollection): void {
  if (state.csfError) return;
  if (ts.isVariableStatement(node)) {
    inspectVariableStatement(node, state);
    return;
  }
  if (isExportedFunctionDeclaration(node)) {
    const fnName = node.name?.text ?? 'anonymous';
    state.csfError = `Story export '${fnName}' uses legacy CSF1/CSF2 function declaration; stories must be CSF3 objects`;
    return;
  }
  if (ts.isExportAssignment(node) && !node.isExportEquals) {
    state.defaultExportExpr = node.expression;
  }
}

export function collectStoryAstInfo(
  sourceFile: ts.SourceFile
): StoryAstCollection {
  const state: StoryAstCollection = {
    topLevelVars: new Map<string, ts.Expression>(),
    defaultExportExpr: null,
    named: [],
    csfError: null,
  };
  ts.forEachChild(sourceFile, (node) => inspectStoryStatement(node, state));
  return state;
}
