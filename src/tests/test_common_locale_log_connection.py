from __future__ import annotations

import asyncio
import logging
from pathlib import Path

import pytest

from api.exceptions import APIException
from common import config
from common.cache import cache
from common.db import connection
from common.db.connection import db_connect, get_pool
from common.locale import locale
from common.locale.rainwave_locale import RainwaveLocale
from common import log


def test_locale_and_rainwave_locale_behavior() -> None:
    translation_file = locale.get_translation_file("en_MAIN.json")
    assert translation_file["language_name_short"] == "EN"

    english_canada = locale.get_closest("en-US")
    assert english_canada.code == "en-CA"
    fallback_locale = locale.get_closest("zz-ZZ")
    assert fallback_locale.code == "en-CA"

    translated = english_canada.translate("internal_error")
    assert translated == "Internal server error."
    ranked = english_canada.translate(
        "album_requests_ranked_at",
        {"count": 2, "rank": 3},
    )
    assert "Requested 2 " in ranked
    assert "times" in ranked
    assert "ranking " in ranked
    assert english_canada.gettext("internal_error") == "Internal server error."
    assert (
        english_canada.pgettext("unused", "internal_error") == "Internal server error."
    )
    assert english_canada.ngettext("one", "many", 1) == "one"
    assert english_canada.ngettext("one", "many", 2) == "many"

    custom_translation = {
        "language_name_short": "ZZ",
        "internal_error": "",
        "album_requests_ranked_at": translation_file["album_requests_ranked_at"],
    }
    custom_locale = RainwaveLocale(
        "en-CA",
        translation_file,
        custom_translation,
    )
    assert custom_locale.translate("internal_error") == "[[internal_error]]"
    assert custom_locale.translate("album_requests_ranked_at") == "[[no args provided]]"


def test_log_init_shutdown_and_connection_cache_guards(tmp_path: Path) -> None:
    async def _run() -> None:
        old_log_dir = config.log_dir
        try:
            config.log_dir = str(tmp_path)
            log.init(log_file="unit.log", log_file_level=logging.INFO)
            log.info("unit", "hello")
            log.shutdown()

            log_path = tmp_path / "unit.log"
            assert log_path.exists()
            contents = log_path.read_text(encoding="utf-8")
            assert "Info test." in contents
            assert "hello" in contents

            with pytest.raises(log.LogNotInitializedError):
                log.debug("unit", "after shutdown")
        finally:
            config.log_dir = old_log_dir
            log.shutdown()
            log.init(log_stdout_level=logging.CRITICAL)

        if cache.client is None:
            with pytest.raises(APIException, match="No memcache connection"):
                await cache.cache_set("x", {"y": 1})
            with pytest.raises(APIException, match="No memcache connection"):
                await cache.cache_get("x")

            async with cache.cache_connect():
                await cache.cache_set("unit_key", {"value": 3})
                assert await cache.cache_get("unit_key") == {"value": 3}
                with pytest.raises(
                    APIException, match="cache_connect was called twice"
                ):
                    async with cache.cache_connect():
                        pass
        else:
            await cache.cache_set("unit_key", {"value": 3})
            assert await cache.cache_get("unit_key") == {"value": 3}

        if connection.db_pool is None:
            with pytest.raises(APIException, match="No database connection"):
                get_pool()

            async with db_connect(auto_retry=False):
                assert get_pool() is not None
                with pytest.raises(APIException, match="db_connect was called twice"):
                    async with db_connect(auto_retry=False):
                        pass

            with pytest.raises(APIException, match="No database connection"):
                get_pool()
        else:
            assert get_pool() is not None

    asyncio.run(_run())
