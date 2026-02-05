from web_api.web import APIHandler
from web_api.web import PrettyPrintAPIMixin
from web_api.urls import handle_api_url
from web_api.urls import handle_api_html_url

from backend.libs import db


@handle_api_url("tip_jar")
class TipJarContents(APIHandler):
    description = "Returns a list of donations Rainwave has had."
    return_name = "tip_jar"
    allow_get = True
    login_required = False
    pagination = True
    sid_required = False
    auth_required = False

    def post(self):
        self.append(
            self.return_name,
            db.c.fetch_all(
                "SELECT donation_id AS id, donation_amount AS amount, donation_message AS message, "
                "CASE WHEN donation_private IS TRUE THEN 'Anonymous' ELSE COALESCE(radio_username, username) END AS name "
                "FROM r4_donations LEFT JOIN phpbb_users USING (user_id) "
                "ORDER BY donation_id DESC " + self.get_sql_limit_string()
            ),
        )


@handle_api_html_url("tip_jar")
class TipJarHTML(PrettyPrintAPIMixin, TipJarContents):
    login_required = False
    auth_required = False

    def get(self):  # pylint: disable=E0202
        self.write(
            self.render_string(
                "basic_header.html", title=self.locale.translate("tip_jar")
            )
        )
        self.write("<p>%s</p>" % self.locale.translate("tip_jar_opener"))
        self.write("<ul><li>%s</li>" % self.locale.translate("tip_jar_instruction_1"))
        self.write("<li>%s</li>" % self.locale.translate("tip_jar_instruction_2"))
        self.write("<li>%s</li></ul>" % self.locale.translate("tip_jar_instruction_3"))
        self.write("<p>%s</p>" % self.locale.translate("tip_jar_opener_end"))

        self.write(
            """
			<div>
				<a href='https://paypal.me/Rainwave/5USD'>Donate at https://paypal.me/Rainwave</a>
			</div>"""
        )

        all_donations = db.c.fetch_var(
            "SELECT ROUND(SUM(donation_amount)) FROM r4_donations WHERE user_id != 2 AND donation_amount > 0"
        )
        self.write(
            "<p>%s: %s</p>"
            % (self.locale.translate("tip_jar_all_donations"), all_donations)
        )

        balance = db.c.fetch_var("SELECT ROUND(SUM(donation_amount)) FROM r4_donations")
        self.write(
            "<p>%s: %s</p>" % (self.locale.translate("tip_jar_balance"), balance)
        )

        super().get(write_header=False)

    def sort_keys(self, keys):
        return ["name", "amount", "message"]
