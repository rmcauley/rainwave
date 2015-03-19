import os
import warnings
import subprocess
from libs import config
from libs import js_templating
from libs.config import get_build_number
from slimit import minify

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    import scss
    from scss import Scss

scss.config.LOAD_PATHS = os.path.join(os.path.dirname(__file__), "..", "static", "style4")

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
	if not os.path.exists(wfn):
		_bake_css_file(os.path.join(os.path.dirname(__file__), "..", "static", "style4", "_sass.scss"), wfn)

def bake_beta_css():
	create_baked_directory()
	wfn = os.path.join(os.path.dirname(__file__), "..", "static", "baked", str(get_build_number()), "style5b.css")
	_bake_css_file(os.path.join(os.path.dirname(__file__), "..", "static", "style5", "r5.scss"), wfn)

def _bake_css_file(input_filename, output_filename):
	css_f = open(input_filename, 'r')
	css_content = Scss().compile(css_f.read())
	css_f.close()

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

def bake_templates(source_dir="templates5", dest_file="templates5.js", always_write=False):
	create_baked_directory()
	fn = os.path.join(os.path.dirname(__file__), "..", "static", "baked", str(get_build_number()), dest_file)
	if not os.path.exists(fn) or always_write:
		o = open(fn, "w")
		o.write(js_templating.js_start())
		#pylint: disable=W0612
		for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "..", "static", source_dir)):
			for f in files:
				if f.endswith(".hbar"):
					tname = os.path.join(root[root.find(source_dir) + len(source_dir) + len(os.sep):], f[:-5]).replace(os.sep, ".")
					tfile = open(os.path.join(root[root.find("..") + 3:], f))
					parser = js_templating.RainwaveParser(tname)
					parser.feed(tfile.read())
					o.write(parser.close())
					tfile.close()
		o.write(js_templating.js_end())
		o.close()
		#pylint: enable=W0612

def bake_beta_templates():
	return bake_templates(dest_file="templates5b.js", always_write=True)
