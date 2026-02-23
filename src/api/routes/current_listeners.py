@handle_api_url("current_listeners")
class CurrentListenersRequest(APIHandler):
    description = "Lists all current listeners for a station."
    sid_required = True

    def post(self):
        self.append(
            "current_listeners", cache.get_station(self.sid, "current_listeners")
        )


@handle_api_html_url("current_listeners")
class CurrentListenersHTML(PrettyPrintAPIMixin, CurrentListenersRequest):
    pass
