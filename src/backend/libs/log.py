from os import path
import logging
import logging.handlers
import datetime
from typing import Any
from backend import config

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


def init(logfile: str | None = None, loglevel: str = "warning") -> None:
    global log
    logging.getLogger().setLevel(logging.DEBUG)
    logging.getLogger("scss").setLevel(logging.DEBUG)
    logging.getLogger("scss.compiler").setLevel(logging.DEBUG)
    logging.getLogger("tornado.access").setLevel(logging.CRITICAL)

    handler = None
    if logfile and config.log_dir:
        handler = logging.handlers.RotatingFileHandler(
            path.join(config.log_dir, logfile), maxBytes=10000000, backupCount=1
        )
        handler.setFormatter(RWFormatter())

    print_handler = logging.StreamHandler()
    print_handler.setFormatter(RWFormatter())
    print_handler.setLevel(logging.DEBUG)

    if not handler:
        loglevel = "print"
        handler = print_handler

    logging.getLogger("tornado.general").addHandler(handler)
    log = logging.getLogger("tornado.application")
    log.addHandler(handler)

    if loglevel == "print":
        log.addHandler(print_handler)

        logging.getLogger("tornado.general").addHandler(print_handler)

    if loglevel == "critical":
        handler.setLevel(logging.CRITICAL)
    elif loglevel == "error":
        handler.setLevel(logging.ERROR)
    elif loglevel == "info":
        handler.setLevel(logging.INFO)
    elif loglevel == "debug" or loglevel == "print":
        handler.setLevel(logging.DEBUG)
    else:
        handler.setLevel(logging.WARNING)
    debug("test", "Debug test.")
    info("test", "Info test.")
    warn("test", "Warn test.")
    error("test", "Error test.")
    critical("test", "Critical test.")


def close() -> None:
    logging.shutdown()


def _massage_line(key: str, message: str, user: Any | None) -> str:
    user_info = ""
    if user and user.user_id > 1:
        user_info = "u%s" % user.user_id
    elif user:
        user_info = "a%s" % user.ip_address
    return " %-15s [%-15s] %s" % (user_info, key, message)


def debug(key: str, message: str, user: Any | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.debug(_massage_line(key, message, user))


def warn(key: str, message: str, user: Any | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.warning(_massage_line(key, message, user))


def info(key: str, message: str, user: Any | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.info(_massage_line(key, message, user))


def error(key: str, message: str, user: Any | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.error(_massage_line(key, message, user))


def critical(key: str, message: str, user: Any | None = None) -> None:
    if not log:
        raise LogNotInitializedError
    log.critical(_massage_line(key, message, user))


def exception(key: str, message: str, e: BaseException) -> None:
    if not log:
        raise LogNotInitializedError
    log.critical(_massage_line(key, message, None), exc_info=e)
