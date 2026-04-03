from qrcode import QRCodeImage

class SvgPathImage(QRCodeImage):
    def to_string(self) -> str: ...
