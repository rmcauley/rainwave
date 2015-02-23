# import os
# import warnings
# import subprocess
# from libs import config
# from libs.config import get_build_number

import shlex
from operator import methodcaller
from HTMLParser import HTMLParser

_unique_id = 0
def _get_id():
	global _unique_id
	_unique_id += 1
	return "v%s" % _unique_id

class RainwaveParser(HTMLParser):
	tree = [ ]
	stack = [ ]

	def _parse_val(self, val):
		if val[:2] == "{{" and val[-2:] == "}}":
			val = "context.%s" % val[2:-2].strip()
		else:
			val = "\"%s\"" % val
		return val

	def __init__(self, template_name, *args, **kwargs):
		HTMLParser.__init__(self, *args, **kwargs)
		print "function %s(context) {" % template_name
		print "var _to_return = {};"

	def close(self, *args, **kwargs):
		HTMLParser.close(self, *args, **kwargs)
		print "return _to_return;"
		print "}"

	def handle_starttag(self, tag, attrs):
		uid = _get_id()
		print "var %s = document.createElement('%s');" % (uid, tag)
		if len(self.tree) == 0:
			print "to_return.root = %s;" % uid
		else:
			print "%s.appendChild(%s);" % (self.tree[-1], uid)
		self.tree.append(uid)
		for attr in attrs:
			attr_val = self._parse_val(attr[1])
			if attr[0] == "bind":
				print "_to_return.%s = %s;" % (attr_val.strip('"'), uid)
			else:
				print "%s.setAttribute('%s', %s);" % (uid, attr[0], attr_val)

	def handle_endtag(self, tag):
		self.tree.pop()

	def handle_data(self, data):
		data = data.strip()
		if data[:3] == "{{#" and data[-2:] == "}}":
			self.handle_stack_push(data[3:-2])
		elif data[:3] == "{{/" and data[-2:] == "}}":
			self.handle_stack_pop()
		else:
			print "%s.textContent = %s;" % (self.tree[-1], self._parse_val(data))

	def handle_stack_push(self, data):
		args = []
		for arg in shlex.split(data):
			args.append(arg)
		stack_id = _get_id()
		print "var %s = function(context) {" % stack_id
		self.stack.append((stack_id, args[0], args[1:]))

	def handle_stack_pop(self):
		print "};"
		getattr(self, "handle_%s" % self.stack[-1][1])(self.stack[-1][0], *self.stack[-1][2])
		self.stack.pop()

	def handle_each(self, function_id, *args):
		print "for (var i = 0; i < context.%s.length; i++) {" % args[0]
		print "  %s(context.%s[i]);" % (function_id, args[0])
		print "}"

# def process_templates():
parser = RainwaveParser("main")
parser.feed('<html><head><title>Test</title></head>'
	'<body>'
	'<h1 class="hello" bind="h1">Parse me!</h1>'
	'{{#each song }}'
	'	<div class="song" class="{{ crap }}">{{ title }}</div>'
	'{{/each}}'
	'</body></html>'
)
parser.close()