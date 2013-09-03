import os
import json
import types
import codecs
import tornado.locale

from libs import buildtools

locale_explanation = """
Rainwave Localization Formatting

RW localizations are stored in a JSON file and use the following syntax:
%(stuff)	- will display the variable inside ()
#(stuff)	- will display a number with a suffix at the end
				- suffixes are picked up in order of accuracy to the leftmost digit, e.g. when looking up "1253" it will search for:
					- 1253
					- 253
					- 53
					- 3
				... in English this will result in a suffix of "rd"
&(stuff:person is/people are)
			- Uses the first part (split by the /) if "stuff" is 1, uses the latter half if stuff is != 1
			
The JSON files should be encoded in UTF-8.
"""

master = None
translations = {}
_supported_locales = []

def load_translations():
	global master
	global translations
	
	master_file = open(os.path.join(os.path.dirname(__file__), "../static/lang/en_MASTER.json"))
	master = json.load(master_file)
	master_file.close()
	
	for root, subdir, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/lang")):
		for file in files:
			if file == "en_MASTER.json":
				continue
			f = codecs.open(os.path.join(os.path.dirname(__file__), "../static/lang/", file), "r", encoding="utf-8")
			translations[file[:-5]] = RainwaveLocale(file[:-5], master, json.load(f))
			f.close()
			
def compile_static_language_files():
	global translations

	buildtools.create_baked_directory()

	for locale, translation in translations.iteritems():
			f = codecs.open(os.path.join(os.path.dirname(__file__), "../static/baked/", str(buildtools.get_build_number()), locale + ".js"), "w", encoding="utf-8")
			f.write(u'\u4500')
			f.seek(0)
			f.write("var LOCALE = \"" + locale + "\"; var lang = " + (json.dumps(translation.dict, ensure_ascii=False, encoding="utf-8", separators=(',',':'))) + ";")
			f.close()

# I know this whole thing seems a bit wonkily-coded, but that's because we're staying Tornado compatible,
# which has an entirely different setup
class RainwaveLocale(tornado.locale.Locale):
	@classmethod
	def get(self, code):
		global translations
		return translations[code]
	
	@classmethod
	def get_closest(self, *codes):
		global translations
		
		if type(codes) == types.TupleType:
			codes = codes[0]
	
		for i in range(0, len(codes)):
			if codes[i] in translations:
				return translations[codes[i]]
			
			parts = codes[i].split("_")	
			for locale_name, translation in translations.iteritems():
				if parts[0] == locale_name[:2]:
					return translation	
		
		return translations['en_CA']	
	
	def __init__(self, code, master, translation):
		self.dict = dict(master.items() + translation.items())
		self.code = code
		
		self.missing = {}
		for k, v in master.iteritems():
			if not translation.has_key(k):
				self.missing[k] = v
	
	def translate(self, key, **kwargs):
		if not key in self.dict:
			return "[[ " + key + " ]]"
		line = self.dict[key]
		for k, i in kwargs.iteritems():
			if "%(" + k + ")" in line:
				line = line.replace("%(" + k + ")", str(i))
			if type(i) == types.IntType or type(i) == types.LongType or type(i) == types.FloatType:
				if "#(" + k + ")" in line:
					line = line.replace("#(" + k + ")", self.get_suffixed_number(i))
				plural_check = "&(" + k + ":"
				if plural_check in line:
					found_plural = line.find(plural_check)
					whole_plural = line[found_plural:line.find(")", found_plural) + 1]
					single_plural = whole_plural[0:-1].split(":", 1)[1]
					if not "/" in single_plural:
						return "[[" + k + " plural error ]]"
					if i == 1:
						line = line.replace(whole_plural, single_plural.split("/", 1)[0])
					else:
						line = line.replace(whole_plural, single_plural.split("/", 1)[1])
		return line
	
	def get_suffixed_number(self, number):
		if not type(number) == types.StringType:
			number = str(number)
		for i in range(0, len(number) - 1):
			if ("suffix_" + number[i:]) in self.dict:
				return number + self.dict['suffix_'+ number[i:]]
		return number
