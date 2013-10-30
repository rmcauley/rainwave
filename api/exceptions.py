from tornado.web import HTTPError
from api import locale

class APIException(HTTPError):
	def __init__(self, translation_key, text = None, http_code = 200, **kwargs):
		self.tl_key = translation_key
		self.reason = text
		self.extra = kwargs

		self.status_code = http_code
		self.log_message = None
		self.args = []

	def localize(self, request_locale):
		if not self.reason and request_locale:
			self.reason = request_locale.translate(self.tl_key, **self.extra)

	def jsonable(self):
		self.extra.update({ "code": self.status_code, "success": False, "tl_key": self.tl_key, "text": self.reason })
		return self.extra
