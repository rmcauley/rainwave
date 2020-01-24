
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
# 	{{ ^blahblah }}
#   	 - use raw JS in the template excluding ^
#        - access the current object the template system is looking at with _c
#
# You can add your own convenience functions that will automatically
# turn into straight Javascript by adding/remove from raw_js_functions.
# e.g. for django:
# before:
#    RWTemplates.raw_js_functions = []
#    <div>{{ gettext("Hello") }}</div> -----> a.textContent="gettext(\"Hello\")";
# after:
#    RWTemplates.raw_js_functions.append("gettext")
#    <div>{{ gettext("Hello") }}</div> -----> a.textContent=gettext("Hello");
#
##########################################

from html.parser import HTMLParser
import re
import os

# Use as wide an array of ES5 compatible characters as we can to keep
# variable names short.
_unique_id_chars = [ chr(x) for x in range(65, 91) ] + [ chr(x) for x in range(97, 123) ]
_unique_id = _unique_id_chars[0]
_func_id = _unique_id_chars[0]
_defined_dirs = []

def _get_id():
	global _unique_id
	next_idx = _unique_id_chars.index(_unique_id[-1]) + 1
	if next_idx >= len(_unique_id_chars):
		_unique_id += _unique_id_chars[0]
		return _unique_id
	_unique_id = _unique_id[:-1] + _unique_id_chars[next_idx]
	return _unique_id

def _get_func_id():
	global _func_id
	next_idx = _unique_id_chars.index(_func_id[-1]) + 1
	if next_idx >= len(_unique_id_chars):
		_func_id += _unique_id_chars[0]
		return "_f.%s" % _func_id
	_func_id = _func_id[:-1] + _unique_id_chars[next_idx]
	return "_f.%s" % _func_id

def compile_templates(source_dir, dest_file, **kwargs):
	global _unique_id
	global _func_id
	global _defined_dirs
	_defined_dirs = []
	_func_id = _unique_id_chars[0]
	_unique_id = _unique_id_chars[0]

	o = open(dest_file, "w")
	o.write(js_start('full_calls' in kwargs and kwargs['full_calls'], 'helpers' in kwargs and kwargs['helpers']))
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

def js_start(full_calls=False, helpers=False):
	to_ret = ""
	if helpers:
		to_ret += "window.RWTemplateHelpers={};"
	to_ret += "window.RWTemplates=function(){"
	to_ret += "'use strict';"
	to_ret += "var _f={};"
	to_ret += "var _h=window.RWTemplateHelpers;"
	if not full_calls:
		to_ret += (
			"var _d=document;"
			"_d.c=_d.createElement;"
			"Element.prototype.s=Element.prototype.setAttribute;"
			"Element.prototype.a=Element.prototype.appendChild;"
		)
	to_ret += (
		"function _svg(icon){"
			"var s=document.createElementNS(\"http://www.w3.org/2000/svg\",\"svg\");"
			"var u=document.createElementNS(\"http://www.w3.org/2000/svg\",\"use\");"
			"u.setAttributeNS(\"http://www.w3.org/1999/xlink\",\"xlink:href\",\"/static/images4/symbols.svg#\"+icon);"
			"s.appendChild(u);"
			"return s;"
		"}"
	)
	to_ret += "var _rwt={};"
	if helpers:
		to_ret += "var _o;"
		to_ret += "_rwt.set_object=function(ctor){_o=ctor;};"
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

raw_js_functions = [
	"$l",
	"gettext",
	"interpolate"
]

_bind_reserved_words = ( 'update', 'get', 'update_data', 'clear', 'reset', 'get_form_elements', 'submitting', 'error', 'normal', 'success', 'enable_enter_key_submission' )

