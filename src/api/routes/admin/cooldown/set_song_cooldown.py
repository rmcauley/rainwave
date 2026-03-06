@handle_api_url("admin/set_song_cooldown")
class SetSongCooldown(APIHandler):
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
            await cursor.update(
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
            await cursor.update(
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
            await cursor.update(
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
