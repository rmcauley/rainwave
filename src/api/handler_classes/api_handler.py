from abc import abstractmethod
import time
from time import time as timestamp
import traceback
from typing import Any, cast
import orjson
from api.exceptions import APIException
from api.handler_classes.rainwave_handler import RainwaveHandler
from common import log
from common.db.connection import db_connection_errors


class APIHandler(RainwaveHandler):
    content_type = "application/json"
    _startclock: float

    async def prepare(self) -> None:
        await super().prepare()
        self._startclock = time.monotonic()

    def write_rainwave_output(self) -> None:
        exectime = time.monotonic() - self._startclock
        if exectime > 0.5:
            log.warn(
                "long_request",
                "%s took %s to execute!" % (self.__class__.__name__, exectime),
            )
        self.response["api_info"] = {
            "exectime": int(exectime),
            "time": int(timestamp()),
        }
        if self.error_response:
            self.write(
                orjson.dumps(
                    cast(dict[str, object], self.response) | self.error_response
                )
            )
        else:
            self.write(orjson.dumps(self.response))

    def write_error(self, status_code: int, **kwargs: Any) -> None:
        self.response = {}
        if "message_id" in self.response:
            self.response = {
                "message_id": self.response["message_id"],
            }
        self.error_response[self.return_name] = {
            "tl_key": "internal_error",
            "text": self.locale.translate("internal_error"),
            "status": 500,
            "success": False,
        }

        if "exc_info" in kwargs:
            exc = kwargs["exc_info"][1]

            if isinstance(exc, db_connection_errors):
                self.error_response["error"] = {
                    "status": 500,
                    "tl_key": "db_error_retry",
                    "text": self.locale.translate("db_error_retry"),
                }
            elif isinstance(exc, APIException):
                self.error_response[self.return_name] = exc.to_api(self.locale)
            else:
                self.error_response["error"] = {
                    "status": status_code,
                    "tl_key": "internal_error",
                    "text": repr(exc),
                }

                self.response["traceback"] = "\n".join(
                    traceback.format_exception(
                        kwargs["exc_info"][0],
                        kwargs["exc_info"][1],
                        kwargs["exc_info"][2],
                    )
                )
        else:
            self.error_response["error"] = {
                "status": 500,
                "tl_key": "internal_error",
                "text": self.locale.translate("internal_error"),
            }

        self.write_rainwave_output()

    @abstractmethod
    async def post(self) -> None:
        raise NotImplementedError()
