import os
import glob
import shutil
from pathlib import Path
import sass
from calmjs.parse import es5
from calmjs.parse.unparsers.es5 import minify_print

from libs import RWTemplates
from libs.config import get_build_number
from libs import config


def create_baked_directory():
    d = os.path.join(
        os.path.dirname(__file__), "../static/baked/", str(get_build_number())
    )
    if not os.path.exists(d):
        os.makedirs(d)
    return False


def copy_woff():
    d = os.path.join(
        os.path.dirname(__file__), "../static/baked/", str(get_build_number())
    )
    # Copying the minimized font files has to go somewhere.
    for fontfile in glob.glob(
        os.path.join(os.path.dirname(__file__), "../static/fonts/*.min.woff")
    ):
        shutil.copy(fontfile, d)


def bake_css():
    create_baked_directory()
    wfn = os.path.join(
        os.path.dirname(__file__),
        "..",
        "static",
        "baked",
        str(get_build_number()),
        "style5.css",
    )
    incl_path = str(
        Path(
            os.path.join(os.path.dirname(__file__), "..", "static", "style5")
        ).resolve()
    )
    if not os.path.exists(wfn):
        _bake_css_file("r5.scss", wfn, incl_path)


def bake_beta_css():
    create_baked_directory()
    wfn = os.path.join(
        os.path.dirname(__file__),
        "..",
        "static",
        "baked",
        str(get_build_number()),
        "style5b.css",
    )
    incl_path = str(
        Path(
            os.path.join(os.path.dirname(__file__), "..", "static", "style5")
        ).resolve()
    )
    _bake_css_file("r5.scss", wfn, incl_path)


def _bake_css_file(input_filename, output_filename, include_path):
    with open(os.path.join(include_path, input_filename)) as input_file:
        css_content = sass.compile(
            string=input_file.read(),
            include_paths=[include_path],
            output_style="compressed",
        )

    with open(output_filename, "w") as dest:
        dest.write(css_content)


def get_js_file_list(js_dir="js"):
    jsfiles = []
    for root, _subdirs, files in os.walk(
        os.path.join(os.path.dirname(__file__), "..", "static", js_dir)
    ):
        for f in files:
            if f.endswith(".js"):
                jsfiles.append(os.path.join(root[root.find("..") + 3 :], f))
    jsfiles = sorted(jsfiles)
    return jsfiles


def get_js_file_list_url():
    return get_js_file_list()


def bake_js(source_dir="js5", dest_file="script5.js"):
    create_baked_directory()
    fn = os.path.join(
        os.path.dirname(__file__),
        "..",
        "static",
        "baked",
        str(get_build_number()),
        dest_file,
    )
    if not os.path.exists(fn):
        js_content = ""
        for sfn in get_js_file_list(source_dir):
            jsfile = open(os.path.join(os.path.dirname(__file__), "..", sfn))
            js_content += jsfile.read() + "\n"
            jsfile.close()

        o = open(fn, "w")
        # Pylint disabled for next line because pylint is buggy about the es5 function
        o.write(minify_print(es5(js_content)))  # pylint: disable=not-callable
        o.close()


def bake_templates(
    source_dir="templates5", dest_file="templates5.js", always_write=False, **kwargs
):
    create_baked_directory()
    source_dir = os.path.join(os.path.dirname(__file__), "..", "static", source_dir)
    dest_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "static",
        "baked",
        str(get_build_number()),
        dest_file,
    )
    if not os.path.exists(dest_file) or always_write:
        RWTemplates.compile_templates(
            source_dir,
            dest_file,
            helpers=False,
            inline_templates=("fave", "rating", "rating_album"),
            **kwargs,
        )


def bake_beta_templates():
    return bake_templates(
        dest_file="templates5b.js",
        always_write=True,
        debug_symbols=True,
        full_calls=False,
    )
