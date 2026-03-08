from api.handle_url import handle_url
from api.routes.keys.keys_index import KeyIndex


@handle_url("/keys/create")
class KeyCreate(KeyIndex):
    def get(self):
        self.user.generate_api_key()
        super().get()
