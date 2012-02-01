import pylibmc

#TODO: Instantiate module-wide memcache connection
cache = None

class RainwaveCache:
	def __init__(self):
		#TODO: Lots of stuff in here I'm sure
		self.memcache = pylibmc.Client(["127.0.0.1"], binary = True)
		self.memcache.behaviors = { "tcp_nodelay": True }
		pass

	def set_user_var(user, *args):
		value = args.pop()
		key = "u%s_" % user.user_id
		key2 = '_'.join("_")
		self.memcache.set(key + key2, value)
		
	#TODO def @propery current_event