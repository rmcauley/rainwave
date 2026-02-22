import time
from time import time as timestamp
from typing import Any
import orjson
from api.handler_classes.rainwave_handler import RainwaveHandler
from common import log


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
        self.response["api_info"] = {"exectime": exectime, "time": round(timestamp())}
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

            if isinstance(exc, db.connection_errors):
                try:
                    self.append(
                        "error",
                        {
                            "code": 500,
                            "tl_key": "db_error_retry",
                            "text": self.locale.translate("db_error_retry"),
                        },
                    )
                except Exception:
                    self.append(
                        "error",
                        {
                            "code": 500,
                            "tl_key": "db_error_permanent",
                            "text": self.locale.translate("db_error_permanent"),
                        },
                    )
            elif isinstance(exc, APIException):
                exc.localize(self.locale)
                self.append(self.return_name, exc.jsonable())
            elif isinstance(exc, SongNonExistent):
                self.append(
                    "error",
                    {
                        "code": status_code,
                        "tl_key": "song_does_not_exist",
                        "text": self.locale.translate("song_does_not_exist"),
                    },
                )
            else:
                self.append(
                    "error",
                    {
                        "code": status_code,
                        "tl_key": "internal_error",
                        "text": repr(exc),
                    },
                )
                self.append(
                    "traceback",
                    {
                        "traceback": traceback.format_exception(
                            kwargs["exc_info"][0],
                            kwargs["exc_info"][1],
                            kwargs["exc_info"][2],
                        )
                    },
                )
        else:
            self.append(
                "error",
                {
                    "tl_key": "internal_error",
                    "text": self.locale.translate("internal_error"),
                },
            )
        if not kwargs.get("no_finish"):
            self.finish()
