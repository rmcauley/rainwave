class APIHandler(RainwaveHandler):
    content_type = "application/json"

    is_api_handler = True

    def initialize(self, **kwargs: Any) -> None:
        super().initialize(**kwargs)
        if self.allow_get and not isinstance(self, PrettyPrintAPIMixin):
            self.get = self.post

    def finish(self, chunk: Any = None) -> None:
        self.set_header("Content-Type", self.content_type)
        self.write_output()
        super().finish(chunk)

    def write_output(self) -> None:
        if hasattr(self, "_output"):
            if hasattr(self, "_startclock"):
                exectime = timestamp() - self._startclock
            else:
                exectime = -1
            if exectime > 0.5:
                log.warn(
                    "long_request", "%s took %s to execute!" % (self.url, exectime)
                )
            self.append("api_info", {"exectime": exectime, "time": round(timestamp())})
            self.write(orjson.dumps(self._output))

    def write_error(self, status_code: int, **kwargs: Any) -> None:
        if isinstance(self._output, list):
            self._output = []
        else:
            if self._output and "message_id" in self._output:
                self._output = {
                    "message_id": self._output["message_id"],
                }
                self._output[self.return_name] = {
                    "tl_key": "internal_error",
                    "text": self.locale.translate("internal_error"),
                    "status": 500,
                    "success": False,
                }
            else:
                self._output = {}
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
