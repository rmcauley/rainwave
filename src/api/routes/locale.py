import orjson as json

import tornado.web

from api.handle_url import handle_url
from api.handler_classes.html_handler import HtmlHandler
from common.locale.locale import translations
from common.locale.locale_explanation import locale_explanation


@handle_url("/locale/")
class LocaleIndex(HtmlHandler):
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
        self.write(locale_explanation)
        self.write("</p><hr>")

        self.write(
            "<p>Translating a new language?  Start with the <a href='https://github.com/rmcauley/rainwave/blob/master/lang/en_MASTER.json'>Github Translation File Template</a>.</p>"
        )

        self.write(
            "<hr><p>The following languages exist, but may have missing lines: <ul>"
        )
        for k, v in translations.items():
            if k != "en_CA":
                self.write(
                    "<li><a href='/locale/%s'>%s</a> - %s missing lines</a>"
                    % (k, k, len(v.missing.keys()))
                )
        self.write("</li>")
        self.write(self.render_string("basic_footer.html"))


@handle_url(r"/locale/(\w+)")
class LocaleMissingLines(HtmlHandler):
    description = "Lists all the missing lines in a locale/translation file."
    auth_required = False
    sid_required = False

    def get(self, request_locale: str):
        if not request_locale in translations:
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
                translations[request_locale].missing,
                option=json.OPT_SORT_KEYS | json.OPT_INDENT_2,
            ).decode()
        )
        self.write("</div>")
        self.write(self.render_string("basic_footer.html"))
