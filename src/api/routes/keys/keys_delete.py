@handle_url("/keys/delete")
class KeyDelete(KeyIndex):
    fields = {"delete_key": (fieldtypes.integer, True)}

    def get(self):
        await cursor.update(
            "DELETE FROM r4_api_keys WHERE user_id = %s AND api_id = %s",
            (self.user.id, self.get_argument("delete_key")),
        )
        self.user.get_all_api_keys()
        super().get()
