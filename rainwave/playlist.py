from mutagen.mp3 import MP3
import os
from libs import db

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
	
class SongMetadataUnremovable(Exception):
	pass
	
class Song(object):
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
		s.id = id
		s.filename = d['song_filename']
		s.verified = d['song_verified']
		s.data['sids'] = db.c.fetch_list("SELECT sid FROM r4_song_sid WHERE song_id = %s", (id,))
		s.data['title'] = d['song_title']
		s.data['link'] = d['song_link']
		s.data['link_text'] = d['song_link_text']
		s.data['length'] = d['song_length']
		s.data['added_on'] = d['song_added_on']
		s.data['rating'] = d['song_rating']
		s.data['rating_count'] = d['song_rating_count']
		s.data['cool_multiply'] = d['song_cool_multiply']
		s.data['origin_sid'] = d['song_origin_sid']
		s.data['sid'] = None
		
		if sid:
			s.sid = sid
			s.data['cool'] = d['song_cool']
			s.data['cool_end'] = d['song_cool_end']
			s.data['elec_appearances'] = d['song_elec_appearances']
			s.data['elec_last'] = d['song_elec_last']
			s.data['elec_blocked'] = d['song_elec_blocked']
			s.data['elec_blocked_num'] = d['song_elec_blocked_num']
			s.data['elec_blocked_by'] = d['song_elec_blocked_by']
			s.data['vote_share'] = d['song_vote_share']
			s.data['vote_total'] = d['song_vote_total']
			s.data['request_total'] = d['song_request_total']
			s.data['played_last'] = d['song_played_last']

		s.artists = Artist.load_list_from_song_id(id)
		s.groups = SongGroup.load_list_from_song_id(id)
		s.albums = Album.load_list_from_song_id(id)
		
		return s
			
	@classmethod
	def load_from_file(klass, filename, sids):
		"""
		Produces an instance of the Song class with all album, group, and artist IDs loaded from only a filename.
		All metadata is saved to the database and updated where necessary.
		"""

		kept_albums = []
		kept_artists = []
		kept_groups = []
		matched_id = db.c.fetch_var("SELECT song_id FROM r4_songs WHERE song_filename = %s", (filename,))
		if matched_id:
			s = klass.load_from_id(matched_id)
			for metadata in s.albums:
				if metadata.is_tag:
					metadata.disassociate_song_id(s.id)
				else:
					kept_albums.append(metadata)
			for metadata in s.artists:
				if metadata.is_tag:
					metadata.disassociate_song_id(s.id)
				else:
					kept_artists.append(metadata)
			for metadata in s.groups:
				if metadata.is_tag:
					metadata.disassociate_song_id(s.id)
				else:
					kept_groups.append(metadata)
		elif len(sids) == 0:
			raise SongHasNoSIDsException
		else:
			s = klass()
		
		s.load_tag_from_file(filename)
		s.save(sids)
		
		s.artists = Artist.load_list_from_tag(s.artist_tag) + kept_artists
		s.albums = Album.load_list_from_tag(s.album_tag) + kept_albums
		s.groups = SongGroup.load_list_from_tag(s.genre_tag) + kept_groups
		
		for metadata in s.artists + s.albums + s.groups:
			metadata.associate_song_id(s.id)
		
		return s

	def __init__(self):
		"""
		A blank Song object.  Please use one of the load functions to get a filled instance.
		"""
		self.id = None
		self.albums = None
		self.artists = None
		self.groups = None
		self.verified = False
		self.data = {}
		
	def load_tag_from_file(self, filename):
		"""
		Reads ID3 tags and sets object-level variables.
		"""
		
		f = MP3(filename)
		self.filename = filename
		keys = f.keys()
		if "TIT2" in keys:
			self.data['title'] = f["TIT2"][0]
		if "TPE1" in keys:
			self.artist_tag = f["TPE1"][0]
		if "TALB" in keys:
			self.album_tag = f["TALB"][0]
		if "TCON" in keys:
			self.genre_tag = f["TCON"][0]
		if "COMM" in keys:
			self.data['link_text'] = f["COMM"][0]
		elif "COMM::'XXX'" in keys:
			self.data['link_text'] = f["COMM::'XXX'"][0]
		if "WXXX:URL" in keys:
			self.data['link'] = f["WXXX:URL"].url
		elif "WXXX" in keys:
			self.data['link'] = f["WXXX"][0]
		self.data['length'] = int(f.info.length)
		
	def is_valid(self):
		"""
		Lets callee know if this MP3 is valid or not.
		"""
		
		if os.path.exists(self.filename):
			self.verified = True
			return True
		else:
			self.verified = False
			return False
		
	def save(self, sids_override = False):
		"""
		Save song to the database.  Does NOT associate metadata.
		"""
		update = False
		if self.id:
			update = True
		else:
			potential_id = None
			check_album = None
			# To check for moved/duplicate songs we try to find if it exists in the db
			# by matching on song title and either the first album if we have it, or its entire album tag.
			if self.albums:
				check_album = self.albums[0].data['name']
			else:
				check_album = self.album_tag
			potential_id = db.c.fetch_var("SELECT song_id FROM r4_songs JOIN r4_song_album USING (song_id) JOIN r4_albums USING (album_id) WHERE song_title = %s AND album_name = %s", (self.data['title'], check_album))
			if potential_id:
				self.id = potential_id
				update = True
				
		if sids_override:
			self.data['sids'] = sids_override
		elif len(self.sids) == 0:
			raise SongHasNoSIDsException
		self.data['origin_sid'] = self.data['sids'][0]
		
		if update:
			db.c.update("UPDATE r4_songs \
				SET	song_filename = %s, \
					song_title = %s, \
					song_link = %s, \
					song_link_text = %s, \
					song_length = %s, \
					song_scanned = TRUE, \
					song_verified = TRUE \
				WHERE song_id = %s", 
				(self.filename, self.data['title'], self.data['link'], self.data['link_text'], self.data['length'], self.id))
			self.verified = True
		else:
			self.id = db.c.get_next_id("r4_songs", "song_id")
			db.c.update("INSERT INTO r4_songs \
				(song_id, song_filename, song_title, song_link, song_link_text, song_length, song_origin_sid) \
				VALUES \
				(%s,      %s           , %s        , %s       , %s            , %s              , %s)",
				(self.id, self.filename, self.data['title'], self.data['link'], self.data['link_text'], self.data['length'], self.data['origin_sid']))
			self.verified = True

		current_sids = db.c.fetch_list("SELECT sid FROM r4_song_sid WHERE song_id = %s", (self.id,))
		for sid in current_sids:
			if not self.data['sids'].count(sid):
				db.c.update("UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s AND sid = %s", (self.id, sid))
		for sid in self.data['sids']:
			if current_sids.count(sid):
				db.c.update("UPDATE r4_song_sid SET song_exists = TRUE WHERE song_id = %s AND sid = %s", (self.id, sid))
			else:
				db.c.update("INSERT INTO r4_song_sid (song_id, sid) VALUES (%s, %s)", (self.id, sid))
			
				
	def disable(self):
		db.c.update("UPDATE r4_songs SET song_verified = FALSE WHERE song_id = %s", (self.id,))
		db.c.update("UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s", (self.id,))
		for metadata in self.albums:
			metadata.reconcile_sids()
		
	def start_cooldown(self):
		"""
		Calculates cooldown based on jfinalfunk's crazy algorithms.
		Cooldown may be overriden by song_cool_* rules found in database.
		"""
	
	def update_rating(self):
		"""
		Calculate an updated rating from the database.
		"""
		
	def add_artist(self, name):
		return self._add_metadata(self.artists, name, Artist)
		
	def add_album(self, name):
		return self._add_metadata(self.albums, name, Album)

	def add_group(self, name):
		return self._add_metadata(self.groups, name, SongGroup)
	
	def _add_metadata(self, lst, name, klass):
		for metadata in lst:
			if metadata.data['name'] == name:
				return True
		new_md = klass.load_from_name(name)
		new_md.associate_song_id(self.id)
		lst.append(new_md)
		return True
		
	def remove_artist_id(self, id):
		return self._remove_metadata_id(self.artists, id)
		
	def remove_album_id(self, id):
		return self._remove_metadata_id(self.albums, id)
		
	def remove_group_id(self, id):
		return self._remove_metadata_id(self.groups, id)
		
	def _remove_metadata_id(self, lst, id):
		for metadata in lst:
			if metadata.id == id and not metadata.is_tag:
				metadata.disassociate_song_id(self.id)
				return True
		raise SongMetadataUnremovable("Found no tag by ID %s that wasn't assigned by ID3." % id)
		
	def remove_artist(self, name):
		return self._remove_metadata(self.artists, name)
		
	def remove_album(self, name):
		return self._remove_metadata(self.albums, name)
		
	def remove_group(self, name):
		return self._remove_metadata(self.groups, name)
		
	def _remove_metadata(self, lst, name):
		for metadata in lst:
			if metadata.data['name'] == name and not metadata.is_tag:
				metadata.disassociate_song_id(self.id)
				return True
		raise SongMetadataUnremovable("Found no tag by name %s that wasn't assigned by ID3." % name)
		
	def to_dict(self):
		self.data['id'] = self.id
		album_list = []
		artist_list = []
		group_list = []
		if self.albums:
			for metadata in self.albums:
				albums_list.append(metadata.to_dict())
			self.data['albums'] = album_list
		if self.artists:
			for metadata in self.artists:
				artist_list.append(metadata.to_dict())
			self.data['artists'] = artist_list
		if self.groups:
			for metadata in self.groups:
				group_list.append(metadata.to_dict())
			self.data['groups'] = group_list
		return self.data
		
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

