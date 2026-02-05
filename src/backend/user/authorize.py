
    def authorize(self, sid: int, api_key: str | None, bypass: bool = False) -> None:
        self.api_key = api_key

        if not bypass and (api_key and not re.match(r"^[\w\d]+$", api_key)):
            print("bad api key")
            return

        if self.id > 1:
            self._auth_registered_user(api_key, bypass)
        else:
            print("auth anon user")
            self._auth_anon_user(api_key, bypass)
