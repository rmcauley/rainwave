import re

from lxml.html import HtmlElement

from template_compiler.parse_node_results import ParseNodeResults
from template_compiler.template_compiler_errors import RainwaveTemplateNodeParseFailure

raw_js_functions = ["$l", "_svg"]


def js_variable_name(count: int) -> str:
    return f"v{count}"


def parse_node(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    if node.tag == "if":
        results = parse_if_node(node, append_to_variable_name, js_variable_count)
    elif node.tag == "else":
        results = parse_else_node(node, append_to_variable_name, js_variable_count)
    elif node.tag == "for":
        results = parse_for_node(node, append_to_variable_name, js_variable_count)
    elif node.tag == "template":
        results = parse_template_node(node, append_to_variable_name, js_variable_count)
    else:
        results = parse_html_node(node, append_to_variable_name, js_variable_count)

    if "$l(" in results.buffer:
        results.imports.add("$l")

    return results


def parse_if_node(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    condition = node.attrib.get("condition")
    if not condition:
        raise RainwaveTemplateNodeParseFailure(
            node, "if tag requires 'condition' attribute"
        )

    walked = walk_node_contents(node, append_to_variable_name, js_variable_count)

    condition = _parse_context_key(condition)
    buffer = f"if ({condition}) {{\n"
    buffer += walked.buffer
    buffer += "}\n"

    return ParseNodeResults(
        buffer=buffer,
        binds=walked.binds,
        js_variable_count=walked.js_variable_count,
        imports=walked.imports,
    )


def parse_else_node(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    walked = walk_node_contents(node, append_to_variable_name, js_variable_count)

    buffer = "else {\n"
    buffer += walked.buffer
    buffer += "}\n"

    return ParseNodeResults(
        buffer=buffer,
        binds=walked.binds,
        js_variable_count=walked.js_variable_count,
        imports=walked.imports,
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
    binds: dict[str, str] = {}

    bind_attr = node.attrib.get("bind")
    if bind_attr:
        bind_attr = bind_attr.strip()
        js_variable_count += 1
        var_name = js_variable_name(js_variable_count)
        binds[bind_attr] = var_name
        buffer += f"const {var_name} = {each_attr}.map(context => {{\n"
        js_variable_count += 1
        loop_root = js_variable_name(js_variable_count)
        buffer += f"const {loop_root} = document.createDocumentFragment();\n"
        walked = walk_node_contents(node, loop_root, js_variable_count)
        walked.binds["$root"] = loop_root
        buffer += walked.buffer
        buffer += f"{append_to_variable_name}.appendChild({loop_root});\n"
        buffer += f"return {emit_binds(walked.binds)};\n"
        buffer += "});\n"
    else:
        buffer += f"{each_attr}.forEach(context => {{\n"
        walked = walk_node_contents(node, append_to_variable_name, js_variable_count)
        buffer += walked.buffer
        buffer += "});\n"

    return ParseNodeResults(
        buffer=buffer,
        binds=binds,
        js_variable_count=walked.js_variable_count,
        imports=walked.imports,
    )


def parse_template_node(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    use_attr = node.attrib.get("use")
    if not use_attr:
        raise RainwaveTemplateNodeParseFailure(
            node, "<template> tag requires 'use' attribute"
        )
    use_attr = use_attr.strip()

    bind_attr = node.attrib.get("bind")

    buffer = ""
    binds: dict[str, str] = {}

    if bind_attr:
        bind_attr = bind_attr.strip()
        js_variable_count += 1
        var_name = js_variable_name(js_variable_count)
        binds[bind_attr] = var_name
        buffer += f"const {var_name} = {use_attr}(context);\n"
        buffer += f"{append_to_variable_name}.appendChild({var_name}.$root);\n"
    else:
        buffer += f"{append_to_variable_name}.appendChild({use_attr}(context).$root);\n"

    return ParseNodeResults(
        buffer=buffer,
        binds=binds,
        js_variable_count=js_variable_count,
        imports={use_attr},
    )


def parse_html_node(
    node: HtmlElement,
    append_to_variable_name: str,
    js_variable_count: int,
) -> ParseNodeResults:
    tag = node.tag
    if isinstance(tag, bytes):
        tag = tag.decode()
    elif not isinstance(tag, str):
        return ParseNodeResults(
            buffer="", binds={}, js_variable_count=js_variable_count, imports=set()
        )

    buffer = ""
    binds: dict[str, str] = {}
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
            binds[attr_val_raw.strip()] = var_name
        elif attr_name == "class" and node.tag != "svg":
            buffer += f"{var_name}.className='{attr_val_raw.strip()}';\n"
            imports.add("style")
        elif attr_name == "href":
            buffer += f"{var_name}.href={attr_val_parsed};\n"
        elif attr_name == "use" and node.tag == "svg":
            # Already handled in svg creation
            pass
        else:
            # Generic attribute
            buffer += f"{var_name}.setAttribute('{attr_name}',{attr_val_parsed});\n"

    walked = walk_nodes(node, var_name, js_variable_count)

    binds.update(walked.binds)

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


def walk_nodes(
    node: HtmlElement, append_to_variable_name: str, js_variable_count: int
) -> ParseNodeResults:
    walk_result = ParseNodeResults(
        buffer="", binds={}, js_variable_count=js_variable_count, imports=set()
    )
    previous_child_tag: str | None = None
    for child in node:
        if child.tag == "else" and previous_child_tag != "if":
            raise RainwaveTemplateNodeParseFailure(
                child,
                "<else> must immediately follow an <if> sibling",
            )
        child_result = parse_node(
            child, append_to_variable_name, walk_result.js_variable_count
        )

        walk_result.buffer += child_result.buffer
        walk_result.binds.update(child_result.binds)
        walk_result.js_variable_count = child_result.js_variable_count
        walk_result.imports = walk_result.imports.union(child_result.imports)
        previous_child_tag = child.tag if isinstance(child.tag, str) else None
    return walk_result


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


def emit_binds(binds: dict[str, str]) -> str:
    buffer = "{"
    for key, val in binds.items():
        buffer += f'"{key}": {val},'
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
