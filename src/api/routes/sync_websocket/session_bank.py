from common import log

import datetime
import tornado


class SessionBank:
    def __init__(self):
        super().__init__()
        self.sessions = []
        self.websockets = []
        self.throttled = {}
        self.websockets_by_user = {}

    def __iter__(self):
        for item in self.sessions:
            yield item

    def append(self, session):
        if session.is_websocket:
            if not session in self.websockets:
                self.websockets.append(session)
            if not session.user.is_anonymous():
                if not session.user.id in self.websockets_by_user:
                    self.websockets_by_user[session.user.id] = []
                self.websockets_by_user[session.user.id].append(session)
        elif not session in self.sessions:
            self.sessions.append(session)

    def remove(self, session):
        if session in self.throttled:
            tornado.ioloop.IOLoop.instance().remove_timeout(self.throttled[session])
            del self.throttled[session]
        if session in self.websockets:
            self.websockets.remove(session)
            if (
                not session.user.is_anonymous()
                and session.user.id in self.websockets_by_user
                and session in self.websockets_by_user
            ):
                self.websockets_by_user[session.user.id].remove(session)
                if not self.websockets_by_user[session.user.id]:
                    del self.websockets_by_user[session.user.id]
        elif session in self.sessions:
            self.sessions.remove(session)

    def clear(self):
        for timer in self.throttled.values():
            tornado.ioloop.IOLoop.instance().remove_timeout(timer)
        self.sessions[:] = []
        self.throttled.clear()

    def find_user(self, user_id):
        toret = []
        for session in self.sessions + self.websockets:
            if session.user.id == user_id:
                toret.append(session)
        return toret

    def find_ip(self, ip_address):
        toret = []
        for session in self.sessions + self.websockets:
            if session.request.remote_ip == ip_address:
                toret.append(session)
        return toret

    def find_listen_key(self, listen_key):
        toret = []
        for session in self.sessions + self.websockets:
            if session.user.data.get("listen_key") == listen_key:
                toret.append(session)
        return toret

    def keep_alive(self):
        for session in self.sessions + self.websockets:
            try:
                session.keep_alive()
            except Exception as e:
                session.rw_finish()
                log.exception("sync", "Session failed keepalive.", e)

    def update_all(self, sid):
        session_count = 0
        session_failed_count = 0
        for session in self.sessions + self.websockets:
            try:
                session.update()
                session_count += 1
            except Exception as e:
                try:
                    session.rw_finish()
                except:
                    pass
                session_failed_count += 1
                log.exception("sync_update_all", "Failed to update session.", e)
        log.debug(
            "sync_update_all",
            "Updated %s sessions (%s failed) for sid %s."
            % (session_count, session_failed_count, sid),
        )

        self.clear()

    # this function is only called when the user's tune_in status changes
    # though it does send an update for the whole user() object if the situation
    # is correct
    def _do_user_update(self, session, updated_by_ip):
        # clear() might wipe out the timeouts for a bigger update (that includes user update anyway!)
        # don't bother updating again if that's already happened
        if not session in self.throttled:
            return
        del self.throttled[session]

        try:
            potential_mixup_warn = (
                updated_by_ip
                and not session.user.is_anonymous()
                and not session.user.is_tunedin()
            )
            session.refresh_user()
            if potential_mixup_warn and not session.user.is_tunedin():
                log.debug(
                    "sync_update_ip",
                    "Warning logged in user of potential M3U mixup at IP %s"
                    % session.request.remote_ip,
                )
                session.login_mixup_warn()
            else:
                session.update_user()
        except Exception as e:
            log.exception("sync", "Session failed to be updated during update_user.", e)
            try:
                session.rw_finish()
            except Exception:
                log.exception("sync", "Session failed finish() during update_user.", e)

    def send_to_user(self, user_id, uuid_exclusion, data):
        if not user_id in self.websockets_by_user:
            return
        if "message_id" in data:
            del data["message_id"]
        for session in self.websockets_by_user[user_id]:
            if not session.uuid == uuid_exclusion:
                session.write_message(data)

    def send_to_all(self, uuid_exclusion, data):
        for session in self.websockets:
            if not uuid_exclusion == session.uuid:
                session.write_message(data)

    def _throttle_session(self, session, updated_by_ip=False):
        if not session in self.throttled:
            self.throttled[session] = tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=2),
                lambda: self._do_user_update(session, updated_by_ip),
            )

    def update_user(self, user_id):
        # throttle rapid user updates - usually when a user does something like
        # switch relays on their media player this can happen.
        for session in self.find_user(user_id):
            self._throttle_session(session)

    def update_ip_address(self, ip_address):
        for session in self.find_ip(ip_address):
            self._throttle_session(session, True)

    def update_listen_key(self, listen_key):
        for session in self.find_listen_key(listen_key):
            self._throttle_session(session)
