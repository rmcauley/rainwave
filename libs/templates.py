# import os
# import warnings
# import subprocess
# from libs import config
# from libs.config import get_build_number

import shlex
from HTMLParser import HTMLParser

##########################################
#
# Rainwave Templating System
#
# A work of the worst kind of madness.
# This is a very simple templating system that will output
# native Javascript DOM calls and functions attached
# to a global JS variable called RWTemplates.
#
# TODO: better docs.  (sorry)
# just know that it looks and works a lot like Handlebars
# only it's far less forgiving
# it is also comparitively severely restrictive:
#    - ONE ELEMENT PER {{ }} TAG
#    - DO NOT MULTI-LINE TEXT
#    - DO NOT MIX {{ }} TAGS AND TEXT
#    - EACH {{# }} AND {{/ }} and {{> }} MUST BE ON ITS OWN LINE
#
##########################################

_unique_id = 0
def _get_id():
	global _unique_id
	_unique_id += 1
	return "v%s" % _unique_id

class RainwaveParser(HTMLParser):
	tree = [ ]
	stack = [ ]
	buffr = None

	def _parse_val(self, val):
		if val[:2] == "{{" and val[-2:] == "}}":
			val = "context.%s" % val[2:-2].strip()
		else:
			val = "\"%s\"" % val
		return val

	def __init__(self, template_name, *args, **kwargs):
		HTMLParser.__init__(self, *args, **kwargs)
		self.buffr = ""
		self.buffr += "%s: function(context) {" % template_name
		self.buffr += "if (!context.$template) context.$template = {};"
		self.buffr += "root_context = context;"
		self.buffr += "if (!context.root) context.root = document.createDocumentFragment();"

	def close(self, *args, **kwargs):
		HTMLParser.close(self, *args, **kwargs)
		self.buffr += "}"
		return self.buffr

	def handle_starttag(self, tag, attrs):
		uid = _get_id()
		self.buffr += "var %s = document.createElement('%s');" % (uid, tag)
		self.handle_append(uid)
		self.tree.append(uid)
		for attr in attrs:
			attr_val = self._parse_val(attr[1])
			if attr[0] == "bind":
				self.buffr += "context.$template.%s = %s;" % (attr_val.strip('"'), uid)
			else:
				self.buffr += "%s.setAttribute('%s', %s);" % (uid, attr[0], attr_val)

	def handle_append(self, uid):
		if len(self.tree) == 0:
			self.buffr += "context.$template.root.appendChild(%s);" % uid
		else:
			self.buffr += "%s.appendChild(%s);" % (self.tree[-1], uid)

	def handle_endtag(self, tag):
		self.tree.pop()

	def handle_data(self, lines):
		for line in lines.split("\n"):
			data = line.strip()
			if data[:3] == "{{>" and data[-2:] == "}}":
				self.handle_subtemplate(data[3:-2])
			elif data[:3] == "{{#" and data[-2:] == "}}":
				self.handle_stack_push(data[3:-2])
			elif data[:3] == "{{/" and data[-2:] == "}}":
				self.handle_stack_pop()
			else:
				self.buffr += "%s.textContent = %s;" % (self.tree[-1], self._parse_val(data))

	def handle_stack_push(self, data):
		args = []
		for arg in shlex.split(data):
			args.append(arg)
		stack_id = _get_id()
		self.buffr += "var %s = function(context) {" % stack_id
		self.stack.append((stack_id, args[0], args[1:]))

	def handle_stack_pop(self):
		self.buffr += "};"
		getattr(self, "handle_%s" % self.stack[-1][1])(self.stack[-1][0], *self.stack[-1][2])
		self.stack.pop()

	def handle_each(self, function_id, *args):
		self.buffr += "for (var i = 0; i < context.%s.length; i++) {" % args[0]
		self.buffr += "if (!context.%s[i].$template) context.%s[i].$template = {};" % (args[0], args[0])
		self.buffr += "%s(context.%s[i]);" % (function_id, args[0])
		self.buffr += "}"

	def handle_subtemplate(self, template_name):
		self.handle_append("RWTemplates.%s(context)" % template_name)

# def process_templates():
print "var RWTemplates = {"

parser = RainwaveParser("main")
parser.feed('<html><head><title>Test</title></head>'
	'<body>'
	'<h1 class="hello" bind="h1">Parse me!</h1>'
	'{{#each song }}'
	'	<div class="song" class="{{ crap }}" bind="title">{{ title }}</div>'
	'{{/each}}'
	'\n'
	'\n'
	'hello\n'
	'{{>song}}'
	'</body></html>'
)
parser.close()

print "};"