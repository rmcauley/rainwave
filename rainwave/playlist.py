from mutagen.mp3 import MP3
import os

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
	
class SongHasNoSIDsException(Exception):
	pass

class SongNonExistent(Exception):
	pass
	
class Song(Object):
	@classmethod
	def load_from_id(klass, id, sid = False):
		d = None
		if not sid:
			d = db.c.fetch_row("SELECT * FROM r4_songs WHERE song_id = %s", (id,))
		else:
			d = db.c.fetch_row("SELECT * FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE r4_songs.song_id = %s AND r4_song_sid.sid = %s", (id, sid))
		if not d:
			raise SongNonExistent
		
		s = klass()
		klass.id = id
		klass.sids = db.c.fetch_list_from_query("SELECT sid FROM r4_song_sid WHERE song_id = %s", (id,))
		klass.filename = d['song_filename']
		klass.verified = d['song_verified']
		klass.title = d['song_title']
		klass.link = d['song_link']
		klass.link_text = d['song_link_text']
		klass.length = d['song_length']
		klass.added_on = d['song_added_on']
		klass.rating = d['song_rating']
		klass.rating_count = d['song_rating_count']
		klass.cool_multiply = d['song_cool_multiply']
		klass.origin_sid = d['song_origin_sid']
		
		if sid:
			klass.cool = d['song_cool']
			klass.cool_end = d['song_cool_end']
			klass.elec_appearances = d['song_elec_appearances']
			klass.elec_last = d['song_elec_last']
			klass.elec_blocked = d['song_elec_blocked']
			klass.elec_blocked_num = d['song_elec_blocked_num']
			klass.elec_blocked_by = d['song_elec_blocked_by']
			klass.vote_share = d['song_vote_share']
			klass.vote_total = d['song_vote_total']
			klass.request_total = d['song_request_total']
			klass.played_last = d['song_played_last']

		klass.artists = Artist.load_list_from_song_id(id)
		klass.groups = SongGroup.load_list_from_song_id(id)
		klass.album = Album.load_from_id(d['album_id'])
			
	@classmethod
	def load_from_file(klass, filename, sids):
		"""
		Produces an instance of the Song class with all album, group, and artist IDs loaded.
		"""
		
		s = klass()
		s._load_tag_from_file(filename)
		s._refresh_associated()
		s.save(sids)
		return s

	def __init__(self):
		"""
		A blank Song object.  Please use one of the load functions to get a filled instance.
		"""
		self.id = None
		
	def _load_tag_from_file(self, filename):
		"""
		Reads ID3 tags and sets object-level variables.
		"""
		
		f = MP3(filename)
		self.filename = filename
		keys = f.keys()
		if "TIT2" in keys:
			self.title = f["TIT2"][0]
		if "TPE1" in keys:
			self.artist_tag = f["TPE1"][0]
		if "TRCK" in keys:
			self.track = f["TRCK"][0]
		if "TALB" in keys:
			self.album_tag = f["TALB"][0]
		if "TCON" in keys:
			self.genre_tag = f["TCON"][0]
		if "COMM" in keys:
			self.link_text = f["COMM"][0]
		if "TDRC" in keys:
			self.year = f["TDRC"][0]
		if "WXXX" in keys:
			self.link = f["WXXX"][0]
		self.length = int(f.info.length)

	def is_valid(self):
		"""
		Lets callee know if this MP3 is valid or not.
		"""
		
		if os.path.exists(self.filename):
			return True
		else:
			return False
	
		super(RWMP3, self).__init__()
		self.id = None
		self.sids = []
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
		self.album = Album.load_from_title(self.album_tag)
		self.groups = SongGroup.load_list_from_tag(self.genre_tag)
		
	def is_valid(self):
		"""
		Lets callee know if this MP3 is valid or not.
		"""
		
		if os.path.exists(self.filename):
			return True
		else:
			return False
		
	def update_from_tag(self):
		"""
		Destroys associated objects, re-reads the tags, and saves the file to the database.
		"""
		
		self.album.disassociate(self.id)
		for artist in self.artists:
			artist.disassociate_song(self.id)
		for group in self.groups:
			if group.is_from_tag(self.id):
				group.diassociate_song(self.id)
		
		super(RWMP3, self)._load_tag_from_file(filename)
		self._refresh_associated()
		self.save()
		
	def save(self, sids_override = False):
		"""
		Save song to the database.
		"""
		update = False
		if self.id
			update = True
		else
			potential_id = db.c.fetch_var("SELECT song_id FROM r4_songs JOIN r4_albums USING (album_id) WHERE song_title = %s AND album_title = %s" % (self.title, self.album_tag))
			if potential_id
				self.id = potential_id
				update = True
				
		if sids_override:
			self.sids = sids_override
		elif len(self.sids) == 0:
			raise SongHasNoSIDsException
		
		if update:
			db.c.update("UPDATE r4_songs \
				SET	song_filename = %s, \
					song_title = %s, \
					song_link = %s, \
					song_link_text = %s, \
					song_secondslong = %s, \
					song_verified = true \
				WHERE song_id = %s", 
				(self.filename, self.title, self.link, self.link_text, self.secondslong, True))
		else
			self.id = db.c.fetch_var("SELECT nextval('r4_songs_song_id_seq'::regclass)")
			db.c.update("INSERT INTO r4_songs \
				(song_id, song_filename, song_title, song_link, song_link_text, song_secondslong, song_origin_sid) \
				VALUES \
				(%s,      %s           , %s        , %s       , %s            , %s              , %s)",
				(self.id, self.filename, self.title, self.link, self.link_text, self.secondslong, self.sids[0]))
					
		self.album.associate_song(self.id)
		for artist in self.artists:
			artist.associate_song(self.id)
		for group in self.groups:
			if group.is_from_tag(self.id):
				group.associate_song(self.id)

		current_sids = db.c.fetch_list("SELECT sid FROM r4_song_sid WHERE song_id = %s", (self.id,))
		for sid in current_sids:
			if not self.sids.index(sid):
				db.c.update("UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s AND sid = %s", (self.id, sid))
		for sid in self.sids:
			if not current_sids.index(sid):
				db.c.update("INSERT INTO r4_song_sid (song_id, sid) VALUES (%s, %s)", (self.song_id, self.sid))
		
	def start_cooldown():
		"""
		Calculates cooldown based on jfinalfunk's crazy algorithms.
		Cooldown may be overriden by song_cool_* rules found in database.
		"""
	
	def update_rating():
		"""
		Calculate an updated rating from the database.
		"""
		
