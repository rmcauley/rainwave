from libs import log
from libs import db
from unidecode import unidecode

def make_searchable_string(s):
	if not isinstance(s, unicode):
		s = unicode(s)
	s = unidecode(s).lower()
	return ''.join(e for e in s if (e.isalnum() or e == ' '))

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
	check_self_size_query = None			# one argument: id
	delete_self_query = None		# one argument: id

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
	def load_from_id(klass, metadata_id):
		instance = klass()
		data = db.c.fetch_row(klass.select_by_id_query, (metadata_id,))
		if not data:
			raise MetadataNotFoundEror("%s ID %s could not be found." % (klass.__name__, metadata_id))
		instance._assign_from_dict(data)
		return instance

	@classmethod
	def load_list_from_tag(klass, tag):
		if not tag:
			return []
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
		self.elec_block = None
		self.cool_time = None

		self.data = {}
		self.data['name'] = None

	def _assign_from_dict(self, d):
		self.id = d["id"]
		self.data['name'] = d["name"]
		if d.has_key("is_tag"):
			self.is_tag = d["is_tag"]
		if d.has_key("elec_block") and d['elec_block'] is not None:
			self.elec_block = d["elec_block"]
		if d.has_key("cool_time") and d['cool_time'] is not None:
			self.cool_time = d["cool_time"]
		if d.has_key("cool_override") and d['cool_override'] is not None:
			self.cool_time = d['cool_override']
		if d.has_key("name_searchable"):
			self.data['name_searchable'] = d['name_searchable']
		if d.has_key("order"):
			self.data['order'] = d['order']

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

	def start_election_block(self, sid, num_elections = False):
		if self.elec_block is not None:
			if self.elec_block > 0:
				log.debug("elec_block", "%s SID %s blocking ID %s for override %s" % (self.__class__.__name__, sid, self.id, self.elec_block))
				self._start_election_block_db(sid, self.elec_block)
		elif num_elections:
			log.debug("elec_block", "%s SID %s blocking ID %s for normal %s" % (self.__class__.__name__, sid, self.id, num_elections))
			self._start_election_block_db(sid, num_elections)

	def start_cooldown(self, sid, cool_time = False):
		if self.cool_time is not None:
			self._start_cooldown_db(sid, self.cool_time)
		elif cool_time and cool_time > 0:
			self._start_cooldown_db(sid, cool_time)

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
		if db.c.fetch_var(self.check_self_size_query, (self.id,)) == 0:
			db.c.update(self.delete_self_query, (self.id,))

	def to_dict(self, user = None):
		self.data['id'] = self.id
		return self.data