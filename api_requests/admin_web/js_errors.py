from time import time as timestamp
import datetime
from libs import db
import api.web
from api.server import handle_url

from api_requests.admin.js_errors import JSErrors

def relative_time(epoch_time):
	diff = datetime.timedelta(seconds=timestamp() - epoch_time)
	if diff.days > 0:
		return "%sd" % diff.days
	elif diff.seconds > 3600:
		return "%shr" % int(diff.seconds / 3600)
	elif diff.seconds > 60:
		return "%sm" % int(diff.seconds / 60)
	elif diff.seconds > 0:
		return "%ss" % diff.seconds
	return "now"

@handle_url("/admin/album_list/js_errors")
class JSErrors(api.web.PrettyPrintAPIMixin, JSErrors):
	def get(self):	#pylint: disable=E0202,W0221
		for row in self._output[self.return_name]:
			if "stack" in row and row['stack'] and len(row['stack']):
				row['stack'] = '\n'.join(row['stack'])
				row['stack'] = "<pre style='max-width: 450px; overflow: auto;'>%s</pre>" % row['stack']
			else:
				row['stack'] = " "
		super(JSErrors, self).get()

@handle_url("/admin/tools/js_errors")
class JSErrorsDummy(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("basic_header.html", title="Latest Songs"))
		self.write(self.render_string("basic_footer.html"))
