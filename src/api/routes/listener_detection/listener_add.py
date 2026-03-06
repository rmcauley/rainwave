from common.db.cursor import get_cursor
@handle_api_url(r"listener_add/(\d+)")
from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.routes.listener_detection.icecast_handler import IcecastHandler
from common.zeromq import sync_to_front
from common.user.user_model import make_user


class AddListener(IcecastHandler):
    fields = {
        "client": (fieldtypes.integer, True),
        "mount": (fieldtypes.icecast_mount, True),
        "ip": (fieldtypes.ip_address, True),
        "agent": (fieldtypes.media_player, True),
    }
    mount = None
    user_id = None
    listen_key = None
    agent = None
    listener_ip = None

    def post(self, sid):
        self.mount, self.user_id, self.listen_key, self.listener_ip = (
            self.get_argument_required("mount")
        )
        self.agent = input["agent")
        if self.listener_ip is None:
            self.listener_ip = input["ip")

        if sid:
            try:
                self.sid = int(sid)
            except ValueError:
                raise APIException("invalid_station_id", http_code=400)
        else:
            raise APIException("invalid_station_id", http_code=400)
        if self.user_id > 1:
            self.add_registered(self.sid)
        else:
            self.add_anonymous(self.sid)

    async def add_registered(self, sid):
        async with get_cursor() as cursor:
            real_key = await cursor.fetch_var(
                "SELECT radio_listenkey FROM phpbb_users WHERE user_id = %s",
                (self.user_id,),
            )
            if real_key != self.listen_key:
                raise APIException("invalid_argument", reason="mismatched listen_key.")
            tunedin = await cursor.fetch_var(
                "SELECT COUNT(*) FROM r4_listeners WHERE user_id = %s", (self.user_id,)
            )
            if tunedin:
                await cursor.update(
                    """
                    UPDATE r4_listeners
                    SET sid = %s,
                        listener_ip = %s,
                        listener_purge = FALSE,
                        listener_icecast_id = %s,
                        listener_relay = %s,
                        listener_agent = %s
                    WHERE user_id = %s
""",
                (
                    sid,
                    self.listener_ip,
                    input["client"),
                    self.relay,
                    self.agent,
                    self.user_id,
                ),
            )
            self.append(
                "%s update: %s %s %s %s %s %s."
                % (
                    "{:<5}".format(self.user_id),
                    sid,
                    "{:<15}".format(self.listener_ip),
                    "{:<15}".format(self.relay),
                    "{:<10}".format(input["client")),
                    self.agent,
                    self.listen_key,
                )
            )
            self.failed = False
        else:
            await cursor.update(
                """
                    INSERT INTO r4_listeners
                    (sid,
                        user_id,
                        listener_ip,
                        listener_icecast_id,
                        listener_relay,
                        listener_agent)
                    VALUES (%s, %s, %s, %s, %s, %s)
""",
                (
                    sid,
                    self.user_id,
                    self.listener_ip,
                    input["client"),
                    self.relay,
                    self.agent,
                ),
            )
            self.append(
                "%s new   : %s %s %s %s %s %s."
                % (
                    "{:<5}".format(self.user_id),
                    sid,
                    "{:<15}".format(self.listener_ip),
                    "{:<15}".format(self.relay),
                    "{:<10}".format(input["client")),
                    self.agent,
                    self.listen_key,
                )
            )
            self.failed = False
        if not self.failed:
            u = make_user(self.user_id)
            u.get_listener_record(use_cache=False)
            if u.has_requests():
                u.put_in_request_line(sid)
        sync_to_front.sync_frontend_user_id(self.user_id)

    async def add_anonymous(self, sid):
        async with get_cursor() as cursor:
            if not self.listen_key:
                self.failed = False
                return

            records = await cursor.fetch_list(
                "SELECT listener_id FROM r4_listeners WHERE (listener_ip = %s OR listener_key = %s) AND user_id = 1",
                (self.listener_ip, self.listen_key),
            )
            if len(records) == 0:
                await cursor.update(
                    """
                    INSERT INTO r4_listeners
                    (sid,
                        listener_ip,
                        user_id,
                        listener_relay,
                        listener_agent,
                        listener_icecast_id,
                        listener_key)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
""",
                (
                    sid,
                    self.listener_ip,
                    1,
                    self.relay,
                    input["agent"),
                    input["client"),
                    self.listen_key,
                ),
            )
            self.append(
                "%s new   : %s %s %s %s %s %s."
                % (
                    "{:<5}".format(self.user_id),
                    sid,
                    "{:<15}".format(self.listener_ip),
                    "{:<15}".format(self.relay),
                    "{:<10}".format(input["client")),
                    self.agent,
                    self.listen_key,
                )
            )
            self.failed = False
        else:
            # Keep one valid entry on file for the listener by popping once
            listener_id = records.pop()
            # Erase the rest
            while records:
                popped = records.pop()
                sync_to_front.sync_frontend_key(popped)
                await cursor.update(
                    "DELETE FROM r4_listeners WHERE listener_id = %s", (popped,)
                )
            await cursor.update(
                """
                    UPDATE r4_listeners
                    SET sid = %s,
                        listener_ip = %s,
                        listener_relay = %s,
                        listener_agent = %s,
                        listener_icecast_id = %s,
                        listener_key = %s,
                        listener_purge = FALSE
                    WHERE listener_id = %s
""",
                (
                    sid,
                    self.listener_ip,
                    self.relay,
                    input["agent"),
                    input["client"),
                    self.listen_key,
                    listener_id,
                ),
            )
            self.append(
                "%s update: %s %s %s %s %s %s."
                % (
                    "{:<5}".format(self.user_id),
                    sid,
                    "{:<15}".format(self.listener_ip),
                    "{:<15}".format(self.relay),
                    "{:<10}".format(input["client")),
                    self.agent,
                    self.listen_key,
                )
            )
            self.failed = False
        sync_to_front.sync_frontend_key(self.listen_key)
