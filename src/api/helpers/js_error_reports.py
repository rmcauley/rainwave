from typing import TypedDict

from pydantic import BaseModel


class JavaScriptErrorReport(BaseModel):
    name: str
    message: str
    lineNumber: int | str | None
    columnNumber: int | str | None
    stack: str
    location: str
    userAgent: str
    browserLanguage: str


class JavaScriptErrorReportDict(TypedDict):
    user_id: int
    username: str
    time: int
    name: str
    message: str
    lineNumber: int | str | None
    columnNumber: int | str | None
    stack: str
    location: str
    userAgent: str
    browserLanguage: str
