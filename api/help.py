import tornado.web
import api.web
from libs import config

help_classes: dict[
    str,
    api.web.RainwaveHandler | api.web.APIHandler,
] = {}
url_properties = (
    ("allow_get", "GET", "Allows HTTP GET requests in addition to POST requests."),
    (
        "allow_cors",
        "CORS",
        "Can be used cross-origin, i.e. from your website and domain name.",
    ),
    (
        "auth_required",
        "auth",
        "User ID and API Key required as part of form submission.",
    ),
    ("sid_required", "sid", "Station ID required as part of form submission."),
    ("tunein_required", "tunein", "User is required to be tuned in to use command."),
    (
        "login_required",
        "login",
        "User must be logged in to a registered account to use command.",
    ),
    ("dj_required", "dj", "User must be the active DJ for the station to use command."),
    ("admin_required", "admin", "User must be an administrator to use command."),
    (
        "pagination",
        "pagination",
        "Request can be paginated using 'per_page' and 'page_start' fields.",
    ),
)
section_order_normal = ("Core JSON", "Statistic HTML")
section_order = (
    "Core JSON",
    "Statistic HTML",
    "HTML Pages",
    "Admin JSON",
    "Admin HTML",
    "Other",
)
sections = {
    "Core JSON": {},
    "HTML Pages": {},
    "Statistic HTML": {},
    "Admin JSON": {},
    "Admin HTML": {},
    "Other": {},
}


def sectionize_requests():
    for url, handler in help_classes.items():
        if getattr(handler, "help_hidden"):
            pass
        elif getattr(handler, "local_only"):
            if config.get("developer_mode"):
                sections["Other"][url] = handler
        elif getattr(handler, "is_pretty_print_html"):
            if handler.admin_required or handler.dj_required or handler.dj_preparation:
                sections["Admin HTML"][url] = handler
            else:
                sections["Statistic HTML"][url] = handler
        elif getattr(handler, "is_html"):
            if handler.admin_required or handler.dj_required or handler.dj_preparation:
                sections["Admin HTML"][url] = handler
            else:
                sections["HTML Pages"][url] = handler
        elif isinstance(handler, api.web.APIHandler):
            if handler.admin_required or handler.dj_required or handler.dj_preparation:
                sections["Admin JSON"][url] = handler
            else:
                sections["Core JSON"][url] = handler
        else:
            sections["Other"][url] = handler


def add_help_class(cls, url):
    help_classes[url] = cls


class IndexRequest(api.web.HTMLRequest):
    auth_required = False
    login_required = False
    sid_required = False
    return_name = "help"

    def write_property(self, name, handler, to_print):
        if getattr(handler, name, False):
            self.write("<td class='%s requirement'>%s</td>" % (name, to_print))
        else:
            self.write("<td class='requirement'>&nbsp;</td>")

    def write_class_properties(self, url, handler):
        self.write("<tr>")
        for prop in url_properties:
            if prop[0] == "auth_required" and getattr(handler, "phpbb_auth", False):
                self.write("<td class='auth requirement'>phpBB</td>")
            elif prop[0] == "auth_required" and getattr(
                handler, "auth_required", False
            ):
                self.write("<td class='auth requirement'>API key</td>")
            elif (
                prop[0] == "dj_required"
                and not getattr(handler, "admin_required", False)
                and (
                    getattr(handler, "dj_required", False)
                    or getattr(handler, "dj_preparation", False)
                )
            ):
                self.write("<td class='dj requirement'>dj</td>")
            else:
                self.write_property(prop[0], handler, prop[1])
        display_url = url
        self.write("<td><a href='/api4/help%s'>%s</a></td>" % (url, display_url))
        if getattr(handler, "is_html") and url.find("(") == -1:
            self.write("<td><a href='%s'>Link</a></td>" % url)
        else:
            self.write("<td>&nbsp;</td>")
        self.write("</tr>")

    def get(self):
        self.write(
            self.render_string(
                "basic_header.html", request=self, title="Rainwave API Documentation"
            )
        )

        self.write("<h2>Requests</h2>")
        self.write("<table class='help_legend'>")
        order = (
            section_order
            if self.user and self.user.is_admin()
            else section_order_normal
        )
        for section in order:
            self.write("<tr><th colspan='11'>%s</th></tr>" % section)
            self.write(
                "<tr><th>Allows GET</th><th>Allow CORS</th><th>Auth Required</th><th>Station ID Required</th><th>Tune In Required</th><th>Login Required</th><th>DJ</th><th>Admin</th><th>Pagination</th><th>URL</th><th>Link</th></tr>"
            )
            for url, handler in sorted(sections[section].items()):
                self.write_class_properties(url, handler)
        self.write("</table>")
        self.write("<h2>Making an API Request</h2>")
        self.write(
            """
<p>Get the currently playing/election data for Covers/station ID 3 for an anonymous user or external website:</p>
<pre>xhr = new XMLHttpRequest();
xhr.open("POST", "https://rainwave.cc/api4/info", true);
xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
xhr.onload = function() { console.log(xhr.response) };
xhr.send("sid=3");</pre>
<p>Get currently playing/election data for Game/station ID 1 for a user with ID 2:</p>
<pre>xhr.open("POST", "https://rainwave.cc/api4/info", true);
xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
xhr.send("sid=1&user=2&key=AUTHKEYFROMUSER");</pre>
<p>Vote on a song on All/station ID 5:</p>
<pre>xhr.open("POST", "https://rainwave.cc/api4/vote", true);
xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
xhr.send("sid=5&user=2&key=AUTHKEYFROMUSER&entry_id=1");</pre>
<p>Grab album information for album ID 1 on OCR Remix/station ID 2:</p>
<pre>xhr.open("POST", "https://rainwave.cc/api4/album", true);
xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
xhr.send("sid=2&user=2&key=AUTHKEYFROMUSER&id=1");</pre>
<p>Get the 300th to 350th previously played song for Chiptune (using paginated requests):</p>
<pre>xhr.open("POST", "https://rainwave.cc/api4/playback_history", true);
xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
xhr.send("sid=4&user=2&key=AUTHKEYFROMUSER&id=1&per_page=50&page_start=6");</pre>
<p>Please experiment by making requests yourself and looking at the output.  Parameters and conditions are noted in the table above.</p>"""
        )
        self.write(
            "<ul><li>The Rainwave API endpoints are all: <b>https://rainwave.cc/api4/[URL]</b>, with URL corresponding to the table above.</li>"
        )
        self.write(
            "<li>All endpoints respond to POST.  Some allow GET requests as well, and are noted so in the table above. </li>"
        )
        self.write(
            "<li>Click the URL in the table above to get details on what the request does and what arguments it requires.</li>"
        )
        self.write(
            "<li>Authentication keys and user IDs are only visible to end users, they can see theirs at <a href='https://rainwave.cc/keys/'>https://rainwave.cc/keys/</a></li>"
        )
        self.write(
            "<li>If an API Key is required in the table above and the user is anonymous, you will not be able use that functionality.  API keys for anonymous users are only given to those using the rainwave.cc site and expire quickly.  Registered user's API keys do not expire.</li>"
        )
        self.write(
            "<li>Desired station for the request must be specified by 'sid' form data, using the corresponding Station ID below.</li>"
        )
        self.write(
            "<li>Rainwave's API is complete, and will not be changing.  New functionality will only be done via new commands.</li>"
        )
        self.write(
            "<li>There is a possibility that the API can crash and not return JSON.  Try/catch for safety.  Other errors (404/500) return JSON.</li>"
        )
        self.write("</ul>")
        self.write("<h2>Station ID For 'sid' Argument</h2>")
        self.write("<ul>")
        for sid in config.station_ids:
            self.write("<li>%s: %s</li>" % (sid, config.station_id_friendly[sid]))
        self.write("</ul>")
        self.write(self.render_string("basic_footer.html"))


