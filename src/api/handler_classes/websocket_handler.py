    # works without touching cookies or headers, primarily used for websocket requests
    def prepare_standalone(self, message_id: str | None = None) -> None:
        self._output = {}
        if message_id != None:
            self.append("message_id", {"message_id": message_id})
        self.setup_output()
        self.arg_parse()
        self.sid_check()
        self.permission_checks()
