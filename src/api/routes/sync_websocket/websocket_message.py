class WSMessage(dict):
    def __lt__(self, other):
        if self["action"] == "request" and other["action"] != "request":
            return False
        return True

    def __gt__(self, other):
        if self["action"] == "request" and other["action"] != "request":
            return True
        return False

    def __eq__(self, other):
        if self["action"] == "request" and other["action"] == "request":
            return True
        return False

    def __le__(self, other):
        return self.__lt__(other) or self.__eq__(other)

    def __ge__(self, other):
        return self.__gt__(other) or self.__eq__(other)

    def __ne__(self, other):
        return not self.__eq__(other)
