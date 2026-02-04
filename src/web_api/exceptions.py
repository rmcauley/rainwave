from tornado.web import HTTPError
from typing import Any


class APIException(HTTPError):
    code: int

    def __init__(
        self, translation_key: str, text: str | None = None, http_code: int = 200, **kwargs: Any
    ) -> None:
        super().__init__(http_code, text, **kwargs)
        self.tl_key = translation_key
        self.reason = text
        self.extra = kwargs
        self.code = http_code

    def localize(self, request_locale: Any) -> None:
        if not self.reason and request_locale:
            self.reason = request_locale.translate(self.tl_key, **self.extra)

    def jsonable(self) -> dict[str, Any]:
        self.extra.update(
            {
                "code": self.status_code,
                "success": False,
                "tl_key": self.tl_key,
                "text": self.reason,
            }
        )
        return self.extra
