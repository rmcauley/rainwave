from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from common.db.cursor import get_cursor
from api.rainwave_dto import Api4AdminAddDonationPostRequest
from api.rainwave_return_key_to_open_api import RainwaveResponseKey


@handle_api_url("admin/add_donation")
class AddDonationHandler(APIHandler):
    admin_required = True

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "add_donation_result"

    async def post(self):
        input = self.get_validated_input(Api4AdminAddDonationPostRequest)
        async with get_cursor() as cursor:
            await cursor.update(
                "INSERT INTO r4_donations (user_id, donation_amount, donation_message, donation_private) values (%s, %s, %s, %s)",
                (
                    input.donor_id,
                    input.amount,
                    input.message,
                    input.private,
                ),
            )
        self.response["add_donation_result"] = {
            "success": True,
            "text": "Donation added.",
            "tl_key": "success",
        }
