from libs import cache
from libs import db
import api.web
from api.server import handle_api_url
from api.server import handle_api_html_url

@handle_api_url("admin/request_line")
class ListRequestLine(api.web.APIHandler):
	return_name = "request_line"
	admin_required = True
	sid_required = True

	def post(self):
		self.append(self.return_name, cache.get_station(self.sid, "request_line"))
		# self.append("request_line_db", db.c.fetch_all("SELECT username, r4_request_line.* FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE sid = %s ORDER BY line_wait_start", (self.sid,)))

@handle_api_html_url("request_line")
class ListRequestLineHTML(api.web.PrettyPrintAPIMixin, ListRequestLine):
	pass