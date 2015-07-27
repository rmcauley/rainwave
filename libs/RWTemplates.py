#!/usr/bin/python

##########################################
#
# Rainwave Javascript Templating System
#
# Takes in Handlebars-like templates and outputs native Javascript DOM calls.
# Optionally saves generated elements.
#
# Given a file templates/example.hbar:
#    <div class="some_div" bind="bound_div">{{ hello_world }}</div>
#
# This is what happens in JS:
#    var obj = { "hello_world": "DOM ahoy!" }
#    JSTemplates.example(obj);
#    console.log(obj.$t._root);                 // a documentFragment
#    console.log(obj.$t.bound_div.textContent); // "DOM ahoy!"
#    document.body.appendChild(obj.$t._root);
#
# The resulting HTML:
#    <div class="some_div">DOM ahoy!</div>
#
# Also mucks with having shorthand versions of native functions for minification.
# So careful if you're also calling things as Element.prototype.(s|a) and document.c.
#
# Cannot deal with SVG (or other namespaces) except for Rainwave's particular use case.
#
# Templates look much like Handlebars, except handlers are dealt with differently:
#    Handlebars: <div>{{ format_time time }}</div>
#    RWTemplate: <div helper="format_time">{{ time }}</div>
#
# Restrictions:
#    - {{#each}} cannot handle objects - only arrays.
#    - {{#if}} cannot be used inside < >
#        - BAD : <a {{#if href}}href="hello"{{/if}}>
#        - GOOD: {{#if href}}<a href="hello"></a>{{/if}}
#    - {{#if}} must contain whole elements
#        - BAD : {{#if href}} <a href="href"> {{else}} <a> {{/if}} something </a>
#        - GOOD: {{#if href}}<a href="hello"></a>{{else}}<a></a>{{/if}}
#
# Some handy things to know:
#
#	{{ @root.blah }}
#   	 - access root context object
# 	{{ $blahblah }}
#   	 - use raw JS including $ (this is a dumb hack for Rainwave)
# 	{{ ^blahblah }}
#   	 - use raw JS in the template excluding ^
#        - access the current object the template system is looking at with _c
#
##########################################

from HTMLParser import HTMLParser
import re
import os

# Use as wide an array of ES5 compatible characters as we can to keep
# variable names short.
_unique_id_chars = [ chr(x) for x in xrange(65, 91) ] + [ chr(x) for x in xrange(97, 123) ]
_unique_id = _unique_id_chars[0]
def _get_id():
	global _unique_id
	next_idx = _unique_id_chars.index(_unique_id[-1]) + 1
	if next_idx >= len(_unique_id_chars):
		_unique_id += _unique_id_chars[0]
		return _unique_id
	_unique_id = _unique_id[:-1] + _unique_id_chars[next_idx]
	return _unique_id

def compile_templates(source_dir, dest_file, **kwargs):
	o = open(dest_file, "w")
	o.write(js_start('full_calls' in kwargs and kwargs['full_calls']))
	#pylint: disable=W0612
	for root, subdirs, files in os.walk(source_dir):
		for f in files:
			if f.endswith(".hbar") or f.endswith(".html"):
				tname = os.path.join(root[root.find(source_dir) + len(source_dir) + len(os.sep):], f[:f.rfind(".")]).replace(os.sep, ".")
				tfile = open(os.path.join(root, f))
				parser = RainwaveParser(tname, **kwargs)
				parser.feed(tfile.read())
				o.write(parser.close())
				tfile.close()
	o.write(js_end())
	o.close()
	#pylint: enable=W0612

def js_start(full_calls=False):
	to_ret ="window.RWTemplates=function(){"
	if not full_calls:
		to_ret += (
			"var _d=document;"
			"_d.c=_d.createElement;"
			"Element.prototype.s=Element.prototype.setAttribute;"
			"Element.prototype.a=Element.prototype.appendChild;"
		)
	to_ret += (
		"function _svg(icon){"
			"\"use strict\";"
			"var s=document.createElementNS(\"http://www.w3.org/2000/svg\",\"svg\");"
			"var u=document.createElementNS(\"http://www.w3.org/2000/svg\",\"use\");"
			"u.setAttributeNS(\"http://www.w3.org/1999/xlink\",\"xlink:href\",\"/static/images4/symbols.svg#\"+icon);"
			"s.appendChild(u);"
			"return s;"
		"}"
	)
	to_ret += "var _rwt={};"
	return to_ret

