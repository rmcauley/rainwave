# TODO: Update all exceptions that may wind up facing the user to use this class
class APIException(Exception):
	def __init__(self, code, translation_key, text, **extra):
		self.key = translation_key
		self.code = code
		self.extra = extra
		Exception.__init__(self, text)

	def jsonable(self):
		self.extra.update({ "code": self.code, "key": self.key, "text": self.text })
		return self.extra
