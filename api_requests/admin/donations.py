from libs import db
import api.web
from api.server import handle_api_url
from api.exceptions import APIException
from api import fieldtypes

@handle_api_url("admin/add_donation")
class AddDonationHandler(api.web.APIHandler):
	admin_required = True
	fields = { "donor_id": (fieldtypes.user_id, True),
				"amount": (fieldtypes.integer, True),
				"message": (fieldtypes.string, True),
				"private": (fieldtypes.boolean, True) }

	def post(self):
		if db.c.update("INSERT INTO r4_donations (user_id, donation_amount, donation_message, donation_private) values (%s, %s, %s, %s)",
			(self.get_argument("donor_id"), self.get_argument("amount"), self.get_argument("message"), self.get_argument("private"))):
			self.append_standard("donation_added", "Donation added.")
		else:
			raise APIException("donation_failed")
