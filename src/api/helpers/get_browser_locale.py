from tornado.web import RequestHandler

from common.locale.locale import get_closest
from common.locale.rainwave_locale import RainwaveLocale


def get_browser_locale(
    handler: RequestHandler, default: str = "en-CA"
) -> RainwaveLocale:
    attempt_lang: str = default
    if "rw_lang" in handler.cookies:
        attempt_lang = handler.cookies["rw_lang"].value
    if "Accept-Language" in handler.request.headers:
        attempt_lang = handler.request.headers["Accept-Language"].split(",")[0]
    return get_closest(attempt_lang)
