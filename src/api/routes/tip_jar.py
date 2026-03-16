from typing import Any

from psycopg import sql

from api import rainwave_typeddicts
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_html_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey

from api.helpers.paginated_requests import get_pagination_sql_limit_string
from common.db.cursor import get_cursor

class TipJarContents(APIHandler):
    description = "Returns a list of donations Rainwave has had."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "tip_jar"
    login_required = False
    pagination = True
    sid_required = False
    auth_required = False

    async def post(self):
        async with get_cursor() as cursor:
            self.response["tip_jar"] = await cursor.fetch_all(
                sql.SQL(
                    """
                    SELECT
                        donation_id AS id,
                        donation_amount AS amount,
                        donation_message AS message,
                        CASE WHEN donation_private IS TRUE THEN 'Anonymous' ELSE COALESCE(radio_username, username) END AS name
                    FROM r4_donations
                        LEFT JOIN phpbb_users USING (user_id)
                    ORDER BY donation_id DESC
                    """
                )
                + get_pagination_sql_limit_string(self),
                params=None,
                row_type=rainwave_typeddicts.TipJarItem,
            )

@handle_api_html_url("tip_jar")
class TipJarHTML(TipJarContents):
    pretty_print_html = True

    async def get(self):
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

        async with get_cursor() as cursor:
            all_donations = await cursor.fetch_guaranteed(
                "SELECT ROUND(SUM(donation_amount)) FROM r4_donations WHERE user_id != 2 AND donation_amount > 0",
                params=None,
                default=0.0,
                var_type=float,
            )
            balance = await cursor.fetch_guaranteed(
                "SELECT ROUND(SUM(donation_amount)) FROM r4_donations",
                params=None,
                default=0.0,
                var_type=float,
            )
        self.write(
            "<p>%s: %s</p>"
            % (self.locale.translate("tip_jar_all_donations"), all_donations)
        )

        self.write(
            "<p>%s: %s</p>" % (self.locale.translate("tip_jar_balance"), balance)
        )

        super().get(write_header=False)

    def sort_keys(self, _keys: Any):
        return ["name", "amount", "message"]
