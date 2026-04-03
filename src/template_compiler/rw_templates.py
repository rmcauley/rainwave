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


def _relative_module_path(from_file_name: str, to_file_name: str) -> str:
    module_path = os.path.relpath(
        os.path.splitext(to_file_name)[0],
        os.path.dirname(from_file_name),
    ).replace(os.sep, "/")
    if module_path.endswith("/index"):
        module_path = module_path[: -len("/index")]
    if not module_path.startswith("."):
        module_path = f"./{module_path}"
    return module_path


def solve_ts_imports(
    template_file_name: str,
    imports: set[str],
    template_name_to_filename: dict[str, str],
) -> str:
    import_buffer = ""
    for import_name in sorted(imports):
        if import_name == "svg":
            import_buffer += (
                f"import {{ svgIcon as _svg }} from "
                f"'{_relative_module_path(template_file_name, 'frontend/src/helpers/svg.ts')}';\n"
            )
        elif import_name == "$l":
            import_buffer += (
                f"import {{ $l }} from "
                f"'{_relative_module_path(template_file_name, 'frontend/src/language/index.ts')}';\n"
            )
        else:
            imported_template_file_name = template_name_to_filename.get(import_name)
            if not imported_template_file_name:
                raise Exception(f"Unknown template import '{import_name}'.")
            if imported_template_file_name == template_file_name:
                continue
            import_buffer += (
                f"import {{{import_name}}} from "
                f"'{_relative_module_path(template_file_name, imported_template_file_name)}.template';\n"
            )
    return import_buffer


def compile_templates(source_dir: str) -> None:
    template_name_to_filename: dict[str, str] = {}
    for root, _subdirs, files in os.walk(source_dir):
        for file_name in files:
            if file_name.endswith(".html"):
                template_name = file_name[: file_name.rfind(".")]
                if template_name_to_filename.get(template_name, None):
                    raise Exception(f"{template_name} is a duplicate template name.")
                template_name_to_filename[template_name] = os.path.join(root, file_name)

    for template_name, file_name in template_name_to_filename.items():
        template_output_file_name = os.path.splitext(file_name)[0] + ".template.ts"
        try:
            with open(file_name) as html_file, open(
                template_output_file_name, "w"
            ) as ts_file:
                buffer = f"function {template_name}(context) {{\n"
                buffer += "const v1 = document.createDocumentFragment();\n"
                parsed_result_binds: dict[str, str] = {"$root": "v1"}
                parsed_result_imports: set[str] = set()
                js_variable_count = 1
                for fragment in html.fragments_fromstring(html_file.read()):
                    if isinstance(fragment, str):
                        buffer += emit_text_content(fragment, "v1")
                    else:
                        parsed_result = parse_node(fragment, "v1", js_variable_count)
                        parsed_result_binds.update(parsed_result.binds)
                        parsed_result_imports.update(parsed_result.imports)
                        js_variable_count = parsed_result.js_variable_count
                        buffer += parsed_result.buffer
                buffer += f"return {emit_binds(parsed_result_binds)}\n;"
                buffer += "}\n"

                buffer = (
                    solve_ts_imports(
                        file_name,
                        parsed_result_imports,
                        template_name_to_filename,
                    )
                    + buffer
                )
                buffer += f"export {{ {template_name} }};"
                ts_file.write(buffer)
        except:
            print(f"Failed on {file_name}")
            raise


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
    )
