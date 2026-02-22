# this mixin will overwrite anything in APIHandler and RainwaveHandler so be careful wielding it
class PrettyPrintAPIMixin:
    phpbb_auth = True
    allow_get = True
    write_error = html_write_error
    is_html = True
    is_pretty_print_html = True

    # Vars here be filled by the base class, not the mixin
    _output: dict[Any, Any] | list[Any]
    write: Callable
    render_string: Callable
    locale: locale.RainwaveLocale
    return_name: str
    pagination: bool
    fields: dict
    get_argument_int: Callable
    url: str
    get_argument: Callable
    request: tornado.httputil.HTTPServerRequest

    # reset the initialize to ignore overwriting self.get with anything
    def initialize(self, *args: Any, **kwargs: Any) -> None:
        super().initialize(*args, **kwargs)  # type: ignore
        self._real_post = self.post
        self.post = self.post_reject

    def prepare(self) -> None:
        super().prepare()  # type: ignore
        self._real_post()

    def get(self, write_header: bool = True) -> None:
        if not isinstance(self._output, dict):
            raise APIException(
                "invalid_argument",
                "Pretty-printed output of in_order requests is not supported",
                code=400,
            )

        if write_header:
            self.write(
                self.render_string(
                    "basic_header.html", title=self.locale.translate(self.return_name)
                )
            )

        page_start = self.get_argument("page_start")
        per_page = self.get_argument("per_page")
        per_page_link = None
        previous_page_start = None
        next_page_start = None
        if self.pagination:
            if self.get_argument_int("page_start"):
                previous_page_start = min(page_start - per_page, 0)
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

            if page_start > 0:
                self.write(
                    "<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>"
                    % (per_page_link, previous_page_start)
                )
            if (
                self.return_name in self._output
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
                if "page_start" in self.request.arguments:
                    i += self.get_argument("page_start")
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

        if self.pagination:
            if page_start > 0:
                self.write(
                    "<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>"
                    % (per_page_link, previous_page_start)
                )
            if (
                self.return_name in self._output
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

    def header_special(self) -> None:
        pass

    def row_special(self, row: dict[str, Any]) -> None:
        pass

    def sort_keys(self, keys: list[str] | Any) -> list[str]:
        new_keys = []
        for key in ["rating_user", "fave", "title", "album_rating_user", "album_name"]:
            if key in keys:
                new_keys.append(key)
        new_keys.extend(key for key in keys if key not in new_keys)
        return new_keys

    # pylint: disable=E1003
    # no JSON output!!
    def finish(self, *args, **kwargs):
        super().finish(*args, **kwargs)  # type: ignore

    # pylint: enable=E1003

    # see initialize, this will override the JSON POST function
    def post_reject(self):
        return None
