@handle_api_url("request_line")
class ListRequestLine(APIHandler):
    description = "Gives a list of who is waiting in line to make a request on the given station, plus their current top-requested song. (or no song, if they have not decided)"
    sid_required = True

    def post(self):
        # A 13 year old bug means it's returning "request_line_result" here.
        self.append(self.return_name, cache.get_station(self.sid, "request_line"))
        # It _should_ be "request_line" for now and future APIs, so... we return both. 😬
        self.append("request_line", cache.get_station(self.sid, "request_line"))
        # self.append("request_line_db", await cursor.fetch_all("SELECT username, r4_request_line.* FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE sid = %s ORDER BY line_wait_start", (self.sid,)))


@handle_api_html_url("request_line")
class ListRequestLineHTML(PrettyPrintAPIMixin, ListRequestLine):
    pass
