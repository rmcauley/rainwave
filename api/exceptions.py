from tornado.web import HTTPError
from api import locale

# TODO: Update all exceptions that may wind up facing the user to use this class
class APIException(HTTPError):
	def __init__(self, translation_key, text = None, http_code = 200, **kwargs):
		self.key = translation_key
		self.reason = text
		self.extra = kwargs

		self.status_code = http_code
		self.log_message = None
		self.args = []
		
	def localize(self, request_locale):
		if not self.reason:
			self.reason = request_locale.get(self.translation_key, self.extra)

	def jsonable(self):
		self.extra.update({ "success": False, "tl_key": self.key, "text": self.reason })
		return self.extra
