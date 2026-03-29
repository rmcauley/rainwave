from typing import cast

from pydantic import AliasChoices, BaseModel, Field

from api import rainwave_typeddicts
from common.cache.cache import cache_get, cache_set


class JavaScriptErrorReport(BaseModel):
    name: str
    message: str
    lineNumber: int | str | None = Field(
        default=None, validation_alias=AliasChoices("lineNumber", "line_number")
    )
    columnNumber: int | str | None = Field(
        default=None, validation_alias=AliasChoices("columnNumber", "column_number")
    )
    stack: str
    location: str
    userAgent: str = Field(validation_alias=AliasChoices("userAgent", "user_agent"))
    browserLanguage: str = Field(
        validation_alias=AliasChoices("browserLanguage", "browser_language")
    )


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
