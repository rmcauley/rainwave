import path from 'node:path';

// Rainwave template compiler.
//
// Turns component-style HTML templates into TypeScript that builds the DOM.
//
// Given components/example/example.html:
//    <div class="some_div" bind="bound_div">{{ hello_world }}</div>
//
// This is what happens in TS:
//    const binds = exampleTemplate({ hello_world: "DOM ahoy!" });
//    console.log(binds.bound_div.textContent); // "DOM ahoy!"
//    document.body.appendChild(binds.$root);
//
// Template syntax:
//    - <if condition="foo">...</if>   : Conditional block
//    - <else></else>                  : Else clause, must directly follow an <if>
//    - <for each="items">...</for>    : Loop over an array
//    - {{ var }}                      : Interpolation (in attributes & text)
//
// Binds:
//    - A bind inside <if>/<else> is typed `T | undefined`, unless it is bound in
//      both the <if> and its <else>, in which case it is always present.
//    - A bind inside <for> needs a bind attribute on the <for>, which becomes an
//      array of each iteration's binds (plus its $root).
//    - Bind names must be unique within a template (or <for> body), except
//      across an <if> and its <else>.  "$root" is reserved.
//
// Cannot deal with SVG (or other namespaces) except for Rainwave's particular use case.
//
// Restrictions:
//    - <for> cannot handle objects - only arrays.
/* oxlint-disable no-use-before-define -- the parse functions are mutually recursive */
import { type ChildNode, type Element, type Text, isTag, isText } from 'domhandler';
import { parseDocument } from 'htmlparser2';

const RAW_JS_FUNCTIONS = ['$l', '_svg'];

const ROOT_BIND_NAME = '$root';

// Tags that have an entry in lib.dom's HTMLElementTagNameMap.  Anything else
// (custom elements, obsolete tags) is typed as plain HTMLElement.
const KNOWN_HTML_TAGS = new Set(
  `a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption
  cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset
  figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img
  input ins kbd label legend li link main map mark menu meta meter nav noscript object ol
  optgroup option output p picture pre progress q rp rt ruby s samp script search section select
  slot small source span strong style sub summary sup table tbody td template textarea tfoot th
  thead time title tr track u ul var video wbr`.split(/\s+/),
);

interface Bind {
  varName: string;
  tsType: string;
  optional: boolean;
}

type Binds = Map<string, Bind>;

interface ParseResults {
  buffer: string;
  binds: Binds;
  varCount: number;
  imports: Set<string>;
}

export class TemplateNodeParseFailure extends Error {
  constructor(node: ChildNode, message: string) {
    super(`${nodePath(node)}\n\n${message}`);
    this.name = 'TemplateNodeParseFailure';
  }
}

function nodePath(node: ChildNode): string {
  const segments: string[] = [];
  let current: ChildNode | null = node;
  while (current && isTag(current)) {
    const { name } = current;
    const sameName = (current.parent?.children ?? []).filter(
      (sibling) => isTag(sibling) && sibling.name === name,
    );
    segments.unshift(`${name}[${sameName.indexOf(current) + 1}]`);
    current = current.parent as ChildNode | null;
  }
  return `/${segments.join('/')}`;
}

const jsVariableName = (count: number): string => `v${count}`;

const bindTsTypeWithUndefined = (bind: Bind): string =>
  bind.optional ? `${bind.tsType} | undefined` : bind.tsType;

/** The TS type of document.createElement(tag) / _svg(). */
function elementTsType(tag: string): string {
  if (tag === 'svg') {
    return 'SVGSVGElement';
  }
  return KNOWN_HTML_TAGS.has(tag) ? `HTMLElementTagNameMap['${tag}']` : 'HTMLElement';
}

function emptyResults(varCount: number): ParseResults {
  return { buffer: '', binds: new Map(), varCount, imports: new Set() };
}

