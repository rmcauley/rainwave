class IcecastHandler(RainwaveHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to relays for the purpose of tracking listeners."

    failed = True
    relay = None

    def prepare(self):
        self.failed = True  # Assume failure unless otherwise
        self.relay = fieldtypes.valid_relay(self.request.remote_ip)

        if not self.relay:
            self.set_status(403)
            self.append("%s is not a valid relay." % self.request.remote_ip)
            log.debug("ldetect", "%s is not a valid relay." % self.request.remote_ip)
            self.finish()
            return

        super().prepare()

    def finish(self, chunk=None):
        if self.failed:
            self.set_status(403)
            self.set_header("icecast-auth-user", "0")
        else:
            self.set_status(200)
            self.set_header("icecast-auth-user", "1")
        super().finish()

    def write_error(self, status_code, **kwargs):
        self.failed = True
        if "exc_info" in kwargs:
            exc = kwargs["exc_info"][1]
            if isinstance(exc, APIException):
                exc.localize(self.locale)
                self.set_header("icecast-auth-message", exc.reason or "No reason.")
            log.debug("ldetect", "Relay command failed: %s" % exc.reason)
            log.exception(
                "ldetect", "Exception encountered handling relay command.", exc
            )
        super().finish()

    def append(self, message, dct=None):
        log.debug("ldetect", message)
        self.set_header("icecast-auth-message", message)
        self.write(message)
