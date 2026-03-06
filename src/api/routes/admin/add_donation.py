from common.libs import db
import api.web
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from api import fieldtypes
from common.db.cursor import get_cursor


@handle_api_url("admin/add_donation")
class AddDonationHandler(APIHandler):
    admin_required = True
    fields = {
        "donor_id": (fieldtypes.user_id, True),
        "amount": (fieldtypes.integer, True),
        "message": (fieldtypes.string, True),
        "private": (fieldtypes.boolean, True),
    }

    async def post(self):
        async with get_cursor() as cursor:
            if await cursor.update(
                "INSERT INTO r4_donations (user_id, donation_amount, donation_message, donation_private) values (%s, %s, %s, %s)",
                (
                    input["donor_id"),
                    input["amount"),
                    input["message"),
                    input["private"),
                ),
            ):
                self.append_standard("donation_added", "Donation added.")
            else:
                raise APIException("donation_failed")
            self.write_rainwave_output()
