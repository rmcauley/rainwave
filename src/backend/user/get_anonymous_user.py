

    def _auth_anon_user(self, api_key: str | None, bypass: bool = False) -> None:
        if not bypass:
            print("not bypassing")
            cache_key = unicodedata.normalize(
                "NFKD", "api_key_listen_key_%s" % api_key
            ).encode("ascii", "ignore")
            print("A")
            listen_key = cache.get(cache_key)
            print("B")
            if not listen_key:
                listen_key = db.c.fetch_var(
                    "SELECT api_key_listen_key FROM r4_api_keys WHERE api_key = %s AND user_id = 1",
                    (self.api_key,),
                )
                print("c")
                if not listen_key:
                    print("d")
                    return
                else:
                    print("e")
                    self.data["listen_key"] = listen_key
            else:
                print("f")
                self.data["listen_key"] = listen_key
        print("all should be good!")
        self.authorized = True
