import ipaddress
import re
import time
from datetime import datetime
from urllib.parse import parse_qsl, urlparse
from typing import Any, cast

from common import config


def string(input: Any) -> str | None:
    if not input:
        return None
    if isinstance(input, bytes):
        input = input.decode().strip()
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


def valid_relay(input: str) -> str | None:
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
    if this_sid in config.station_ids:
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


# Returns a set of (mount, user_id, listen_key, listener_ip)
def icecast_mount(input: str) -> tuple[str, int, str | None, str | None] | None:
    if not input:
        return None
    parsed = urlparse(input)
    path = parsed.path
    if path[0] == "/":
        path = path[1:]
    mount = path.split(r"/")[0].split(".")[0]
    if not mount:
        return None

    # mount point query string
    #
    # When listeners tune in from the web interface or use an unaltered m3u file downloaded from the
    # web interface while tuned in, the streaming client will send a request to the relay that
    # includes a user id and listen key. The request looks like this:
    #
    # /all.ogg?1000:1a2b3c4d5e
    #
    # Nginx will receive this request and append the client IP address before forwarding the request
    # to Icecast. Now the request to Icecast looks like this:
    #
    # /all.ogg?1000:1a2b3c4d5e&1.2.3.4
    #
    # To authenticate the streaming client, Icecast will send a request to Rainwave (listener_add)
    # and include the above string in the `mount` query argument.
    #
    # Because we aren't using the usual name=value query format, we can parse the query string with
    # `parse_qsl(qs, keep_blank_values=True)` and get a list that looks like this:
    #
    # [('1000:1a2b3c4d5e', ''), ('1.2.3.4', '')]
    #
    # If the listener is not signed in, the user id and listen key will not be present, but Nginx
    # will still append the client IP address, so the request will look like this:
    #
    # /all.ogg?&1.2.3.4
    #
    # Parsing this query string will return a list that looks like this:
    #
    # [('1.2.3.4', '')]
    #
    # The code below assumes that the *last* tuple in the list is the client IP address, and if the
    # list length is longer than 1, the *first* tuple contains the user id information.
    #
    # Because all requests are proxied through Nginx, we can be reasonably sure that the *last*
    # tuple in the list is the real client IP address. If a malicious client tries to supply a fake
    # IP address in the query string, Nginx will always append the real client IP address at the end
    # of the query string before forwarding the request to Icecast.

    uid = 1
    listen_key = None
    listener_ip = None

    params = parse_qsl(parsed.query, keep_blank_values=True)

    if len(params) > 0:
        ip_param = params[-1][0]
        try:
            # This works for both IPv4 and IPv6.
            listener_ip = str(ipaddress.ip_address(ip_param))
        except ValueError:
            # Somehow this wasn't a valid IP address.
            listener_ip = None

    if len(params) > 1:
        id_param = params[0][0]
        if ":" in id_param:
            parsed_uid, parsed_listen_key = id_param.split(":", maxsplit=1)
            try:
                uid = int(parsed_uid)
            except ValueError:
                uid = 1
            if len(parsed_listen_key) == 10:
                listen_key = parsed_listen_key

    return (mount, uid, listen_key, listener_ip)


def ip_address(addr: Any) -> Any:
    try:
        # This works for both IPv4 and IPv6.
        return str(ipaddress.ip_address(addr))
    except ValueError:
        # Somehow this wasn't a valid IP address.
        return None


media_player_error = None


def media_player(s: str) -> str:
    ua = s.lower()
    if ua.find("firefox") > -1:
        return "Firefox"
    elif ua.find("chrome") > -1:
        return "Chrome"
    elif ua.find("safari") > -1:
        return "Safari"
    elif ua.find("foobar") > -1:
        return "Foobar2000"
    elif ua.find("dalvik") > -1 or ua.find("android") > -1:
        return "Android"
    elif ua.find("stagefright") > -1 or ua.find("servestream") > -1:
        return "Android (App)"
    elif ua.find("lavf") > -1:
        return "LAV"
    elif ua.find("ffmpeg") > -1:
        return "FFmpeg"
    elif ua.find("winamp") > -1:
        return "Winamp"
    elif ua.find("vlc") > -1 or ua.find("videolan") > -1:
        return "VLC"
    elif ua.find("applecoremedia") > -1 and ua.find("mac os x") > -1:
        return "iTunes (iPhone)"
    elif ua.find("applecoremedia") > -1:
        return "iTunes (Mac OS)"
    elif ua.find("cfnetwork") > -1 and ua.find("darwin") > -1:
        return "iPhone (App)"
    elif ua.find("minecraft") > -1:
        return "Minecraft"
    elif ua.find("clementine") > -1:
        return "Clementine"
    elif ua.find("xine") > -1:
        return "Xine"
    elif ua.find("audacious") > -1:
        return "Audacious"
    elif ua.find("fstream") > -1:
        return "Fstream"
    elif ua.find("bass") > -1:
        return "BASS/XMplay"
    elif ua.find("xion") > -1:
        return "Xion"
    elif ua.find("itunes") > -1:
        return "iTunes"
    elif ua.find("muses") > -1 or ua.find("fmod") > -1:
        return "Flash Player"
    elif ua.find("mozilla") > -1:
        return "Mozilla"
    elif ua.find("wmplayer") > -1 or ua.find("nsplayer") > -1:
        return "Windows Media"
    elif ua.find("mediamonkey") > -1:
        return "MediaMonkey"
    elif ua.find("XBMC") > -1:
        return "XBMC"
    elif ua == "-":
        return "None"
    return "Unknown (" + s + ")"


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
