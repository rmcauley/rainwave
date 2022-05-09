import bcrypt

pw = input("Password: ")
h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt())
h = '$2y$' + h[4:].decode()

print(h)
print()
