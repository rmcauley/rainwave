import os
from pwd import getpwnam
from grp import getgrpnam

def change_user(user, group):
	user_id = getpwnam(user).pw_uid
	group_id = grp.getgrnam(group).gr_gid
	os.setuid(user_id)
	os.setgid(group_id)