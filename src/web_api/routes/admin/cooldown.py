from backend.libs import db
import web_api.web
from web_api.urls import handle_api_url
from web_api import fieldtypes


@handle_api_url("admin/set_song_cooldown")
class SetSongCooldown(web_api.web.APIHandler):
    admin_required = True
    sid_required = False
    description = "Sets the song cooldown multiplier and override.  Passing null or false for either argument will retain its current setting. (non-destructive update)"
    fields = {
        "song_id": (fieldtypes.song_id, True),
        "multiply": (fieldtypes.float_num, None),
        "override": (fieldtypes.integer, None),
    }

    def post(self):
        if self.get_argument("multiply") and self.get_argument("override"):
            db.c.update(
                "UPDATE r4_songs SET song_cool_multiply = %s, song_cool_override = %s WHERE song_id = %s",
                (
                    self.get_argument("multiply"),
                    self.get_argument("override"),
                    self.get_argument("song_id"),
                ),
            )
            self.append(
                self.return_name,
                {
                    "success": True,
                    "text": "Song cooldown multiplier and override updated.",
                },
            )
        elif self.get_argument("multiply"):
            db.c.update(
                "UPDATE r4_songs SET song_cool_multiply = %s WHERE song_id = %s",
                (self.get_argument("multiply"), self.get_argument("song_id")),
            )
            self.append(
                self.return_name,
                {
                    "success": True,
                    "text": "Song cooldown multiplier updated.  Override untouched.",
                },
            )
        elif self.get_argument("override"):
            db.c.update(
                "UPDATE r4_songs SET AND song_cool_override = %s WHERE song_id = %s",
                (self.get_argument("override"), self.get_argument("song_id")),
            )
            self.append(
                self.return_name,
                {
                    "success": True,
                    "text": "Song cooldown override updated.  Multiplier untouched.",
                },
            )
        else:
            self.append(
                self.return_name,
                {
                    "success": False,
                    "text": "Neither multiply or override parameters set.",
                },
            )


@handle_api_url("admin/reset_song_cooldown")
class ResetSongCooldown(web_api.web.APIHandler):
    admin_required = True
    sid_required = False
    description = (
        "Sets song cooldown override to null and sets cooldown multiplier to 1."
    )
    fields = {"song_id": (fieldtypes.song_id, True)}

    def post(self):
        db.c.update(
            "UPDATE r4_songs SET song_cool_multiply = 1, song_cool_override = NULL WHERE song_id = %s",
            (self.get_argument("song_id"),),
        )
        self.append(self.return_name, {"success": True, "text": "Song cooldown reset."})


@handle_api_url("admin/set_album_cooldown")
class SetAlbumCooldown(web_api.web.APIHandler):
    admin_required = True
    description = "Sets the album cooldown multiplier and override PER STATION.  Passing null or false for either argument will retain its current setting. (non-destructive update)"
    fields = {
        "album_id": (fieldtypes.album_id, True),
        "multiply": (fieldtypes.float_num, None),
        "override": (fieldtypes.integer, None),
    }

    def post(self):
        if self.get_argument("multiply") and self.get_argument("override"):
            db.c.update(
                "UPDATE r4_album_sid SET album_cool_multiply = %s, album_cool_override = %s WHERE album_id = %s AND sid = %s",
                (
                    self.get_argument("multiply"),
                    self.get_argument("override"),
                    self.get_argument("album_id"),
                    self.sid,
                ),
            )
            self.append(
                self.return_name,
                {
                    "success": True,
                    "text": "Album cooldown multiplier and override updated.",
                },
            )
        elif self.get_argument("multiply"):
            db.c.update(
                "UPDATE r4_album_sid SET album_cool_multiply = %s WHERE album_id = %s AND sid = %s",
                (
                    self.get_argument("multiply"),
                    self.get_argument("album_id"),
                    self.sid,
                ),
            )
            self.append(
                self.return_name,
                {
                    "success": True,
                    "text": "Album cooldown multiplier updated.  Override untouched.",
                },
            )
        elif self.get_argument("override"):
            db.c.update(
                "UPDATE r4_album_sid SET album_cool_override = %s WHERE album_id = %s AND sid = %s",
                (
                    self.get_argument("override"),
                    self.get_argument("album_id"),
                    self.sid,
                ),
            )
            self.append(
                self.return_name,
                {
                    "success": True,
                    "text": "Album cooldown override updated.  Override untouched.",
                },
            )
        else:
            self.append(
                self.return_name,
                {
                    "success": False,
                    "text": "Neither multiply or override parameters set.",
                },
            )


@handle_api_url("admin/reset_album_cooldown")
class ResetAlbumCooldown(web_api.web.APIHandler):
    admin_required = True
    description = (
        "Sets album cooldown override to null and sets cooldown multiplier to 1."
    )
    fields = {"album_id": (fieldtypes.album_id, True)}

    def post(self):
        db.c.update(
            "UPDATE r4_album_sid SET album_cool_multiply = 1, album_cool_override = NULL WHERE album_id = %s AND sid = %s",
            (self.get_argument("album_id"), self.sid),
        )
        self.append(
            self.return_name,
            {"success": True, "text": "Album cooldown multiplier and override reset."},
        )
