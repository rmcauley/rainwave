from typing import Any, Union

from tornado.web import Finish, RequestHandler

from api import fieldtypes
from api.exceptions import APIException
from common import log


class IcecastHandler(RequestHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to relays for the purpose of tracking listeners."

    failed = True
    relay: str | None = None

    def prepare(self):
        self.failed = True  # Assume failure unless otherwise
        self.relay = fieldtypes.valid_relay(self.request.remote_ip)

        if not self.relay:
            self.set_status(403)
            self.write("%s is not a valid relay." % self.request.remote_ip)
            log.debug("ldetect", "%s is not a valid relay." % self.request.remote_ip)
            raise Finish()

    def finish(self, chunk: Any = None):
        if self.failed:
            self.set_status(403)
            self.set_header("icecast-auth-user", "0")
        else:
            self.set_status(200)
            self.set_header("icecast-auth-user", "1")
        return super().finish(chunk)

    def write_error(self, status_code: int, **kwargs: Any):
        self.failed = True
        if "exc_info" in kwargs:
            exc = kwargs["exc_info"][1]
            if isinstance(exc, APIException):
                self.set_header("icecast-auth-message", exc.reason or "No reason.")
            log.debug("ldetect", "Relay command failed: %s" % exc.reason)
            log.exception(
                "ldetect", "Exception encountered handling relay command.", exc
            )
        super().finish()

    def write(self, chunk: Union[str, bytes, dict[Any, Any]]) -> None:
        log.debug("ldetect", str(chunk))
        self.set_header("icecast-auth-message", str(chunk))
        super().write(chunk)
