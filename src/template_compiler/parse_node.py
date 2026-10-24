import re
from typing import Sequence

from lxml.html import HtmlElement

from template_compiler.parse_node_results import Bind, ParseNodeResults
from template_compiler.template_compiler_errors import RainwaveTemplateNodeParseFailure

raw_js_functions = ["$l", "_svg"]

ROOT_BIND_NAME = "$root"

# Tags that have an entry in lib.dom's HTMLElementTagNameMap.  Anything else
# (custom elements, obsolete tags) is typed as plain HTMLElement.
KNOWN_HTML_TAGS = frozenset(
    {
        "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base",
        "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption",
        "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del",
        "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset",
        "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5",
        "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img",
        "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map",
        "mark", "menu", "meta", "meter", "nav", "noscript", "object", "ol",
        "optgroup", "option", "output", "p", "picture", "pre", "progress", "q",
        "rp", "rt", "ruby", "s", "samp", "script", "search", "section", "select",
        "slot", "small", "source", "span", "strong", "style", "sub", "summary",
        "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th",
        "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr",
    }
)  # fmt: skip


def js_variable_name(count: int) -> str:
    return f"v{count}"


def element_ts_type(tag: str) -> str:
    """The TS type of document.createElement(tag) / _svg()."""
    if tag == "svg":
        return "SVGSVGElement"
    if tag in KNOWN_HTML_TAGS:
        return f"HTMLElementTagNameMap['{tag}']"
    return "HTMLElement"


def merge_binds(
    into: dict[str, Bind],
    new: dict[str, Bind],
    node: HtmlElement,
) -> None:
    for name, bind in new.items():
        if name in into:
            raise RainwaveTemplateNodeParseFailure(node, f"Duplicate bind '{name}'.")
        into[name] = bind


def _check_bind_name(node: HtmlElement, name: str) -> None:
    if name == ROOT_BIND_NAME:
        raise RainwaveTemplateNodeParseFailure(
            node, f"'{ROOT_BIND_NAME}' is a reserved bind name."
        )


def _empty_results(js_variable_count: int) -> ParseNodeResults:
    return ParseNodeResults(
        buffer="", binds={}, js_variable_count=js_variable_count, imports=set()
    )


def _with_imports(results: ParseNodeResults) -> ParseNodeResults:
    if "$l(" in results.buffer:
        results.imports.add("$l")
    return results


