from api.handler_classes.api_handler import APIHandler


class APIHandlerWithGet(APIHandler):
    content_type = "application/json"

    async def get(self) -> None:
        await self.post()
