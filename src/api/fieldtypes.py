import ipaddress
import re
import time
from datetime import datetime
from typing import Any, cast

from common import config, stations


def string(input: Any) -> str | None:
    if not input:
        return None
    if isinstance(input, bytes):
        try:
            input = input.decode().strip()
        except UnicodeDecodeError:
            return None
    if isinstance(input, str):
        return input.strip()
    try:
        return input.decode("utf-8").strip()
    except UnicodeDecodeError:
        return None


def numeric(input: Any) -> int | float | str | None:
    if isinstance(input, (int, float)):
        return input
    if isinstance(input, bytes):
        input = input.decode()
    if not input:
        return None
    if not isinstance(input, str):
        return None
    if not re.match(r"^-?\d+(.\d+)?$", input):
        return None
    return input


def integer(input: Any) -> int | None:
    if isinstance(input, int):
        return input
    if isinstance(input, float):
        return int(input)
    try:
        return int(input)
    except:
        return None


def positive_integer(input: Any) -> int | None:
    nmbr = integer(input)
    if nmbr is None:
        return None
    if nmbr <= 0:
        return None
    return nmbr


def zero_or_greater_integer(input: Any) -> int | None:
    nmbr = integer(input)
    if nmbr == None:
        return None
    if nmbr < 0:
        return None
    return nmbr


def float_num(input: Any) -> float | None:
    f = numeric(input)
    if not f:
        return None
    return float(input)


def rating(input: Any) -> float | None:
    r = float_num(input)
    if not r:
        return None
    if r < 1 or r > 5:
        return None
    if not (r * 10) % 5 == 0:
        return None
    return r


def boolean(input: Any) -> bool | None:
    if input == True:
        return True
    elif input == False:
        return False
    elif input == "true" or input == "True":
        return True
    elif input == "false" or input == "False":
        return False
    return None


def valid_relay(input: Any | None) -> str | None:
    if not input:
        return None
    for name, value in config.relays.items():
        if value["ip_address"] == input or (
            value.get("ip_address6") and value.get("ip_address6") == input
        ):
            return name
    return None


def sid(input: Any) -> int | None:
    this_sid = zero_or_greater_integer(input)
    if not this_sid:
        return None
    if this_sid in stations.station_ids:
        return this_sid
    return None


def integer_list(input: Any) -> list[int] | None:
    if isinstance(input, list):
        if all(
            isinstance(i, int)
            for i in input  # pyright: ignore[reportUnknownVariableType]
        ):
            return cast(list[int], input)
        return None

    if isinstance(input, bytes):
        input = input.decode().strip()
    if not input:
        return None
    try:
        if not re.match(r"^(\d+)(,\d+)*$", input):
            return None
    except TypeError:
        return None
    l: list[int] = []
    for entry in input.split(","):
        l.append(int(entry))
    return l


def string_list(input: Any) -> list[str] | None:
    if isinstance(input, list):
        if all(
            isinstance(i, str)
            for i in input  # pyright: ignore[reportUnknownVariableType]
        ):
            return cast(list[str], input)
        return None
    if not isinstance(input, str):
        return None
    l: list[str] = []
    for entry in input.split(","):
        l.append(entry)
    return l


def ip_address(addr: Any) -> str | None:
    try:
        # This works for both IPv4 and IPv6.
        return str(ipaddress.ip_address(addr))
    except ValueError:
        # Somehow this wasn't a valid IP address.
        return None


def date(s: Any) -> datetime | None:
    if not s:
        return None
    if isinstance(s, bytes):
        s = s.decode()
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        return None


def date_as_epoch(s: Any) -> float | None:
    dt = date(s)
    if not dt:
        return None
    return time.mktime(dt.timetuple())
