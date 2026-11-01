from typing import cast

from pydantic import BaseModel

from api import rainwave_typeddicts
from common.cache.cache import cache_get, cache_set


class JavaScriptErrorReport(BaseModel):
    name: str
    message: str
    stack: str
    cause: str
    location: str


async def get_error_reports() -> rainwave_typeddicts.AdminJsErrors:
    return (
        cast(
            rainwave_typeddicts.AdminJsErrors | None,
            await cache_get("error_reports"),
        )
        or []
    )


async def set_error_reports(
    error_reports: rainwave_typeddicts.AdminJsErrors,
) -> None:
    await cache_set("error_reports", error_reports)
