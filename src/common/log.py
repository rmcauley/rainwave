from os import path
import logging
import logging.handlers
import datetime
from typing import Any
from common import config

log: logging.Logger | None = None


class LogNotInitializedError(Exception):
    pass


class RWFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        msg = logging.Formatter.format(self, record)
        return "%s - %s - %s" % (
            datetime.datetime.now().strftime("%m-%d %H:%M:%S"),
            record.levelname.ljust(8),
            msg,
        )


def init(
    log_file: str | None = None,
    log_file_level: int = logging.DEBUG,
    log_stdout_level: int = logging.WARNING,
) -> None:
    global log
    logging.getLogger().setLevel(logging.DEBUG)
    logging.getLogger("tornado.access").setLevel(logging.CRITICAL)

    formatter = RWFormatter()
    handlers: list[logging.Handler] = []

    log = logging.getLogger("tornado.application")

    log_file_path: str | None = None
    if log_file:
        if path.isabs(log_file):
            log_file_path = log_file
        elif config.log_dir:
            log_file_path = path.join(config.log_dir, log_file)

    if log_file_path:
        file_handler = logging.handlers.RotatingFileHandler(
            log_file_path, maxBytes=10000000, backupCount=1
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(log_file_level)
        handlers.append(file_handler)

    stdout_handler = logging.StreamHandler()
    stdout_handler.setFormatter(formatter)
    stdout_handler.setLevel(log_stdout_level)
    handlers.append(stdout_handler)

    for handler in handlers:
        logging.getLogger("tornado.general").addHandler(handler)
        log.addHandler(handler)

    debug("test", "Debug test.")
    info("test", "Info test.")
    warn("test", "Warn test.")
    error("test", "Error test.")
    critical("test", "Critical test.")


def shutdown() -> None:
    global log

    for logger_name in ("tornado.general", "tornado.application"):
        logger = logging.getLogger(logger_name)
        for handler in list(logger.handlers):
            logger.removeHandler(handler)
            handler.close()

    log = None


def _massage_line(key: str, message: str, user_id: int | None) -> str:
    user_string = ""
    if user_id:
        user_string = f"u{user_id}"
    return "%-6s [%-15s] %s" % (user_string, key, message)


def debug(key: str, message: str, user_id: int | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.debug(_massage_line(key, message, user_id))


def warn(key: str, message: str, user_id: int | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.warning(_massage_line(key, message, user_id))


def info(key: str, message: str, user_id: int | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.info(_massage_line(key, message, user_id))


def error(key: str, message: str, user_id: int | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.error(_massage_line(key, message, user_id))


def critical(key: str, message: str, user_id: int | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.critical(_massage_line(key, message, user_id))


def exception(key: str, message: str, e: Any) -> None:
    if not log:
        raise LogNotInitializedError
    log.critical(_massage_line(key, message, None), exc_info=e)
