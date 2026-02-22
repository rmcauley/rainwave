@handle_api_url("admin/reset_song_cooldown")
class ResetSongCooldown(api.web.APIHandler):
    admin_required = True
    sid_required = False
    description = (
        "Sets song cooldown override to null and sets cooldown multiplier to 1."
    )
    fields = {"song_id": (fieldtypes.song_id, True)}

    def post(self):
        await cursor.update(
            "UPDATE r4_songs SET song_cool_multiply = 1, song_cool_override = NULL WHERE song_id = %s",
            (self.get_argument("song_id"),),
        )
        self.append(self.return_name, {"success": True, "text": "Song cooldown reset."})
