import os

if os.name != "nt":
    from pwd import getpwnam
    from grp import getgrnam

def change_user(user, group):
	if (user or group) and os.getuid() != 0:
		raise Exception("Must run as root to use user/group change config parameters. (current UID: %s)" % os.getuid())

	if group:
		group_id = getgrnam(group).gr_gid
		os.setgid(group_id)

	if user:
		user_id = getpwnam(user).pw_uid
		os.setuid(user_id)