# ################################################################### ASSOCIATED DATA TEMPLATE

class MetadataInsertionError(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class MetadataUpdateError(MetadataInsertionError):
	pass

class MetadataNotNamedError(MetadataInsertionError):
	pass

class MetadataNotFoundError(MetadataInsertionError):
	pass

class AssociatedMetadata(Object):
	select_by_name_query = None 		# one %s argument: name
	select_by_id_query = None			# one %s argument: id
	select_by_song_id_query = None		# one %s argument: song_id
	disassociate_all_song_id_query = None	# one %s argument: song_id
	associate_song_query = None			# two %s argument: song_id, id

	@classmethod
	def load_from_name(klass, name):
		instance = klass()
		data = db.c.fetch_row(klass.select_by_name_query, (name,))
		if data:
			instance._assign_from_dict(data)
		else:
			instance.name = name
			instance.save()
		return instance
		
	@classmethod
	def load_from_id(klass, id):
		instance = klass()
		data = db.c.fetch_row(klass.select_by_id_query, (id,))
		if not data:
			raise MetadataNotFoundError("%s ID %s could not be found." % (klass.__name__, id))
		instance._assign_from_dict(data)
		return instance
		
	@classmethod
	def load_list_from_tag(klass, tag):
		instances = []
		for fragment in tag.split(","):
			instances.append(klass.load_from_name(fragment.strip()))
		return instances
		
	@classmethod
	def load_list_from_song_id(klass, song_id):
		instances = []
		for row in db.c.query(klass.select_by_song_id_query, (song_id,))
			instance = klass()
			instance._assign_from_dict(row)
			instances.append(instance)
		return instances
		
	def __init__(self):
		self.id = None
		self.name = None
		self.is_tag = False
		self.elec_block = False
		self.cool_time = False

	def _assign_from_dict(self, d):
		self.id = d["id"]
		self.name = d["name"]
		if d.has_key("is_tag"):
			self.is_tag = d["is_tag"]
		if d.has_key("elec_block")
			self.elec_block = d["elec_block"]
		if d.has_key("cool_time")
			self.cool_time = d["cool_time"]
		
	def save(self):
		if not self.id and self.name:
			if not self._insert_into_db():
				raise MetadataInsertionError("%s with name \"%s\" could not be inserted into the database." % (self.__class__.__name__, self.name))
		elif self.id:
			if not self._update_db():
				raise MetadataUpdateError("%s with ID %s could not be updated." % (self.__class__.__name__, self.id))
		else:
			raise MetadataNotNamedError("Tried to save a %s without a name" % self.__class__.__name__)
			
	def is_from_tag(self, song_id):
		return self.is_tag
			
	def _insert_into_db():
		return False
	
	def _update_db():
		return False
		
	def start_election_block(self, num_elections = False):
		if num_elections:
			self._start_election_block_db(num_elections)
		elif self.elec_block:
			self._start_election_block_db(self.elec_block)
		
	def start_cooldown(self, cool_time = False):
		if cool_time:
			self._start_cooldown_db(cool_time)
		elif self.cool_time:
			self._start_cooldown_db(self.cool_time)

	def associate_song_id(self, song_id):
		if not db.c.update(associate_song_id_query, (song_id, self.id)):
			raise MetadataUpdateError("Cannot associate song ID %s with %s ID %s" % (song_id, self.__class__.__name__, self.id))
		
	def disassociate_song_id(klass, song_id):
		if not db.c.update(disassociate_song_id_query, (song_id, self.id)):
			raise MetadataUpdateError("Cannot disassociate song ID %s with %s ID %s" % (song_id, self.__class__.__name__, self.id))
		
class Album(AssociatedMetaData):
	select_by_name_query = "SELECT r4_albums.* FROM r4_albums WHERE album_name = %s"
	select_by_id_query = "SELECT r4_albums.* FROM r4_albums WHERE album_id = %s"
	select_by_song_id_query = "SELECT r4_albums.*, r4_song_album.album_is_tag FROM r4_song_album JOIN r4_albmus USING (album_id) WHERE song_id = %s"
	disassociate_song_id_query = "DELETE FROM r4_song_album WHERE song_id = %s AND album_id = %s"
	associate_song_id_query = "INSERT INTO r4_song_album (song_id, album_id) VALUES (%s, %s)"

	def _insert_into_db(self):
		self.id = db.c.fetch_var("SELECT nextval('r4_albums_album_id_seq'::regclass)")
		return db.c.update("INSERT INTO r4_albums (album_id, album_name) VALUES (%s, %s)", (self.id, self.name))
	
	def _update_db(self):
		return db.c.update("UPDATE r4_albums SET album_name = %s, album_rating = %s WHERE album_id = %s", (self.name, self.rating, self.id))
		
	def _assign_from_dict(self, d):
		pass
	
	def associate_song_id(self, song_id, sids):
		# TODO: Check sid association here
		super().associate_song_id(song_id)
		
	def disassociate_song_id(self, song_id, sids):
		# TODO: Check sid association here
		super().disassociate_song_id(song_id)
		
	def associated_songs(self, sids):
		