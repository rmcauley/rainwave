# type: ignore

##### Typing ignored for whole file.


# this mixin will overwrite anything in APIHandler and RainwaveHandler so be careful wielding it
class PrettyPrintAPIMixin:
    phpbb_auth = True
    allow_get = True
    write_error = _html_write_error
    _output: RainwaveHandler["_output"]

    # reset the initialize to ignore overwriting self.get with anything
    def initialize(self, *args, **kwargs):
        super().initialize(*args, **kwargs)
        self._real_post = self.post
        self.post = self.post_reject

    def prepare(self):
        super().prepare()
        self._real_post()

    def get(self, write_header=True):
        if not isinstance(self._output, dict):
            raise APIException(
                "internal_error", "This API call is not supported.", http_code=500
            )

        if write_header:
            self.write(
                self.render_string(
                    "basic_header.html", title=self.locale.translate(self.return_name)
                )
            )
        per_page: int = 100
        page_start: int = 0
        per_page_link = None
        previous_page_start = 0
        next_page_start = per_page
        if (
            self.pagination
            and "per_page" in self.fields
            and self.get_argument_int("per_page") != 0
        ):
            per_page_arg = self.get_argument_int("per_page")
            if per_page_arg:
                per_page = per_page_arg
            page_start_arg = self.get_argument_int("page_start")
            if page_start_arg:
                page_start = page_start_arg
                previous_page_start = page_start - per_page
                next_page_start = page_start + per_page
            else:
                next_page_start = per_page

            per_page_link = "%s?" % self.url
            for field in self.fields.keys():
                if field == "page_start":
                    pass
                elif field == "per_page":
                    per_page_link += "%s=%s&" % (field, per_page)
                else:
                    per_page_link += "%s=%s&" % (field, self.get_argument(field))

            if page_start and page_start > 0:
                self.write(
                    "<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>"
                    % (per_page_link, previous_page_start)
                )
            if (
                isinstance(self._output, dict)
                and self.return_name in self._output
                and len(self._output[self.return_name]) >= per_page
            ):
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )
            elif not self.return_name in self._output:
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )

        for json_out in self._output.values():
            if not isinstance(json_out, list):
                continue
            if len(json_out) > 0:
                self.write("<table class='%s'><th>#</th>" % self.return_name)
                keys = getattr(self, "columns", self.sort_keys(json_out[0].keys()))
                for key in keys:
                    self.write("<th>%s</th>" % self.locale.translate(key))
                self.header_special()
                self.write("</th>")
                i = 1
                if page_start:
                    i += page_start
                for row in json_out:
                    self.write("<tr><td>%s</td>" % i)
                    for key in keys:
                        if key == "sid":
                            self.write(
                                "<td>%s</td>" % config.station_id_friendly[row[key]]
                            )
                        else:
                            self.write("<td>%s</td>" % row[key])
                    self.row_special(row)
                    self.write("</tr>")
                    i = i + 1
                self.write("</table>")
            else:
                self.write("<p>%s</p>" % self.locale.translate("no_results"))

        if (
            self.pagination
            and "per_page" in self.fields
            and self.get_argument("per_page") != 0
        ):
            if page_start and page_start > 0:
                self.write(
                    "<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>"
                    % (per_page_link, previous_page_start)
                )
            if (
                per_page
                and self.return_name in self._output
                and isinstance(self._output[self.return_name], list)
                and len(self._output[self.return_name]) >= per_page
            ):
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )
            elif not self.return_name in self._output:
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )
        self.write(self.render_string("basic_footer.html"))

    def header_special(self):
        pass

    def row_special(self, row):
        pass

    def sort_keys(self, keys):
        new_keys = []
        for key in ["rating_user", "fave", "title", "album_rating_user", "album_name"]:
            if key in keys:
                new_keys.append(key)
        new_keys.extend(key for key in keys if key not in new_keys)
        return new_keys

    # pylint: disable=E1003
    # no JSON output!!
    def finish(self, *args, **kwargs):
        super(APIHandler, self).finish(*args, **kwargs)

    # pylint: enable=E1003

    # see initialize, this will override the JSON POST function
    def post_reject(self):
        return None
