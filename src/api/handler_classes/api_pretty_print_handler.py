from typing import Any, cast

from api import fieldtypes
from api.handler_classes.api_handler_with_get import APIHandlerWithGet
from api.helpers.paginated_requests import get_pagination_params
from urllib.parse import urlencode

from common import config


class PrettyPrintAPIHandler(APIHandlerWithGet):
    def write_rainwave_output(self) -> None:
        self.write(
            self.render_string(
                "basic_header.html", title=self.locale.translate(self.return_name)
            )
        )

        (per_page, page_start) = get_pagination_params(self)
        previous_page_link: str | None = None
        next_page_link: str | None = None
        previous_page_start = None
        next_page_start = None
        if self.pagination:
            if fieldtypes.integer(self.get_argument("page_start")):
                previous_page_start = min(page_start - per_page, 0)
                next_page_start = page_start + per_page
            else:
                next_page_start = per_page

            base_args: dict[str, str | int] = {
                key: self.get_argument(key)
                for key in self.request.arguments
                if key != "page_start"
            }
            base_args["per_page"] = per_page
            next_page_link_url = "?%s" % urlencode(
                {**base_args, "page_start": next_page_start}
            )
            previous_page_link_url: str | None = None
            if page_start > 0:
                previous_page_link_url = "?%s" % urlencode(
                    {**base_args, "page_start": previous_page_start}
                )

            if page_start > 0:
                previous_page_link = (
                    "<div><a href='%s'>&lt;&lt; Previous Page</a></div>"
                    % previous_page_link_url
                )
                self.write(previous_page_link)

            return_name_response = self.response.get(self.return_name, None)
            if (
                return_name_response
                and isinstance(return_name_response, list)
                and len(cast(list[Any], return_name_response)) >= per_page
            ):
                next_page_link = (
                    "<div><a href='%s'>Next Page &gt;&gt;</a></div>"
                    % next_page_link_url
                )
                self.write(next_page_link)
            elif not self.return_name in self.response:
                next_page_link = (
                    "<div><a href='%s'>Next Page &gt;&gt;</a></div>"
                    % next_page_link_url
                )
                self.write(next_page_link)

        for response_key, response_value in self.response.items():
            if not isinstance(response_value, list):
                continue
            response_value = cast(list[dict[str, Any]], response_value)
            if len(response_value) > 0:
                self.write("<table class='%s'><th>#</th>" % response_key)
                keys = getattr(
                    self, "columns", self.sort_keys(list(response_value[0].keys()))
                )
                for key in keys:
                    self.write("<th>%s</th>" % self.locale.translate(key))
                self.header_special()
                self.write("</th>")
                i = 1
                if "page_start" in self.request.arguments:
                    i += page_start
                for row in response_value:
                    self.write("<tr><td>%s</td>" % i)
                    for key in keys:
                        if key == "sid":
                            self.write(
                                "<td>%s</td>" % config.stations[row[key]]["name"]
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
            if previous_page_link:
                self.write(previous_page_link)
            if next_page_link:
                self.write(next_page_link)

        self.write(self.render_string("basic_footer.html"))

    def header_special(self) -> None:
        pass

    def row_special(self, row: dict[str, Any]) -> None:
        pass

    def sort_keys(self, keys: list[str]) -> list[str]:
        new_keys: list[str] = []
        for key in ["rating_user", "fave", "title", "album_rating_user", "album_name"]:
            if key in keys:
                new_keys.append(key)
        new_keys.extend(key for key in keys if key not in new_keys)
        return new_keys
