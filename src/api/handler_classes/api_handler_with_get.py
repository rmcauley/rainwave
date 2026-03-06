from api.handler_classes.api_handler import APIHandler


class APIHandlerWithGet(APIHandler):
    async def get(self) -> None:
        await self.post()
