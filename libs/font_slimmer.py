# http://stackoverflow.com/questions/14557944/downsizing-an-otf-font-by-removing-glyphs

import sys

supported = False
try:
	import fontforge
	supported = True
except Exception as e:
	pass

def slim(ttf, text_file, destination):
	if not supported:
		return

	font = fontforge.open(ttf)
	f = open(text_file, "r")

	for i in f.read().decode("UTF-8"):
		font.selection[ord(i)] = True
	f.close()

	font.selection.invert()

	for i in font.selection.byGlyphs:
		font.removeGlyph(i)

	font.generate(destination)
