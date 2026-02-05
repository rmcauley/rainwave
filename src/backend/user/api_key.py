def check_is_valid_api_key():
    if not bypass and (api_key and not re.match(r"^[\w\d]+$", api_key)):
        print("bad api key")
        return
