# http://stackoverflow.com/questions/14557944/downsizing-an-otf-font-by-removing-glyphs

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

    for i in f.read():
        # 1327 is where the Cyrillic block(s) end, covered by Roboto Condensed.
        # We don't want to include characters covered by Roboto in these
        # extended (presumably CJK) languages, we want them rendered by Roboto!
        if ord(i) > 1327:
            font.selection[ord(i)] = True
    f.close()

    font.selection.invert()

    for i in font.selection.byGlyphs:
        font.removeGlyph(i)

    font.generate(destination)
