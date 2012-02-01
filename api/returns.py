def ErrorReturn(code, text, other = None):
	obj = { "code": code, "text": text }
	if other:
		obj.update(other)
	return obj