function withImports(results: ParseResults): ParseResults {
  if (results.buffer.includes('$l(')) {
    results.imports.add('$l');
  }
  return results;
}

function mergeBinds(into: Binds, from: Binds, node: ChildNode): void {
  for (const [name, bind] of from) {
    if (into.has(name)) {
      throw new TemplateNodeParseFailure(node, `Duplicate bind '${name}'.`);
    }
    into.set(name, bind);
  }
}

function checkBindName(node: ChildNode, name: string): void {
  if (name === ROOT_BIND_NAME) {
    throw new TemplateNodeParseFailure(node, `'${ROOT_BIND_NAME}' is a reserved bind name.`);
  }
}

const isElement = (node: ChildNode | undefined): node is Element =>
  node !== undefined && isTag(node);

const isTextNode = (node: ChildNode | undefined): node is Text =>
  node !== undefined && isText(node);

const isBlankText = (node: ChildNode | undefined): boolean =>
  isTextNode(node) && node.data.trim() === '';

/** Convert a context key reference into JS variable access. */
function parseContextKey(contextKey: string): string {
  if (contextKey === 'this') {
    return 'context';
  }
  if (contextKey.startsWith('^')) {
    return contextKey.slice(1);
  }
  if (RAW_JS_FUNCTIONS.some((funcName) => contextKey.startsWith(funcName))) {
    return contextKey;
  }
  return `context.${contextKey}`;
}

const escapeTemplateLiteral = (text: string): string =>
  text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');

/** Parse attribute or text values, handling {{ }} interpolation. */
function parseVal(val: string): string {
  const parts: string[] = [];
  for (const piece of val.trim().split(/({{.*?}})/)) {
    if (piece.startsWith('{{') && piece.endsWith('}}')) {
      parts.push(parseContextKey(piece.slice(2, -2).trim()));
    } else if (piece.trim().length > 0) {
      parts.push(`\`${escapeTemplateLiteral(piece)}\``);
    }
  }
  return parts.join('+');
}

function emitText(text: string, appendTo: string): string {
  if (text.trim() === '') {
    return '';
  }
  return `${appendTo}.appendChild(document.createTextNode(${parseVal(text)}));\n`;
}

function emitBinds(binds: Binds): string {
  return `{${[...binds].map(([key, bind]) => `"${key}": ${bind.varName},`).join('')}}`;
}

/**
 * The TS type of emitBinds(binds).  Optional binds are `| undefined` rather
 * than `?`, because the key is always present on the emitted object.
 */
function emitBindsType(binds: Binds): string {
  return `{${[...binds].map(([key, bind]) => `"${key}": ${bindTsTypeWithUndefined(bind)};`).join('')}}`;
}

/**
 * Parse sibling nodes (and loose text), pairing each <if> with an
 * immediately following <else>.
 */
function walkNodes(nodes: ChildNode[], appendTo: string, varCount: number): ParseResults {
  const result = emptyResults(varCount);
  let index = 0;
  while (index < nodes.length) {
    const node = nodes[index];
    index += 1;
    if (node === undefined) {
      continue;
    }

    if (isTextNode(node)) {
      result.buffer += emitText(node.data, appendTo);
      continue;
    }
    if (!isElement(node)) {
      continue; // comments & directives emit nothing
    }

    let childResult: ParseResults;
    if (node.name === 'if') {
      let elseNode: Element | null = null;
      let lookahead = index;
      while (isTextNode(nodes[lookahead])) {
        lookahead += 1;
      }
      const next = nodes[lookahead];
      if (isElement(next) && next.name === 'else') {
        if (nodes.slice(index, lookahead).some((between) => !isBlankText(between))) {
          throw new TemplateNodeParseFailure(node, 'Text between <if> and <else> is not allowed');
        }
        elseNode = next;
        index = lookahead + 1;
      }
      childResult = withImports(parseConditionalNode(node, elseNode, appendTo, result.varCount));
    } else {
      childResult = parseNode(node, appendTo, result.varCount);
    }

    result.buffer += childResult.buffer;
    mergeBinds(result.binds, childResult.binds, node);
    result.varCount = childResult.varCount;
    for (const importName of childResult.imports) {
      result.imports.add(importName);
    }
  }
  return result;
}

