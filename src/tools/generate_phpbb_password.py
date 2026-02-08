import bcrypt
from api.routes.auth.login import phpbb_passwd_compare

pw = input("Password: ")
h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt())
h = "$2y$" + h[4:].decode()

if not phpbb_passwd_compare(pw, h):
    raise RuntimeError("Password/hash mismatch.")

print(h)
print()