class AssociatedMetadata(object):
	select_by_name_query = None 		# one %s argument: name
	select_by_id_query = None			# one %s argument: id
	select_by_song_id_query = None		# one %s argument: song_id
	disassociate_song_id_query = None	# two %s argument: song_id, id
	associate_song_id_query = None		# three %s argument: song_id, id, is_tag

	@classmethod
	def load_from_name(klass, name):
		instance = klass()
		data = db.c.fetch_row(klass.select_by_name_query, (name,))
		if data:
			instance._assign_from_dict(data)
		else:
			instance.data['name'] = name
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
			if len(fragment) > 0:
				instance = klass.load_from_name(fragment.strip())
				instance.is_tag = True
				instances.append(instance)
		return instances
		
	@classmethod
	def load_list_from_song_id(klass, song_id):
		instances = []
		for row in db.c.fetch_all(klass.select_by_song_id_query, (song_id,)):
			instance = klass()
			instance._assign_from_dict(row)
			instances.append(instance)
		return instances
		
	def __init__(self):
		self.id = None
		self.is_tag = False
		self.elec_block = False
		self.cool_time = False
		
		self.data = {}
		self.data['name'] = None

	def _assign_from_dict(self, d):
		self.id = d["id"]
		self.data['name'] = d["name"]
		if d.has_key("is_tag"):
			self.is_tag = d["is_tag"]
		if d.has_key("elec_block"):
			self.elec_block = d["elec_block"]
		if d.has_key("cool_time"):
			self.cool_time = d["cool_time"]
		
	def save(self):
		if not self.id and self.data['name']:
			if not self._insert_into_db():
				raise MetadataInsertionError("%s with name \"%s\" could not be inserted into the database." % (self.__class__.__name__, self.data['name']))
		elif self.id:
			if not self._update_db():
				raise MetadataUpdateError("%s with ID %s could not be updated." % (self.__class__.__name__, self.id))
		else:
			raise MetadataNotNamedError("Tried to save a %s without a name" % self.__class__.__name__)

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

	def associate_song_id(self, song_id, is_tag = None):
		if is_tag == None:
			is_tag = self.is_tag
		else:
			self.is_tag = is_tag
		if db.c.fetch_var(self.has_song_id_query, (song_id, self.id)) > 0:
			pass
		else:
			if not db.c.update(self.associate_song_id_query, (song_id, self.id, is_tag)):
				raise MetadataUpdateError("Cannot associate song ID %s with %s ID %s" % (song_id, self.__class__.__name__, self.id))
		
	def disassociate_song_id(self, song_id, is_tag = True):
		if not db.c.update(self.disassociate_song_id_query, (song_id, self.id)):
			raise MetadataUpdateError("Cannot disassociate song ID %s with %s ID %s" % (song_id, self.__class__.__name__, self.id))
			
	def to_dict(self):
		self.data['id'] = self.id
		return self.data
		
