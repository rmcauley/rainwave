from rainwave.rwmp3 import RWMP3

def get_shortest_song():
	"""
	This function gets the shortest available song to us from the database.
	"""
	
def get_average_song_length():
	"""
	Calculates the average song length of available songs in the database.
	"""
	
def prepare_cooldown_algorithm():
	"""
	Prepares pre-calculated variables that relate to calculating cooldown.
	Should pull all variables fresh from the DB, for algorithm
	refer to jfinalfunk.
	"""
	
def get_random_song():
	"""
	Fetch a random song, abiding by all election block, request block, and
	availability rules.  Falls back to get_random_ignore_requests on failure.
	"""
	
def get_random_song_timed(target_seconds):
	"""
	Fetch a random song abiding by all election block, request block, and
	availability rules, but giving priority to the target song length 
	provided.  Falls back to get_random_ignore_requests on failure.
	"""
	
def get_random_song_ignore_requests():
	"""
	Fetch a random song abiding by election block and availability rules,
	but ignoring request blocking rules.
	"""
	
def get_random_song_ignore_all():
	"""
	Fetches the most stale song (longest time since it's been played) in the db,
	ignoring all availability and election block rules.
	"""
	
def warm_cooled_songs():
	"""
	Makes songs whose cooldowns have expired available again.
	"""

class Song(RWMP3):
	def __init__(self):
		"""
		Initialize a blank Song object.
		"""
	
		super(RWMP3, self).__init__()
		self.song_id = None
		self.artists = None
		self.album = None
		self.groups = None
	
	def _load_tag_from_file(self, filename):
		"""
		Load information from the MP3 file and fill artist, album, and song groups.
		"""
	
		super(RWMP3, self)._load_tag_from_file(filename)
		self._refresh_associated()

	def _refresh_associated(self):
		"""
		Load artists, albums, and groups.
		"""
	
		self.artists = Artist.load_list_from_tag(self.artist_tag)
		self.album = Album.load_from_name(self.album_tag)
		self.groups = SongGroup.load_list_from_tag(self.genre_tag)
		
	def update_from_tag(self):
		"""
		Destroys associated objects, re-reads the tags, and saves the file to the database.
		"""
		
		album.disassociate(self.song_id)
		for artist in self.artists:
			artist.disassociate_song(self.song_id)
		for group in self.groups:
			if group.is_from_tag():
				group.diassociate_song(self.song_id)
		
		super(RWMP3, self)._load_tag_from_file(filename)
		self._refresh_associated()
		self.save()
		
	def save(self, sid_override):
		"""
		Save song to the database.
		"""
		
		pass
		
	def start_cooldown():
		"""
		Calculates cooldown based on jfinalfunk's crazy algorithms.
		Cooldown may be overriden by song_cool_* rules found in database.
		"""
	
	def update_rating():
		"""
		Calculate an updated rating from the database.
		"""
		
# ################################################################### ALBUM

class Album:
	def __init__(self):
		pass
		
	@classmethod
	def load_from_name(klass, name):
		"""
		Loads (or creates, if it doesn't exist) an album from name.
		"""
		# Save if not present in database
		pass
		
	@classmethod
	def check_from_name(klass, name):
		"""
		Checks to see if an album exists in the database, by name.
		"""
		pass
		
	@classmethod
	def load_from_id(klass, id):
		"""
		Loads in album data (no songs) through the database.
		"""
		pass

	def start_election_block(self, num_elections):
		"""
		Sets all songs belonging to this album on the album's sid
		to be off num_elections.
		"""
		pass
	
	def verify(self):
		"""
		Checks to see if there are any valid songs in this album
		for the given sid.  Updates the database on any change.
		"""
		pass
		
	def start_cooldown(self):
		"""
		Sets cooldown times on all songs belonging to this album
		on this album's sid.
		"""
		pass
		
	def update_rating(self):
		"""
		Recalculate rating on this album.
		"""
		pass
	
	def update_request_conflicts(self):
		"""
		Sees if there are any requests pending for this album
		and update DB var and self.var accordingly.
		"""
		pass
		
	def disassociate_song(self, song):
		"""
		Removes the given song from the album.
		"""
		pass
		
