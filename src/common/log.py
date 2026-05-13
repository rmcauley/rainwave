from os import path
import logging
import logging.handlers
import datetime
from typing import Any
from common import config


class RWFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        msg = logging.Formatter.format(self, record)
        return "%s - %s - %s" % (
            datetime.datetime.now().strftime("%m-%d %H:%M:%S"),
            record.levelname.ljust(8),
            msg,
        )


class RWColorFormatter(RWFormatter):
    RESET = "\033[0m"
    COLORS = {
        logging.DEBUG: "\033[90m",
        logging.INFO: "\033[97m",
        logging.WARNING: "\033[33m",
        logging.ERROR: "\033[31m",
        logging.CRITICAL: "\033[31m",
    }

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        color = self.COLORS.get(record.levelno)
        if not color:
            return msg
        return f"{color}{msg}{self.RESET}"


logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger("tornado.access").setLevel(logging.CRITICAL)

formatter = RWFormatter()
color_formatter = RWColorFormatter()
log = logging.getLogger("tornado.application")
general_log = logging.getLogger("tornado.general")

stdout_handler: logging.StreamHandler[Any] = logging.StreamHandler()
stdout_handler.setFormatter(formatter)
stdout_handler.setLevel(logging.DEBUG)
log.addHandler(stdout_handler)
general_log.addHandler(stdout_handler)

file_handler: logging.Handler | None = None


def init(
    log_file: str | None = None,
    log_file_level: int = logging.DEBUG,
    log_stdout_level: int = logging.WARNING,
) -> None:
    global file_handler
    logging.getLogger().setLevel(logging.DEBUG)
    logging.getLogger("tornado.access").setLevel(logging.CRITICAL)
    stdout_handler.setFormatter(
        color_formatter if config.log_stdout_color else formatter
    )
    stdout_handler.setLevel(log_stdout_level)

    if file_handler:
        log.removeHandler(file_handler)
        general_log.removeHandler(file_handler)
        file_handler.close()
        file_handler = None

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
        log.addHandler(file_handler)
        general_log.addHandler(file_handler)


def _massage_line(key: str, message: str, user_id: int | None) -> str:
    user_string = ""
    if user_id:
        user_string = f"u{user_id}"
    return "%-6s [%-15s] %s" % (user_string, key, message)


def debug(key: str, message: str, user_id: int | None = None) -> None:
    log.debug(_massage_line(key, message, user_id))


def warn(key: str, message: str, user_id: int | None = None) -> None:
    log.warning(_massage_line(key, message, user_id))


def info(key: str, message: str, user_id: int | None = None) -> None:
    log.info(_massage_line(key, message, user_id))


def error(key: str, message: str, user_id: int | None = None) -> None:
    log.error(_massage_line(key, message, user_id))


def critical(key: str, message: str, user_id: int | None = None) -> None:
    log.critical(_massage_line(key, message, user_id))


def exception(key: str, message: str, e: Any) -> None:
    log.critical(_massage_line(key, message, None), exc_info=e)
