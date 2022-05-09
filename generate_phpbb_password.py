import bcrypt

pw = input("Password: ")

print(bcrypt.hashpw(pw.encode(), bcrypt.gensalt()))
print()
