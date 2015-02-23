# import os
# import warnings
# import subprocess
# from libs import config
# from libs.config import get_build_number

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
# Also mucks with having shorthand versions of native
# functions for minification.
#
# just know that it looks like Handlebars
# except with no helpers available :P
# and it's far less forgiving
# and it is also severely restrictive:
#    - ONE ELEMENT PER {{ }} TAG
#    - DO NOT MULTI-LINE TEXT
#    - DO NOT MIX {{ }} TAGS AND TEXT IN THE SAME HTML ELEMENT
#    - EACH {{# }} AND {{/ }} and {{> }} MUST BE ON ITS OWN LINE
#
# {{ @root.blah }}
#    - access root content
# {{ $blahblah }}
#    - raw JS output including $
# {{ ^blahblah }}
#    - raw JS output excluding ^
#
# it's dumb.  but it's fast.  really fast.  stupid fast.
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
	name = None

	def _parse_val(self, val):
		if val[:2] == "{{" and val[-2:] == "}}":
			val = "ctx.%s" % val[2:-2].strip()
		else:
			val = "\"%s\"" % val
		return val

	def __init__(self, template_name, *args, **kwargs):
		HTMLParser.__init__(self, *args, **kwargs)
		self.name = template_name
		self.buffr = ""
		self.buffr += "%s: function(ctx) {" % template_name
		self.buffr += "\"use strict\";"
		self.buffr += "ctx = ctx || {};"
		self.buffr += "if (!ctx.$template) ctx.$template = {};"
		self.buffr += "var rctx = ctx;"
		self.buffr += "if (!ctx.$template.root) ctx.$template.root = d.createDocumentFragment();"

	def close(self, *args, **kwargs):
		HTMLParser.close(self, *args, **kwargs)
		if len(self.tree):
			raise Exception("Unclosed tags: %s" % repr(self.tree))
		if len(self.stack):
			raise Exception("Unclosed stack: %s" % repr(self.stack))
		self.buffr += "return ctx;"
		self.buffr += "}"
		return self.buffr

	def handle_starttag(self, tag, attrs):
		uid = _get_id()
		self.buffr += "var %s = d.cE('%s');" % (uid, tag)
		self.handle_append(uid)
		self.tree.append(uid)
		for attr in attrs:
			attr_val = self._parse_val(attr[1])
			if attr[0] == "bind":
				self.buffr += "ctx.$template.%s = %s;" % (attr_val.strip('"'), uid)
			else:
				self.buffr += "%s.sA('%s', %s);" % (uid, attr[0], attr_val)

	def handle_append(self, uid):
		if len(self.tree) == 0:
			self.buffr += "rctx.$template.root.appendChild(%s);" % uid
		else:
			self.buffr += "%s.aC(%s);" % (self.tree[-1], uid)

	def handle_endtag(self, tag):
		self.tree.pop()

	def handle_data(self, lines):
		if not lines:
			return
		for line in lines.split("\n"):
			data = line.strip()
			if not data:
				pass
			elif data[:3] == "{{>" and data[-2:] == "}}":
				self.handle_subtemplate(data[3:-2])
			elif data[:3] == "{{#" and data[-2:] == "}}":
				self.handle_stack_push(data[3:-2])
			elif data[:3] == "{{/" and data[-2:] == "}}":
				self.handle_stack_pop(data[3:-2])
			elif not len(self.tree):
				self.buffr += "rctx.$template.root.textContent = %s;" % self._parse_val(data)
			else:
				self.buffr += "%s.textContent = %s;" % (self.tree[-1], self._parse_val(data))

	def handle_stack_push(self, data):
		args = data.strip().split(' ', 1)
		entry = { "name": args[0] }
		if len(args) > 1:
			entry['argument'] = args[1]

		# This quickly closes the 'if' tag itself and copies the arguments over to 'else'
		if len(self.stack) and self.stack[-1]['name'] == "if" and data == "else":
			entry = self.stack[-1]
			self.handle_stack_pop(entry['name'])
			entry['name'] = "else"

		entry['function_id'] = _get_id()
		self.buffr += "var %s = function(ctx) {" % entry['function_id']
		self.stack.append(entry)

	def handle_stack_pop(self, name):
		if not len(self.stack):
			raise Exception("Closing tag %s exists where there are no opening tags in %s template." % (name, self.name))
		# break on mismatched tags unless we're just closing an else to an if
		if not name == self.stack[-1]['name'] and not (name == "if" and self.stack[-1]['name'] == "else"):
			raise Exception("Mismatched open and close tags (%s and %s) in %s template." % (self.stack[-1]['name'], name, self.name))

		self.buffr += "};"
		getattr(self, "handle_%s" % self.stack[-1]['name'])(self.stack[-1]['function_id'], self.stack[-1]['argument'])
		self.stack.pop()

	def parse_context_key(self, context_key):
		if context_key[0:6] == "@root.":
			return "rctx.%s" % context_key[6:]
		if context_key[0] == "$":
			return context_key
		if context_key[0] == "^":
			return context_key[1:]
		else:
			return "ctx.%s" % context_key

	def handle_each(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffr += "for (var i = 0; i < %s.length; i++) {" % context_key
		self.buffr += "if (!%s[i].$template) %s[i].$template = {};" % (context_key, context_key)
		self.buffr += "%s(%s[i]);" % (function_id, context_key)
		self.buffr += "}"

	def handle_subtemplate(self, template_name):
		self.handle_append("RWTemplates.%s(ctx)" % template_name)

	def handle_if(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffr += "if (%s) %s(ctx);" % (context_key, function_id)

	def handle_else(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffr += "if (!(%s)) %s(ctx);" % (context_key, function_id)

	def handle_with(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffr += "%s(%s);" % (function_id, context_key)

# def process_templates():
print ("(function() { "
		"var d = document;"
		"d.cE = d.createElement;"
		"Element.prototype.sA = Element.prototype.setAttribute;"
		"Element.prototype.aC = Element.prototype.appendChild;"
		"window.RWTemplates = {")
parser = RainwaveParser("main")
parser.feed(
	'<h1 class="hello" bind="h1">Parse me!</h1>\n'
	'{{#each line }}\n'
	'	<div class="song" class="{{ title }}" bind="title">{{ title }}</div>\n'
	'{{/each}}\n'
	'{{#with line[0]}}\n'
	'<div style="color: red;">{{ title }}</div>'
	'{{/with}}\n'
	'{{#if true }}\n'
	'blurgh\n'
	'{{/if}}\n'
	'{{#if false }}\n'
	'<div>This is a positive.</div>\n'
	'{{#else}}\n'
	'<div>This is a negative!</div>\n'
	'{{/if}}\n'
)
print parser.close()
print "}; })();"