import ipaddress
import re
import time
from datetime import datetime
from urllib.parse import parse_qsl, urlparse
from typing import Any

from backend import config
from backend.libs import db
from backend.events import event

string_error = "must be a string."


def string(in_string: Any, request: Any = None) -> str | None:
    if not in_string:
        return None
    if isinstance(in_string, bytes):
        in_string = in_string.decode()
    if isinstance(in_string, str):
        return in_string
    try:
        return in_string.decode("utf-8").strip()
    except UnicodeDecodeError:
        return None


# All _error variables start with no capital letter and end with a period.
numeric_error = "must be a number."


def numeric(s: Any, request: Any = None) -> int | float | str | None:
    if isinstance(s, (int, float)):
        return s
    if isinstance(s, bytes):
        s = s.decode()
    if not s:
        return None
    if not isinstance(s, str):
        return None
    if not re.match(r"^-?\d+(.\d+)?$", s):
        return None
    return s


integer_error = "must be a number."


def integer(s: Any, request: Any = None) -> int | None:
    if isinstance(s, (int)):
        return s
    if isinstance(s, float):
        return int(s)
    if isinstance(s, bytes):
        s = s.decode()
    if not s:
        return None
    if not isinstance(s, str):
        return None
    if not re.match(r"^-?\d+$", s):
        return None
    return int(s)


song_id_error = "must be a valid song ID."


def song_id(s: Any, request: Any = None) -> int | None:
    this_id = integer(s)
    if not this_id:
        return None
    if (
        db.c.fetch_var(
            "SELECT COUNT(*) FROM r4_songs WHERE song_id = %s AND song_verified = TRUE",
            (this_id,),
        )
        == 0
    ):
        return None
    return this_id


song_id_matching_sid_error = (
    "must be a valid song ID that exists on the requested station ID."
)


def song_id_matching_sid(s: Any, request: Any) -> int | None:
    this_id = integer(s)
    if not this_id or not request:
        return None
    if (
        db.c.fetch_var(
            "SELECT COUNT(*) FROM r4_song_sid WHERE song_id = %s AND sid = %s",
            (this_id, request.sid),
        )
        == 0
    ):
        return None
    return this_id


album_id_error = "must be a valid album ID."


def album_id(s: Any, request: Any = None) -> int | None:
    this_id = integer(s)
    if not this_id:
        return None
    if (
        db.c.fetch_var("SELECT COUNT(*) FROM r4_albums WHERE album_id = %s", (this_id,))
        == 0
    ):
        return None
    return this_id


artist_id_error = "must be a valid artist ID."


def artist_id(s: Any, request: Any = None) -> int | None:
    this_id = integer(s)
    if not this_id:
        return None
    if (
        db.c.fetch_var(
            "SELECT COUNT(*) FROM r4_artists WHERE artist_id = %s", (this_id,)
        )
        == 0
    ):
        return None
    return this_id


sched_id_error = "must be a valid schedule ID."


def sched_id(s: Any, request: Any = None) -> int | None:
    this_id = integer(s)
    if not this_id:
        return None
    if (
        db.c.fetch_var(
            "SELECT COUNT(*) FROM r4_schedule WHERE sched_id = %s", (this_id,)
        )
        == 0
    ):
        return None
    return this_id


elec_id_error = "must be a valid election ID."


def elec_id(s: Any, request: Any = None) -> int | None:
    this_id = integer(s)
    if not this_id:
        return None
    if (
        db.c.fetch_var(
            "SELECT COUNT(*) FROM r4_elections WHERE elec_id = %s", (this_id,)
        )
        == 0
    ):
        return None
    return this_id


positive_integer_error = "must be a positive number."


def positive_integer(s: Any, request: Any = None) -> int | None:
    nmbr = integer(s)
    if not nmbr:
        return None
    if nmbr <= 0:
        return None
    return nmbr


zero_or_greater_integer_error = "must be positive number or zero."


def zero_or_greater_integer(s: Any, request: Any = None) -> int | None:
    nmbr = integer(s)
    if nmbr == None:
        return None
    if nmbr < 0:
        return None
    return nmbr


float_num_error = "must be a number."


def float_num(s: Any, request: Any = None) -> float | None:
    f = numeric(s)
    if not f:
        return None
    return float(s)


long_num_error = "must be a number."


def long_num(s: Any, request: Any = None) -> int | None:
    l = numeric(s)
    if not l:
        return None
    return int(l)


