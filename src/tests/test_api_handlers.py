# pyright: reportMissingSuperCall=false, reportUnknownLambdaType=false, reportUnknownArgumentType=false

import json
from typing import Any, cast
from unittest.mock import AsyncMock, Mock, patch

import pydantic
from psycopg import OperationalError
from tornado.httputil import HTTPServerRequest
from tornado.web import Application
from tornado.web import HTTPError

from api.exceptions import APIException
from api.handler_classes.api_handler import APIHandler
from api.handler_classes.rainwave_handler import RainwaveHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.routes.auth.errors import OAuthRejectedError


class _DummyLocale:
    def translate(self, key: str, values: dict[str, Any] | None = None) -> str:
        if values:
            return f"{key}:{values}"
        return key


class _DummyAPIHandler(APIHandler):
    @property
    def return_name(self) -> RainwaveResponseKey:
        return "error"

    async def post(self) -> None:
        cast(dict[str, Any], self.response)["error"] = True


class _SimpleDTO(pydantic.BaseModel):
    song_id: int
    name: str


class _DummyUser:
    def __init__(
        self,
        *,
        anonymous: bool = False,
        tunedin: bool = True,
        admin: bool = False,
        perks: bool = True,
        lock: bool = False,
        lock_sid: int | None = None,
        lock_counter: int = 0,
    ) -> None:
        self._anonymous = anonymous
        self._tunedin = tunedin
        self._admin = admin
        self._perks = perks
        self.private_data = {
            "lock": lock,
            "lock_sid": lock_sid,
            "lock_counter": lock_counter,
        }

    def is_anonymous(self) -> bool:
        return self._anonymous

    def is_tunedin(self) -> bool:
        return self._tunedin

    def is_admin(self) -> bool:
        return self._admin

    def has_perks(self) -> bool:
        return self._perks


def _handler() -> Any:
    handler = cast(Any, _DummyAPIHandler.__new__(_DummyAPIHandler))
    handler.locale = _DummyLocale()
    handler.response = {}
    handler.pretty_print_html = False
    handler.websocket_handling = False
    handler.websocket_message = None
    handler._rainwave_output_written = False
    handler.startclock = 0.0
    handler.request = Mock()
    handler.request.arguments = {}
    handler.request.headers = {}
    handler.request.body = b""
    handler.request.cookies = {}
    handler.get_cookie = Mock(return_value=None)
    handler.get_argument = Mock(return_value=None)
    return handler


def test_api_handler_get_and_finish_branches() -> None:
    handler = _handler()
    try:
        import asyncio

        asyncio.run(handler.get())
    except HTTPError as exc:
        assert exc.status_code == 405
    else:
        raise AssertionError("HTTPError was not raised")

    handler = _handler()
    handler.pretty_print_html = True
    import asyncio

    asyncio.run(handler.get())
    assert handler.response["error"] is True

    handler = _handler()
    with (
        patch.object(handler, "_write_rainwave_output") as write_output,
        patch("tornado.web.RequestHandler.finish", return_value=Mock()),
    ):
        handler.finish()
    write_output.assert_called_once()

    handler = _handler()
    handler.websocket_handling = True
    with (
        patch.object(handler, "_write_rainwave_output") as write_output,
        patch("tornado.web.RequestHandler.finish", return_value=Mock()),
    ):
        handler.finish()
    write_output.assert_not_called()


def test_get_json_error_response_branches() -> None:
    handler = _handler()
    handler.response = cast(Any, {"message_id": "abc"})
    response = handler.get_json_error_response(500)
    assert response["message_id"] == "abc"
    assert response["error"]["tl_key"] == "internal_error"

    handler = _handler()
    exc = APIException("auth_required", status_code=403)
    response = handler.get_json_error_response(403, exc_info=(APIException, exc, None))
    assert response["error"]["tl_key"] == "auth_required"
    assert response["error"]["code"] == 403

    handler = _handler()
    db_exc = OperationalError("db down")
    response = handler.get_json_error_response(
        500, exc_info=(OperationalError, db_exc, None)
    )
    assert response["error"]["tl_key"] == "db_error_retry"

    handler = _handler()
    generic_exc = RuntimeError("boom")
    response = handler.get_json_error_response(
        500, exc_info=(RuntimeError, generic_exc, None)
    )
    assert response["error"]["tl_key"] == "internal_error"
    assert "RuntimeError" in response["error"]["traceback"]


