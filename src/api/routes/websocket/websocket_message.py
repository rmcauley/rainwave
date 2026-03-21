from typing import Any


class RainwaveWebsocketMessage(dict[str, Any]):
    def __lt__(self, other: RainwaveWebsocketMessage):
        if self["action"] == "request" and other["action"] != "request":
            return False
        return True

    def __gt__(self, other: RainwaveWebsocketMessage):
        if self["action"] == "request" and other["action"] != "request":
            return True
        return False

    def __eq__(self, other: object):
        if isinstance(other, self.__class__):
            if self["action"] == "request" and other["action"] == "request":
                return True
        return False

    def __le__(self, other: RainwaveWebsocketMessage):
        return self.__lt__(other) or self.__eq__(other)

    def __ge__(self, other: RainwaveWebsocketMessage):
        return self.__gt__(other) or self.__eq__(other)

    def __ne__(self, other: object):
        return not self.__eq__(other)
