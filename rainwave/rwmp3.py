from mutagen.mp3 import MP3
import os

class RWMP3:
	"""
	Base class for building any song that reads from MP3 files.
	"""
	
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

		self.filename = None
		self.title = None
		self.artist_tag = None
		self.track = None
		self.album_tag = None
		self.genre_tag = None
		self.link_text = None
		self.year = None
		self.www = None
		self.length = None
		
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
			self.www = f["WXXX"][0]
		self.length = int(f.info.length)

	def is_valid(self):
		"""
		Lets callee know if this MP3 is valid or not.
		"""
		
		if os.path.exists(self.filename):
			return True
		else:
			return False