class Album(AssociatedMetadata):
	select_by_name_query = "SELECT r4_albums.* FROM r4_albums WHERE album_name = %s"
	select_by_id_query = "SELECT r4_albums.* FROM r4_albums WHERE album_id = %s"
	select_by_song_id_query = "SELECT r4_albums.*, r4_song_album.album_is_tag FROM r4_song_album JOIN r4_albums USING (album_id) WHERE song_id = %s ORDER BY r4_albums.album_name"
	disassociate_song_id_query = "DELETE FROM r4_song_album WHERE song_id = %s AND album_id = %s"
	associate_song_id_query = "INSERT INTO r4_song_album (song_id, album_id, album_is_tag) VALUES (%s, %s, %s)"
	has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_album WHERE song_id = %s AND album_id = %s"

	def _insert_into_db(self):
		self.id = db.c.get_next_id("r4_albums", "album_id")
		return db.c.update("INSERT INTO r4_albums (album_id, album_name) VALUES (%s, %s)", (self.id, self.data['name']))
	
	def _update_db(self):
		return db.c.update("UPDATE r4_albums SET album_name = %s, album_rating = %s WHERE album_id = %s", (self.data['name'], self.data['rating'], self.id))
		
	def _assign_from_dict(self, d):
		self.id = d['album_id']
		self.data['name'] = d['album_name']
		self.data['rating'] = d['album_rating']
		self.data['rating_count'] = d['album_rating_count']
		self.data['added_on'] = d['album_added_on']
		if d.has_key('album_is_tag'):
			self.is_tag = d['album_is_tag']
	
	def associate_song_id(self, song_id):
		super(Album, self).associate_song_id(song_id)
		self.reconcile_sids()
		
	def disassociate_song_id(self, song_id):
		super(Album, self).disassociate_song_id(song_id)
		self.reconcile_sids()
		
	def reconcile_sids(self):
		sids = db.c.fetch_list("SELECT r4_song_sid.sid AS 'sid' FROM r4_song_sid JOIN r4_song_album USING (song_id) WHERE album_id = %s AND r4_song_sid.song_exists = TRUE GROUP BY sid", (self.id,))
		current_sids = db.c.fetch_list("SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = TRUE", (self.id,))
		old_sids = db.c.fetch_list("SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = FALSE", (self.id,))
		for sid in current_sids:
			if not sids.count(sid):
				db.c.update("UPDATE r4_album_sid SET album_exists = FALSE WHERE album_id = %s AND sid = %s", (self.id, sid))
		for sid in sids:
			if current_sids.count(sid):
				pass
			elif old_sids.count(sid):
				db.c.update("UPDATE r4_album_sid SET album_exists = TRUE WHERE album_id = %s AND sid = %s", (self.id, sid))
			else:
				db.c.update("INSERT INTO r4_album_sid (album_id, sid) VALUES (%s, %s)", (self.id, sid))
					
