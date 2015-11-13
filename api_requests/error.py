from api import fieldtypes
from api.web import APIHandler
from api.exceptions import APIException
from api.server import handle_api_url
from libs import cache
from libs import config
from libs import log
from urlparse import urlsplit

@handle_api_url('error_report')
class ErrorReport(APIHandler):
    login_required = False
    tunein_required = False
    sid_required = False
    help_hidden = True
    description = "Handles taking automated error reports from Rainwave."
    return_name = "error_report_result"
    fields = {
        "name": (fieldtypes.string, True),
        "message": (fieldtypes.string, True),
        "lineNumber": (fieldtypes.string, True),
        "columnNumber": (fieldtypes.string, True),
        "stack": (fieldtypes.string, True),
        "location": (fieldtypes.string, True),
        "user_agent": (fieldtypes.string, True),
        "browser_language": (fieldtypes.string, True),
    }

    def prepare(self):
        if not self.request.headers.get("Referer"):
            raise APIException("auth_failed", "Error reporting cannot be made from an external address. (no referral)")
        refhost = urlsplit(self.request.headers.get("Referer")).hostname
        failed = True
        if refhost in config.station_hostnames:
            failed = False
        elif config.has("accept_error_reports_from_hosts") and refhost in config.get("accept_error_reports_from_hosts"):
            failed = False
        if failed:
            raise APIException("auth_failed", "Error reporting cannot be made from an external address. (%s)" % refhost)
        else:
            return super(ErrorReport, self).prepare()

    def post(self):
        # limit size of submission
        for k, v in self.cleaned_args.iteritems():
            self.cleaned_args[k] = v[:2048]
        self.cleaned_args['user_id'] = self.user.id
        self.cleaned_args['username'] = self.user.data['name']

        reports = cache.get("error_reports")
        if not isinstance(reports, list):
            reports = []

        reports.insert(0, self.cleaned_args)
        cache.set("error_reports", reports)

        self.append_standard("report_submitted", "Error report submitted.")