class HelpRequest(tornado.web.RequestHandler):
    def get(self, url):
        url = "/" + url
        if not url in help_classes:
            self.send_error(404)
        try:
            cls = help_classes[url]
        except:
            self.send_error(404)
        self.write(
            self.render_string("basic_header.html", title="Rainwave API - %s" % url)
        )
        self.write("<p>%s</p>" % cls.description)
        self.write("<ul>")
        for prop in url_properties:
            if prop[0] == "auth_required" and getattr(cls, "phpbb_auth", False):
                self.write(
                    "<li>User must be requesting from Rainwave.cc and logged in to the Rainwave.cc forum system."
                )
            elif getattr(cls, prop[0], False):
                self.write("<li>" + prop[2] + "</li>")
        self.write("</ul>")

        self.write("<h2>Fields</h2>")
        self.write("<table><tr><th>Field Name</th><th>Type</th><th>Required</th></tr>")
        if getattr(cls, "auth_required", False):
            if getattr(cls, "admin_required", False):
                self.write(
                    "<tr><td>user_id</td><td>integer</td><td>Required, must be an administrator.</td></tr>"
                )
            elif getattr(cls, "login_required", False):
                self.write(
                    "<tr><td>user_id</td><td>integer</td><td>Required, registered users only. (user_id > 1)</td></tr>"
                )
            else:
                self.write(
                    "<tr><td>user_id</td><td>integer</td><td>Required, anonymous users OK. (user_id == 1).</td></tr>"
                )
            self.write("<tr><td>key</td><td>api_key</td><td>Required</td></tr>")
        else:
            self.write("<tr><td>user_id</td><td>integer</td><td>Optional</td></tr>")
            self.write("<tr><td>key</td><td>api_key</td><td>Optional</td></tr>")
        if getattr(cls, "sid_required", False):
            self.write("<tr><td>sid</td><td>integer</td><td>Required</td></tr>")
        if getattr(cls, "pagination", False) and not "per_page" in cls.fields:
            self.write(
                "<tr><td>per_page</td><td>integer</td><td>Optional, default 100</td></tr>"
            )
            self.write(
                "<tr><td>page_start</td><td>integer</td><td>Optional, default 0</td></tr>"
            )
        for field, field_attribs in cls.fields.items():
            type_cast, required = field_attribs
            self.write("<tr><td>%s</td><td>%s</td>" % (field, type_cast.__name__))
            if required:
                self.write("<td>Required</td>")
            else:
                self.write("<td>Not required.</td>")
            self.write("</tr>")
        self.write("</table>")

        self.write(self.render_string("basic_footer.html"))
