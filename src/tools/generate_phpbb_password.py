import bcrypt
from api.routes.auth.login import phpbb_passwd_compare

pw = input("Password: ")
hashed_bytes = bcrypt.hashpw(pw.encode(), bcrypt.gensalt())
phpbb_hash = "$2y$" + hashed_bytes[4:].decode()

if not phpbb_passwd_compare(pw, phpbb_hash):
    raise RuntimeError("Password/hash mismatch.")

print()
print(phpbb_hash)
print()