/**
 * Parse a single node.  An <if> parsed here has no <else>; use walkNodes to
 * pair <if> with a following <else>.
 */
function parseNode(node: Element, appendTo: string, varCount: number): ParseResults {
  let results: ParseResults;
  if (node.name === 'if') {
    results = parseConditionalNode(node, null, appendTo, varCount);
  } else if (node.name === 'else') {
    throw new TemplateNodeParseFailure(node, '<else> must immediately follow an <if> sibling');
  } else if (node.name === 'for') {
    results = parseForNode(node, appendTo, varCount);
  } else {
    results = parseHtmlNode(node, appendTo, varCount);
  }
  return withImports(results);
}

/**
 * Parse an <if> and its optional <else> as one unit.
 *
 * Elements are created in `const`s that only exist inside their branch, so
 * every bind is re-declared with `let` in front of the `if` and assigned at
 * the end of its branch.  A bind that exists in both branches is always
 * assigned; one that exists in only one is `| undefined`.
 */
function parseConditionalNode(
  ifNode: Element,
  elseNode: Element | null,
  appendTo: string,
  varCount: number,
): ParseResults {
  const condition = ifNode.attribs.condition;
  if (!condition) {
    throw new TemplateNodeParseFailure(ifNode, "if tag requires 'condition' attribute");
  }

  const walkedIf = walkNodes(ifNode.children, appendTo, varCount);
  let count = walkedIf.varCount;
  const walkedElse = elseNode ? walkNodes(elseNode.children, appendTo, count) : null;
  if (walkedElse) {
    count = walkedElse.varCount;
  }

  const elseBinds: Binds = walkedElse?.binds ?? new Map();
  let declarations = '';
  let ifAssignments = '';
  let elseAssignments = '';
  const binds: Binds = new Map();
  for (const name of new Set([...walkedIf.binds.keys(), ...elseBinds.keys()])) {
    const inIf = walkedIf.binds.get(name);
    const inElse = elseBinds.get(name);
    const branchBinds = [inIf, inElse].filter((bind) => bind !== undefined);
    const optional = !inIf || inIf.optional || !inElse || inElse.optional;
    const tsType = [...new Set(branchBinds.map((bind) => bind.tsType))].join(' | ');

    count += 1;
    const varName = jsVariableName(count);
    const bind: Bind = { varName, tsType, optional };
    binds.set(name, bind);
    declarations += `let ${varName}: ${bindTsTypeWithUndefined(bind)};\n`;
    if (inIf) {
      ifAssignments += `${varName} = ${inIf.varName};\n`;
    }
    if (inElse) {
      elseAssignments += `${varName} = ${inElse.varName};\n`;
    }
  }

  let buffer = declarations;
  buffer += `if (${parseContextKey(condition)}) {\n`;
  buffer += walkedIf.buffer + ifAssignments;
  buffer += '}';
  const imports = new Set(walkedIf.imports);
  if (walkedElse) {
    buffer += ' else {\n';
    buffer += walkedElse.buffer + elseAssignments;
    buffer += '}';
    for (const importName of walkedElse.imports) {
      imports.add(importName);
    }
  }
  buffer += '\n';

  return { buffer, binds, varCount: count, imports };
}

