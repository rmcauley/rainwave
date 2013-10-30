from PIL import Image

sheet = Image.new("RGBA", (2600, 48), None)

for i in range(0, 26):
	sprite = Image.open("bar_%05d.png" % i)
	sheet.paste(sprite, (i * 100, 0))

sheet.save("sheet-hdpi.png", optimize=True)

sheet_ldpi = sheet.resize((1300, 24), Image.ANTIALIAS)
sheet_ldpi.save("sheet-ldpi.png", optimize=True)