class Artist(AssociatedMetadata):
	select_by_name_query = "SELECT artist_id AS id, artist_name AS name FROM r4_artists WHERE artist_name = %s"
	select_by_id_query = "SELECT artist_id AS id, artist_name AS name FROM r4_artists WHERE artist_id = %s"
	select_by_song_id_query = "SELECT r4_artists.artist_id AS id, r4_artists.artist_name AS name, r4_song_artist.artist_is_tag AS is_tag FROM r4_song_artist JOIN r4_artists USING (artist_id) WHERE song_id = %s"
	disassociate_song_id_query = "DELETE FROM r4_song_artist WHERE song_id = %s AND artist_id = %s"
	associate_song_id_query = "INSERT INTO r4_song_artist (song_id, artist_id, artist_is_tag) VALUES (%s, %s, %s)"
	has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_artist WHERE song_id = %s AND artist_id = %s"
	
	def _insert_into_db(self):
		self.id = db.c.get_next_id("r4_artists", "artist_id")
		return db.c.update("INSERT INTO r4_artists (artist_id, artist_name) VALUES (%s, %s)", (self.id, self.data['name']))
	
	def _update_db(self):
		return db.c.update("UPDATE r4_artists SET artist_name = %s WHERE artist_id = %s", (self.name, self.id))
	
class SongGroup(AssociatedMetadata):
	select_by_name_query = "SELECT group_id AS id, group_name AS name FROM r4_groups WHERE group_name = %s"
	select_by_id_query = "SELECT group_id AS id, group_name AS name FROM r4_groups WHERE group_id = %s"
	select_by_song_id_query = "SELECT r4_groups.group_id AS id, r4_groups.group_name AS name, group_elec_block AS elec_block FROM r4_song_group JOIN r4_groups USING (group_id) WHERE song_id = %s"
	disassociate_song_id_query = "DELETE FROM r4_song_group WHERE song_id = %s AND group_id = %s"
	associate_song_id_query = "INSERT INTO r4_song_group (song_id, group_id, group_is_tag) VALUES (%s, %s, %s)"
	has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_group WHERE song_id = %s AND group_id = %s"
	
	def _insert_into_db(self):
		self.id = db.c.get_next_id("r4_groups", "group_id")
		return db.c.update("INSERT INTO r4_groups (group_id, group_name) VALUES (%s, %s)", (self.id, self.data['name']))
	
	def _update_db(self):
		return db.c.update("UPDATE r4_groups SET group_name = %s WHERE group_id = %s", (self.name, self.id))