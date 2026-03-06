from api.handler_classes.api_handler_with_get import APIHandlerWithGet


@handle_api_url("info_all")
class InfoAllRequest(APIHandlerWithGet):
    auth_required = False
    description = "Returns a basic dict containing rudimentary information on what is currently playing on all stations."
    allow_cors = True

    def post(self):
        self.append("all_stations_info", cache.get("all_stations_info"))
