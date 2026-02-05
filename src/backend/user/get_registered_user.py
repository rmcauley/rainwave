    def _auth_registered_user(self, api_key: str | None, bypass: bool = False) -> None:
        if not bypass:
            keys = cache.get_user(self, "api_keys")
            if keys and api_key in keys:
                pass
            elif not api_key in self.get_all_api_keys():
                log.debug(
                    "auth", "Invalid user ID %s and/or API key %s." % (self.id, api_key)
                )
                return

        # Set as authorized and begin populating information
        # Pay attention to the "AS _variable" names in the SQL fields, they won't get exported to private JSONable dict
        self.authorized = True
        user_data = None
        if not user_data:
            user_data = db.c.fetch_row(
                "SELECT user_id AS id, COALESCE(radio_username, username) AS name, user_avatar AS avatar, radio_requests_paused AS requests_paused, "
                "user_avatar_type AS _avatar_type, radio_listenkey AS listen_key, group_id AS _group_id, radio_totalratings AS _total_ratings, discord_user_id AS _discord_user_id "
                "FROM phpbb_users WHERE user_id = %s",
                (self.id,),
            )

        if not user_data:
            log.debug("auth", "Invalid user ID %s not found in DB." % (self.id,))
            return

        self.data.update(user_data)

        self.data["avatar"] = solve_avatar(
            self.data["_avatar_type"], self.data["avatar"]
        )
        self.data.pop("_avatar_type")

        # Privileged folk - donors, admins, etc - get perks.
        # The numbers are the phpBB group IDs.
        if self.data["_group_id"] in (5, 4, 8, 18):
            self.data["perks"] = True

        # Admin and station manager groups
        if self.data["_group_id"] in (5, 18):
            self.data["admin"] = True
        self.data.pop("_group_id")

        if self.data["perks"]:
            self.data["rate_anything"] = True
        elif self.data["_total_ratings"] > config.rating_allow_all_threshold:
            self.data["rate_anything"] = True
        self.data.pop("_total_ratings")

        if not self.data["listen_key"]:
            self.generate_listen_key()

        self.data["uses_oauth"] = True if self.data["_discord_user_id"] else False
        self.data.pop("_discord_user_id")
