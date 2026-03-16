from urllib.parse import urlsplit
from time import time as timestamp
from api import rainwave_typeddicts
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler
from api.helpers.js_error_reports import (
    JavaScriptErrorReport,
    get_error_reports,
    set_error_reports,
)
from common import config


@handle_api_url("error_report")
class ErrorReport(AuthRequiredAPIHandler):
    description = "Handles taking automated error reports from backend.rainwave."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "error_report_result"

    sid_required = False

    async def prepare(self):
        if not self.request.headers.get("Referer"):
            raise APIException(
                "auth_failed",
                "Error reporting cannot be made from an external address. (no referral)",
            )
        refhost = urlsplit(self.request.headers.get("Referer")).hostname
        failed = True
        if refhost == config.hostname:
            failed = False
        elif (
            config.accept_error_reports_from_hosts
            and refhost in config.accept_error_reports_from_hosts
        ):
            failed = False
        if failed:
            raise APIException(
                "auth_failed",
                "Error reporting cannot be made from an external address. (%s)"
                % refhost,
            )
        else:
            await super().prepare()

    async def post(self) -> None:
        error_report = self.get_validated_input(JavaScriptErrorReport)
        error_report_dict: rainwave_typeddicts.AdminJsError = {
            "browserLanguage": error_report.browserLanguage,
            "columnNumber": error_report.columnNumber,
            "lineNumber": error_report.lineNumber,
            "location": error_report.location,
            "message": error_report.location,
            "name": error_report.name[:2048],
            "stack": error_report.stack[:2048],
            "time": int(timestamp()),
            "user_id": self.user.id,
            "userAgent": error_report.userAgent,
            "username": self.user.public_data["name"],
        }

        reports = await get_error_reports()

        while len(reports) > 30:
            reports.pop()

        reports.insert(0, error_report_dict)

        await set_error_reports(reports)

        self.response["error_report_result"] = {
            "success": True,
            "text": "Submitted",
            "tl_key": "report_submitted",
        }
