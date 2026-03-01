class NonFatalScannerError(Exception):
    pass


class AlbumArtNoAlbumFoundError(NonFatalScannerError):
    pass


class NewDirectoryException(Exception):
    pass


class DeletedDirectoryException(Exception):
    pass
