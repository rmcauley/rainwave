import scss
from scss import Scss
import os
from jsmin import jsmin

scss.config.LOAD_PATHS = os.path.dirname(__file__) + "/../static/style4"

def create_baked_directory():
	d = os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()))
	if not os.path.exists(d):
		os.makedirs(d)

def bake_css():
	create_baked_directory()
	# _bake_css_file(os.path.join(os.path.dirname(__file__), "../static/style/_sass.scss"),
	# 			   os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()), "style.css"))
	_bake_css_file(os.path.join(os.path.dirname(__file__), "../static/style4/_sass.scss"),
				   os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()), "style4.css"))


def _bake_css_file(input_filename, output_filename):
	css_f = open(input_filename, 'r')
	css_content = Scss().compile(css_f.read())
	css_f.close()

	dest = open(output_filename, 'w')
	dest.write(css_content)
	dest.close()

def get_js_file_list(js_dir = "js"):
	jsfiles = []
	for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "..", "static", js_dir)):
		for f in files:
			jsfiles.append(os.path.join(root[root.find("..") + 3:], f))
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

def bake_js(source_dir="js", dest_file="script.js"):
	create_baked_directory()
	o = open(os.path.join(os.path.dirname(__file__), "..", "static", "baked", str(get_build_number()), dest_file), "w")
	for fn in get_js_file_list(source_dir):
		jsfile = open(os.path.join(os.path.dirname(__file__), "..", fn))
		o.write(jsmin(jsfile.read()))
		jsfile.close()
	o.close()

def bake_beta_js():
	bake_js("js4", "script4.js")

def get_build_number():
	bnf = open(os.path.join(os.path.dirname(__file__), "../etc/buildnum"), 'r')
	bn = int(bnf.read())
	bnf.close()
	return bn

def increment_build_number():
	bn = get_build_number()	+ 1
	bnf = open(os.path.join(os.path.dirname(__file__), "../etc/buildnum"), 'w')
	bnf.write(bn)
	bnf.close()
	return bn
