import os
import subprocess
import scss
from pathlib import Path
from libs import config
from libs import RWTemplates
from libs.config import get_build_number
from slimit import minify

def create_baked_directory():
	d = os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()))
	if not os.path.exists(d):
		os.makedirs(d)
		if os.name != "nt" and os.getuid() == 0:	#pylint: disable=E1101
			subprocess.call(["chown", "-R", "%s:%s" % (config.get("api_user"), config.get("api_group")), d ])
		return True
	return False

def bake_css():
	create_baked_directory()
	wfn = os.path.join(os.path.dirname(__file__), "..", "static", "baked", str(get_build_number()), "style4.css")
	incl_path = Path(os.path.join(os.path.dirname(__file__), "..", "static", "style5")).resolve()
	if not os.path.exists(wfn):
		_bake_css_file("_sass.scss", wfn, incl_path)

def bake_beta_css():
	create_baked_directory()
	wfn = os.path.join(os.path.dirname(__file__), "..", "static", "baked", str(get_build_number()), "style5b.css")
	incl_path = Path(os.path.join(os.path.dirname(__file__), "..", "static", "style5")).resolve()
	_bake_css_file("r5.scss", wfn, incl_path)

def _bake_css_file(input_filename, output_filename, include_path):
	css_content = scss.compiler.compile_file(input_filename,
		root=include_path,
		search_path=[ include_path ],
		output_style='compressed',
		live_errors=True,
		warn_unused_imports=False
	)

	dest = open(output_filename, 'w')
	dest.write(css_content)
	dest.close()

def get_js_file_list(js_dir = "js"):
	jsfiles = []
	#pylint: disable=W0612
	for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "..", "static", js_dir)):
		for f in files:
			if f.endswith(".js"):
				jsfiles.append(os.path.join(root[root.find("..") + 3:], f))
	#pylint: enable=W0612
	jsfiles = sorted(jsfiles)
	return jsfiles

def get_js_file_list_url():
	if os.sep != "/":
		jsfiles = get_js_file_list()
		result = []
		for fn in jsfiles:
			result.append(fn.replace(os.sep, "/"))
		return result
	return get_js_file_list()

def bake_js(source_dir="js4", dest_file="script4.js"):
	create_baked_directory()
	fn = os.path.join(os.path.dirname(__file__), "..", "static", "baked", str(get_build_number()), dest_file)
	if not os.path.exists(fn):
		js_content = ""
		for sfn in get_js_file_list(source_dir):
			jsfile = open(os.path.join(os.path.dirname(__file__), "..", sfn))
			js_content += minify(jsfile.read()) + "\n"
			jsfile.close()

		o = open(fn, "w")
		o.write(minify(js_content, mangle=True, mangle_toplevel=False))
		o.close()

def bake_templates(source_dir="templates5", dest_file="templates5.js", always_write=False, **kwargs):
	create_baked_directory()
	source_dir = os.path.join(os.path.dirname(__file__), "..", "static", source_dir)
	dest_file = os.path.join(os.path.dirname(__file__), "..", "static", "baked", str(get_build_number()), dest_file)
	RWTemplates.compile_templates(source_dir, dest_file, helpers=False, inline_templates=('fave', 'rating'), **kwargs)

def bake_beta_templates():
	return bake_templates(dest_file="templates5b.js", always_write=True, debug_symbols=True, full_calls=False)
