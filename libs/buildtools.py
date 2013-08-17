from scss import Scss
import json
import os
import codecs

def create_baked_directory():
	dir = os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()))
	if not os.path.exists(dir):
		os.makedirs(dir)

def bake_css():
	css_f = open(os.path.join(os.path.dirname(__file__), "../static/style/_sass.scss"), 'r')
	css_content = Scss().compile(css_f.read())
	css_f.close()
	
	create_baked_directory()
	
	dest = open(os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()), "style.css"), 'w')
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
