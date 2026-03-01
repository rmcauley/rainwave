def should_ignore_file(filename: str) -> bool:
    if filename.split(".")[-1].lower() in (".tmp", ".filepart"):
        return True
    return False
