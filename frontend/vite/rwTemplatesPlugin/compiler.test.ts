// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { TemplateNodeParseFailure, compileTemplate } from './compiler.ts';

function compile(source: string): string {
  return compileTemplate(source, {
    templateName: 'sample',
    outputFile: '/src/components/sample/sample.template.ts',
    svgModule: '/src/helpers/svg.ts',
    languageModule: '/src/language/index.ts',
  });
}

// the function-level return is always the last one (loops return earlier)
function returnObject(output: string): Record<string, string> {
  const finalReturn = output.slice(output.lastIndexOf('return {'));
  const binds: Record<string, string> = {};
  for (const match of finalReturn.matchAll(/"([^"]+)": (v\d+),/g)) {
    binds[match[1] ?? ''] = match[2] ?? '';
  }
  return binds;
}

function declaration(output: string, varName: string): string {
  const match = new RegExp(`let ${varName}: ([^\\n]+);\\n`).exec(output);
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('binds', () => {
  it('keeps unconditional binds const and typed by tag', () => {
    const output = compile('<div bind="a"><span bind="b"></span></div>');

    expect(output).not.toContain('let ');
    expect(returnObject(output)).toEqual({ $root: 'v1', a: 'v1', b: 'v2' });
  });

  it('hoists a bind in <if> and makes it optional', () => {
    const output = compile('<p></p><if condition="foo"><div bind="a"></div></if>');

    const varName = returnObject(output).a ?? '';
    expect(declaration(output, varName)).toBe("HTMLElementTagNameMap['div'] | undefined");
    expect(output.indexOf(`let ${varName}`)).toBeLessThan(output.indexOf('if (context.foo)'));
    expect(output).toMatch(new RegExp(`${varName} = v\\d+;\\s*\\}`));
  });

  it('makes a bind in both branches always present', () => {
    const output = compile(
      '<p></p><if condition="foo"><div bind="a"></div></if><else><span bind="a"></span></else>',
    );

    expect(declaration(output, returnObject(output).a ?? '')).toBe(
      "HTMLElementTagNameMap['div'] | HTMLElementTagNameMap['span']",
    );
    expect(output).toContain('} else {');
  });

  it('makes a bind in only one branch optional', () => {
    const output = compile(
      '<p></p><if condition="foo"><div bind="a"></div></if><else><span bind="b"></span></else>',
    );

    const binds = returnObject(output);
    expect(declaration(output, binds.a ?? '')).toMatch(/\| undefined$/);
    expect(declaration(output, binds.b ?? '')).toMatch(/\| undefined$/);
  });

  it('keeps a nested <if> optional even if both inner branches bind', () => {
    const output = compile(
      '<p></p><if condition="outer"><if condition="inner"><div bind="a"></div></if>' +
        '<else><div bind="a"></div></else></if>',
    );

    expect(declaration(output, returnObject(output).a ?? '')).toMatch(/\| undefined$/);
  });

  it('makes a <for> bind an array of iteration binds', () => {
    const output = compile(
      '<p></p><for each="items" bind="rows"><a bind="link"></a><if condition="x"><i bind="icon"></i></if></for>',
    );

    expect(output).toContain('context.items.map(');
    // inner binds belong to each iteration's object, not the template's
    expect(Object.keys(returnObject(output))).toEqual(['$root', 'rows']);
    expect(output.indexOf('let v')).toBeGreaterThan(output.indexOf('context.items.map('));
  });

  it('makes a <for> bind inside <if> an optional array', () => {
    const output = compile(
      '<p></p><if condition="x"><for each="items" bind="rows"><a bind="link"></a></for></if>',
    );

    const typeDecl = declaration(output, returnObject(output).rows ?? '');
    expect(typeDecl).toMatch(/^Array<\{/);
    expect(typeDecl).toContain(`"link": HTMLElementTagNameMap['a']`);
  });

  it('types unknown tags as HTMLElement', () => {
    const output = compile('<p></p><if condition="x"><my-widget bind="w"></my-widget></if>');

    expect(declaration(output, returnObject(output).w ?? '')).toBe('HTMLElement | undefined');
  });

  it('types svg binds as SVGSVGElement', () => {
    const output = compile('<p></p><if condition="x"><svg use="icon" bind="icon"></svg></if>');

    expect(declaration(output, returnObject(output).icon ?? '')).toBe('SVGSVGElement | undefined');
  });
});

describe('errors', () => {
  it('rejects a bind in <for> without a bind attribute', () => {
    expect(() => compile('<p></p><for each="items"><a bind="link"></a></for>')).toThrow(
      /no 'bind' attribute/,
    );
  });

  it('rejects duplicate binds', () => {
    expect(() => compile('<div bind="a"></div><div bind="a"></div>')).toThrow(/Duplicate bind 'a'/);
    expect(() => compile('<p bind="a"></p><if condition="x"><div bind="a"></div></if>')).toThrow(
      /Duplicate bind 'a'/,
    );
  });

  it('reserves $root', () => {
    expect(() => compile('<div bind="$root"></div>')).toThrow(/reserved/);
  });

  it('rejects <else> without a preceding <if>', () => {
    expect(() => compile('<p></p><else><p></p></else>')).toThrow(/must immediately/);
    expect(() => compile('<div><else><p></p></else></div>')).toThrow(/must immediately/);
  });

  it('rejects text between <if> and <else>', () => {
    expect(() =>
      compile('<div><if condition="x"><b></b></if>oops<else><i></i></else></div>'),
    ).toThrow(TemplateNodeParseFailure);
  });

  it('reports the path of the failing node', () => {
    expect(() => compile('<div><span><else></else></span></div>')).toThrow(
      /^\/div\[1\]\/span\[1\]\/else\[1\]/,
    );
  });
});

describe('output', () => {
  it('keeps text after control flow', () => {
    const output = compile(
      '<div><if condition="x"><b></b></if> after if<for each="items"><i></i></for> after for</div>',
    );

    expect(output).toContain('createTextNode(`after if`)');
    expect(output).toContain('createTextNode(`after for`)');
  });

  it('emits a plain class as a string literal', () => {
    expect(compile('<div class="a b"></div>')).toContain('v1.className="a b"');
  });

  it('interpolates {{ }} in class names', () => {
    const output = compile('<div class="song song-{{ origin_sid }}"></div>');

    expect(output).toContain('v1.className=`song song-`+context.origin_sid');
    expect(output).not.toContain('{{');
  });

  it('interpolates {{ }} in attributes and text', () => {
    const output = compile('<a href="#!/album/{{ id }}" title="{{ name }}">{{ name }}</a>');

    expect(output).toContain('v1.href=`#!/album/`+context.id');
    expect(output).toContain("v1.setAttribute('title',context.name)");
    expect(output).toContain('createTextNode(context.name)');
  });

  it('gives valueless attributes an empty string value', () => {
    expect(compile('<button disabled></button>')).toContain("v1.setAttribute('disabled','')");
  });

  it('imports $l and svg helpers relative to the template', () => {
    const output = compile('<div>{{ $l("hi") }}<svg use="icon"></svg></div>');

    expect(output).toContain("import { $l } from '../../language';");
    expect(output).toContain("import { svgIcon as _svg } from '../../helpers/svg';");
  });
});
