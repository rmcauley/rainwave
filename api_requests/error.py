import urllib
import tornado.web
from tornado.httpclient import AsyncHTTPClient, HTTPRequest
from urllib.parse import urlsplit
import urllib.parse
import time
from api import fieldtypes
from api.web import APIHandler
from api.exceptions import APIException
from api.urls import handle_api_url
from libs import cache
from libs import config
from libs import log
import json


@handle_api_url("error_report")
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
        "lineNumber": (fieldtypes.integer, None),
        "columnNumber": (fieldtypes.integer, None),
        "stack": (fieldtypes.string, True),
        "location": (fieldtypes.string, True),
        "user_agent": (fieldtypes.string, True),
        "browser_language": (fieldtypes.string, True),
    }

    def prepare(self):
        if not self.request.headers.get("Referer"):
            raise APIException(
                "auth_failed",
                "Error reporting cannot be made from an external address. (no referral)",
            )
        refhost = urlsplit(self.request.headers.get("Referer")).hostname
        failed = True
        if refhost == config.get("hostname"):
            failed = False
        elif config.has("accept_error_reports_from_hosts") and refhost in config.get(
            "accept_error_reports_from_hosts"
        ):
            failed = False
        if failed:
            raise APIException(
                "auth_failed",
                "Error reporting cannot be made from an external address. (%s)"
                % refhost,
            )
        else:
            return super(ErrorReport, self).prepare()

    def post(self):
        # limit size of submission
        for k, v in self.cleaned_args.items():
            if isinstance(object, str):
                self.cleaned_args[k] = v[:2048]
        self.cleaned_args["user_id"] = self.user.id
        self.cleaned_args["username"] = self.user.data["name"]
        self.cleaned_args["time"] = time.time()

        reports = cache.get("error_reports")
        if not isinstance(reports, list):
            reports = []

        while len(reports) > 30:
            reports.pop()

        reports.insert(0, self.cleaned_args)
        cache.set_global("error_reports", reports)

        self.append_standard("report_submitted", "Error report submitted.")


@handle_api_url("sentry_tunnel")
class SentryTunnel(tornado.web.RequestHandler):
    help_hidden = True

    async def post(self):
        if not config.has("sentry_dsn"):
            return

        try:
            sentry_host = config.get("sentry_host")
            envelope = self.request.body.decode("utf-8")
            piece = envelope.split("\n")[0]
            header = json.loads(piece)
            dsn = urllib.parse.urlparse(header.get("dsn"))

            if dsn.hostname != sentry_host:
                raise Exception(f"Invalid Sentry host: {dsn.hostname}")

            project_id = dsn.path.strip("/")
            if project_id != config.get("sentry_frontend_project_id"):
                raise Exception(f"Invalid Project ID: {project_id}")

            tunneled = HTTPRequest(
                url=f"https://{sentry_host}/api/{project_id}/envelope/",
                method="POST",
                body=envelope,
            )
            http_client = AsyncHTTPClient()
            await http_client.fetch(tunneled)
        except Exception as e:
            log.exception("sentry", "Error tunneling Sentry", e)

        return {}
