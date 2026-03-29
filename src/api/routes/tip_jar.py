from typing import TypedDict

from api.handler_classes.html_handler import HtmlHandler

from api.handle_url import handle_api_html_url

from common.db.cursor import get_cursor


class TipJarAllDonationsRow(TypedDict):
    all_donations: float | None


class TipJarBalanceRow(TypedDict):
    balance: float | None


class TipJarDonationRow(TypedDict):
    id: int
    amount: float
    message: str | None
    name: str


@handle_api_html_url("tip_jar")
class TipJarHTML(HtmlHandler):
    sid_required = False
    auth_required = False

    async def get(self) -> None:
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
            </div>
            """
        )

        async with get_cursor() as cursor:
            summary = await cursor.fetch_row(
                "SELECT ROUND(SUM(donation_amount)) AS all_donations FROM r4_donations WHERE user_id != 2 AND donation_amount > 0",
                row_type=TipJarAllDonationsRow,
            )
            balance_summary = await cursor.fetch_row(
                "SELECT ROUND(SUM(donation_amount)) AS balance FROM r4_donations",
                row_type=TipJarBalanceRow,
            )
            donations = await cursor.fetch_all(
                """
                SELECT
                    donation_id AS id,
                    donation_amount AS amount,
                    donation_message AS message,
                    CASE WHEN donation_private IS TRUE THEN 'Anonymous' ELSE COALESCE(radio_username, username) END AS name
                FROM r4_donations
                    LEFT JOIN phpbb_users USING (user_id)
                ORDER BY donation_id DESC
                """,
                params=None,
                row_type=TipJarDonationRow,
            )
        all_donations = summary["all_donations"] if summary else 0.0
        balance = balance_summary["balance"] if balance_summary else 0.0

        self.write(
            "<p>%s: %s</p>"
            % (self.locale.translate("tip_jar_all_donations"), all_donations)
        )
        self.write(
            "<p>%s: %s</p>" % (self.locale.translate("tip_jar_balance"), balance)
        )

        self.write("<table class='tip_jar'><tr>")
        self.write("<th>%s</th>" % self.locale.translate("name"))
        self.write("<th>%s</th>" % self.locale.translate("amount"))
        self.write("<th>%s</th>" % self.locale.translate("message"))
        self.write("</tr>")
        for donation in donations:
            self.write("<tr>")
            self.write("<td>%s</td>" % donation["name"])
            self.write("<td>%s</td>" % donation["amount"])
            self.write("<td>%s</td>" % donation["message"])
            self.write("</tr>")
        self.write("</table>")
        self.write(self.render_string("basic_footer.html"))
