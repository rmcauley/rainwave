import os
import json
import types
import codecs
import tornado.locale
import tornado.escape

from libs import buildtools
from libs import log

locale_explanation = r"""
Rainwave localizations are stored in a JSON file and use the following syntax:

"translation_key":  "Translated phrase."

There are some value replacements you can use in the translated phrase strings:

%(stuff)
    - will display the variable inside ()
        = "event_on_station": "Event on %(station_name) "
            --> "Event on Game"
        = "rating:"     : "Rating: %(num_ratings)"
            --> "Rating: 5.0"

#(stuff)
    - Will display a number with a suffix at the end.
    - Suffixes are not provided in the master language file.
    - English examples:
         = "rank"    : "Rank: #(rank)"
        = "suffix_1": "st"
            --> "Rank: 1st" when rank is 1
        = "suffix_2": "nd"
            --> "Rank: 2nd" when rank is 2
        = "suffix_3": "rd"
            --> "Rank: 3rd" when rank is 3
    - When looking up e.g. the number 1253, the system searches in this order:
        1. "suffix_1253"
        2. "suffix_253"
        3. "suffix_53"
        4. "suffix_3"
    - Be mindful of this.  Example, 13 in English:
        = "suffix_3": "rd"
            --> "Rank: 3rd"
            --> "Rank: 13rd"
            --> "Rank: 113rd"
        = "suffix_13": "th"
            --> "Rank: 3"
            --> "Rank: 13th"
            --> "Rank: 113th"
        = "suffix_3": "rd", "suffix_13": "th"
            --> "Rank: 3rd"
            --> "Rank: 13th"
            --> "Rank: 113th"

&(stuff:person is/people are)
    - Uses the first part (split by the /) if "stuff" is 1, uses the latter half if stuff is != 1 (sorry, plurals are restricted to English grammar)
        = "favorited_by": "Favourited by &(fave_count:person/people)"
            --> "Favourited by 0 people"
            --> "Favourited by 1 person"
            --> "Favourited by 2 people"
            --> "Favourited by 3 people" etc

The JSON files should be encoded in UTF-8.
"""

master = None
translations = {}
locale_names_json = ""

def load_translations():
	global master
	global translations
	global locale_names_json

	master_file = open(os.path.join(os.path.dirname(__file__), "../lang/en_MASTER.json"))
	master = json.load(master_file)
	master_file.close()

	locale_names = {}
	for root, subdir, files in os.walk(os.path.join(os.path.dirname(__file__), "../lang")):		#pylint: disable=W0612
		for filename in files:
			if filename == "en_MASTER.json":
				continue
			if not filename.endswith(".json"):
				continue
			try:
				f = codecs.open(os.path.join(os.path.dirname(__file__), "../lang/", filename), "r", encoding="utf-8")
				translations[filename[:-5]] = RainwaveLocale(filename[:-5], master, json.load(f))
				f.close()
				locale_names[filename[:-5]] = translations[filename[:-5]].dict['language_name']
			except Exception as e:
				log.exception("locale", "%s translation did not load." % filename[:-5], e)

	locale_names_json = tornado.escape.json_encode(locale_names)

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
	def exists(self, code):
		global translations
		return code in translations

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

	# I can't find the original definition for the init here
	# And things seem to work fine without calling it
	# So... I'm just going to leave it alone and ignore
	# the pylint warning that we're not calling super() here
	#pylint: disable=W0231
	def __init__(self, code, mster, translation):
		# super(RainwaveLocale, self).__init__()
		# remove lines that are no longer in the master file
		to_pop = []
		for k, v in translation.iteritems():
			if not mster.has_key(k) and not k.startswith("suffix_"):
				to_pop.append(k)
		for k in to_pop:
			translation.pop(k)

		self.dict = dict(mster.items() + translation.items())
		self.code = code

		# document lines missing
		self.missing = {}
		for k, v in mster.iteritems():
			if not translation.has_key(k):
				self.missing[k] = v
	#pylint: enable=W0231

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