def test_get_request_validation_data_and_validation_errors() -> None:
    handler = _handler()
    handler.request.headers = {"Content-Type": "application/json"}
    handler.request.body = json.dumps({"song_id": 3, "name": "A"}).encode("utf-8")
    assert handler._get_request_validation_data() == {"song_id": 3, "name": "A"}
    validated = handler.get_validated_input(_SimpleDTO)
    assert validated.song_id == 3

    handler = _handler()
    handler.request.arguments = {"song_id": [b"4"], "name": [b"B"], "tags": [b"x", b"y"]}
    assert handler._get_request_validation_data() == {
        "song_id": "4",
        "name": "B",
        "tags": ["x", "y"],
    }
    validated = handler.get_validated_input(_SimpleDTO)
    assert validated.song_id == 4

    handler = _handler()
    try:
        handler.get_validated_input(_SimpleDTO, {"name": "A"})
    except APIException as exc:
        assert exc.tl_key == "missing_argument"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    try:
        handler.get_validated_input(_SimpleDTO, {"song_id": "bad", "name": "A"})
    except APIException as exc:
        assert exc.tl_key == "invalid_argument"
    else:
        raise AssertionError("APIException was not raised")


def test_write_output_and_pretty_print_sort_keys() -> None:
    handler = _handler()
    handler.response = {}
    handler.write = Mock()
    with patch("api.handler_classes.rainwave_handler.time.monotonic", return_value=0.25):
        handler._write_rainwave_output_json()
    assert "api_info" in handler.response
    handler.write.assert_called_once()

    handler = _handler()
    handler.write = Mock()
    handler.pretty_print_html = False
    handler._write_rainwave_output()
    try:
        handler._write_rainwave_output()
    except RuntimeError:
        pass
    else:
        raise AssertionError("RuntimeError was not raised")

    sorted_keys = RainwaveHandler.pretty_print_sort_keys(
        handler, ["album_name", "sid", "title", "other"]
    )
    assert sorted_keys[:2] == ["title", "album_name"]


def test_rainwave_handler_init_and_prepare_websocket_branches() -> None:
    app = Application()
    request = HTTPServerRequest(method="GET", uri="/")
    request.connection = Mock()
    request.connection.set_close_callback = Mock()
    locale = _DummyLocale()
    user = _DummyUser()
    handler = cast(
        Any,
        _DummyAPIHandler(
        app,
        request,
        websocket_handling=True,
        websocket_user=cast(Any, user),
        websocket_locale=cast(Any, locale),
        websocket_sid=4,
        websocket_uuid="abc",
        ),
    )
    handler.locale = cast(Any, locale)
    handler.permission_checks = Mock()
    import asyncio

    asyncio.run(handler.prepare())
    assert handler.optional_user is user
    assert handler.websocket_uuid == "abc"
    assert handler.sid == 4

    request = HTTPServerRequest(method="GET", uri="/")
    request.connection = Mock()
    request.connection.set_close_callback = Mock()
    missing_sid_handler = _DummyAPIHandler(
        app,
        request,
        websocket_handling=True,
    )
    missing_sid_handler.locale = cast(Any, locale)
    try:
        asyncio.run(missing_sid_handler.prepare())
    except APIException as exc:
        assert exc.tl_key == "missing_station_id"
    else:
        raise AssertionError("APIException was not raised")


