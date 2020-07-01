#!/usr/bin/env python

import sys
from meliae import loader

# This is kind of a "cheat sheet" file more than anything else at this point
# to serve as a reminder to me how to work with Meliae effectively.


def quicksum(fn):
    om = loader.load(fn)
    s = om.summarize()
    print(s)
    # print()
    # print( "------------------------")
    # print()
    # for objtype in s.summaries[0:3]:
    # 	summarize_object_list(om.get_all(objtype.type_str)[0:5])
    # summarize_object_list(om, [om.get_all("Sync")[0]])


def summarize_object_list(om, object_list):
    for obj in object_list:
        print(
            "%s: (refs to: %s, refs from: %s)"
            % (obj.type_str, obj.num_refs, obj.num_referrers)
        )
        summarize_parents(om, obj)


def summarize_parents(om, obj, depth=1, max_depth=3):
    for parent in obj.parents:
        p = om[parent]
        print("  " * depth, end="")
        print("%s %s" % (p.type_str, p.value))
        if depth <= max_depth:
            summarize_parents(om, p, depth + 1, max_depth)


if __name__ == "__main__":
    quicksum(sys.argv[1])
