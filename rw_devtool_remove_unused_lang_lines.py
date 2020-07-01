#!/usr/bin/env python

import os

import api.locale

api.locale.load_translations()

to_pop = []
for k, v in api.locale.master.items():
    found = False
    for root, subdirs, files in os.walk(os.path.join("static", "js4")):
        for filename in files:
            if filename.endswith(".js"):
                f = open(os.path.join(root, filename))
                c = f.read()
                if c.find('$l("%s")' % k) >= 0:
                    found = True
                    break
                f.close()
        if found == True:
            continue
    if not found:
        to_pop.append(k)

f = open(os.path.join("lang", "en_MASTER.json"))
out = open("out.json", "w")
for line in f:
    if to_pop.count(line.strip().split(" ", 1)[0].strip('"')) == 0:
        out.write(line)
    elif len(line.strip()) == 0:
        out.write(line)
    elif line.find("__comment__") >= 0:
        out.write(line)
f.close()
out.close()
