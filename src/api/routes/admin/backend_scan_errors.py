from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from scanner.scan_errors import get_music_scan_errors

@handle_api_url("admin/music_scan_errors")
class BackendScanErrors(APIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_music_scan_errors"
    admin_required = True
    sid_required = False
    description = "A list of errors that have occurred while scanning music."

    async def post(self):
        self.response["admin_music_scan_errors"] = await get_music_scan_errors()
