import tornado.web

from api.urls import handle_url
import api.web

from libs import config


def get_round_robin_url(sid, filetype="mp3", user=None):
    return "http://%s:%s/%s" % (
        config.get_station(sid, "round_robin_relay_host"),
        config.get_station(sid, "round_robin_relay_port"),
        get_stream_filename(sid, filetype, user),
    )


def get_stream_filename(sid, filetype="mp3", user=None):
    filename = config.get_station(sid, "stream_filename")

    if user is None or user.is_anonymous():
        return "%s.%s" % (filename, filetype)
    else:
        return "%s.%s?%s:%s" % (filename, filetype, user.id, user.data["listen_key"])


@handle_url(r"/tune_in/(\w+|\d)\.(ogg|mp3)(.m3u)?")
class TuneInIndex(api.web.HTMLRequest):
    description = (
        "Provides the user with an M3U file containing Ogg or MP3 URLs to relays."
    )
    login_required = False
    auth_required = False
    sid_required = False

    def prepare(self):
        super(TuneInIndex, self).prepare()
        self.set_header("Content-Type", "audio/x-mpegurl")
        self.set_header("Cache-Control", "no-cache, must-revalidate")
        self.set_header("Expires", "Mon, 26 Jul 1997 05:00:00 GMT")

    def set_sid(self, url_param, filetype):
        if url_param:
            url_param_int = api.web.fieldtypes.positive_integer(url_param)
            if not url_param_int:
                for k, v in config.station_id_friendly.items():
                    if v.lower() == url_param.lower():
                        self.sid = k
                        break
            else:
                self.sid = url_param_int

        if not self.sid:
            raise tornado.web.HTTPError(404)
        if not self.sid in config.station_ids:
            raise tornado.web.HTTPError(404)

        self.set_header(
            "Content-Disposition",
            'inline; filename="rainwave_%s_%s.m3u"'
            % (config.station_id_friendly[self.sid].lower(), filetype),
        )

    def get(self, url_param, filetype, m3u=None):
        self.set_sid(url_param, filetype)

        stream_filename = get_stream_filename(self.sid, filetype, self.user)

        self.write(
            "#EXTINF:0,Rainwave %s: %s\n"
            % (
                config.station_id_friendly[self.sid],
                self.locale.translate("random_relay"),
            )
        )
        self.write(get_round_robin_url(self.sid, filetype, self.user) + "\n")

        for relay in config.public_relays[self.sid]:
            self.write(
                "#EXTINF:0, Rainwave %s: %s Relay\n"
                % (config.station_id_friendly[self.sid], relay["name"])
            )
            self.write(
                "%s%s:%s/%s\n"
                % (relay["protocol"], relay["hostname"], relay["port"], stream_filename)
            )


@handle_url("/pages/embed.js")
class EmbedInfo(api.web.HTMLRequest):
    phpbb_auth = False
    sid_required = False
    auth_required = False

    def get(self):
        self.set_header("Content-Type", "application/javascript")
        f = open("static/js4/audio.js")
        wholejs = f.read()
        f.close()

        self.write(wholejs)
        self.write("\n\n")
        self.write("var R4AudioRelays = ")
        self.write(repr(config.public_relays_json))
        self.write("\n\n")
        self.write("var R4AudioMounts = ")
        self.write(repr(config.station_mount_filenames))
