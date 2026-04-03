from lxml.html import HtmlElement


class RainwaveTemplateNodeParseFailure(Exception):
    def __init__(self, node: HtmlElement, message: str):
        super().__init__(f"{node.getroottree().getpath(node)}\n\n{message}")
