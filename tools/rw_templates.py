##########################################
#
# Rainwave Javascript Templating System v2
#
# Refactored to use HTML component-style syntax for templates
# instead of Handlebars-style inline tags.
#
# Given a file templates/example.hbar:
#    <div class="some_div" bind="bound_div">{{ hello_world }}</div>
#
# This is what happens in JS:
#    const binds = RWTemplates.example({ "hello_world": "DOM ahoy!" });
#    console.log(root);                 // a documentFragment
#    console.log(binds.bound_div.textContent); // "DOM ahoy!"
#    document.body.appendChild(binds.$root);
#
# The resulting HTML:
#    <div class="some_div">DOM ahoy!</div>
#
# Template Syntax:
#    - <if condition="foo">...</if>     : Conditional block
#    - <else></else>                     : Else clause for if
#    - <for each="items">...</for>      : Loop over array
#    - <template use="name" />           : Include subtemplate
#    - {{ var }}                         : Variable interpolation (in attributes & text)
#
# Cannot deal with SVG (or other namespaces) except for Rainwave's particular use case.
#
# Restrictions:
#    - <for> cannot handle objects - only arrays.
#    - {{ }} interpolation works in attributes and text content
#
##########################################

import orjson
from html.parser import HTMLParser
import re
import os
from typing import Literal, TypedDict


# Binds are for when a HTMLElement (or other object) needs to be
# assigned to the bind object returned by the template render function.
class TemplateBind(TypedDict):
    name: str
    ts_type: str


class TemplateControlBranch(TypedDict):
    type: Literal["control"]
    tag: Literal["if", "else", "for", "template"]
    js_variable_name: str
    condition_or_each: str | None  # condition for if, each for for, None for else
    bind: str | None


class TemplateHtmlBranch(TypedDict):
    type: Literal["html"]
    js_variable_name: str
    tag: str
    ts_type: str


type TemplateBranch = TemplateControlBranch | TemplateHtmlBranch


HTML_ELEMENT_TYPES = {
    "div": "HTMLDivElement",
    "span": "HTMLSpanElement",
    "a": "HTMLAnchorElement",
    "button": "HTMLButtonElement",
    "img": "HTMLImageElement",
    "ul": "HTMLUListElement",
    "li": "HTMLLIElement",
    "svg": "SVGSVGElement",
    "p": "HTMLParagraphElement",
    "h1": "HTMLHeadingElement",
    "h2": "HTMLHeadingElement",
    "h3": "HTMLHeadingElement",
    "h4": "HTMLHeadingElement",
    "h5": "HTMLHeadingElement",
    "h6": "HTMLHeadingElement",
    "input": "HTMLInputElement",
    "textarea": "HTMLTextAreaElement",
    "select": "HTMLSelectElement",
    "form": "HTMLFormElement",
    "table": "HTMLTableElement",
    "tr": "HTMLTableRowElement",
    "td": "HTMLTableCellElement",
    "th": "HTMLTableCellElement",
    "label": "HTMLLabelElement",
    "b": "HTMLElement",
    "sup": "HTMLElement",
}

# Template control tags that are not HTML elements
TEMPLATE_TAGS = {"if", "else", "for", "template"}

raw_js_functions = ["$l"]


def compile_templates_v2(source_dir: str, dest_file: str) -> None:
    with open(dest_file, "w") as output_js:
        with open(dest_file + ".d.ts", "w") as output_d_ts:
            output_js.write(js_start())
            output_d_ts.write(d_ts_start())
            template_names: set[str] = set()
            for root, _subdirs, files in os.walk(source_dir):
                for f in files:
                    if f.endswith(".html"):
                        template_name = f[: f.rfind(".")]
                        if template_name in template_names:
                            raise Exception(
                                f"%{template_name} is a duplicate template name."
                            )
                        template_names.add(template_name)

                        with open(os.path.join(root, f)) as handlebars_file:
                            parser = RainwaveParserV2(template_name)
                            parser.feed(handlebars_file.read())
                            [js_buffer, d_ts_buffer] = parser.get_buffers_and_close()
                            output_js.write(js_buffer)
                            output_d_ts.write(d_ts_buffer)
            output_js.write(js_end(template_names))
            output_d_ts.write(d_ts_end())


def js_start() -> str:
    to_ret = (
        "function _svg(icon){"
        'const s=document.createElementNS("http://www.w3.org/2000/svg","svg");'
        'const u=document.createElementNS("http://www.w3.org/2000/svg","use");'
        'u.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href","/static/images4/symbols.svg#"+icon);'
        "s.appendChild(u);"
        "return s;"
        "}"
    )
    to_ret += "\n"
    return to_ret