# ################################################################# SONG GROUP

class SongGroupInsertionError(Exception):
	pass

class SongGroupUpdateError(Exception):
	pass

class SongGroupNotNamedError(Exception):
	pass

class SongGroupNotFoundError(Exception):
	pass

class SongGroup:
	def __init__(self):
		self.id = None
		self.name = None

	def _assign_from_dict(self, d):
		self.id = d["id"]
		self.name = d["name"]
		self.from_tag = d["is_tag"]
		
	def save(self):
		if not self.id and self.name:
			if db.c.update("INSERT INTO rw_artists (artist_name) VALUES (%s)", (self.name,)):
				self._assign_from_dict(db.c.fetch_row("SELECT * FROM rw_artists WHERE artist_name = %s", (self.name,)))
			else:
				raise ArtistInsertionError
		elif self.id:
			if not db.c.update("UPDATE rw_artists SET artist_name = %s WHERE artist_id = %s", (self.name, self.id)):
				raise ArtistUpdateError
		else:
			raise ArtistNotNamedError
		
	@classmethod
	def load_from_name(klass, name):
		instance = klass()
		artist = db.c.fetch_row("SELECT rw_artists.* FROM rw_artists WHERE artist_name = %s", (name,))
		if artist:
			instance._assign_from_dict(artist)
		else:
			instance.name = name
			instance.save()
		return instance
		
	@classmethod
	def load_from_id(klass, id):
		instance = klass()
		artist = db.c.fetch_row("SELECT rw_artists.* FROM rw_artists WHERE artist_id = %s", (id,))
		if not artist:
			raise ArtistNotFoundError
		instance._assign_from_dict(artist)
		return instance
		
	@classmethod
	def load_list_from_tag(klass, tag):
		instances = []
		for fragment in tag.split(","):
			instances.append(klass.load_from_name(fragment.strip()))
		return instances
		
	def start_election_block(self, num_elections):
		"""
		Set songs that belong go this group to be blocked from elections.
		"""
		
	def is_from_Tag
		
	# songgroup.set_election_blocks
# songgroup.is_from_tag
# songgroup.disassociate_song
		
# ################################################################### ARTIST

class ArtistInsertionError(Exception):
	pass
	
class ArtistUpdateError(Exception):
	pass
	
class ArtistNotNamedError(Exception):
	pass
	
class ArtistNotFoundError(Exception):
	pass

class Artist:
	def __init__(self):
		self.id = None
		self.name = None
		
	def _assign_from_dict(self, d):
		self.id = d["id"]
		self.name = d["name"]
		
	def save(self):
		if not self.id and self.name:
			if db.c.update("INSERT INTO rw_artists (artist_name) VALUES (%s)", (self.name,)):
				self._assign_from_dict(db.c.fetch_row("SELECT * FROM rw_artists WHERE artist_name = %s", (self.name,)))
			else:
				raise ArtistInsertionError
		elif self.id:
			if not db.c.update("UPDATE rw_artists SET artist_name = %s WHERE artist_id = %s", (self.name, self.id)):
				raise ArtistUpdateError
		else:
			raise ArtistNotNamedError
		
	@classmethod
	def load_from_name(klass, name):
		instance = klass()
		artist = db.c.fetch_row("SELECT rw_artists.* FROM rw_artists WHERE artist_name = %s", (name,))
		if artist:
			instance._assign_from_dict(artist)
		else:
			instance.name = name
			instance.save()
		return instance
		
	@classmethod
	def load_from_id(klass, id):
		instance = klass()
		artist = db.c.fetch_row("SELECT rw_artists.* FROM rw_artists WHERE artist_id = %s", (id,))
		if not artist:
			raise ArtistNotFoundError
		instance._assign_from_dict(artist)
		return instance
		
	@classmethod
	def load_list_from_tag(klass, tag):
		instances = []
		for fragment in tag.split(","):
			instances.append(klass.load_from_name(fragment.strip()))
		return instances