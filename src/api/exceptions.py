from tornado.web import HTTPError
from typing import Any, Literal

from api.rainwave_typeddicts import Error as RainwaveErrorObject
from common.locale.rainwave_locale import RainwaveLocale

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
    | Literal["too_many_requests"]
    | Literal["same_request_exists"]
    | Literal["same_request_album"]
    | Literal["song_not_requested"]
    | Literal["rejected"]
    | Literal["station_offline"]
    | Literal["server_just_started"]
    | Literal["search_string_too_short"]
    | Literal["user_locked"]
    | Literal["album_does_not_exist"]
    | Literal["username_required"]
    | Literal["password_required"]
    | Literal["login_failed"]
    | Literal["login_password_disabled"]
    | Literal["login_too_old"]
    | Literal["login_limit"]
    | Literal["login_failed"]
)


class APIException(HTTPError):
    http_status: int

    def __init__(
        self,
        translation_key: ErrorTranslationKeys,
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
