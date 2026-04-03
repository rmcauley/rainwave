##########################################
#
# Rainwave Javascript Templating System v3
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

import os

from lxml import html

from template_compiler.parse_node import emit_binds, emit_text_content, parse_node


def compile_templates(source_dir: str, dest_file: str) -> None:
    with open(dest_file + ".ts", "w") as output_ts:
        output_ts.write(ts_start())
        template_names: set[str] = set()
        for root, _subdirs, files in os.walk(source_dir):
            for f in files:
                if f.endswith(".html"):
                    try:
                        template_name = f[: f.rfind(".")]
                        if template_name in template_names:
                            raise Exception(
                                f"{template_name} is a duplicate template name."
                            )
                        template_names.add(template_name)

                        with open(os.path.join(root, f)) as html_file:
                            buffer = f"function {template_name}(context) {{\n"
                            buffer += "const v1 = document.createDocumentFragment();\n"
                            parsed_result_binds: dict[str, str] = {"$root": "v1"}
                            js_variable_count = 1
                            for fragment in html.fragments_fromstring(html_file.read()):
                                if isinstance(fragment, str):
                                    buffer += emit_text_content(fragment, "v1")
                                else:
                                    parsed_result = parse_node(fragment, "v1", js_variable_count)
                                    parsed_result_binds.update(parsed_result.binds)
                                    js_variable_count = parsed_result.js_variable_count
                                    buffer += parsed_result.buffer

                            buffer += f"return {emit_binds(parsed_result_binds)}\n;"
                            buffer += "}\n"
                            output_ts.write(buffer)
                    except:
                        print(f"Failed on {os.path.join(root, f)}")
                        raise
        output_ts.write(ts_end(template_names))


def ts_start() -> str:
    to_ret = "import { svgIcon as _svg } from '../helpers/svg';\n"
    to_ret += "import { $l } from '../language';\n"
    return to_ret


def ts_end(template_names: set[str]) -> str:
    buffer = "export default {"
    for template_name in sorted(template_names):
        buffer += template_name + ","
    buffer += "}"
    return buffer


if __name__ == "__main__":
    import argparse

    argp = argparse.ArgumentParser(
        description="Rainwave Javascript Templating system v2.  Takes HTML component-style template files, outputs native Javascript."
    )
    argp.add_argument(
        "--templatedir",
        required=True,
        help="Directory where templates live",
    )
    argp.add_argument(
        "--outfile",
        required=True,
        help="Output Javascript and d.ts file",
    )
    command_args = argp.parse_args()
    compile_templates(
        command_args.templatedir,
        command_args.outfile,
    )
