from tornado.web import HTTPError
from typing import Any, Literal

# Cross-reference these with keys in en_MAIN.jsonc
ErrorTranslationKeys = (
    Literal["missing_station_id"]
    | Literal["invalid_station_id"]
    | Literal["missing_argument"]
    | Literal["invalid_argument"]
    | Literal["auth_required"]
    | Literal["auth_failed"]
    | Literal["login_required"]
    | Literal["tunein_required"]
    | Literal["admin_required"]
    | Literal["perks_required"]
    | Literal["unlocked_only"]
    | Literal["internal_error"]
    | Literal["song_does_not_exist"]
    | Literal["db_error_retry"]
    | Literal["db_error_permanent"]
    | Literal["websocket_throttle"]
    | Literal["404"]
)


class APIException(HTTPError):
    code: int

    def __init__(
        self,
        translation_key: ErrorTranslationKeys,
        text: str | None = None,
        http_code: int = 200,
        **kwargs: Any
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
