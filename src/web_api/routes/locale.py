import json  # We have some features of stdlib JSON we need here, don't use ujson

import tornado.web

import web_api.web
from web_api.urls import handle_url
from src.backend.libs import locale


@handle_url("/locale/")
class LocaleIndex(web_api.web.HTMLRequest):
    description = "Lists the currently available Rainwave locales/translations and how many lines are missing in them, as compared to the English master locale."
    auth_required = False
    sid_required = False

    def get(self):
        self.write(
            self.render_string(
                "basic_header.html", title="Locale/Translation Information"
            )
        )
        self.write("<p style='white-space: pre;'>")
        self.write(locale.locale_explanation)
        self.write("</p><hr>")

        self.write(
            "<p>Translating a new language?  Start with the <a href='https://github.com/rmcauley/rainwave/blob/master/lang/en_MASTER.json'>Github Translation File Template</a>.</p>"
        )

        self.write(
            "<hr><p>The following languages exist, but may have missing lines: <ul>"
        )
        for k, v in locale.translations.items():
            if k != "en_CA":
                self.write(
                    "<li><a href='/locale/%s'>%s</a> - %s missing lines</a>"
                    % (k, k, len(v.missing.keys()))
                )
        self.write("</li>")
        self.write(self.render_string("basic_footer.html"))


@handle_url(r"/locale/(\w+)")
class LocaleMissingLines(web_api.web.HTMLRequest):
    description = "Lists all the missing lines in a locale/translation file."
    auth_required = False
    sid_required = False

    def get(self, request_locale):
        if not request_locale in locale.translations:
            raise tornado.web.HTTPError(404)

        self.write(
            self.render_string(
                "basic_header.html", title="%s Missing Lines" % request_locale
            )
        )
        self.write(
            "<p><a href='https://github.com/rmcauley/rainwave/blob/master/lang/%s.json'>GitHub JSON File</a></p>"
            % request_locale
        )
        self.write("<p>The following lines are missing from this translation:</p>")

        self.write("<div class='json'>")
        self.write(
            json.dumps(
                locale.translations[request_locale].missing,
                sort_keys=True,
                indent=4,
                separators=(",", ": "),
            )
        )
        self.write("</div>")
        self.write(self.render_string("basic_footer.html"))
