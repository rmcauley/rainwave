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

# These comments exist here for now until I can find a better place for them.
# /* Rainwave 3 en_CA MASTER Language File

 # |variables| are replaced by Rainwave's localization library
 # |S:variable| means to suffix a number-variable using the suffixes you define here. i.e. 4th, 5th, 6th, etc.  Works only on 1-10 number scales, made for English.
 # |P:variable,word| pluralizes a word (found in this file) based on variable.  Again made for English, it only uses the plural word for anything != 0 and > 1.
 
 # Some examples:
 
 # This song has |favourites| favourites                       -----> This song has 5 favourites
 # This song ranks |S:variables|                               -----> This song ranks 5th                    (5 followed by "suffix_5")
 # Has been favourited by |favourites| |P:favourites,person|   -----> Has been favouirted by 5 people        ("person_p" gets used)
 # Has been favourited by |favourites| |P:favourites,person|   -----> Has been favouirted by 1 person        ("person" gets used)
 
 # No HTML or HTML codes allowed.  Only text.
 
 # PLEASE MAKE SURE YOUR FILE IS ENCODED IN UTF-8.
 
def bake_languages():
	master_file = open(os.path.join(os.path.dirname(__file__), "../static/lang/en_MASTER.json"))
	master = json.load(master_file)
	master_file.close()
	
	create_baked_directory()
	
	for root, subdir, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/lang")):
		for file in files:
			if file == "en_MASTER.json":
				continue
			f = codecs.open(os.path.join(os.path.dirname(__file__), "../static/lang/", file), "r", encoding="utf-8")
			lang = json.load(f)
			f.close()
			
			lang = dict(master.items() + lang.items())
			f = codecs.open(os.path.join(os.path.dirname(__file__), "../static/baked/", str(get_build_number()), file[:-5] + ".js"), "w", encoding="utf-8")
			f.write(u'\u4500')
			f.seek(0)
			f.write("lang = " + (json.dumps(lang, ensure_ascii=False, encoding="utf-8", separators=(',',':'))) + ";")
			f.close()

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