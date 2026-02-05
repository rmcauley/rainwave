    def get_all_api_keys(self) -> list[str]:
        if self.id > 1:
            keys = db.c.fetch_list(
                "SELECT api_key FROM r4_api_keys WHERE user_id = %s ", (self.id,)
            )
            cache.set_user(self, "api_keys", keys)
            return keys
        return []