def parse_node(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    """
    Parse a single node.  An <if> parsed here has no <else>; use walk_fragments
    to pair <if> with a following <else>.
    """
    if node.tag == "if":
        results = parse_conditional_node(
            node, None, append_to_variable_name, js_variable_count
        )
    elif node.tag == "else":
        raise RainwaveTemplateNodeParseFailure(
            node,
            "<else> must immediately follow an <if> sibling",
        )
    elif node.tag == "for":
        results = parse_for_node(node, append_to_variable_name, js_variable_count)
    else:
        results = parse_html_node(node, append_to_variable_name, js_variable_count)

    return _with_imports(results)


def parse_root_element(
    node: HtmlElement,
    js_variable_count: int,
) -> ParseNodeResults:
    """Parse an element that becomes the template's $root instead of being appended to a fragment."""
    return _with_imports(parse_html_node(node, None, js_variable_count))


def parse_conditional_node(
    if_node: HtmlElement,
    else_node: HtmlElement | None,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    """
    Parse an <if> and its optional <else> as one unit.

    Elements are created in `const`s that only exist inside their branch, so
    every bind is re-declared with `let` in front of the `if` and assigned at
    the end of its branch.  A bind that exists in both branches is always
    assigned; one that exists in only one is `| undefined`.
    """
    condition = if_node.attrib.get("condition")
    if not condition:
        raise RainwaveTemplateNodeParseFailure(
            if_node, "if tag requires 'condition' attribute"
        )
    if else_node is not None and (if_node.tail or "").strip():
        raise RainwaveTemplateNodeParseFailure(
            if_node, "Text between <if> and <else> is not allowed"
        )

    walked_if = walk_node_contents(if_node, append_to_variable_name, js_variable_count)
    js_variable_count = walked_if.js_variable_count
    walked_else: ParseNodeResults | None = None
    if else_node is not None:
        walked_else = walk_node_contents(
            else_node, append_to_variable_name, js_variable_count
        )
        js_variable_count = walked_else.js_variable_count

    else_binds = walked_else.binds if walked_else is not None else {}
    declarations = ""
    if_assignments = ""
    else_assignments = ""
    binds: dict[str, Bind] = {}
    for name in dict.fromkeys([*walked_if.binds, *else_binds]):
        in_if = walked_if.binds.get(name)
        in_else = else_binds.get(name)
        branch_binds = [bind for bind in (in_if, in_else) if bind is not None]
        optional = (
            len(branch_binds) < 2 or in_if is None or in_if.optional
            or in_else is None or in_else.optional
        )  # fmt: skip
        ts_type = " | ".join(dict.fromkeys(bind.ts_type for bind in branch_binds))

        js_variable_count += 1
        var_name = js_variable_name(js_variable_count)
        binds[name] = Bind(var_name, ts_type, optional)
        declarations += f"let {var_name}: {_ts_type_with_undefined(binds[name])};\n"
        if in_if is not None:
            if_assignments += f"{var_name} = {in_if.var_name};\n"
        if in_else is not None:
            else_assignments += f"{var_name} = {in_else.var_name};\n"

    buffer = declarations
    buffer += f"if ({_parse_context_key(condition)}) {{\n"
    buffer += walked_if.buffer + if_assignments
    buffer += "}"
    imports = set(walked_if.imports)
    if walked_else is not None and else_node is not None:
        buffer += " else {\n"
        buffer += walked_else.buffer + else_assignments
        buffer += "}"
        imports |= walked_else.imports
    buffer += "\n"

    # Text following the whole construct, so it belongs to the last element
    last_node = else_node if else_node is not None else if_node
    buffer += _emit_text_node(last_node, last_node.tail, append_to_variable_name)

    return ParseNodeResults(
        buffer=buffer,
        binds=binds,
        js_variable_count=js_variable_count,
        imports=imports,
    )


def parse_for_node(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    each_attr = node.attrib.get("each")
    if not each_attr:
        raise RainwaveTemplateNodeParseFailure(
            node, "<for> tag requires 'each' attribute"
        )
    each_attr = _parse_context_key(each_attr)

    buffer = ""
    binds: dict[str, Bind] = {}

    bind_attr = node.attrib.get("bind")
    if bind_attr:
        bind_attr = bind_attr.strip()
        _check_bind_name(node, bind_attr)
        js_variable_count += 1
        var_name = js_variable_name(js_variable_count)
        buffer += f"const {var_name} = {each_attr}.map(context => {{\n"
        js_variable_count += 1
        loop_root = js_variable_name(js_variable_count)
        buffer += f"const {loop_root} = document.createDocumentFragment();\n"
        walked = walk_node_contents(node, loop_root, js_variable_count)
        buffer += walked.buffer
        buffer += f"{append_to_variable_name}.appendChild({loop_root});\n"

        # Each iteration returns its own binds, so the <for> bind is an array of them.
        loop_binds = {ROOT_BIND_NAME: Bind(loop_root, "DocumentFragment")}
        merge_binds(loop_binds, walked.binds, node)
        buffer += f"return {emit_binds(loop_binds)};\n"
        buffer += "});\n"
        binds[bind_attr] = Bind(var_name, f"Array<{emit_binds_type(loop_binds)}>")
    else:
        buffer += f"{each_attr}.forEach(context => {{\n"
        walked = walk_node_contents(node, append_to_variable_name, js_variable_count)
        if walked.binds:
            raise RainwaveTemplateNodeParseFailure(
                node,
                f"<for> contains bind(s) {sorted(walked.binds)} but has no 'bind' attribute to collect them into an array",
            )
        buffer += walked.buffer
        buffer += "});\n"

    buffer += _emit_text_node(node, node.tail, append_to_variable_name)

    return ParseNodeResults(
        buffer=buffer,
        binds=binds,
        js_variable_count=walked.js_variable_count,
        imports=walked.imports,
    )


def parse_html_node(
    node: HtmlElement,
    append_to_variable_name: str | None,
    js_variable_count: int,
) -> ParseNodeResults:
    tag = node.tag
    if isinstance(tag, bytes):
        tag = tag.decode()
    elif not isinstance(tag, str):
        # comments & processing instructions emit nothing, but the text after them is real
        results = _empty_results(js_variable_count)
        if append_to_variable_name is not None:
            results.buffer = _emit_text_node(node, node.tail, append_to_variable_name)
        return results

    buffer = ""
    binds: dict[str, Bind] = {}
    js_variable_count += 1
    var_name = js_variable_name(js_variable_count)
    imports: set[str] = set()

    if node.tag == "svg":
        imports.add("svg")
        svg_use = node.attrib.get("use")
        if svg_use:
            buffer += f"const {var_name} = _svg('{svg_use}');\n"
        else:
            raise RainwaveTemplateNodeParseFailure(
                node, "SVG elements require 'use' attribute"
            )
    else:
        buffer += f"const {var_name} = document.createElement('{tag}');\n"

    buffer += _emit_text_node(node, node.text, var_name)

    for attr_name, attr_val_raw in node.attrib.items():
        attr_val_parsed = _parse_val(node, attr_val_raw.strip())

        if attr_name == "bind":
            bind_name = attr_val_raw.strip()
            _check_bind_name(node, bind_name)
            binds[bind_name] = Bind(var_name, element_ts_type(tag))
        elif attr_name == "class" and node.tag != "svg":
            buffer += f"{var_name}.className='{attr_val_raw.strip()}';\n"
        elif attr_name == "href":
            buffer += f"{var_name}.href={attr_val_parsed};\n"
        elif attr_name == "use" and node.tag == "svg":
            # Already handled in svg creation
            pass
        else:
            # Generic attribute
            buffer += f"{var_name}.setAttribute('{attr_name}',{attr_val_parsed});\n"

    walked = walk_nodes(node, var_name, js_variable_count)

    merge_binds(binds, walked.binds, node)

    if append_to_variable_name is not None:
        buffer += f"{append_to_variable_name}.appendChild({var_name});\n"
        buffer += _emit_text_node(node, node.tail, append_to_variable_name)

    return ParseNodeResults(
        buffer=buffer + walked.buffer,
        binds=binds,
        js_variable_count=walked.js_variable_count,
        imports=imports.union(walked.imports),
    )


def _parse_context_key(context_key: str) -> str:
    """Convert a context key reference into JS variable access"""
    if context_key == "this":
        return "context"
    if context_key.startswith("^"):
        return context_key[1:]
    for func_name in raw_js_functions:
        if context_key.startswith(func_name):
            return context_key
    return "context.%s" % context_key


def _parse_val(node: HtmlElement, val: str) -> str:
    """
    Parse attribute or text values, handling {{ }} interpolation.
    Concatenates string literals and variable references.
    """
    try:
        return _parse_raw_val(val)
    except Exception as e:
        raise RainwaveTemplateNodeParseFailure(node, repr(e)) from e


def walk_fragments(
    fragments: Sequence[str | HtmlElement],
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    """
    Parse sibling nodes (and loose text, which only appears at the top level of
    a template), pairing each <if> with an immediately following <else>.
    """
    walk_result = _empty_results(js_variable_count)
    index = 0
    while index < len(fragments):
        fragment = fragments[index]
        index += 1

        if isinstance(fragment, str):
            walk_result.buffer += emit_text_content(fragment, append_to_variable_name)
            continue

        if fragment.tag == "if":
            else_node: HtmlElement | None = None
            if index < len(fragments):
                next_fragment = fragments[index]
                if not isinstance(next_fragment, str) and next_fragment.tag == "else":
                    else_node = next_fragment
                    index += 1
            child_result = _with_imports(
                parse_conditional_node(
                    fragment,
                    else_node,
                    append_to_variable_name,
                    walk_result.js_variable_count,
                )
            )
        else:
            child_result = parse_node(
                fragment, append_to_variable_name, walk_result.js_variable_count
            )

        walk_result.buffer += child_result.buffer
        merge_binds(walk_result.binds, child_result.binds, fragment)
        walk_result.js_variable_count = child_result.js_variable_count
        walk_result.imports = walk_result.imports.union(child_result.imports)
    return walk_result


def walk_nodes(
    node: HtmlElement, append_to_variable_name: str, js_variable_count: int
) -> ParseNodeResults:
    return walk_fragments(list(node), append_to_variable_name, js_variable_count)


def walk_node_contents(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    walked = walk_nodes(node, append_to_variable_name, js_variable_count)
    walked.buffer = (
        _emit_text_node(node, node.text, append_to_variable_name) + walked.buffer
    )
    return walked


def _ts_type_with_undefined(bind: Bind) -> str:
    return f"{bind.ts_type} | undefined" if bind.optional else bind.ts_type


def emit_binds(binds: dict[str, Bind]) -> str:
    buffer = "{"
    for key, bind in binds.items():
        buffer += f'"{key}": {bind.var_name},'
    buffer += "}"
    return buffer


def emit_binds_type(binds: dict[str, Bind]) -> str:
    """
    The TS type of emit_binds(binds).  Optional binds are `| undefined` rather
    than `?`, because the key is always present on the emitted object.
    """
    buffer = "{"
    for key, bind in binds.items():
        buffer += f'"{key}": {_ts_type_with_undefined(bind)};'
    buffer += "}"
    return buffer


def emit_text_content(text: str | None, append_to_variable_name: str) -> str:
    if not text:
        return ""

    if text.strip() == "":
        return ""

    return (
        f"{append_to_variable_name}.appendChild("
        f"document.createTextNode({_parse_raw_val(text)}));\n"
    )


def _emit_text_node(
    node: HtmlElement,
    text: str | None,
    append_to_variable_name: str,
) -> str:
    if not text:
        return ""

    if text.strip() == "":
        return ""

    return (
        f"{append_to_variable_name}.appendChild("
        f"document.createTextNode({_parse_val(node, text)}));\n"
    )


def _parse_raw_val(val: str) -> str:
    val = val.strip()
    use_plus = False
    final_val = ""
    for m in re.split(r"({{.*?}})", val):
        tm = None
        if m.startswith("{{") and m.endswith("}}"):
            tm = _parse_context_key(m[2:-2].strip())
        elif len(m.strip()) > 0:
            tm = "`%s`" % m
        if tm:
            if use_plus:
                final_val += "+"
            final_val += tm
            use_plus = True
    return final_val
