from tornado.web import HTTPError
from typing import Any

from api import rainwave_typeddicts
from api.rainwave_typeddicts import Error as RainwaveErrorObject
from common.locale.rainwave_locale import RainwaveLocale


class APIException(HTTPError):
    http_status: int
    tl_key: rainwave_typeddicts.TranslationKey

    def __init__(
        self,
        translation_key: rainwave_typeddicts.TranslationKey,
        text: str | None = None,
        http_status: int = 200,
        **kwargs: Any
    ) -> None:
        super().__init__(http_status, text, **kwargs)
        self.tl_key = translation_key
        self.reason = text
        self.extra = kwargs
        self.http_status = http_status

    def to_api(self, request_locale: RainwaveLocale) -> RainwaveErrorObject:
        rw_error_obj: RainwaveErrorObject = {
            "code": self.status_code,
            "tl_key": self.tl_key,
            "text": request_locale.translate(self.tl_key, **self.extra),
        }

        return rw_error_obj