function parseForNode(node: Element, appendTo: string, varCount: number): ParseResults {
  const eachAttr = node.attribs.each;
  if (!eachAttr) {
    throw new TemplateNodeParseFailure(node, "<for> tag requires 'each' attribute");
  }
  const each = parseContextKey(eachAttr);

  let buffer = '';
  const binds: Binds = new Map();
  let walked: ParseResults;

  const bindAttr = node.attribs.bind?.trim();
  if (bindAttr) {
    checkBindName(node, bindAttr);
    const varName = jsVariableName(varCount + 1);
    const loopRoot = jsVariableName(varCount + 2);
    buffer += `const ${varName} = ${each}.map(context => {\n`;
    buffer += `const ${loopRoot} = document.createDocumentFragment();\n`;
    walked = walkNodes(node.children, loopRoot, varCount + 2);
    buffer += walked.buffer;
    buffer += `${appendTo}.appendChild(${loopRoot});\n`;

    // Each iteration returns its own binds, so the <for> bind is an array of them.
    const loopBinds: Binds = new Map([
      [ROOT_BIND_NAME, { varName: loopRoot, tsType: 'DocumentFragment', optional: false }],
    ]);
    mergeBinds(loopBinds, walked.binds, node);
    buffer += `return ${emitBinds(loopBinds)};\n`;
    buffer += '});\n';
    binds.set(bindAttr, {
      varName,
      tsType: `Array<${emitBindsType(loopBinds)}>`,
      optional: false,
    });
  } else {
    buffer += `${each}.forEach(context => {\n`;
    walked = walkNodes(node.children, appendTo, varCount);
    if (walked.binds.size > 0) {
      throw new TemplateNodeParseFailure(
        node,
        `<for> contains bind(s) ${JSON.stringify([...walked.binds.keys()].toSorted())} but has no 'bind' attribute to collect them into an array`,
      );
    }
    buffer += walked.buffer;
    buffer += '});\n';
  }

  return { buffer, binds, varCount: walked.varCount, imports: walked.imports };
}

/** appendTo is null for an element that becomes the template's $root. */
function parseHtmlNode(node: Element, appendTo: string | null, varCount: number): ParseResults {
  const tag = node.name;
  let buffer = '';
  const binds: Binds = new Map();
  const count = varCount + 1;
  const varName = jsVariableName(count);
  const imports = new Set<string>();

  if (tag === 'svg') {
    imports.add('svg');
    const svgUse = node.attribs.use;
    if (!svgUse) {
      throw new TemplateNodeParseFailure(node, "SVG elements require 'use' attribute");
    }
    buffer += `const ${varName} = _svg('${svgUse}');\n`;
  } else {
    buffer += `const ${varName} = document.createElement('${tag}');\n`;
  }

  const [firstChild, ...otherChildren] = node.children;
  if (isTextNode(firstChild)) {
    buffer += emitText(firstChild.data, varName);
  }
  for (const [attrName, attrValRaw] of Object.entries(node.attribs)) {
    const attrVal = attrValRaw.trim();
    // Valueless attributes (`disabled`) parse as an empty string.
    const attrExpression = parseVal(attrVal) || "''";
    if (attrName === 'bind') {
      checkBindName(node, attrVal);
      binds.set(attrVal, { varName, tsType: elementTsType(tag), optional: false });
    } else if (attrName === 'class' && tag !== 'svg') {
      // Plain class lists stay string literals; only interpolated ones need a template.
      buffer += `${varName}.className=${attrVal.includes('{{') ? attrExpression : JSON.stringify(attrVal)};\n`;
    } else if (attrName === 'href') {
      buffer += `${varName}.href=${attrExpression};\n`;
    } else if (attrName === 'use' && tag === 'svg') {
      // Already handled in svg creation
    } else {
      buffer += `${varName}.setAttribute('${attrName}',${attrExpression});\n`;
    }
  }

  const walked = walkNodes(isTextNode(firstChild) ? otherChildren : node.children, varName, count);
  mergeBinds(binds, walked.binds, node);

  if (appendTo !== null) {
    buffer += `${appendTo}.appendChild(${varName});\n`;
  }

  return {
    buffer: buffer + walked.buffer,
    binds,
    varCount: walked.varCount,
    imports: new Set([...imports, ...walked.imports]),
  };
}