def js_end():
	return "return _rwt;}();"

class _full_call(object):
	setAttribute = "setAttribute"
	appendChild = "appendChild"
	document = "document"
	createElement = "createElement"

class _short_call(object):
	setAttribute = "s"
	appendChild = "a"
	document = "_d"
	createElement = "c"

_bind_reserved_words = ( 'update', 'get', 'update_data', 'clear', 'reset', 'get_form_elements', 'submitting', 'error', 'normal', 'success', 'enable_enter_key_submission' )

class RainwaveParser(HTMLParser):
	def parse_context_key(self, context_key):
		if context_key[0:6] == "@root.":
			return "_b.%s" % context_key[6:]
		if context_key[0] == "$":
			return context_key
		if context_key[0] == "^":
			return context_key[1:]
		else:
			return "_c.%s" % context_key

	def _parse_val(self, val):
		use_plus = False
		final_val = ""
		for m in re.split(r"({{.*?}})", val):
			tm = None
			if m[:2] == "{{" and m[-2:] == "}}":
				tm = self.parse_context_key(m[2:-2].strip())
			elif len(m.strip()) > 0:
				tm = "\"%s\"" % m
			if tm:
				if use_plus:
					final_val += "+"
				final_val += tm
				use_plus = True
		return final_val

	def __init__(self, template_name, helpers=False, debug_symbols=True, full_calls=False, **kwargs):
		global _unique_id
		global _unique_id_chars

		HTMLParser.__init__(self, **kwargs)

		self.tree = []
		self.stack = []
		self.tree_names = []
		self.buffr = None
		self.html_buffer = ""
		self.helpers_on = helpers
		self.helpers = {}
		self.bound_scopes = {}
		self.debug_symbols = debug_symbols

		if full_calls:
			self.calls = _full_call
		else:
			self.calls = _short_call
		# reset the unique IDs back to 0 for this template's local scope
		_unique_id = _unique_id_chars[0]
		self.name = template_name
		names = self.name.split('.')
		self.buffr = ""
		if len(names) > 1:
			for i in range(1, len(names) + 1):
				cname = '.'.join(names[0:i])
				self.buffr += "if(!_rwt.%s)_rwt.%s={};" % (cname, cname)
		dbg_name = ""
		if debug_symbols:
			dbg_name = " " + template_name.replace(".", "_")
		self.buffr += "_rwt.%s=function%s(_c,_proot){" % (template_name, dbg_name)
		self.buffr += "\"use strict\";"
		self.buffr += "_c=_c||{};"
		if not self.helpers_on:
			self.buffr += "if(!_c.$t)_c.$t={};"
		else:
			self.buffr += "if(!_c.$t)_c.$t=new RWTemplateObject(_c);"
		# _b?! ... I don't know what else I can call the root context
		# _b is used when the templater calls @some_var
		self.buffr += "var _b=_c;"
		self.buffr += "var _r=_proot||_c.$t._root||%s.createDocumentFragment();" % self.calls.document
		self.buffr += "if(!_c.$t._root){_c.$t._root=_r;}"
		# I've tried modifying the documentFragment prototype.  Browsers don't like that. :)
		# So we do a bit of function-copying here in the JS.
		if not full_calls:
			self.buffr += "_r.%s=_r.%s;" % (_short_call.appendChild, _full_call.appendChild)

	def _current_tree_point(self):
		if len(self.tree) == 0:
			return "_r"
		else:
			return self.tree[-1]

	def close(self, *args, **kwargs):
		self.handle_data(None)
		HTMLParser.close(self, *args, **kwargs)
		if len(self.stack):
			raise Exception("%s unclosed stack: %s" % (self.name, repr(self.stack)))
		if len(self.tree):
			raise Exception("%s unclosed tags: %s" % (self.name, repr(self.tree_names)))
		self.buffr += "return _c.$t;"
		self.buffr += "};"
		return self.buffr

	def handle_starttag(self, tag, attrs):
		self.handle_data(None)

		uid = _get_id()

		if tag == "svg":
			svg_use = None
			for attr in attrs:
				if attr[0] == "use":
					svg_use = self._parse_val(attr[1])
			if svg_use:
				self.buffr += "var %s=_svg(%s);" % (uid, svg_use)
			else:
				raise Exception("(%s) The Rainwave templater cannot support SVG unless in this RW-specific format: <svg use=\"%s\" attr=\"...\" ...>" % (self.name, svg_use))
		else:
			self.buffr += "var %s=%s.%s('%s');" % (uid, self.calls.document, self.calls.createElement, tag)
		self.tree.append(uid)
		self.tree_names.append((tag, attrs))
		# gotta do binds last (so they pick up helpers/etc)
		bind_names = []
		for attr in attrs:
			attr_val = self._parse_val(attr[1])
			if attr[0] == "bind":
				bind_names.append(attr_val.strip('"'))
			else:
				if self.helpers_on and attr[0] == "helper":
					self.helpers[uid] = attr_val
				self.buffr += "%s.%s('%s',%s);" % (uid, self.calls.setAttribute, attr[0], attr_val)
		for name in bind_names:
			self.handle_bind(uid, name)

	def handle_bind(self, uid, bind_name):
		if len(self.stack) and self.stack[-1]['function_id'] and not self.stack[-1]['function_id'] in self.bound_scopes:
			self.bound_scopes[self.stack[-1]['function_id']] = True
			if not self.helpers_on:
				self.buffr += "if(!_c.$t)_c.$t={};"
			else:
				self.buffr += "if(!_c.$t){_c.$t=new RWTemplateObject(_c);_c.$t._root=%s;}" % self._current_tree_point()
		if not self.helpers_on:
			self.buffr += "_c.$t.%s=%s;" % (bind_name, uid)
		else:
			global _bind_reserved_words
			if bind_name in _bind_reserved_words:
				raise Exception("%s is a reserved word for binding. (%s)" % (bind_name, self.name))
			self.buffr += "if(_c.$t.%s)_c.$t.%s.push(%s);else _c.$t.%s=[%s];" % (bind_name, bind_name, uid, bind_name, uid)
			if bind_name != "item_root":
				self.buffr += "_rwt.helpers.elem_update(%s, _c['%s']);" % (uid, bind_name)

	def handle_append(self, uid):
		self.buffr += "%s.%s(%s);" % (self._current_tree_point(), self.calls.appendChild, uid)

	def handle_endtag(self, tag):
		self.handle_data(None)
		current_point = self._current_tree_point()
		try:
			if tag != self.tree_names[-1][0]:
				raise Exception("%s has mismatched open/close tags. (%s/%s)" % (self.name, tag, self.tree_names[-1][0]))
			self.tree.pop()
			self.tree_names.pop()
		except IndexError:
			raise Exception("%s has too many closing tags." % self.name)
		self.handle_append(current_point)

	def handle_data(self, lines):
		if lines:
			self.html_buffer += lines
			return
		self.html_buffer = self.html_buffer.strip()
		if not self.html_buffer or not len(self.html_buffer):
			return
		for line in self.html_buffer.split("\n"):
			for data in re.split(r"({{.*?}})", line):
				data = data.strip()
				if not data or len(data) == 0:
					pass
				elif data[:3] == "{{>" and data[-2:] == "}}":
					self.handle_subtemplate(data[3:-2])
				elif re.match(r"^\{\{\s*else\s*\}\}$", data):
					self.handle_stack_push("#else")
				elif data[:3] == "{{#" and data[-2:] == "}}":
					self.handle_stack_push(data[3:-2])
				elif data[:3] == "{{/" and data[-2:] == "}}":
					self.handle_stack_pop(data[3:-2])
				elif not len(self.tree):
					raise Exception("%s: Tried to set textContent of root element.  Text needs to be in an element. (\"%s\")" % (self.name, data))
				elif self.tree[-1] in self.helpers:
					self.buffr += "%s.textContent=_rwt.helpers[%s](%s);" % (self.tree[-1], self.helpers[self.tree[-1]], self._parse_val(data))
				else:
					self.buffr += "%s.textContent=%s;" % (self.tree[-1], self._parse_val(data))
		self.html_buffer = ""

	def handle_stack_push(self, data):
		args = data.strip().split(' ', 1)
		entry = { "name": args[0] }
		if len(args) > 1:
			entry['argument'] = args[1]
		elif entry['name'] == "if":
			raise "Tried to use an 'if' without an argument. (%s)" % self.name

		# This quickly closes the 'if' tag itself and copies the arguments over to 'else'
		if len(self.stack) and self.stack[-1]['name'] == "if" and (data == "else" or data == "#else"):
			if len(self.stack) and self.stack[-1]['function_id'] and self.stack[-1]['function_id'] in self.bound_scopes:
				del(self.bound_scopes[self.stack[-1]['function_id']])
			self.buffr += "}else{"
			return
		elif entry['name'] == "if":
			entry['function_id'] = None
			context_key = self.parse_context_key(entry['argument'])
			self.buffr += "if(%s){" % (context_key)
		else:
			entry['function_id'] = _get_id()
			dbg_name = ""
			if 'argument' in entry and re.match(r"^\w+$", entry['argument']):
				dbg_name = " %s_%s_%s" % (entry['name'], entry['argument'], entry['function_id'])
			self.buffr += "var %s=function%s(_c, %s){" % (entry['function_id'], dbg_name, self._current_tree_point())
			self.scope_bound = False
		self.stack.append(entry)

	def handle_stack_pop(self, name):
		if not len(self.stack):
			raise Exception("Closing tag %s exists where there are no opening tags in %s template." % (name, self.name))
		# break on mismatched tags unless we're just closing an else to an if
		if not name == self.stack[-1]['name'] and not (name == "if" and self.stack[-1]['name'] == "else"):
			raise Exception("Mismatched open and close tags (%s and %s) in %s template." % (self.stack[-1]['name'], name, self.name))

		if self.stack[-1]['function_id']:
			self.buffr += "};"
		getattr(self, "handle_%s" % self.stack[-1]['name'])(self.stack[-1]['function_id'], self.stack[-1]['argument'])
		self.stack.pop()
		if not len(self.stack):
			self.scope_bound = True
		else:
			self.scope_bound = False

	def handle_each(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		if not self.helpers_on:
			self.buffr += "for(var _i= 0;_i<%s.length;_i++){" % context_key
			self.buffr += "%s(%s[_i], %s);" % (function_id, context_key, self._current_tree_point())
			self.buffr += "}"
		else:
			self.buffr += "_rwt.helpers.array_render(%s,%s,%s);" % (context_key, function_id, self._current_tree_point())

	def handle_subtemplate(self, template_name):
		self.buffr += "_rwt.%s(_c, %s);" % (template_name, self._current_tree_point())

	def handle_if(self, function_id, context_key):
		self.buffr += "}"

	def handle_else(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffr += "if(!(%s))%s(_c, %s);" % (context_key, function_id, self._current_tree_point())

	def handle_with(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffr += "if(!%s.$t)%s.$t={};" % (context_key, context_key)
		self.buffr += "%s(%s, %s);" % (function_id, context_key, self._current_tree_point())

if __name__ == "__main__":
	import argparse

	argp = argparse.ArgumentParser(description="Rainwave Javascript Templating system.  Takes Handlebars-style files from templatedir, outputs native Javascript to outfile.")
	argp.add_argument("--templatedir", default="jstemplates")
	argp.add_argument("--outfile", default="RWTemplates.templates.js")
	argp.add_argument("--helpers", action="store_true")
	argp.add_argument("--full", action="store_true")
	command_args = argp.parse_args()
	compile_templates(command_args.templatedir, command_args.outfile, full_calls=command_args.full, helpers=command_args.helpers)