rating_error = "must >= 1.0 and <= 5.0 in increments of	0.5."


def rating(s: Any, request: Any = None) -> float | None:
    r = float_num(s)
    if not r:
        return None
    if r < 1 or r > 5:
        return None
    if not (r * 10) % 5 == 0:
        return None
    return r


boolean_error = "must be 'true' or 'false'."


def boolean(s: Any, request: Any = None) -> bool | None:
    if s == True:
        return True
    elif s == False:
        return False
    elif s == "true" or s == "True":
        return True
    elif s == "false" or s == "False":
        return False
    return None


user_id_error = "must be a valid user ID."


def user_id(s: Any, request: Any = None) -> int | None:
    u = positive_integer(s, request)
    if not u:
        return None
    if not db.c.fetch_var("SELECT user_id FROM phpbb_users WHERE user_id = %s", (u,)):
        return None
    return u


valid_relay_error = "must be a known and valid relay's IP address."


def valid_relay(s: Any, request: Any = None) -> str | None:
    if not s:
        return None
    for name, value in config.relays.items():
        if value["ip_address"] == s or (
            value.get("ip_address6") and value.get("ip_address6") == s
        ):
            return name
    return None


sid_error = "must be a valid station ID."


def sid(s: Any, request: Any = None) -> int | None:
    this_sid = zero_or_greater_integer(s, request)
    if not this_sid:
        return None
    if request and request.allow_sid_zero and this_sid == 0:
        return this_sid
    if this_sid in config.station_ids:
        return this_sid
    return None


integer_list_error = "must be a comma-separated list of integers."


def integer_list(s: Any, request: Any = None) -> list[int] | None:
    if isinstance(s, list):
        for i in s:
            if not isinstance(i, int):
                return None
        return s

    if isinstance(s, bytes):
        s = s.decode()
    if not s:
        return None
    try:
        if not re.match(r"^(\d+)(,\d+)*$", s):
            return None
    except TypeError:
        return None
    l = []
    for entry in s.split(","):
        l.append(int(entry))
    return l


string_list_error = "must be a comma-separated list of strings."


def string_list(s: Any, request: Any = None) -> list[str] | None:
    if isinstance(s, list):
        for i in s:
            if not isinstance(i, str):
                return None
        return s
    l = []
    for entry in s.split(","):
        l.append(entry)
    return l


# Careful, this one could get expensive with all the song ID queries
song_id_list_error = "must be a comma-separated list of valid song IDs."


def song_id_list(s: Any, request: Any = None) -> list[int] | None:
    l = integer_list(s)
    if not l:
        return None
    for this_song_id in l:
        if (
            db.c.fetch_var(
                "SELECT COUNT(*) FROM r4_songs WHERE song_id = %s AND song_verified = TRUE",
                (this_song_id,),
            )
            == 0
        ):
            return None
    return l


# Returns a set of (mount, user_id, listen_key, listener_ip)
icecast_mount_error = "invalid Icecast mount."


def icecast_mount(
    s: Any, request: Any = None
) -> tuple[str, int, str | None, str | None] | None:
    if not s:
        return None
    if isinstance(s, bytes):
        s = s.decode()
    parsed = urlparse(s)
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


ip_address_error = "invalid IP address."


def ip_address(addr: Any, request: Any = None) -> Any:
    if not addr:
        return None
    return addr


media_player_error = None


def media_player(s: str, request: Any = None) -> str:
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


producer_type_error = None


def producer_type(s: Any, request: Any = None) -> Any | None:
    if s not in event.all_producers:
        return None
    return s


group_id_error = "must be a valid group ID."


def group_id(s: Any, request: Any = None) -> int | None:
    gid = integer(s)
    if (
        db.c.fetch_var("SELECT COUNT(*) FROM r4_groups WHERE group_id = %s", (gid,))
        == 0
    ):
        return None
    return gid


date_error = "must be valid ISO 8601 date. (YYYY-MM-DD)"


def date(s: Any, request: Any = None) -> datetime | None:
    if not s:
        return None
    if isinstance(s, bytes):
        s = s.decode()
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        return None


date_as_epoch_error = "must be valid ISO 8601 date. (YYYY-MM-DD)"


def date_as_epoch(s: Any, request: Any = None) -> float | None:
    dt = date(s, request)
    if not dt:
        return None
    return time.mktime(dt.timetuple())
