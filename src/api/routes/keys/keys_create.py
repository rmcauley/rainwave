import api.web
from api.handle_url import handle_url
from api import fieldtypes

from common.libs import db


@handle_url("/keys/create")
class KeyCreate(KeyIndex):
    def get(self):
        self.user.generate_api_key()
        super().get()