def d_ts_start() -> str:
    to_ret = ""
    return to_ret


def js_end(template_names: set[str]) -> str:
    buffer = "export default {"
    for template_name in template_names:
        buffer += template_name + ","
    buffer += "}"
    return buffer


def d_ts_end() -> str:
    return ""


class RainwaveParserV2(HTMLParser):
    def __init__(self, template_name: str):
        super().__init__()

        self.name = template_name
        self._template_tree: list[TemplateBranch] = []
        self._current_js_variable_count = 1
        self._current_js_variable_name = "v1"
        self._input_buffer = ""

        (start_buffer, start_d_ts_buffer) = self._get_start_buffers(
            template_name, self._current_js_variable_name
        )
        self.buffer = start_buffer
        self.buffer_d_ts = start_d_ts_buffer

        root_branch: TemplateHtmlBranch = {
            "type": "html",
            "tag": "",
            "js_variable_name": self._current_js_variable_name,
            "ts_type": "DocumentFragment",
        }
        self._template_tree.append(root_branch)

    def _get_start_buffers(
        self, fn_name: str, js_variable_name: str
    ) -> tuple[str, str]:
        buffer = "function %s(context) {\n" % (fn_name)
        buffer += "const $rootContext = context;\n"
        buffer += "const %s = document.createDocumentFragment();\n" % js_variable_name
        buffer += 'const $binds = {"$root": %s};\n' % js_variable_name
        buffer_d_ts = (
            'export function %s(context: unknown): { "$root": DocumentFragment, '
            % fn_name
        )
        return (buffer, buffer_d_ts)

    def get_buffers_and_close(self) -> tuple[str, str]:
        self.close()

        if len(self._template_tree) > 1:
            raise Exception(
                "%s unclosed template tree: %s" % (self.name, repr(self._template_tree))
            )

        (buffer_end, d_ts_buffer_end) = self._get_end_buffers()
        self.buffer += buffer_end
        self.buffer_d_ts += d_ts_buffer_end

        return (self.buffer, self.buffer_d_ts)

    def _get_end_buffers(self) -> tuple[str, str]:
        return ("return $binds;};", "};")

    def handle_data(self, data: str) -> None:
        # Strip leading/trailing whitespace but preserve internal structure
        data = data.strip()
        if not data:
            return

        self._input_buffer += data

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        self._process_template_between_html_tags()

        attrs_dict = {name: value for name, value in attrs}

        if tag in ("if", "else", "for", "template"):
            if tag == "if":
                self._handle_start_if_tag(attrs_dict)
            elif tag == "else":
                self._handle_start_else_tag()
            elif tag == "for":
                self._handle_start_for_tag(attrs_dict)
            else:
                raise Exception("Unhandled control tag.")
        else:
            self._handle_html_element(tag, attrs, is_branch=True)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]):
        """Handle self-closing tags like <template use="..." />"""
        self._process_template_between_html_tags()

        attrs_dict = {name: value for name, value in attrs}

        # Only template should be self-closing
        if tag == "template":
            self._handle_template_tag(attrs_dict)
        else:
            # Self-closing HTML elements (like <img />, <svg />)
            self._handle_html_element(tag, attrs, is_branch=False)

    def handle_endtag(self, tag: str):
        self._process_template_between_html_tags()

        current_branch = self._template_tree.pop()
        if not current_branch or current_branch["tag"] != tag:
            raise Exception(
                "%s mismatched closing tag </%s>, expected </%s>\n\n%s"
                % (
                    self.name,
                    tag,
                    current_branch.get("tag", "unknown"),
                    self._template_tree,
                )
            )

        if current_branch["type"] == "control":
            if current_branch["tag"] == "if":
                self._handle_end_if_tag(current_branch)
            elif current_branch["tag"] == "else":
                self._handle_end_else_tag(current_branch)
            elif current_branch["tag"] == "for":
                self._handle_end_for_tag(current_branch)
            else:
                raise Exception("Unknown end tag %s" % current_branch["tag"])
        else:
            parent = self._get_parent_html_branch()
            self.buffer += "%s.appendChild(%s);\n" % (
                current_branch["js_variable_name"],
                parent["js_variable_name"],
            )

    def _handle_start_if_tag(self, attrs: dict[str, str | None]):
        if "condition" not in attrs:
            raise Exception("(%s) <if> tag requires 'condition' attribute" % self.name)

        condition = self._parse_context_key((attrs.get("condition") or "").strip())

        js_variable_name = self._get_next_js_variable_name()
        branch: TemplateControlBranch = {
            "type": "control",
            "tag": "if",
            "js_variable_name": js_variable_name,
            "condition_or_each": attrs["condition"],
            "bind": None,
        }
        self._template_tree.append(branch)
        self.buffer += "if (%s) {\n" % condition

    def _handle_end_if_tag(self, branch: TemplateControlBranch):
        self.buffer += "}\n"

    def _handle_start_else_tag(self) -> None:
        self.buffer += "else {\n"
        branch: TemplateControlBranch = {
            "type": "control",
            "tag": "else",
            "js_variable_name": "",
            "condition_or_each": None,
            "bind": None,
        }
        self._template_tree.append(branch)

    def _handle_end_else_tag(self, branch: TemplateControlBranch):
        self.buffer += "}\n"

    def _handle_start_for_tag(self, attrs: dict[str, str | None]):
        if "each" not in attrs:
            raise Exception("(%s) <for> tag requires 'each' attribute" % self.name)
        if "bind" not in attrs:
            raise Exception("(%s) <for> tag requires 'bind' attribute" % self.name)

        js_variable_name = self._get_next_js_variable_name()

        bind = attrs.get("bind")
        branch: TemplateControlBranch = {
            "type": "control",
            "tag": "for",
            "js_variable_name": js_variable_name,
            "condition_or_each": self._parse_context_key(attrs.get("each") or ""),
            "bind": bind,
        }
        self._template_tree.append(branch)

        start_buffers = self._get_start_buffers(
            f"{js_variable_name}Loop",
            js_variable_name,
        )
        self.buffer += start_buffers[0]

        if bind:
            self.buffer_d_ts += '%s: Array<{ "$root": DocumentFragment; ' % bind

    def _handle_end_for_tag(self, branch: TemplateControlBranch):
        self.buffer += "}"
        parent_html_branch = self._get_parent_html_branch()
        if branch["bind"]:
            self.buffer += "$binds.%s = %s.map(%sEach => {" % (
                branch["bind"],
                branch["condition_or_each"],
                branch["js_variable_name"],
            )
            self.buffer += "const $r = %sLoop(%sEach);" % (
                branch["js_variable_name"],
                branch["js_variable_name"],
            )
            self.buffer += "%s.appendChild($r.$root);" % (
                parent_html_branch["js_variable_name"]
            )
            self.buffer += "return $binds;"
            self.buffer += "});\n"

            self.buffer_d_ts += "}>;"
        else:
            self.buffer += "%s.forEach(%sEach => %s.appendChild(%sLoop(%sEach)));\n" % (
                branch["condition_or_each"],
                branch["js_variable_name"],
                parent_html_branch["js_variable_name"],
                branch["js_variable_name"],
                branch["js_variable_name"],
            )

    def _handle_template_tag(self, attrs: dict[str, str | None]):
        if "use" not in attrs:
            raise Exception("(%s) <template> tag requires 'use' attribute" % self.name)

        template_name = (attrs["use"] or "").strip()
        parent = self._get_parent_html_branch()
        bind = attrs.get("bind")

        if bind:
            self.buffer += "$binds.%s = %s(context);" % (bind, template_name)
            self.buffer += "%s.appendChild($binds.%s.$root);\n" % (
                parent["js_variable_name"],
                bind,
            )
            self.buffer_d_ts += "%s: ReturnType<%s>;" % (bind, template_name)
        else:
            self.buffer += "%s.appendChild(%s(context));\n" % (
                parent["js_variable_name"],
                template_name,
            )

    def _handle_html_element(
        self, tag: str, attrs: list[tuple[str, str | None]], is_branch: bool
    ):
        """Create a regular HTML element"""
        js_variable_name = self._get_next_js_variable_name()

        if tag == "svg":
            svg_use = None
            for attr_name, attr_val in attrs:
                if attr_name == "use" and attr_val is not None:
                    svg_use = self._parse_val(attr_val)
            if svg_use:
                self.buffer += "const %s = _svg(%s);" % (
                    js_variable_name,
                    svg_use,
                )
            else:
                raise Exception("(%s) SVG elements require 'use' attribute" % self.name)
        else:
            self.buffer += "const %s = document.createElement('%s');\n" % (
                js_variable_name,
                tag,
            )

        ts_type = HTML_ELEMENT_TYPES.get(tag, "HTMLElement")

        if is_branch:
            branch: TemplateHtmlBranch = {
                "type": "html",
                "js_variable_name": js_variable_name,
                "tag": tag,
                "ts_type": ts_type,
            }
            self._template_tree.append(branch)

        # Process attributes
        for attr_name, attr_val in attrs:
            if attr_val is None:
                attr_val_parsed = "'%s'" % attr_name
            else:
                attr_val_parsed = self._parse_val(attr_val)

            if attr_name == "bind":
                bind_name = attr_val.strip() if attr_val else attr_name
                self.buffer += "$binds['%s'] = %s;\n" % (bind_name, js_variable_name)
                self.buffer_d_ts += "%s: %s;" % (bind_name, ts_type)
            elif attr_name == "class" and tag != "svg":
                self.buffer += "%s.className=%s;\n" % (
                    js_variable_name,
                    attr_val_parsed,
                )
            elif attr_name == "href" and tag != "svg":
                self.buffer += "%s.href=%s;\n" % (js_variable_name, attr_val_parsed)
            elif attr_name == "use" and tag == "svg":
                # Already handled in svg creation
                pass
            elif attr_name not in ("bind",):
                # Generic attribute
                self.buffer += "%s.setAttribute('%s',%s);\n" % (
                    js_variable_name,
                    attr_name,
                    attr_val_parsed or r'""',
                )

    def _get_parent_html_branch(self) -> TemplateBranch:
        """Find the closest HTML element in the stack"""
        parent_html_branch = next(
            (
                branch
                for branch in reversed(self._template_tree)
                if branch["type"] == "html"
            ),
            None,
        )
        if not parent_html_branch:
            raise Exception("(%s) No parent HTML element found." % self.name)
        return parent_html_branch

    def _get_next_js_variable_name(self) -> str:
        self._current_js_variable_count += 1
        self._current_js_variable_name = f"v{self._current_js_variable_count}"
        return self._current_js_variable_name

    def _parse_context_key(self, context_key: str) -> str:
        """Convert a context key reference into JS variable access"""
        if context_key.startswith("@root."):
            return "$rootContext.%s" % context_key[6:]
        if context_key == "this":
            return "context"
        if context_key.startswith("^"):
            return context_key[1:]
        for func_name in raw_js_functions:
            if context_key.startswith(func_name):
                return context_key
        return "context.%s" % context_key

    def _parse_val(self, val: str) -> str:
        """
        Parse attribute or text values, handling {{ }} interpolation.
        Concatenates string literals and variable references.
        """
        use_plus = False
        final_val = ""
        try:
            for m in re.split(r"({{.*?}})", val):
                tm = None
                if m.startswith("{{") and m.endswith("}}"):
                    # Variable interpolation
                    tm = self._parse_context_key(m[2:-2].strip())
                elif len(m.strip()) > 0:
                    # String literal
                    tm = '"%s"' % m
                if tm:
                    if use_plus:
                        final_val += "+"
                    final_val += tm
                    use_plus = True
        except Exception:
            print("-" * 80)
            print("Exception in %s" % self.name)
            print("Value: %s" % val)
            print(
                "Current element tree: %s" % orjson.dumps(self._template_tree).decode()
            )
            print("-" * 80)
            raise

        return final_val

    def _process_template_between_html_tags(self) -> None:
        self._input_buffer = self._input_buffer.strip()

        # Do template tag replacements/processing where necessary
        for substitutes in re.split(r"({{.*?}})", self._input_buffer):
            substitutes = substitutes.strip()
            if not substitutes or len(substitutes) == 0:
                # It's just whitespace
                pass
            else:
                parent_html = self._get_parent_html_branch()
                txt = self._parse_val(substitutes)
                if txt[0] == '"' and txt[-1] == '"':
                    txt = '"%s"' % txt[1:-1].replace(
                        r'"',
                        r"\"",
                    )
                self.buffer += "%s.appendChild(document.createTextNode(%s));\n" % (
                    parent_html["js_variable_name"],
                    txt,
                )

        self._input_buffer = ""


if __name__ == "__main__":
    import argparse

    argp = argparse.ArgumentParser(
        description="Rainwave Javascript Templating system v2.  Takes HTML component-style template files, outputs native Javascript."
    )
    argp.add_argument(
        "--templatedir",
        default="jstemplates",
        required=True,
        help="Directory where templates live",
    )
    argp.add_argument(
        "--outfile",
        default="RWTemplates.templates.js",
        required=True,
        help="Output Javascript file",
    )
    command_args = argp.parse_args()
    compile_templates_v2(
        command_args.templatedir,
        command_args.outfile,
    )
