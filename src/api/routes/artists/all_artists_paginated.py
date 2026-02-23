@handle_api_url("all_artists_paginated")
class AllArtistsPaginatedHandler(APIHandler):
    description = "Returns chunks of a list of all artists on the station playlist."
    return_name = "all_artists_paginated"
    fields = {"after": (fieldtypes.integer, False)}

    def post(self):
        all_artists = get_all_artists(
            sid=self.sid,
        )
        offset = self.get_argument_int("after", 0) or 0
        page = all_artists[offset : offset + PAGE_LIMIT]
        self.append(
            self.return_name,
            {
                "data": page,
                "has_more": page[-1] != all_artists[-1],
                "progress": min(
                    math.ceil((offset + len(page)) / len(all_artists) * 100), 100
                ),
                "next": offset + PAGE_LIMIT,
            },
        )
