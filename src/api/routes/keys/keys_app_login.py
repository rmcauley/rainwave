@handle_url("/keys/app")
class AppLogin(api.web.HTMLRequest):
    login_required = False
    sid_required = False
    auth_required = False
    description = "Shows an acceptance screen with an rw:// link to login.  Allows seamless logins on mobile screens."

    def get(self):
        if not self.user or self.user.is_anonymous():
            self.redirect("/oauth/login&redirect=%s" % self.url)
            return

        self.user.ensure_api_key()

        key = await cursor.fetch_var(
            "SELECT api_key FROM r4_api_keys WHERE user_id = %s LIMIT 1",
            (self.user.id,),
        )

        self.render(
            "applogin.html",
            request=self,
            locale=self.locale,
            link_url="rw://%s:%s@rainwave.cc" % (self.user.id, key),
        )
