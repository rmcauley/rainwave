import os
from pwd import getpwnam
from grp import getgrnam

def change_user(user, group):
	if os.getuid() != 0:
		raise Exception("Must run as root.")

	user_id = getpwnam(user).pw_uid
	group_id = getgrnam(group).gr_gid
	os.setuid(user_id)
	# TODO: This causes problems for some reason - maybe it needs to be forked?
	# I get "Operation not permitted"
	# os.setgid(group_id)
