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
#    - {{ var }}                         : Variable interpolation (in attributes & text)
#
# Binds:
#    - A bind inside <if>/<else> is typed `T | undefined`, unless it is bound in
#      both the <if> and its <else>, in which case it is always present.
#    - A bind inside <for> needs a bind attribute on the <for>, which becomes an
#      array of each iteration's binds (plus its $root).
#    - Bind names must be unique within a template (or <for> body), except
#      across an <if> and its <else>.  "$root" is reserved.
#
# Cannot deal with SVG (or other namespaces) except for Rainwave's particular use case.
#
# Restrictions:
#    - <for> cannot handle objects - only arrays.
#    - {{ }} interpolation works in attributes and text content
#
##########################################

import os
from typing import Union

from lxml import html

from template_compiler.parse_node import (
    ROOT_BIND_NAME,
    element_ts_type,
    emit_binds,
    parse_root_element,
    walk_fragments,
)
from template_compiler.parse_node_results import Bind


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


def context_type_name(template_name: str) -> str:
    return f"{template_name}Context"


def find_single_root_element(
    fragments: list[Union[str, html.HtmlElement]],
) -> html.HtmlElement | None:
    """
    Returns the lone root element if the template consists of exactly one real
    element (no text or control flow beside it), so it can be the $root itself
    instead of living inside a documentFragment.
    """
    root_element = None
    for fragment in fragments:
        if isinstance(fragment, str):
            if fragment.strip():
                return None
        elif not isinstance(fragment.tag, str):
            continue  # comments & processing instructions emit nothing
        elif root_element is not None or fragment.tag in ("if", "else", "for"):
            return None
        else:
            root_element = fragment
    if root_element is not None and (root_element.tail or "").strip():
        return None
    return root_element


def find_style_file_name(template_file_name: str) -> str | None:
    """Returns the .scss file sitting next to the template, if any."""
    style_file_name = os.path.splitext(template_file_name)[0] + ".scss"
    if os.path.exists(style_file_name):
        return os.path.basename(style_file_name)
    return None


def solve_ts_imports(
    template_file_name: str,
    imports: set[str],
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
            raise Exception(f"Unknown template import '{import_name}'.")
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
        template_context_file_name = os.path.splitext(file_name)[0] + ".context.ts"
        has_context = os.path.exists(template_context_file_name)
        style_file_name = find_style_file_name(file_name)
        try:
            with (
                open(file_name) as html_file,
                open(template_output_file_name, "w") as ts_file,
            ):
                fn_buffer = ""
                fragments = html.fragments_fromstring(html_file.read())
                root_element = find_single_root_element(fragments)
                parsed_result_binds: dict[str, Bind]
                parsed_result_imports: set[str] = set()
                if root_element is not None:
                    parsed_result = parse_root_element(root_element, 0)
                    parsed_result_binds = {
                        ROOT_BIND_NAME: Bind(
                            "v1", element_ts_type(str(root_element.tag))
                        )
                    }
                    fn_buffer += parsed_result.buffer
                else:
                    fn_buffer += "const v1 = document.createDocumentFragment();\n"
                    parsed_result = walk_fragments(fragments, "v1", 1)
                    parsed_result_binds = {
                        ROOT_BIND_NAME: Bind("v1", "DocumentFragment")
                    }
                    fn_buffer += parsed_result.buffer
                # Duplicates and "$root" were already rejected while parsing
                parsed_result_binds.update(parsed_result.binds)
                parsed_result_imports.update(parsed_result.imports)

                file_buffer = ""
                context_param = ""
                if has_context:
                    file_buffer += (
                        f"import type {{ {context_type_name(template_name)} }} from "
                        f"'{_relative_module_path(template_output_file_name, template_context_file_name)}';\n"
                    )
                    context_param = f"context: {context_type_name(template_name)}"

                if style_file_name:
                    file_buffer += f"import style from './{style_file_name}';\n"

                file_buffer += solve_ts_imports(
                    template_output_file_name,
                    parsed_result_imports,
                )

                file_buffer += f"function {template_name}Template({context_param}) {{\n"

                file_buffer += fn_buffer

                file_buffer += f"return {emit_binds(parsed_result_binds)}\n;"
                file_buffer += "}\n"

                file_buffer += f"export {{ {template_name}Template }};"
                ts_file.write(file_buffer)
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
