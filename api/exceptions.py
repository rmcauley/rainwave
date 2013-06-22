from tornado.web import HTTPError

# TODO: Update all exceptions that may wind up facing the user to use this class
class APIException(HTTPError):
	def __init__(self, code, translation_key, text, **kwargs):
		self.rw_code = code
		self.key = translation_key
		self.reason = text
		self.extra = kwargs

		self.status_code = 200
		self.log_message = None
		self.args = []

	def jsonable(self):
		self.extra.update({ "code": self.rw_code, "key": self.key, "text": self.reason })
		return self.extra
