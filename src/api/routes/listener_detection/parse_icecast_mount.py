# Returns a set of (mount, user_id, listen_key, listener_ip)
import ipaddress
from urllib.parse import parse_qsl, urlparse


class InvalidIcecastMount(Exception):
    pass


def parse_icecast_mount(input: str) -> tuple[str, int, str | None, str | None]:
    if not input:
        raise InvalidIcecastMount
    parsed = urlparse(input)
    path = parsed.path
    if path[0] == "/":
        path = path[1:]
    mount = path.split(r"/")[0].split(".")[0]
    if not mount:
        raise InvalidIcecastMount

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