def test_prepare_and_prepare_http_error_branches() -> None:
    handler = _handler()
    handler.auth_required = True
    handler.permission_checks = Mock()
    import asyncio

    with patch.object(handler, "_prepare_http", new=AsyncMock(return_value=None)):
        try:
            asyncio.run(handler.prepare())
        except APIException as exc:
            assert exc.tl_key == "auth_required"
        else:
            raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.local_only = True
    handler.request.remote_ip = "8.8.8.8"
    with patch("api.handler_classes.rainwave_handler.config.api_trusted_ip_addresses", ["127.0.0.1"]):
        try:
            asyncio.run(handler._prepare_http())
        except APIException as exc:
            assert exc.tl_key == "404"
        else:
            raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.allow_cors = True
    handler.sid_required = False
    handler.request.remote_ip = "127.0.0.1"
    handler.set_header = Mock()
    handler.set_cookie = Mock()
    with (
        patch("api.handler_classes.rainwave_handler.get_browser_locale", return_value=_DummyLocale()),
        patch("api.handler_classes.rainwave_handler.config.default_station", 9),
        patch("api.handler_classes.rainwave_handler.get_cursor") as get_cursor_mock,
        patch.object(handler, "rainwave_auth", new=AsyncMock(return_value=None)),
    ):
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _cursor_context():
            yield Mock()

        get_cursor_mock.side_effect = _cursor_context
        asyncio.run(handler._prepare_http())
    assert handler.sid == 9
    assert handler.set_header.call_count == 3

    handler = _handler()
    handler.request.remote_ip = "127.0.0.1"
    try:
        asyncio.run(handler._prepare_http())
    except APIException as exc:
        assert exc.tl_key == "missing_station_id"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.request.remote_ip = "127.0.0.1"
    handler.get_argument = Mock(side_effect=lambda key, default=None: "999" if key == "sid" else default)
    try:
        asyncio.run(handler._prepare_http())
    except APIException as exc:
        assert exc.tl_key == "invalid_station_id"
    else:
        raise AssertionError("APIException was not raised")


def test_permission_checks_and_rainwave_auth_branches() -> None:
    handler = _handler()
    handler.auth_required = True
    try:
        handler.permission_checks(None, 1)
    except APIException as exc:
        assert exc.tl_key == "missing_argument"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.login_required = True
    try:
        handler.permission_checks(cast(Any, _DummyUser(anonymous=True)), 1)
    except APIException as exc:
        assert exc.tl_key == "login_required"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.tunein_required = True
    try:
        handler.permission_checks(cast(Any, _DummyUser(tunedin=False)), 1)
    except APIException as exc:
        assert exc.tl_key == "tunein_required"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.admin_required = True
    try:
        handler.permission_checks(cast(Any, _DummyUser(admin=False)), 1)
    except APIException as exc:
        assert exc.tl_key == "admin_required"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.perks_required = True
    try:
        handler.permission_checks(cast(Any, _DummyUser(perks=False)), 1)
    except APIException as exc:
        assert exc.tl_key == "perks_required"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.unlocked_listener_only = True
    try:
        handler.permission_checks(None, 1)
    except APIException as exc:
        assert exc.tl_key == "auth_required"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.unlocked_listener_only = True
    try:
        handler.permission_checks(
                cast(Any, _DummyUser(lock=True, lock_sid=2, lock_counter=3)),
                1,
            )
    except APIException as exc:
        assert exc.tl_key == "unlocked_only"
    else:
        raise AssertionError("APIException was not raised")

    import asyncio

    cursor = Mock()
    handler = _handler()
    handler.request.arguments = {}
    assert asyncio.run(handler.rainwave_auth(cursor, 1)) is None

    handler = _handler()
    handler.request.arguments = {"user_id": [b"bad"]}
    handler.get_argument = Mock(side_effect=lambda key, default=None: "bad")
    try:
        asyncio.run(handler.rainwave_auth(cursor, 1))
    except APIException as exc:
        assert exc.tl_key == "invalid_argument"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.request.arguments = {"user_id": [b"2"]}
    handler.get_argument = Mock(side_effect=lambda key, default=None: "2")
    try:
        asyncio.run(handler.rainwave_auth(cursor, 1))
    except APIException as exc:
        assert exc.tl_key == "missing_argument"
    else:
        raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.request.arguments = {"user_id": [b"2"], "key": [b"bad"]}
    handler.get_argument = Mock(side_effect=lambda key, default=None: "2" if key == "user_id" else "bad")
    with patch("api.handler_classes.rainwave_handler.is_valid_api_key", return_value=False):
        try:
            asyncio.run(handler.rainwave_auth(cursor, 1))
        except APIException as exc:
            assert exc.tl_key == "auth_failed"
        else:
            raise AssertionError("APIException was not raised")

    handler = _handler()
    handler.request.arguments = {"user_id": [b"1"], "key": [b"ok"]}
    handler.get_argument = Mock(side_effect=lambda key, default=None: "1" if key == "user_id" else "1234567890abcdef1234567890abcdef")
    with (
        patch("api.handler_classes.rainwave_handler.is_valid_api_key", return_value=True),
        patch("api.handler_classes.rainwave_handler.get_authorized_anonymous_user", new=AsyncMock(return_value="anon")),
    ):
        assert asyncio.run(handler.rainwave_auth(cursor, 1)) == "anon"

    handler = _handler()
    handler.request.arguments = {"user_id": [b"2"], "key": [b"ok"]}
    handler.get_argument = Mock(side_effect=lambda key, default=None: "2" if key == "user_id" else "1234567890abcdef1234567890abcdef")
    with (
        patch("api.handler_classes.rainwave_handler.is_valid_api_key", return_value=True),
        patch("api.handler_classes.rainwave_handler.get_authorized_registered_user", new=AsyncMock(return_value="reg")),
    ):
        assert asyncio.run(handler.rainwave_auth(cursor, 1)) == "reg"