class RainwaveParser(HTMLParser):
	def parse_context_key(self, context_key):
		global raw_js_functions

		if context_key[0:6] == "@root.":
			return "_b.%s" % context_key[6:]
		if context_key == "this":
			return "_c"
		if context_key[0] == "^":
			return context_key[1:]
		for func_name in raw_js_functions:
			if context_key[0:len(func_name)] == func_name:
				return context_key
		return "_c.%s" % context_key

	def _parse_val(self, val):
		use_plus = False
		final_val = ""
		try:
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
		except:
			print( "-" * 80)
			print( "Exception in %s" % self.name)
			print( "Value: %s" % val)
			print( "Current element tree: " % self.tree_names)
			print( "Current call stack: " % self.stack)
			print( "-" * 80)
			raise

		return final_val

	def __init__(self, template_name, helpers=False, debug_symbols=True, full_calls=False, inline_templates=tuple(), **kwargs):
		global _unique_id
		global _unique_id_chars

		HTMLParser.__init__(self, **kwargs)

		self.tree = []
		self.stack = []
		self.tree_names = []
		self.buffers = {}
		self.input_buffer = ""
		self.helpers_on = helpers
		self.helpers = {}
		self.bound_scopes = {}
		self.debug_symbols = debug_symbols
		self.inline_templates = inline_templates

		global _unique_id
		_unique_id = _unique_id_chars[0]

		if full_calls:
			self.calls = _full_call
		else:
			self.calls = _short_call
		self.name = template_name
		names = self.name.split('.')
		self.buffers['_r'] = ""
		global _defined_dirs
		if len(names) > 1:
			for i in range(1, len(names)):
				cname = '.'.join(names[0:i])
				if not cname in _defined_dirs:
					self.buffers['_r'] += "_rwt.%s={};" % cname
					_defined_dirs.append(cname)
		dbg_name = ""
		if debug_symbols:
			dbg_name = " " + template_name.replace(".", "_")
		self.buffers['_r'] += "_rwt.%s=function%s(_c,_r){" % (template_name, dbg_name)
		if not template_name in inline_templates:
			self.buffers['_r'] += "_c=_c||{};"
			if not self.helpers_on:
				self.buffers['_r'] += "if(!_c.$t)_c.$t={};"
			else:
				self.buffers['_r'] += "if(!_c.$t)_c.$t=new _o(_c);"
			# _b?! ... I don't know what else I can call the root context
			# _b is used when the templater calls @some_var
			self.buffers['_r'] += "var _b=_c;"
			self.buffers['_r'] += "_r=_r||_c.$t._root;"
			self.buffers['_r'] += "if (!_r){_r=%s.createDocumentFragment();" % self.calls.document
			# I've tried modifying the documentFragment prototype.  Browsers don't like that. :)
			# So we do a bit of function-copying here in the JS.
			if not full_calls:
				self.buffers['_r'] += "_r.%s=_r.%s;" % (_short_call.appendChild, _full_call.appendChild)
			self.buffers['_r'] += "}"
			self.buffers['_r'] += "if(!_c.$t._root){_c.$t._root=_r;}"

	def _current_tree_point(self):
		if len(self.tree) == 0:
			return "_r"
		else:
			return self.tree[-1]

	def _current_stack_point(self):
		for stackpt in reversed(self.stack):
			if stackpt['function_id']:
				return stackpt['function_id']
		return "_r"

	def close(self, *args, **kwargs):
		self.handle_data(None)
		HTMLParser.close(self, *args, **kwargs)
		if len(self.stack):
			raise Exception("%s unclosed stack: %s" % (self.name, repr(self.stack)))
		if len(self.tree):
			raise Exception("%s unclosed tags: %s" % (self.name, repr(self.tree_names)))
		self.buffers['_r'] += "return _c.$t;"
		self.buffers['_r'] += "};"
		buffer_r = self.buffers['_r']
		del(self.buffers['_r'])
		final_buffer = ""
		for buff in self.buffers.values():
			final_buffer += buff
		final_buffer += buffer_r
		return final_buffer

	def handle_starttag(self, tag, attrs):
		self.handle_data(None)

		uid = _get_id()

		if tag == "svg":
			svg_use = None
			for attr in attrs:
				if attr[0] == "use":
					svg_use = self._parse_val(attr[1])
			if svg_use:
				self.buffers[self._current_stack_point()] += "var %s=_svg(%s);" % (uid, svg_use)
			else:
				raise Exception("(%s) The Rainwave templater cannot support SVG unless in this RW-specific format: <svg use=\"%s\" attr=\"...\" ...>" % (self.name, svg_use))
		else:
			self.buffers[self._current_stack_point()] += "var %s=%s.%s('%s');" % (uid, self.calls.document, self.calls.createElement, tag)
		self.tree.append(uid)
		bind_names = []
		self.tree_names.append((tag, attrs, bind_names))
		# gotta do binds last (so they pick up helpers/etc)
		for attr in attrs:
			if attr[1] == None:
				# you can try this:
				# attr_val = "''"
				# or you can try this: (which produces "disabled='disabled'" attributes)
				attr_val = "'%s'" % attr[0]
			else:
				attr_val = self._parse_val(attr[1])
			if attr[0] == "bind":
				bind_names.append(attr_val.strip('"'))
			elif attr[0] == "class" and tag != "svg":
				self.buffers[self._current_stack_point()] += "%s.className=%s;" % (uid, attr_val)
			elif attr[0] == "href" and tag != "svg":
				self.buffers[self._current_stack_point()] += "%s.href=%s;" % (uid, attr_val)
			elif attr[0] == "use" and tag == "svg":
				pass
			else:
				if self.helpers_on and attr[0] == "helper":
					self.helpers[uid] = attr_val
				self.buffers[self._current_stack_point()] += "%s.%s('%s',%s);" % (uid, self.calls.setAttribute, attr[0], attr_val or r'""')

	def check_bind_scope(self, uid, blah=False):
		for item in reversed(self.stack):
			if item['function_id']:
				if not self.stack[-1]['function_id'] in self.bound_scopes:
					self.bound_scopes[self.stack[-1]['function_id']] = True
					if not self.helpers_on:
						self.buffers[self._current_stack_point()] += "if(!_c.$t)_c.$t={};"
					else:
						self.buffers[self._current_stack_point()] += "if(!_c.$t){_c.$t=new _o(_c);_c.$t._root=%s;}" % self._current_tree_point()
				return

	def handle_bind(self, uid, bind_name):
		self.check_bind_scope(uid, bind_name == "rating_clear")
		if not self.helpers_on:
			self.buffers[self._current_stack_point()] += "_c.$t.%s=%s;" % (bind_name, uid)
		else:
			global _bind_reserved_words
			if bind_name in _bind_reserved_words:
				raise Exception("%s is a reserved word for binding. (%s)" % (bind_name, self.name))
			self.buffers[self._current_stack_point()] += "if(_c.$t.%s)_c.$t.%s.unshift(%s);else _c.$t.%s=[%s];" % (bind_name, bind_name, uid, bind_name, uid)
			if bind_name != "item_root":
				self.buffers[self._current_stack_point()] += "_h.elem_update(%s, _c.%s);" % (uid, bind_name)

	def handle_append(self, uid):
		self.buffers[self._current_stack_point()] += "%s.%s(%s);" % (self._current_tree_point(), self.calls.appendChild, uid)

	def handle_endtag(self, tag):
		self.handle_data(None)
		try:
			uid = self.tree.pop()
			(tn_tag, attrs, bind_names) = self.tree_names.pop()
			if tag != tn_tag:
				raise Exception("%s has mismatched open/close tags. (%s - %s%s)" % (self.name, tag, tn_tag, attrs))
			for name in bind_names:
				self.handle_bind(uid, name)
			if self.helpers_on:
				if tag == "form":
					self.buffers[self._current_stack_point()] += "_h._ofr(_c, %s);" % uid
				elif tag == "select" or tag == "input" or tag == "textarea":
					self.buffers[self._current_stack_point()] += "_h._rec(%s);" % uid
			self.handle_append(uid)
		except IndexError:
			raise Exception("%s has too many closing tags." % self.name)

	def handle_data(self, lines):
		if lines:
			self.input_buffer += lines
			return
		self.input_buffer = self.input_buffer.strip()
		if not self.input_buffer or not len(self.input_buffer):
			return
		text_content_used = False
		for line in self.input_buffer.split("\n"):
			for data in re.split(r"({{.*?}})", line):
				data = data.strip()
				if not data or len(data) == 0:
					pass
				elif data[:3] == "{{>" and data[-2:] == "}}":
					self.handle_subtemplate(data[3:-2].strip())
				elif re.match(r"^\{\{\s*else\s*\}\}$", data):
					self.handle_stack_push("#else")
				elif data[:3] == "{{#" and data[-2:] == "}}":
					self.handle_stack_push(data[3:-2])
				elif data[:3] == "{{/" and data[-2:] == "}}":
					self.handle_stack_pop(data[3:-2])
				elif not len(self.tree):
					raise Exception("%s: Tried to set textContent of root element.  Text needs to be in an element. (\"%s\")" % (self.name, data))
				else:
					self.buffers[self._current_stack_point()] += "%s.textContent" % (self.tree[-1],)
					if text_content_used:
						self.buffers[self._current_stack_point()] += "+"
					self.buffers[self._current_stack_point()] += "="
					if self.tree[-1] in self.helpers:
						self.buffers[self._current_stack_point()] += "_h[%s](%s);" % (self.helpers[self.tree[-1]], self._parse_val(data))
					else:
						txt = self._parse_val(data)
						if txt[0] == '"' and txt[-1] == '"':
							txt = "\"%s\"" % txt[1:-1].replace(r'"', r'\"',)
						self.buffers[self._current_stack_point()] += "%s;" % txt
					text_content_used = True
		self.input_buffer = ""

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
			self.buffers[self._current_stack_point()] += "}else{"
			return
		elif entry['name'] == "if":
			entry['function_id'] = None
			context_key = self.parse_context_key(entry['argument'])
			self.stack.append(entry)
			self.buffers[self._current_stack_point()] += "if(%s){" % (context_key)
		elif entry['name'] == "elsif":
			entry['name'] = "if"
			entry['function_id'] = None
			context_key = self.parse_context_key(entry['argument'])
			self.stack.append(entry)
			self.buffers[self._current_stack_point()] += "else if(%s){" % (context_key)
		else:
			entry['function_id'] = _get_func_id()
			dbg_name = ""
			if 'argument' in entry and re.match(r"^\w+$", entry['argument']):
				dbg_name = " %s_%s_%s" % (entry['name'], entry['argument'], entry['function_id'][3:])
			self.stack.append(entry)
			self.buffers[self._current_stack_point()] = "%s=function%s(_c, %s){" % (entry['function_id'], dbg_name, self._current_tree_point())
			self.scope_bound = False

	def handle_stack_pop(self, name):
		if not len(self.stack):
			raise Exception("Closing tag %s exists where there are no opening tags in %s template." % (name, self.name))
		# break on mismatched tags unless we're just closing an else to an if
		if not name == self.stack[-1]['name'] and not (name == "if" and self.stack[-1]['name'] == "else"):
			raise Exception("Mismatched open and close tags (%s and %s) in %s template." % (self.stack[-1]['name'], name, self.name))

		if self.stack[-1]['function_id']:
			self.buffers[self._current_stack_point()] += "};"
		stackpt = self.stack.pop()
		if not len(self.stack):
			self.scope_bound = True
		else:
			self.scope_bound = False
		getattr(self, "handle_%s" % stackpt['name'])(stackpt['function_id'], stackpt['argument'])

	def handle_each(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		if not self.helpers_on:
			looper_var = _get_id()
			self.buffers[self._current_stack_point()] += "for(var %s=0;%s<%s.length;%s++){" % (looper_var, looper_var, context_key, looper_var)
			self.buffers[self._current_stack_point()] += "%s(%s[%s], %s);" % (function_id, context_key, looper_var, self._current_tree_point())
			self.buffers[self._current_stack_point()] += "}"
		else:
			self.buffers[self._current_stack_point()] += "_h.array_render(%s,%s,%s,_c);" % (context_key, function_id, self._current_tree_point())

	def handle_subtemplate(self, template_name):
		self.check_bind_scope(self._current_tree_point())
		self.buffers[self._current_stack_point()] += "_rwt.%s(_c, %s);" % (template_name, self._current_tree_point())

	def handle_if(self, function_id, context_key):
		self.buffers[self._current_stack_point()] += "}"

	def handle_else(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffers[self._current_stack_point()] += "if(!(%s))%s(_c, %s);" % (context_key, function_id, self._current_tree_point())

	def handle_with(self, function_id, context_key):
		context_key = self.parse_context_key(context_key)
		self.buffers[self._current_stack_point()] += "%s(%s, %s);" % (function_id, context_key, self._current_tree_point())

if __name__ == "__main__":
	import argparse

	argp = argparse.ArgumentParser(description="Rainwave Javascript Templating system.  Takes Handlebars-style files from templatedir, outputs native Javascript to outfile.")
	argp.add_argument("--templatedir", default="jstemplates")
	argp.add_argument("--outfile", default="RWTemplates.templates.js")
	argp.add_argument("--helpers", action="store_true")
	argp.add_argument("--full", action="store_true")
	command_args = argp.parse_args()
	compile_templates(command_args.templatedir, command_args.outfile, full_calls=command_args.full, helpers=command_args.helpers)
