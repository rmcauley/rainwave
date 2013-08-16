from tornado.web import HTTPError

# TODO: Update all exceptions that may wind up facing the user to use this class
class APIException(HTTPError):
	def __init__(self, translation_key, text = None, http_code = 200, **kwargs):
		# TODO: handle text when text is null
		self.key = translation_key
		self.reason = text
		self.extra = kwargs

		self.status_code = http_code
		self.log_message = None
		self.args = []

	def jsonable(self):
		self.extra.update({ "success": False, "tl_key": self.key, "text": self.reason })
		return self.extra
