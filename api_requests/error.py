from api import fieldtypes
from api.web import APIHandler
from api.exceptions import APIException
from api.server import handle_api_url
from libs import cache

@handle_api_url('error_report')
class ErrorReport(APIHandler):
    login_required = False
    tunein_required = False
    sid_required = False
    help_hidden = True
    description = "Handles taking automated error reports from Rainwave."
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
        # TODO: this is brittle - it should be configurable
        # also maybe use urlparse in conjunction with config to make it easier
        if not self.request.headers.get():
            raise APIException("auth_failed", "Error reporting can only come from rainwave.cc, not from external sources.")
        if not self.request.headers.get("Referer").startswith("http://rainwave.cc") and not self.request.headers.get("Referer").startswith("https://rainwave.cc"):
            raise APIException("auth_failed", "Error reporting can only come from rainwave.cc, not from external sources.")
        return super(ErrorReport, self).prepare()

    def post(self):
        # limit size of submission
        for k, v in self.cleaned_args.iteritems():
            self.cleaned_args[k] = v[:2048]
        self.cleaned_args['user_id'] = self.user.id
        self.cleaned_args['username'] = self.user.data['name']

        reports = cache.get("error_reports") or []
        reports.append(self.cleaned_args)
        cache.set("error_reports", self.cleaned_args)

        self.append_standard("report_submitted", "Error report submitted.")
