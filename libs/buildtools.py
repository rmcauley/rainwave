from scss import Scss
import json
import os
import codecs

def create_baked_directory():
	dir = os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()))
	if not os.path.exists(dir):
		os.makedirs(dir)

def bake_css():
	create_baked_directory()
	_bake_css_file(os.path.join(os.path.dirname(__file__), "../static/style/_sass.scss"),
				   os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()), "style.css"))
	_bake_css_file(os.path.join(os.path.dirname(__file__), "../static/style4/_sass.scss"),
				   os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()), "style4.css"))


def _bake_css_file(input_filename, output_filename):
	css_f = open(input_filename, 'r')
	css_content = Scss().compile(css_f.read())
	css_f.close()

	dest = open(output_filename, 'w')
	dest.write(css_content)
	dest.close()

bn = None
def get_build_number():
	global bn
	if bn:
		return bn

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
