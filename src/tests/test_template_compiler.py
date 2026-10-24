from __future__ import annotations

import re
from pathlib import Path

import pytest

from template_compiler.rw_templates import compile_templates
from template_compiler.template_compiler_errors import RainwaveTemplateNodeParseFailure


def compile_template(tmp_path: Path, source: str) -> str:
    (tmp_path / "sample.html").write_text(source)
    compile_templates(str(tmp_path))
    return (tmp_path / "sample.template.ts").read_text()


def return_object(output: str) -> dict[str, str]:
    # the function-level return is always the last one (loops return earlier)
    final_return = output[output.rindex("return {") :]
    return dict(re.findall(r'"([^"]+)": (v\d+),', final_return))


def declaration(output: str, var_name: str) -> str:
    match = re.search(rf"let {var_name}: ([^\n]+);\n", output)
    assert match is not None
    return match.group(1)


def test_unconditional_binds_stay_const_and_typed_by_tag(tmp_path: Path) -> None:
    output = compile_template(tmp_path, '<div bind="a"><span bind="b"></span></div>')

    assert "let " not in output
    assert return_object(output) == {"$root": "v1", "a": "v1", "b": "v2"}


def test_bind_in_if_is_hoisted_and_optional(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><if condition="foo"><div bind="a"></div></if>',
    )

    var_name = return_object(output)["a"]
    assert declaration(output, var_name) == "HTMLElementTagNameMap['div'] | undefined"
    assert output.index(f"let {var_name}") < output.index("if (context.foo)")
    assert re.search(rf"{var_name} = v\d+;\s*\}}", output)


def test_bind_in_both_branches_is_always_present(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><if condition="foo"><div bind="a"></div></if>'
        + '<else><span bind="a"></span></else>',
    )

    var_name = return_object(output)["a"]
    assert (
        declaration(output, var_name)
        == "HTMLElementTagNameMap['div'] | HTMLElementTagNameMap['span']"
    )
    assert "} else {" in output


def test_bind_in_only_one_branch_is_optional(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><if condition="foo"><div bind="a"></div></if>'
        + '<else><span bind="b"></span></else>',
    )

    binds = return_object(output)
    assert declaration(output, binds["a"]).endswith("| undefined")
    assert declaration(output, binds["b"]).endswith("| undefined")


def test_nested_if_stays_optional_even_if_both_branches_bind(
    tmp_path: Path,
) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><if condition="outer"><if condition="inner"><div bind="a"></div></if>'
        + '<else><div bind="a"></div></else></if>',
    )

    # present in both inner branches, but the outer <if> has no <else>
    var_name = return_object(output)["a"]
    assert declaration(output, var_name).endswith("| undefined")


def test_for_bind_is_array_of_iteration_binds(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><for each="items" bind="rows"><a bind="link"></a>'
        + '<if condition="x"><i bind="icon"></i></if></for>',
    )

    assert "context.items.map(" in output
    # inner binds belong to each iteration's object, not the template's
    assert list(return_object(output)) == ["$root", "rows"]
    assert "let v" in output  # the loop's own <if> bind is hoisted inside the callback
    assert output.index("let v") > output.index("context.items.map(")


def test_for_bind_in_if_is_optional_array(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><if condition="x"><for each="items" bind="rows"><a bind="link">'
        + "</a></for></if>",
    )

    var_name = return_object(output)["rows"]
    type_decl = declaration(output, var_name)
    assert type_decl.startswith("Array<{")
    assert "\"link\": HTMLElementTagNameMap['a']" in type_decl


def test_bind_in_for_without_bind_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(RainwaveTemplateNodeParseFailure, match="no 'bind' attribute"):
        compile_template(
            tmp_path,
            '<p></p><for each="items"><a bind="link"></a></for>',
        )


def test_duplicate_bind_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(RainwaveTemplateNodeParseFailure, match="Duplicate bind 'a'"):
        compile_template(
            tmp_path,
            '<div bind="a"></div><div bind="a"></div>',
        )


def test_duplicate_bind_across_if_and_unconditional_is_rejected(
    tmp_path: Path,
) -> None:
    with pytest.raises(RainwaveTemplateNodeParseFailure, match="Duplicate bind 'a'"):
        compile_template(
            tmp_path,
            '<p bind="a"></p><if condition="x"><div bind="a"></div></if>',
        )


def test_root_bind_name_is_reserved(tmp_path: Path) -> None:
    with pytest.raises(RainwaveTemplateNodeParseFailure, match="reserved"):
        compile_template(tmp_path, '<div bind="$root"></div>')


def test_else_without_if_is_rejected_at_top_level_and_nested(
    tmp_path: Path,
) -> None:
    with pytest.raises(RainwaveTemplateNodeParseFailure, match="must immediately"):
        compile_template(tmp_path, "<p></p><else><p></p></else>")
    with pytest.raises(RainwaveTemplateNodeParseFailure, match="must immediately"):
        compile_template(tmp_path, "<div><else><p></p></else></div>")


def test_unknown_tag_binds_as_plain_html_element(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><if condition="x"><my-widget bind="w"></my-widget></if>',
    )

    assert declaration(output, return_object(output)["w"]) == "HTMLElement | undefined"


def test_svg_bind_is_svg_element(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<p></p><if condition="x"><svg use="icon" bind="icon"></svg></if>',
    )

    assert (
        declaration(output, return_object(output)["icon"])
        == "SVGSVGElement | undefined"
    )


def test_text_after_control_flow_is_kept(tmp_path: Path) -> None:
    output = compile_template(
        tmp_path,
        '<div><if condition="x"><b></b></if> after if'
        + '<for each="items"><i></i></for> after for</div>',
    )

    assert "createTextNode(`after if`)" in output
    assert "createTextNode(`after for`)" in output