def test_cookie_and_error_rendering_and_pretty_print_branches() -> None:
    handler = _handler()
    with patch("tornado.web.RequestHandler.set_cookie") as set_cookie:
        handler.set_cookie("sid", 3)
    set_cookie.assert_called_once()
    assert set_cookie.call_args.args[1] == "3"

    handler = _handler()
    handler.content_type = "application/json"
    handler.write = Mock()
    handler.write_error(400, exc_info=(APIException, APIException("auth_required", status_code=403), None))
    assert handler.response["error"]["tl_key"] == "auth_required"

    handler = _handler()
    handler.content_type = "text/html"
    handler.write = Mock()
    handler.render_string = Mock(side_effect=lambda template, title=None: f"{template}:{title}")
    handler._write_error_html(400, exc_info=(OAuthRejectedError, OAuthRejectedError("oauth_rejected"), None))
    assert any("oauth_rejected" in str(call.args[0]) for call in handler.write.call_args_list)

    handler = _handler()
    handler.content_type = "text/html"
    handler.write = Mock()
    handler.render_string = Mock(side_effect=lambda template, title=None: f"{template}:{title}")
    handler._write_error_html(400, exc_info=(HTTPError, HTTPError(400, reason="Bad"), None))
    assert any("400 - Bad" in str(call.args[0]) for call in handler.write.call_args_list)

    handler = _handler()
    handler.pretty_print_html = True
    handler.pagination = True
    handler.response = cast(
        Any,
        {
            "dummy": [{"sid": 1, "title": "A"}, {"sid": 1, "title": "B"}],
            "meta": {"x": 1},
        },
    )
    handler.write = Mock()
    handler.render_string = Mock(side_effect=lambda template, title=None: f"{template}:{title}")
    handler.request.arguments = {"page_start": [b"2"], "sid": [b"1"]}
    handler.get_argument = Mock(side_effect=lambda key, default=None: {"page_start": "2", "sid": "1"}.get(key, default))
    with patch("api.handler_classes.rainwave_handler.get_pagination_params", return_value=(2, 2)):
        handler._write_rainwave_output_json_pretty_print_html()
    assert any("Previous Page" in str(call.args[0]) for call in handler.write.call_args_list)
    assert any("Next Page" in str(call.args[0]) for call in handler.write.call_args_list)

    handler = _handler()
    handler.pretty_print_html = True
    handler.pagination = True
    handler.response = cast(Any, {"other": [{"title": "A"}]})
    handler.write = Mock()
    handler.render_string = Mock(side_effect=lambda template, title=None: f"{template}:{title}")
    handler.request.arguments = {"sid": [b"1"]}
    handler.get_argument = Mock(side_effect=lambda key, default=None: {"sid": "1"}.get(key, default))
    with patch("api.handler_classes.rainwave_handler.get_pagination_params", return_value=(2, 0)):
        handler._write_rainwave_output_json_pretty_print_html()
    assert any("Next Page" in str(call.args[0]) for call in handler.write.call_args_list)