/**
 * Returns the lone root element if the template consists of exactly one real
 * element (no text or control flow beside it), so it can be the $root itself
 * instead of living inside a documentFragment.
 */
function findSingleRootElement(nodes: ChildNode[]): Element | null {
  let root: Element | null = null;
  for (const node of nodes) {
    if (isTextNode(node)) {
      if (!isBlankText(node)) {
        return null;
      }
    } else if (!isElement(node)) {
      continue; // comments & directives emit nothing
    } else if (root !== null || ['if', 'else', 'for'].includes(node.name)) {
      return null;
    } else {
      root = node;
    }
  }
  return root;
}

export interface CompileOptions {
  /** Template name, e.g. "song" produces `songTemplate`. */
  templateName: string;
  /** Absolute path of the .template.ts file that will be written. */
  outputFile: string;
  /** Absolute path of the sibling .context.ts file, if it exists. */
  contextFile?: string;
  /** Absolute path of the sibling stylesheet, if it exists. */
  styleFile?: string;
  /** Absolute path of the module exporting `svgIcon`. */
  svgModule: string;
  /** Absolute path of the module exporting `$l`. */
  languageModule: string;
}

function relativeModulePath(fromFile: string, toFile: string): string {
  let modulePath = path
    .relative(path.dirname(fromFile), toFile.replace(/\.[^./\\]+$/, ''))
    .split(path.sep)
    .join('/');
  modulePath = modulePath.replace(/\/index$/, '');
  return modulePath.startsWith('.') ? modulePath : `./${modulePath}`;
}

function solveTsImports(outputFile: string, imports: Set<string>, options: CompileOptions): string {
  let buffer = '';
  for (const importName of [...imports].toSorted()) {
    if (importName === 'svg') {
      buffer += `import { svgIcon as _svg } from '${relativeModulePath(outputFile, options.svgModule)}';\n`;
    } else if (importName === '$l') {
      buffer += `import { $l } from '${relativeModulePath(outputFile, options.languageModule)}';\n`;
    } else {
      throw new Error(`Unknown template import '${importName}'.`);
    }
  }
  return buffer;
}

/** Compiles one template to unformatted TypeScript. */
export function compileTemplate(html: string, options: CompileOptions): string {
  const { templateName, outputFile } = options;
  const nodes = parseDocument(html).children;
  const rootElement = findSingleRootElement(nodes);

  let body: string;
  let results: ParseResults;
  const binds: Binds = new Map();
  if (rootElement) {
    results = parseRootElement(rootElement);
    binds.set(ROOT_BIND_NAME, {
      varName: 'v1',
      tsType: elementTsType(rootElement.name),
      optional: false,
    });
    body = results.buffer;
  } else {
    results = walkNodes(nodes, 'v1', 1);
    binds.set(ROOT_BIND_NAME, { varName: 'v1', tsType: 'DocumentFragment', optional: false });
    body = `const v1 = document.createDocumentFragment();\n${results.buffer}`;
  }
  // Duplicates and "$root" were already rejected while parsing
  for (const [name, bind] of results.binds) {
    binds.set(name, bind);
  }

  let file = '';
  let contextParam = '';
  if (options.contextFile) {
    const contextType = `${templateName}Context`;
    file += `import type { ${contextType} } from '${relativeModulePath(outputFile, options.contextFile)}';\n`;
    contextParam = `context: ${contextType}`;
  }
  if (options.styleFile) {
    file += `import './${path.basename(options.styleFile)}';\n`;
  }
  file += solveTsImports(outputFile, results.imports, options);
  file += `function ${templateName}Template(${contextParam}) {\n`;
  file += body;
  file += `return ${emitBinds(binds)};\n}\n`;
  file += `export { ${templateName}Template };\n`;
  return file;
}

/** Parse an element that becomes the template's $root instead of being appended to a fragment. */
function parseRootElement(node: Element): ParseResults {
  return withImports(parseHtmlNode(node, null, 0));
}
